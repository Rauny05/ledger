import { ParsedTransaction, categorizeTransaction, detectPaymentMethod } from './csv-parser'

export async function parseXLS(file: File): Promise<ParsedTransaction[]> {
  const XLSX = await import('xlsx')
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true, raw: false })

  let bestResults: ParsedTransaction[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]

    // Try JSON parsing first
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
    if (rows.length < 2) continue

    const results = parseRows(rows)
    if (results.length > bestResults.length) bestResults = results

    // If we got good results, stop
    if (bestResults.length > 0) break
  }

  return bestResults
}

function parseRows(rows: Record<string, unknown>[]): ParsedTransaction[] {
  const results: ParsedTransaction[] = []

  if (rows.length === 0) return results

  const keys = Object.keys(rows[0])

  // Score-based column detection - finds best match for each role
  const dateKey = bestMatch(keys, [
    /^(txn|transaction|value|posting|booking)[\s_-]?date$/i,
    /^date$/i,
    /date/i,
  ])
  const descKey = bestMatch(keys, [
    /^(narration|description|particulars|remarks|details|merchant|payee|beneficiary)$/i,
    /narrat|descript|particular|remark|detail/i,
  ])
  const debitKey = bestMatch(keys, [
    /^(debit|withdrawal|dr|debit[\s_-]?amount|withdrawal[\s_-]?amount|amount[\s_-]?debit)$/i,
    /debit|withdraw/i,
  ])
  const creditKey = bestMatch(keys, [
    /^(credit|deposit|cr|credit[\s_-]?amount|deposit[\s_-]?amount|amount[\s_-]?credit)$/i,
    /credit|deposit/i,
  ])
  const amountKey = bestMatch(keys, [
    /^(amount|transaction[\s_-]?amount|txn[\s_-]?amount|net[\s_-]?amount)$/i,
    /^amount$/i,
    /amount/i,
  ])
  const refKey = bestMatch(keys, [
    /^(reference|ref[\s_-]?no|cheque[\s_-]?no|chq[\s_-]?no|transaction[\s_-]?id|txn[\s_-]?id|utr)$/i,
    /ref|cheque|chq/i,
  ])

  if (!dateKey || !descKey) return results

  for (const row of rows) {
    const rawDate = row[dateKey]
    const description = String(row[descKey] || '').trim()
    if (!rawDate || !description || description.toLowerCase() === descKey.toLowerCase()) continue

    const date = parseDate(rawDate)
    if (!date) continue

    let amount = 0
    let type: 'expense' | 'income' = 'expense'

    if (debitKey && creditKey) {
      const debit = parseAmount(row[debitKey])
      const credit = parseAmount(row[creditKey])
      if (debit > 0) { amount = debit; type = 'expense' }
      else if (credit > 0) { amount = credit; type = 'income' }
      else continue
    } else if (amountKey) {
      const raw = String(row[amountKey] || '')
      // Some banks use negative for debits
      amount = parseAmount(row[amountKey])
      if (amount === 0) continue
      if (amount < 0) { amount = Math.abs(amount); type = 'expense' }
      else {
        const lower = description.toLowerCase()
        const isCredit = lower.includes('credit') || lower.includes('salary') ||
          lower.includes('refund') || lower.includes('deposit') || lower.includes('cashback') ||
          lower.includes('interest') || lower.includes('dividend') || raw.startsWith('+')
        type = isCredit ? 'income' : 'expense'
      }
    } else continue

    const merchant = extractMerchant(description)

    results.push({
      date,
      merchant,
      amount: Math.abs(amount),
      type,
      category: categorizeTransaction(description),
      description: description.slice(0, 200),
      paymentMethod: detectPaymentMethod(description),
      referenceNumber: refKey ? String(row[refKey] || '') : undefined,
    })
  }

  return results
}

// Returns the first key that matches any pattern, trying patterns in order
function bestMatch(keys: string[], patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = keys.find(k => pattern.test(k.trim()))
    if (match) return match
  }
  return undefined
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    if (y < 2000 || y > 2100) return null
    return `${y}-${m}-${d}`
  }

  const str = String(value).trim()
  if (!str || str === '0' || str.toLowerCase() === 'date') return null

  // yyyy-MM-dd
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return iso[0]

  // dd/MM/yyyy or dd-MM-yyyy
  const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/)
  if (dmy) {
    const [, a, b, c] = dmy
    if (parseInt(a) <= 31 && parseInt(b) <= 12) {
      return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
    }
  }

  // MM/dd/yyyy
  const mdy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/)
  if (mdy) {
    const [, a, b, c] = mdy
    if (parseInt(a) <= 12 && parseInt(b) <= 31) {
      return `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`
    }
  }

  // dd Mon yyyy or dd-Mon-yyyy
  const MONTHS: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  }
  const dmony = str.match(/(\d{1,2})[\s\-\/]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s\-\/]+(\d{2,4})/i)
  if (dmony) {
    const day = dmony[1].padStart(2, '0')
    const month = MONTHS[dmony[2].toLowerCase().slice(0, 3)]
    let year = dmony[3]
    if (year.length === 2) year = `20${year}`
    if (month) return `${year}-${month}-${day}`
  }

  // Excel serial number
  const serial = typeof value === 'number' ? value : parseFloat(str)
  if (!isNaN(serial) && serial > 30000 && serial < 60000) {
    const date = new Date(Math.round((serial - 25569) * 86400000))
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear()
      const m = String(date.getUTCMonth() + 1).padStart(2, '0')
      const d = String(date.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }

  return null
}

function parseAmount(value: unknown): number {
  if (typeof value === 'number') return value
  const str = String(value).replace(/[₹$€£,\s]/g, '').trim()
  if (!str || str === '-' || str === '') return 0
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

function extractMerchant(desc: string): string {
  let cleaned = desc
    .replace(/UPI[-\/]\d+[-\/]?/gi, '')
    .replace(/NEFT[-\/][A-Z0-9]+[-\/]?/gi, '')
    .replace(/IMPS[-\/][A-Z0-9]+[-\/]?/gi, '')
    .replace(/\b\d{10,}\b/g, '')
    .replace(/\bRef\s*(?:No)?\.?\s*\d+/gi, '')
    .replace(/\bUTR\s*:?\s*\d+/gi, '')
    .replace(/[\/\\|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const parts = cleaned.split(/\s{2,}/)
  cleaned = parts[0] || cleaned
  if (cleaned.length > 50) cleaned = cleaned.slice(0, 50).trim()
  return cleaned || desc.slice(0, 30)
}
