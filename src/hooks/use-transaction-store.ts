'use client'

import { create } from 'zustand'
import { Transaction, TransactionType, PaymentMethod, Currency } from '@/types'
import { transactionRepo } from '@/database/repositories/transaction-repo'

interface TransactionStore {
  transactions: Transaction[]
  isLoading: boolean
  selectedIds: Set<string>
  recentlyDeleted: Transaction | null

  load: () => Promise<void>
  add: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>
  update: (id: string, data: Partial<Transaction>) => Promise<void>
  remove: (id: string) => Promise<void>
  undoDelete: () => Promise<void>
  bulkDelete: (ids: string[]) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  toggleSelect: (id: string) => void
  clearSelection: () => void
  search: (query: string) => Promise<Transaction[]>
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],
  isLoading: true,
  selectedIds: new Set(),
  recentlyDeleted: null,

  load: async () => {
    set({ isLoading: true })
    const transactions = await transactionRepo.getAll()
    set({ transactions, isLoading: false })
  },

  add: async (data) => {
    const transaction = await transactionRepo.create(data)
    set(s => ({ transactions: [transaction, ...s.transactions] }))
    return transaction
  },

  update: async (id, data) => {
    const updated = await transactionRepo.update(id, data)
    if (!updated) return
    set(s => ({
      transactions: s.transactions.map(t => t.id === id ? updated : t),
    }))
  },

  remove: async (id) => {
    const tx = get().transactions.find(t => t.id === id)
    if (tx) set({ recentlyDeleted: tx })
    await transactionRepo.delete(id)
    set(s => ({ transactions: s.transactions.filter(t => t.id !== id) }))
  },

  undoDelete: async () => {
    const { recentlyDeleted } = get()
    if (!recentlyDeleted) return
    await transactionRepo.create(recentlyDeleted)
    set(s => ({
      transactions: [recentlyDeleted, ...s.transactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      recentlyDeleted: null,
    }))
  },

  bulkDelete: async (ids) => {
    await transactionRepo.bulkDelete(ids)
    set(s => ({
      transactions: s.transactions.filter(t => !ids.includes(t.id)),
      selectedIds: new Set(),
    }))
  },

  toggleFavorite: async (id) => {
    const tx = get().transactions.find(t => t.id === id)
    if (!tx) return
    await transactionRepo.update(id, { isFavorite: !tx.isFavorite })
    set(s => ({
      transactions: s.transactions.map(t =>
        t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
      ),
    }))
  },

  toggleSelect: (id) => {
    set(s => {
      const next = new Set(s.selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selectedIds: next }
    })
  },

  clearSelection: () => set({ selectedIds: new Set() }),

  search: async (query) => {
    return transactionRepo.search(query)
  },
}))
