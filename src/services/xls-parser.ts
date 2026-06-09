import { ParsedTransaction, categorizeTransaction, detectPaymentMethod } from './csv-parser'

export async function parseXLS(file: File): Promise<ParsedTransaction[]> {
  const XLSX = await import('xlsx')
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array', cellDates: true })

  const results: ParsedTransaction[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    if (rows.length === 0) continue

    const originalKeys = Object.keys(rows[0])

    const findCol = (pattern: RegExp) =>
      originalKeys.find(k => pattern.test(k.toLowerCase().trim()))

    const dateKey = findCol(/date|txn.*date|transaction.*date|value.*date/)
    const descKey = findCol(/desc|narr|particular|detail|remark|merchant/)
    const debitKey = findCol(/debit|withdraw|dr/)
    const creditKey = findCol(/credit|deposit|cr/)
    const amountKey = findCol(/amount|value|sum/)
    const refKey = findCol(/ref|reference|txn.*id|transaction.*id|cheque/)

    if (!dateKey && !descKey) continue

    for (const row of rows) {
      const rawDate = dateKey ? row[dateKey] : ''
      const description = descKey ? String(row[descKey] || '') : ''
      if (!rawDate || !description) continue

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
        amount = parseAmount(row[amountKey])
        if (amount === 0) continue
        const lower = description.toLowerCase()
        const isCredit = lower.includes('credit') || lower.includes('salary') ||
          lower.includes('refund') || lower.includes('deposit') || lower.includes('cashback')
        type = isCredit ? 'income' : 'expense'
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

    if (results.length > 0) break
  }

  return results
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const str = String(value).trim()
  if (!str) return null

  // yyyy-MM-dd
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return iso[0]

  // dd/MM/yyyy or dd-MM-yyyy
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (dmy) {
    const [, day, month, year] = dmy
    if (parseInt(day) <= 31 && parseInt(month) <= 12) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
  }

  // dd Mon yyyy or dd-Mon-yyyy
  const MONTHS: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  }
  const mdy = str.match(/(\d{1,2})[\s\-]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s\-]+(\d{2,4})/i)
  if (mdy) {
    const day = mdy[1].padStart(2, '0')
    const month = MONTHS[mdy[2].toLowerCase().slice(0, 3)]
    let year = mdy[3]
    if (year.length === 2) year = `20${year}`
    if (month) return `${year}-${month}-${day}`
  }

  // Excel serial date number
  if (typeof value === 'number' && value > 30000 && value < 60000) {
    const date = new Date((value - 25569) * 86400000)
    if (!isNaN(date.getTime())) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }

  return null
}

function parseAmount(value: unknown): number {
  if (typeof value === 'number') return value
  const str = String(value).replace(/[₹$€£,\s]/g, '').trim()
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

function extractMerchant(desc: string): string {
  let cleaned = desc
    .replace(/UPI[-\/]\d+[-\/]/gi, '')
    .replace(/NEFT[-\/][A-Z0-9]+[-\/]/gi, '')
    .replace(/IMPS[-\/][A-Z0-9]+[-\/]/gi, '')
    .replace(/\b\d{10,}\b/g, '')
    .replace(/\bRef\s*(?:No)?\.?\s*\d+/gi, '')
    .replace(/[\/\\|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const parts = cleaned.split(/\s{2,}/)
  cleaned = parts[0] || cleaned
  if (cleaned.length > 40) cleaned = cleaned.slice(0, 40).trim()
  return cleaned || desc.slice(0, 30)
}
