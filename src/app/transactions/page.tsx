'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactionStore } from '@/hooks/use-transaction-store'
import { useCategoryStore } from '@/hooks/use-category-store'
import { useFormat } from '@/hooks/use-format'
import { Search, ArrowUpRight, ArrowDownRight, Trash2, Star } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { Transaction } from '@/types'

export default function TransactionsPage() {
  const transactions = useTransactionStore(s => s.transactions)
  const remove = useTransactionStore(s => s.remove)
  const undoDelete = useTransactionStore(s => s.undoDelete)
  const toggleFavorite = useTransactionStore(s => s.toggleFavorite)
  const isLoading = useTransactionStore(s => s.isLoading)
  const categories = useCategoryStore(s => s.categories)
  const { formatAmount, formatDate } = useFormat()

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all')

  const filtered = useMemo(() => {
    let txns = transactions
    if (filter !== 'all') txns = txns.filter(t => t.type === filter)
    if (query) {
      const q = query.toLowerCase()
      txns = txns.filter(t =>
        t.merchant.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      )
    }
    return txns
  }, [transactions, filter, query])

  const grouped = useMemo(() => {
    const groups = new Map<string, Transaction[]>()
    filtered.forEach(t => {
      const key = t.date.slice(0, 10)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(t)
    })
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const handleDelete = async (id: string) => {
    await remove(id)
    toast('Transaction deleted', {
      action: {
        label: 'Undo',
        onClick: () => undoDelete(),
      },
    })
  }

  return (
    <div className="p-5">
      <div className="pt-2 mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground">{transactions.length} total</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search transactions..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full rounded-xl border border-border/50 bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'expense', 'income'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-primary/10 text-primary'
                : 'bg-secondary/50 text-muted-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-sm font-medium">No transactions found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {query ? 'Try a different search' : 'Add your first transaction'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([dateKey, txns]) => (
            <div key={dateKey}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  {formatDate(dateKey)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatAmount(txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              <div className="space-y-1">
                <AnimatePresence>
                  {txns.map((tx, i) => {
                    const cat = categories.find(c => c.name === tx.category)
                    const isExpense = tx.type === 'expense'
                    return (
                      <motion.div
                        key={tx.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ delay: i * 0.02 }}
                        className="group flex items-center gap-3 rounded-xl bg-card p-3 border border-border/30 hover:border-border/60 transition-colors"
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                          style={{ backgroundColor: `${cat?.color || '#6366F1'}15` }}
                        >
                          {cat?.icon || '💸'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{tx.merchant}</p>
                            {tx.isFavorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {tx.category}
                            {tx.tags.length > 0 && ` · ${tx.tags.join(', ')}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="flex items-center gap-0.5">
                              {isExpense ? (
                                <ArrowDownRight className="h-3 w-3 text-red-400" />
                              ) : (
                                <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                              )}
                              <span className={`text-sm font-semibold ${isExpense ? 'text-red-400' : 'text-emerald-400'}`}>
                                {formatAmount(tx.amount)}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground capitalize">
                              {tx.paymentMethod.replace('_', ' ')}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
