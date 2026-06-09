'use client'

import { create } from 'zustand'
import { Account } from '@/types'
import { accountRepo } from '@/database/repositories/account-repo'
import { DEFAULT_ACCOUNTS } from '@/config/constants'

interface AccountStore {
  accounts: Account[]
  isLoading: boolean
  load: () => Promise<void>
  add: (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Account>
  update: (id: string, data: Partial<Account>) => Promise<void>
  remove: (id: string) => Promise<void>
  getDefault: () => Account | undefined
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  accounts: [],
  isLoading: true,

  load: async () => {
    set({ isLoading: true })
    await accountRepo.initDefaults(DEFAULT_ACCOUNTS)
    const accounts = await accountRepo.getAll()
    set({ accounts, isLoading: false })
  },

  add: async (data) => {
    const account = await accountRepo.create(data)
    set(s => ({ accounts: [...s.accounts, account] }))
    return account
  },

  update: async (id, data) => {
    await accountRepo.update(id, data)
    set(s => ({
      accounts: s.accounts.map(a => a.id === id ? { ...a, ...data } : a),
    }))
  },

  remove: async (id) => {
    await accountRepo.delete(id)
    set(s => ({ accounts: s.accounts.filter(a => a.id !== id) }))
  },

  getDefault: () => get().accounts.find(a => a.isDefault) || get().accounts[0],
}))
