import { openDB, IDBPDatabase } from 'idb'
import { Transaction, Account, Category, Budget, SavingsGoal, Tag, UserSettings } from '@/types'

const DB_NAME = 'ledger-db'
const DB_VERSION = 1

type StoreName = 'transactions' | 'accounts' | 'categories' | 'budgets' | 'goals' | 'tags' | 'settings'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' })
          txStore.createIndex('date', 'date')
          txStore.createIndex('category', 'category')
          txStore.createIndex('accountId', 'accountId')
          txStore.createIndex('type', 'type')
        }
        if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('budgets')) {
          db.createObjectStore('budgets', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('goals')) {
          db.createObjectStore('goals', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('tags')) {
          db.createObjectStore('tags', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export const localAdapter = {
  async getAll<T>(store: StoreName): Promise<T[]> {
    const db = await getDB()
    return db.getAll(store) as Promise<T[]>
  },

  async getById<T>(store: StoreName, id: string): Promise<T | undefined> {
    const db = await getDB()
    return db.get(store, id) as Promise<T | undefined>
  },

  async put<T>(store: StoreName, item: T): Promise<void> {
    const db = await getDB()
    await db.put(store, item as unknown as object)
  },

  async delete(store: StoreName, id: string): Promise<void> {
    const db = await getDB()
    await db.delete(store, id)
  },

  async clear(store: StoreName): Promise<void> {
    const db = await getDB()
    await db.clear(store)
  },

  async getByIndex<T>(store: StoreName, indexName: string, value: string): Promise<T[]> {
    const db = await getDB()
    return db.getAllFromIndex(store, indexName, value) as Promise<T[]>
  },

  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    const db = await getDB()
    const range = IDBKeyRange.bound(startDate, endDate)
    return db.getAllFromIndex('transactions', 'date', range) as Promise<Transaction[]>
  },

  async getSettings(): Promise<UserSettings | undefined> {
    const db = await getDB()
    return db.get('settings', 'user-settings') as Promise<UserSettings | undefined>
  },

  async saveSettings(settings: UserSettings): Promise<void> {
    const db = await getDB()
    await db.put('settings', { ...settings, id: 'user-settings' })
  },

  async bulkPut<T>(store: StoreName, items: T[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction(store, 'readwrite')
    await Promise.all([
      ...items.map(item => tx.store.put(item as unknown as object)),
      tx.done,
    ])
  },

  async bulkDelete(store: StoreName, ids: string[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction(store, 'readwrite')
    await Promise.all([
      ...ids.map(id => tx.store.delete(id)),
      tx.done,
    ])
  },
}
