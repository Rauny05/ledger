import { Transaction, TransactionType, PaymentMethod } from '@/types'
import { format, subDays } from 'date-fns'
import { v4 as uuid } from 'uuid'

interface SeedEntry {
  merchant: string
  category: string
  amount: number
  type: TransactionType
  paymentMethod: PaymentMethod
  tags?: string[]
  notes?: string
}

const expenses: SeedEntry[] = [
  { merchant: 'Starbucks', category: 'Food & Dining', amount: 380, type: 'expense', paymentMethod: 'upi', tags: ['coffee'], notes: 'Morning latte' },
  { merchant: 'Uber', category: 'Transport', amount: 245, type: 'expense', paymentMethod: 'upi', tags: ['commute'] },
  { merchant: 'Amazon', category: 'Shopping', amount: 2499, type: 'expense', paymentMethod: 'credit_card', tags: ['electronics'] },
  { merchant: 'Swiggy', category: 'Food & Dining', amount: 560, type: 'expense', paymentMethod: 'upi', tags: ['delivery'], notes: 'Dinner order' },
  { merchant: 'Netflix', category: 'Subscriptions', amount: 649, type: 'expense', paymentMethod: 'credit_card', tags: ['streaming'] },
  { merchant: 'Reliance Fresh', category: 'Food & Dining', amount: 1280, type: 'expense', paymentMethod: 'upi', tags: ['groceries'] },
  { merchant: 'Ola', category: 'Transport', amount: 189, type: 'expense', paymentMethod: 'upi' },
  { merchant: 'Zara', category: 'Shopping', amount: 3990, type: 'expense', paymentMethod: 'credit_card', tags: ['clothing'] },
  { merchant: 'PVR Cinemas', category: 'Entertainment', amount: 750, type: 'expense', paymentMethod: 'upi', tags: ['movies'] },
  { merchant: 'Electricity Bill', category: 'Bills & Utilities', amount: 2100, type: 'expense', paymentMethod: 'net_banking' },
  { merchant: 'Apollo Pharmacy', category: 'Health', amount: 450, type: 'expense', paymentMethod: 'upi', tags: ['medicine'] },
  { merchant: 'Spotify', category: 'Subscriptions', amount: 119, type: 'expense', paymentMethod: 'credit_card', tags: ['music'] },
  { merchant: 'Jio Recharge', category: 'Bills & Utilities', amount: 399, type: 'expense', paymentMethod: 'upi' },
  { merchant: 'Cult.fit', category: 'Health', amount: 1500, type: 'expense', paymentMethod: 'upi', tags: ['gym'] },
  { merchant: 'Flipkart', category: 'Shopping', amount: 1799, type: 'expense', paymentMethod: 'credit_card', tags: ['home'] },
  { merchant: 'Zomato', category: 'Food & Dining', amount: 420, type: 'expense', paymentMethod: 'upi', tags: ['delivery'] },
  { merchant: 'Chaayos', category: 'Food & Dining', amount: 210, type: 'expense', paymentMethod: 'cash', tags: ['coffee'] },
  { merchant: 'Metro Card', category: 'Transport', amount: 500, type: 'expense', paymentMethod: 'upi', tags: ['metro'] },
  { merchant: 'YouTube Premium', category: 'Subscriptions', amount: 149, type: 'expense', paymentMethod: 'credit_card' },
  { merchant: 'BookMyShow', category: 'Entertainment', amount: 600, type: 'expense', paymentMethod: 'upi', tags: ['events'] },
  { merchant: 'Myntra', category: 'Shopping', amount: 2200, type: 'expense', paymentMethod: 'credit_card', tags: ['clothing'] },
  { merchant: 'Water Bill', category: 'Bills & Utilities', amount: 350, type: 'expense', paymentMethod: 'net_banking' },
  { merchant: 'Udemy', category: 'Education', amount: 499, type: 'expense', paymentMethod: 'credit_card', tags: ['courses'] },
  { merchant: 'Society Maintenance', category: 'Rent', amount: 4500, type: 'expense', paymentMethod: 'net_banking' },
  { merchant: 'Petrol', category: 'Transport', amount: 2000, type: 'expense', paymentMethod: 'debit_card', tags: ['fuel'] },
  { merchant: 'Dunzo', category: 'Food & Dining', amount: 180, type: 'expense', paymentMethod: 'upi' },
  { merchant: 'Decathlon', category: 'Shopping', amount: 1450, type: 'expense', paymentMethod: 'credit_card', tags: ['sports'] },
  { merchant: 'iCloud+', category: 'Subscriptions', amount: 75, type: 'expense', paymentMethod: 'credit_card' },
  { merchant: 'BigBasket', category: 'Food & Dining', amount: 2100, type: 'expense', paymentMethod: 'upi', tags: ['groceries'] },
  { merchant: 'Rapido', category: 'Transport', amount: 120, type: 'expense', paymentMethod: 'upi' },
]

const incomes: SeedEntry[] = [
  { merchant: 'Salary — Acme Corp', category: 'Salary', amount: 85000, type: 'income', paymentMethod: 'net_banking', tags: ['salary'] },
  { merchant: 'Freelance — Logo Design', category: 'Freelance', amount: 15000, type: 'income', paymentMethod: 'upi', tags: ['freelance'] },
  { merchant: 'Cashback — CRED', category: 'Other Income', amount: 350, type: 'income', paymentMethod: 'upi', tags: ['cashback'] },
  { merchant: 'Dividend — HDFC', category: 'Other Income', amount: 1200, type: 'income', paymentMethod: 'net_banking', tags: ['investment'] },
  { merchant: 'Freelance — Website', category: 'Freelance', amount: 25000, type: 'income', paymentMethod: 'net_banking', tags: ['freelance'] },
]

export function generateSeedTransactions(accountId: string): Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[] {
  const now = new Date()
  const all: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[] = []

  expenses.forEach((entry, i) => {
    const daysAgo = Math.floor(i * 1.2)
    all.push({
      type: entry.type,
      amount: entry.amount,
      currency: 'INR',
      category: entry.category,
      merchant: entry.merchant,
      date: format(subDays(now, daysAgo), 'yyyy-MM-dd'),
      accountId,
      paymentMethod: entry.paymentMethod,
      tags: entry.tags || [],
      notes: entry.notes,
      attachments: [],
      isRecurring: false,
      isFavorite: i < 3,
    })
  })

  incomes.forEach((entry, i) => {
    const daysAgo = i * 8
    all.push({
      type: entry.type,
      amount: entry.amount,
      currency: 'INR',
      category: entry.category,
      merchant: entry.merchant,
      date: format(subDays(now, daysAgo), 'yyyy-MM-dd'),
      accountId,
      paymentMethod: entry.paymentMethod,
      tags: entry.tags || [],
      notes: entry.notes,
      attachments: [],
      isRecurring: false,
      isFavorite: false,
    })
  })

  return all
}
