'use client'

import { motion } from 'framer-motion'
import { useAccountStore } from '@/hooks/use-account-store'
import { useTransactionStore } from '@/hooks/use-transaction-store'
import { useFormat } from '@/hooks/use-format'
import { Plus, Wallet } from 'lucide-react'

export default function AccountsPage() {
  const accounts = useAccountStore(s => s.accounts)
  const transactions = useTransactionStore(s => s.transactions)
  const { formatAmount } = useFormat()

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)

  const getAccountStats = (accountId: string) => {
    const txns = transactions.filter(t => t.accountId === accountId)
    const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, txnCount: txns.length }
  }

  return (
    <div className="p-5 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
        <p className="text-sm text-muted-foreground">{accounts.length} accounts</p>
      </div>

      {/* Net Balance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 border border-primary/20"
      >
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Net Balance</span>
        </div>
        <p className="text-3xl font-bold">{formatAmount(totalBalance)}</p>
        <p className="text-xs text-muted-foreground mt-1">across {accounts.length} accounts</p>
      </motion.div>

      {/* Account Cards */}
      <div className="space-y-3">
        {accounts.map((account, i) => {
          const stats = getAccountStats(account.id)
          return (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-card p-4 border border-border/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: `${account.color}20` }}
                >
                  {account.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{account.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {account.type.replace('_', ' ')}
                  </p>
                </div>
                <p className="text-lg font-bold">{formatAmount(account.balance)}</p>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{stats.txnCount} transactions</span>
                <span className="text-emerald-400">+{formatAmount(stats.income)}</span>
                <span className="text-red-400">-{formatAmount(stats.expense)}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="h-4" />
    </div>
  )
}
