'use client'

import { useEffect, useRef } from 'react'
import { BottomNav } from './bottom-nav'
import { FAB } from './fab'
import { useTransactionStore } from '@/hooks/use-transaction-store'
import { useAccountStore } from '@/hooks/use-account-store'
import { useCategoryStore } from '@/hooks/use-category-store'
import { useSettingsStore } from '@/hooks/use-settings-store'
import { generateSeedTransactions } from '@/config/seed-data'
import { transactionRepo } from '@/database/repositories/transaction-repo'

export function AppShell({ children }: { children: React.ReactNode }) {
  const loadTransactions = useTransactionStore(s => s.load)
  const loadAccounts = useAccountStore(s => s.load)
  const loadCategories = useCategoryStore(s => s.load)
  const loadSettings = useSettingsStore(s => s.load)
  const seeded = useRef(false)

  useEffect(() => {
    const init = async () => {
      await loadSettings()
      await loadAccounts()
      await loadCategories()
      await loadTransactions()

      if (!seeded.current) {
        seeded.current = true
        const existing = useTransactionStore.getState().transactions
        if (existing.length === 0) {
          const accounts = useAccountStore.getState().accounts
          const defaultAccount = accounts.find(a => a.isDefault) || accounts[0]
          if (defaultAccount) {
            const seeds = generateSeedTransactions(defaultAccount.id)
            await transactionRepo.bulkCreate(seeds)
            await loadTransactions()
          }
        }
      }
    }
    init()
  }, [loadSettings, loadAccounts, loadCategories, loadTransactions])

  return (
    <div className="min-h-dvh bg-background pb-24">
      <main className="mx-auto max-w-lg">{children}</main>
      <FAB />
      <BottomNav />
    </div>
  )
}
