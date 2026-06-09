'use client'

import { motion } from 'framer-motion'
import { useTransactionStore } from '@/hooks/use-transaction-store'
import { useCategoryStore } from '@/hooks/use-category-store'
import { useFormat } from '@/hooks/use-format'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import Link from 'next/link'

export function RecentTransactions() {
  const transactions = useTransactionStore(s => s.transactions)
  const categories = useCategoryStore(s => s.categories)
  const { formatAmount, formatDate } = useFormat()

  const recent = transactions.slice(0, 5)

  if (recent.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-card p-5 shadow-sm border border-border/50"
      >
        <h3 className="text-sm font-semibold mb-3">Recent Transactions</h3>
        <div className="flex flex-col items-center py-8 text-center">
          <div className="text-4xl mb-3">💰</div>
          <p className="text-sm font-medium">No transactions yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tap the + button to add your first expense
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-2xl bg-card p-5 shadow-sm border border-border/50"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Recent Transactions</h3>
        <Link href="/transactions" className="text-xs text-primary font-medium">
          View All
        </Link>
      </div>
      <div className="space-y-1">
        {recent.map((tx, i) => {
          const cat = categories.find(c => c.name === tx.category)
          const isExpense = tx.type === 'expense'
          return (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + i * 0.05 }}
              className="flex items-center gap-3 rounded-xl p-2.5 -mx-1 hover:bg-secondary/50 transition-colors"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                style={{ backgroundColor: `${cat?.color || '#6366F1'}15` }}
              >
                {cat?.icon || '💸'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tx.merchant}</p>
                <p className="text-xs text-muted-foreground">
                  {tx.category} · {formatDate(tx.date)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {isExpense ? (
                  <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                )}
                <span className={`text-sm font-semibold ${isExpense ? 'text-red-400' : 'text-emerald-400'}`}>
                  {formatAmount(tx.amount)}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
