import { Account } from '@/types'
import { localAdapter } from '../adapters/local-adapter'
import { v4 as uuid } from 'uuid'

const STORE = 'accounts' as const

export const accountRepo = {
  async getAll(): Promise<Account[]> {
    return localAdapter.getAll<Account>(STORE)
  },

  async getById(id: string): Promise<Account | undefined> {
    return localAdapter.getById<Account>(STORE, id)
  },

  async create(data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const now = new Date().toISOString()
    const account: Account = { ...data, id: uuid(), createdAt: now, updatedAt: now }
    await localAdapter.put(STORE, account)
    return account
  },

  async update(id: string, data: Partial<Account>): Promise<Account | undefined> {
    const existing = await localAdapter.getById<Account>(STORE, id)
    if (!existing) return undefined
    const updated: Account = { ...existing, ...data, id, updatedAt: new Date().toISOString() }
    await localAdapter.put(STORE, updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    return localAdapter.delete(STORE, id)
  },

  async updateBalance(id: string, delta: number): Promise<void> {
    const account = await localAdapter.getById<Account>(STORE, id)
    if (!account) return
    await localAdapter.put(STORE, {
      ...account,
      balance: account.balance + delta,
      updatedAt: new Date().toISOString(),
    })
  },

  async initDefaults(defaults: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const existing = await this.getAll()
    if (existing.length > 0) return
    const now = new Date().toISOString()
    const accounts = defaults.map(d => ({ ...d, id: uuid(), createdAt: now, updatedAt: now }))
    await localAdapter.bulkPut(STORE, accounts)
  },
}
