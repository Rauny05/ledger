import { Category, Account, UserSettings } from '@/types'

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt'>[] = [
  { name: 'Food & Dining', icon: '🍕', color: '#FF6B6B', type: 'expense', subcategories: ['Restaurants', 'Groceries', 'Coffee', 'Delivery', 'Snacks'], budget: undefined },
  { name: 'Transport', icon: '🚗', color: '#4ECDC4', type: 'expense', subcategories: ['Uber', 'Fuel', 'Metro', 'Bus', 'Auto', 'Parking'], budget: undefined },
  { name: 'Shopping', icon: '🛍️', color: '#45B7D1', type: 'expense', subcategories: ['Clothing', 'Electronics', 'Home', 'Books', 'Gifts'], budget: undefined },
  { name: 'Entertainment', icon: '🎬', color: '#96CEB4', type: 'expense', subcategories: ['Movies', 'Games', 'Events', 'Streaming', 'Sports'], budget: undefined },
  { name: 'Bills & Utilities', icon: '💡', color: '#FFEAA7', type: 'expense', subcategories: ['Electricity', 'Water', 'Internet', 'Phone', 'Gas'], budget: undefined },
  { name: 'Health', icon: '🏥', color: '#DDA0DD', type: 'expense', subcategories: ['Medicine', 'Doctor', 'Insurance', 'Gym', 'Wellness'], budget: undefined },
  { name: 'Education', icon: '📚', color: '#98D8C8', type: 'expense', subcategories: ['Courses', 'Books', 'Tuition', 'Supplies'], budget: undefined },
  { name: 'Subscriptions', icon: '🔄', color: '#F7DC6F', type: 'expense', subcategories: ['Netflix', 'Spotify', 'YouTube', 'Apps', 'Cloud'], budget: undefined },
  { name: 'Travel', icon: '✈️', color: '#BB8FCE', type: 'expense', subcategories: ['Flights', 'Hotels', 'Activities', 'Insurance'], budget: undefined },
  { name: 'Personal', icon: '💇', color: '#F1948A', type: 'expense', subcategories: ['Grooming', 'Laundry', 'Accessories'], budget: undefined },
  { name: 'Rent', icon: '🏠', color: '#85C1E9', type: 'expense', subcategories: ['Rent', 'Maintenance', 'Society'], budget: undefined },
  { name: 'Investments', icon: '📈', color: '#82E0AA', type: 'expense', subcategories: ['Stocks', 'Mutual Funds', 'Crypto', 'FD', 'PPF'], budget: undefined },
  { name: 'Salary', icon: '💰', color: '#58D68D', type: 'income', subcategories: ['Base', 'Bonus', 'Commission'], budget: undefined },
  { name: 'Freelance', icon: '💻', color: '#5DADE2', type: 'income', subcategories: ['Projects', 'Consulting', 'Retainers'], budget: undefined },
  { name: 'Other Income', icon: '🎁', color: '#F0B27A', type: 'income', subcategories: ['Gifts', 'Refunds', 'Cashback', 'Interest', 'Dividends'], budget: undefined },
]

export const DEFAULT_ACCOUNTS: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Cash', type: 'cash', balance: 0, currency: 'INR', color: '#58D68D', icon: '💵', isDefault: true },
  { name: 'Bank Account', type: 'savings', balance: 0, currency: 'INR', color: '#5DADE2', icon: '🏦', isDefault: false },
  { name: 'Credit Card', type: 'credit_card', balance: 0, currency: 'INR', color: '#F1948A', icon: '💳', isDefault: false },
]

export const DEFAULT_SETTINGS: UserSettings = {
  currency: 'INR',
  locale: 'en-IN',
  theme: 'dark',
  accentColor: '#6366F1',
  dateFormat: 'dd MMM yyyy',
  monthlyBudget: 50000,
  dataSource: 'local',
  pinEnabled: false,
  biometricEnabled: false,
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
}
