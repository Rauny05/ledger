'use client'

import { useEffect } from 'react'
import { BottomNav } from './bottom-nav'
import { FAB } from './fab'
import { useTransactionStore } from '@/hooks/use-transaction-store'
import { useAccountStore } from '@/hooks/use-account-store'
import { useCategoryStore } from '@/hooks/use-category-store'
import { useSettingsStore } from '@/hooks/use-settings-store'

export function AppShell({ children }: { children: React.ReactNode }) {
  const loadTransactions = useTransactionStore(s => s.load)
  const loadAccounts = useAccountStore(s => s.load)
  const loadCategories = useCategoryStore(s => s.load)
  const loadSettings = useSettingsStore(s => s.load)

  useEffect(() => {
    loadSettings()
    loadAccounts()
    loadCategories()
    loadTransactions()
  }, [loadSettings, loadAccounts, loadCategories, loadTransactions])

  return (
    <div className="min-h-dvh bg-background pb-24">
      <main className="mx-auto max-w-lg">{children}</main>
      <FAB />
      <BottomNav />
    </div>
  )
}
