import { Category } from '@/types'
import { localAdapter } from '../adapters/local-adapter'
import { v4 as uuid } from 'uuid'

const STORE = 'categories' as const

export const categoryRepo = {
  async getAll(): Promise<Category[]> {
    return localAdapter.getAll<Category>(STORE)
  },

  async getById(id: string): Promise<Category | undefined> {
    return localAdapter.getById<Category>(STORE, id)
  },

  async create(data: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    const category: Category = { ...data, id: uuid(), createdAt: new Date().toISOString() }
    await localAdapter.put(STORE, category)
    return category
  },

  async update(id: string, data: Partial<Category>): Promise<void> {
    const existing = await localAdapter.getById<Category>(STORE, id)
    if (!existing) return
    await localAdapter.put(STORE, { ...existing, ...data, id })
  },

  async delete(id: string): Promise<void> {
    return localAdapter.delete(STORE, id)
  },

  async initDefaults(defaults: Omit<Category, 'id' | 'createdAt'>[]): Promise<void> {
    const existing = await this.getAll()
    if (existing.length > 0) return
    const now = new Date().toISOString()
    const categories = defaults.map(d => ({ ...d, id: uuid(), createdAt: now }))
    await localAdapter.bulkPut(STORE, categories)
  },
}
