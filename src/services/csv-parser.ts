import { TransactionType, PaymentMethod } from '@/types'

export interface ParsedTransaction {
  date: string
  merchant: string
  amount: number
  type: TransactionType
  category: string
  description?: string
  referenceNumber?: string
  paymentMethod: PaymentMethod
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': ['swiggy', 'zomato', 'starbucks', 'dominos', 'mcdonald', 'kfc', 'pizza', 'restaurant', 'cafe', 'coffee', 'food', 'grocery', 'bigbasket', 'blinkit', 'dunzo', 'chaayos', 'haldiram', 'fresh'],
  'Transport': ['uber', 'ola', 'rapido', 'metro', 'petrol', 'fuel', 'parking', 'toll', 'cab', 'auto', 'bus', 'train', 'irctc'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'decathlon', 'zara', 'h&m', 'ikea', 'croma', 'reliance digital'],
  'Entertainment': ['netflix', 'pvr', 'inox', 'bookmyshow', 'hotstar', 'prime video', 'movie', 'concert', 'event'],
  'Subscriptions': ['spotify', 'youtube', 'icloud', 'adobe', 'notion', 'figma', 'chatgpt', 'apple', 'google one'],
  'Bills & Utilities': ['electricity', 'water', 'gas', 'internet', 'broadband', 'jio', 'airtel', 'vi ', 'bsnl', 'recharge', 'dth', 'tata play'],
  'Health': ['pharmacy', 'apollo', 'medplus', 'hospital', 'doctor', 'medical', 'gym', 'cult.fit', 'insurance'],
  'Education': ['udemy', 'coursera', 'college', 'school', 'tuition', 'book', 'library'],
  'Rent': ['rent', 'society', 'maintenance', 'housing'],
  'Travel': ['makemytrip', 'goibibo', 'hotel', 'flight', 'airbnb', 'booking.com', 'cleartrip'],
  'Investments': ['mutual fund', 'sip', 'zerodha', 'groww', 'upstox', 'stock', 'crypto', 'fd ', 'ppf'],
}

export function categorizeTransaction(description: string): string {
  const lower = description.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category
  }
  return 'Shopping'
}

export function detectPaymentMethod(description: string): PaymentMethod {
  const lower = description.toLowerCase()
  if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe') || lower.includes('paytm')) return 'upi'
  if (lower.includes('neft') || lower.includes('rtgs') || lower.includes('imps') || lower.includes('net banking')) return 'net_banking'
  if (lower.includes('credit') || lower.includes('cc ')) return 'credit_card'
  if (lower.includes('debit') || lower.includes('dc ') || lower.includes('atm')) return 'debit_card'
  if (lower.includes('wallet') || lower.includes('paytm wallet')) return 'wallet'
  if (lower.includes('cash') || lower.includes('atm')) return 'cash'
  return 'other'
}

export function parseCSV(csvText: string): ParsedTransaction[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))

  const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('txn') || h === 'value date')
  const descIdx = headers.findIndex(h => h.includes('description') || h.includes('narration') || h.includes('particular') || h.includes('detail') || h.includes('merchant'))
  const debitIdx = headers.findIndex(h => h.includes('debit') || h.includes('withdrawal') || h.includes('dr'))
  const creditIdx = headers.findIndex(h => h.includes('credit') || h.includes('deposit') || h.includes('cr'))
  const amountIdx = headers.findIndex(h => h === 'amount' || h === 'transaction amount')
  const refIdx = headers.findIndex(h => h.includes('ref') || h.includes('chq') || h.includes('utr'))

  if (dateIdx === -1 || (descIdx === -1 && amountIdx === -1)) return []

  const results: ParsedTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i])
    if (row.length < 2) continue

    const dateStr = row[dateIdx]?.trim()
    const description = (descIdx >= 0 ? row[descIdx] : '')?.trim()
    const ref = refIdx >= 0 ? row[refIdx]?.trim() : undefined

    let amount = 0
    let type: TransactionType = 'expense'

    if (debitIdx >= 0 && creditIdx >= 0) {
      const debit = parseAmount(row[debitIdx])
      const credit = parseAmount(row[creditIdx])
      if (debit > 0) { amount = debit; type = 'expense' }
      else if (credit > 0) { amount = credit; type = 'income' }
      else continue
    } else if (amountIdx >= 0) {
      amount = parseAmount(row[amountIdx])
      if (amount < 0) { amount = Math.abs(amount); type = 'expense' }
      else if (amount > 0) { type = 'income' }
      else continue
    } else continue

    const date = parseDate(dateStr)
    if (!date) continue

    const merchant = extractMerchant(description)

    results.push({
      date,
      merchant,
      amount,
      type,
      category: categorizeTransaction(description),
      description,
      referenceNumber: ref || undefined,
      paymentMethod: detectPaymentMethod(description),
    })
  }

  return results
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseAmount(str: string): number {
  if (!str) return 0
  const cleaned = str.replace(/[₹$€£,\s"]/g, '').trim()
  if (!cleaned || cleaned === '-' || cleaned === '') return 0
  return parseFloat(cleaned) || 0
}

function parseDate(str: string): string | null {
  if (!str) return null
  const cleaned = str.replace(/['"]/g, '').trim()

  // dd/MM/yyyy or dd-MM-yyyy
  let match = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (match) {
    const [, d, m, y] = match
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // yyyy-MM-dd
  match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) return cleaned

  // MM/dd/yyyy
  match = cleaned.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{4})$/)
  if (match) {
    const [, m, d, y] = match
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // dd Mon yyyy
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  }
  match = cleaned.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/i)
  if (match) {
    const [, d, m, y] = match
    const month = months[m.toLowerCase()]
    if (month) return `${y}-${month}-${d.padStart(2, '0')}`
  }

  return null
}

function extractMerchant(description: string): string {
  const cleaned = description
    .replace(/UPI\/[A-Z0-9]+\//gi, '')
    .replace(/NEFT\/[A-Z0-9]+\//gi, '')
    .replace(/IMPS\/[A-Z0-9]+\//gi, '')
    .replace(/\d{10,}/g, '')
    .replace(/[\/\\]/g, ' ')
    .trim()

  const parts = cleaned.split(/\s+/).slice(0, 4)
  const merchant = parts.join(' ').replace(/\s+/g, ' ').trim()
  return merchant || description.slice(0, 30)
}

export function detectDuplicates(
  incoming: ParsedTransaction[],
  existing: { date: string; amount: number; merchant: string }[]
): Set<number> {
  const dupeIndices = new Set<number>()
  incoming.forEach((tx, i) => {
    const isDupe = existing.some(e =>
      e.date === tx.date &&
      Math.abs(e.amount - tx.amount) < 0.01 &&
      e.merchant.toLowerCase() === tx.merchant.toLowerCase()
    )
    if (isDupe) dupeIndices.add(i)
  })
  return dupeIndices
}
