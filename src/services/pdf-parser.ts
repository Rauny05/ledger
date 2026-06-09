import { ParsedTransaction, categorizeTransaction, detectPaymentMethod } from './csv-parser'

export async function extractTextFromPDF(file: File): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const lines: { y: number; x: number; text: string }[] = []

    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        const transform = item.transform
        lines.push({ y: Math.round(transform[5]), x: Math.round(transform[4]), text: item.str.trim() })
      }
    }

    // Group by Y coordinate (same line)
    const lineMap = new Map<number, { x: number; text: string }[]>()
    lines.forEach(l => {
      const key = l.y
      // Find nearby Y (within 3px tolerance)
      let matched = false
      for (const [existingY] of lineMap) {
        if (Math.abs(existingY - key) <= 3) {
          lineMap.get(existingY)!.push({ x: l.x, text: l.text })
          matched = true
          break
        }
      }
      if (!matched) {
        lineMap.set(key, [{ x: l.x, text: l.text }])
      }
    })

    // Sort lines top to bottom, items left to right
    const sortedLines = Array.from(lineMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) =>
        items.sort((a, b) => a.x - b.x).map(i => i.text).join('  ')
      )

    pages.push(sortedLines.join('\n'))
  }

  return pages
}

const DATE_PATTERNS = [
  /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i,
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{2})(?!\d)/i,
  /(\d{4})-(\d{2})-(\d{2})/,
]

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

function extractDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern)
    if (!match) continue

    if (pattern === DATE_PATTERNS[3]) {
      return match[0]
    }

    if (pattern === DATE_PATTERNS[1] || pattern === DATE_PATTERNS[2]) {
      const day = match[1].padStart(2, '0')
      const month = MONTHS[match[2].toLowerCase().slice(0, 3)]
      let year = match[3]
      if (year.length === 2) year = `20${year}`
      if (month) return `${year}-${month}-${day}`
    }

    if (pattern === DATE_PATTERNS[0]) {
      const [, a, b, c] = match
      // dd/MM/yyyy
      if (parseInt(a) <= 31 && parseInt(b) <= 12) {
        return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
      }
    }
  }
  return null
}

const AMOUNT_PATTERN = /(?:₹|INR|Rs\.?|USD|\$|€|£)?\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?)/g

function extractAmounts(text: string): number[] {
  const amounts: number[] = []
  let match
  while ((match = AMOUNT_PATTERN.exec(text)) !== null) {
    const val = parseFloat(match[1].replace(/,/g, ''))
    if (val > 0 && val < 10000000) amounts.push(val)
  }
  AMOUNT_PATTERN.lastIndex = 0
  return amounts
}

function isTransactionLine(line: string): boolean {
  const hasDate = DATE_PATTERNS.some(p => p.test(line))
  const hasAmount = /\d{1,3}(?:,\d{2,3})*\.\d{2}/.test(line)
  return hasDate && hasAmount
}

function isHeaderOrFooter(line: string): boolean {
  const lower = line.toLowerCase()
  return (
    lower.includes('statement of account') ||
    lower.includes('page no') ||
    lower.includes('opening balance') ||
    lower.includes('closing balance') ||
    lower.includes('total') && lower.includes('balance') ||
    lower.includes('customer id') ||
    lower.includes('account number') ||
    lower.includes('ifsc') ||
    lower.includes('branch') && lower.includes('name') ||
    /^(date|txn date|transaction date|value date)\s/i.test(lower)
  )
}

export function parsePDFTransactions(pages: string[]): ParsedTransaction[] {
  const results: ParsedTransaction[] = []
  const allText = pages.join('\n')
  const lines = allText.split('\n').map(l => l.trim()).filter(Boolean)

  // Detect if this is a tabular statement
  const transactionLines: string[] = []
  let prevLine = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isHeaderOrFooter(line)) continue

    if (isTransactionLine(line)) {
      transactionLines.push(line)
      prevLine = line
    } else if (prevLine && !isTransactionLine(line) && line.length < 100) {
      // Continuation line — append to previous
      transactionLines[transactionLines.length - 1] += ' ' + line
    }
  }

  for (const line of transactionLines) {
    const date = extractDate(line)
    if (!date) continue

    const amounts = extractAmounts(line)
    if (amounts.length === 0) continue

    // Try to detect debit vs credit from position or keywords
    const lower = line.toLowerCase()
    const isCredit = lower.includes('cr') || lower.includes('credit') ||
      lower.includes('credited') || lower.includes('deposit') ||
      lower.includes('salary') || lower.includes('refund') ||
      lower.includes('cashback') || lower.includes('interest')

    // For bank statements with separate debit/credit columns,
    // typically the larger amount is the transaction and smaller is balance
    let amount: number
    let type: 'expense' | 'income'

    if (amounts.length >= 2) {
      // Most Indian bank PDFs: narration, debit, credit, balance
      // Take the first non-balance amount
      amount = amounts[0]
      // If two amounts and one looks like a balance (much larger), use the smaller
      if (amounts[1] > amounts[0] * 5 && amounts.length === 2) {
        amount = amounts[0]
      }
    } else {
      amount = amounts[0]
    }

    type = isCredit ? 'income' : 'expense'

    // Extract merchant/description — everything between date and first amount
    const dateMatch = line.match(DATE_PATTERNS[0]) || line.match(DATE_PATTERNS[1]) || line.match(DATE_PATTERNS[2])
    let description = line
    if (dateMatch) {
      const afterDate = line.slice((dateMatch.index || 0) + dateMatch[0].length).trim()
      // Remove amounts from end
      description = afterDate.replace(/(?:₹|INR|Rs\.?|USD|\$|€|£)?\s*\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?/g, '').trim()
      // Clean up extra spaces
      description = description.replace(/\s+/g, ' ').trim()
    }

    const merchant = extractMerchantFromDescription(description)
    if (!merchant || amount <= 0) continue

    results.push({
      date,
      merchant,
      amount,
      type,
      category: categorizeTransaction(description),
      description: description.slice(0, 200),
      paymentMethod: detectPaymentMethod(description),
    })
  }

  return results
}

function extractMerchantFromDescription(desc: string): string {
  let cleaned = desc
    .replace(/UPI[-\/]\d+[-\/]/gi, '')
    .replace(/NEFT[-\/][A-Z0-9]+[-\/]/gi, '')
    .replace(/IMPS[-\/][A-Z0-9]+[-\/]/gi, '')
    .replace(/\b\d{10,}\b/g, '')
    .replace(/\bRef\s*(?:No)?\.?\s*\d+/gi, '')
    .replace(/\bUTR\s*\d+/gi, '')
    .replace(/\bTxn\s*(?:ID)?\s*\d+/gi, '')
    .replace(/[\/\\|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Take first meaningful segment (up to 40 chars)
  const parts = cleaned.split(/\s{2,}/)
  cleaned = parts[0] || cleaned
  if (cleaned.length > 40) cleaned = cleaned.slice(0, 40).trim()

  return cleaned || desc.slice(0, 30)
}

export function groupTransactionsByMonth(transactions: ParsedTransaction[]): Map<string, ParsedTransaction[]> {
  const groups = new Map<string, ParsedTransaction[]>()
  transactions.forEach(tx => {
    const monthKey = tx.date.slice(0, 7) // yyyy-MM
    if (!groups.has(monthKey)) groups.set(monthKey, [])
    groups.get(monthKey)!.push(tx)
  })
  return new Map([...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])))
}

export function groupTransactionsByDate(transactions: ParsedTransaction[]): Map<string, ParsedTransaction[]> {
  const groups = new Map<string, ParsedTransaction[]>()
  transactions.forEach(tx => {
    const dateKey = tx.date
    if (!groups.has(dateKey)) groups.set(dateKey, [])
    groups.get(dateKey)!.push(tx)
  })
  return new Map([...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])))
}
