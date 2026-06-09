import { Transaction } from '@/types'
import { localAdapter } from '../adapters/local-adapter'
import { v4 as uuid } from 'uuid'

const STORE = 'transactions' as const

export const transactionRepo = {
  async getAll(): Promise<Transaction[]> {
    const txns = await localAdapter.getAll<Transaction>(STORE)
    return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  },

  async getById(id: string): Promise<Transaction | undefined> {
    return localAdapter.getById<Transaction>(STORE, id)
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    return localAdapter.getTransactionsByDateRange(startDate, endDate)
  },

  async getByCategory(category: string): Promise<Transaction[]> {
    return localAdapter.getByIndex<Transaction>(STORE, 'category', category)
  },

  async getByAccount(accountId: string): Promise<Transaction[]> {
    return localAdapter.getByIndex<Transaction>(STORE, 'accountId', accountId)
  },

  async create(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const now = new Date().toISOString()
    const transaction: Transaction = {
      ...data,
      id: uuid(),
      createdAt: now,
      updatedAt: now,
    }
    await localAdapter.put(STORE, transaction)
    return transaction
  },

  async update(id: string, data: Partial<Transaction>): Promise<Transaction | undefined> {
    const existing = await localAdapter.getById<Transaction>(STORE, id)
    if (!existing) return undefined
    const updated: Transaction = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    }
    await localAdapter.put(STORE, updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    return localAdapter.delete(STORE, id)
  },

  async bulkDelete(ids: string[]): Promise<void> {
    return localAdapter.bulkDelete(STORE, ids)
  },

  async bulkCreate(items: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Transaction[]> {
    const now = new Date().toISOString()
    const transactions = items.map(item => ({
      ...item,
      id: uuid(),
      createdAt: now,
      updatedAt: now,
    }))
    await localAdapter.bulkPut(STORE, transactions)
    return transactions
  },

  async search(query: string): Promise<Transaction[]> {
    const all = await this.getAll()
    const q = query.toLowerCase()
    return all.filter(t =>
      t.merchant.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q)) ||
      t.description?.toLowerCase().includes(q)
    )
  },
}
