export type TransactionType = 'expense' | 'income' | 'transfer'
export type PaymentMethod = 'cash' | 'upi' | 'credit_card' | 'debit_card' | 'net_banking' | 'wallet' | 'cheque' | 'other'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
export type AccountType = 'cash' | 'savings' | 'current' | 'credit_card' | 'upi' | 'wallet' | 'investment' | 'crypto'
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  currency: Currency
  category: string
  subcategory?: string
  merchant: string
  description?: string
  date: string // ISO date
  time?: string
  accountId: string
  paymentMethod: PaymentMethod
  tags: string[]
  notes?: string
  attachments: string[]
  location?: { lat: number; lng: number; name?: string }
  isRecurring: boolean
  recurrence?: {
    frequency: RecurrenceFrequency
    endDate?: string
  }
  isFavorite: boolean
  transferToAccountId?: string
  splitWith?: SplitEntry[]
  referenceNumber?: string
  createdAt: string
  updatedAt: string
}

export interface SplitEntry {
  name: string
  amount: number
  settled: boolean
}

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  currency: Currency
  color: string
  icon: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: TransactionType
  subcategories: string[]
  budget?: number
  createdAt: string
}

export interface Budget {
  id: string
  name: string
  amount: number
  spent: number
  categoryId?: string
  period: 'monthly' | 'weekly' | 'yearly'
  startDate: string
  endDate?: string
  createdAt: string
}

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  icon: string
  color: string
  deadline?: string
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface UserSettings {
  currency: Currency
  locale: string
  theme: 'light' | 'dark' | 'system'
  accentColor: string
  dateFormat: string
  monthlyBudget: number
  dataSource: 'local' | 'supabase'
  pinEnabled: boolean
  biometricEnabled: boolean
}

export interface DashboardStats {
  todaySpending: number
  weekSpending: number
  monthSpending: number
  monthIncome: number
  monthBudget: number
  monthRemaining: number
  savings: number
  netBalance: number
  largestExpense: Transaction | null
  topCategories: { category: string; amount: number; color: string }[]
  weeklyTrend: { day: string; amount: number }[]
  monthlyTrend: { month: string; income: number; expense: number }[]
}
