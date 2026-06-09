'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactionStore } from '@/hooks/use-transaction-store'
import { useFormat } from '@/hooks/use-format'
import {
  Home, Receipt, BarChart3, Wallet, Settings, Plus, Calendar,
  Upload, Target, Search, Moon, Sun, ArrowDownRight, ArrowUpRight
} from 'lucide-react'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const transactions = useTransactionStore(s => s.transactions)
  const { formatAmount, formatDate } = useFormat()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const navigate = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-[15%] z-[101] w-[90vw] max-w-lg -translate-x-1/2"
          >
            <Command className="rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border/50 px-4">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Command.Input
                  placeholder="Search transactions, navigate..."
                  className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                <kbd className="hidden sm:flex h-5 items-center rounded border border-border/50 bg-secondary px-1.5 text-[10px] text-muted-foreground">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-[50vh] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                  No results found
                </Command.Empty>

                <Command.Group heading="Navigation">
                  {[
                    { icon: Home, label: 'Dashboard', path: '/' },
                    { icon: Receipt, label: 'Transactions', path: '/transactions' },
                    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
                    { icon: Wallet, label: 'Accounts', path: '/accounts' },
                    { icon: Calendar, label: 'Calendar', path: '/calendar' },
                    { icon: Target, label: 'Budgets', path: '/budgets' },
                    { icon: Upload, label: 'Import CSV', path: '/import' },
                    { icon: Settings, label: 'Settings', path: '/settings' },
                  ].map(item => (
                    <Command.Item
                      key={item.path}
                      onSelect={() => navigate(item.path)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm cursor-pointer data-[selected=true]:bg-secondary/80 transition-colors"
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Actions">
                  <Command.Item
                    onSelect={() => navigate('/add')}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm cursor-pointer data-[selected=true]:bg-secondary/80 transition-colors"
                  >
                    <Plus className="h-4 w-4 text-primary" />
                    <span>Add Transaction</span>
                  </Command.Item>
                </Command.Group>

                {recentTransactions.length > 0 && (
                  <Command.Group heading="Recent Transactions">
                    {recentTransactions.map(tx => (
                      <Command.Item
                        key={tx.id}
                        value={`${tx.merchant} ${tx.category} ${tx.amount}`}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm cursor-pointer data-[selected=true]:bg-secondary/80 transition-colors"
                      >
                        <div className="flex items-center gap-0.5">
                          {tx.type === 'expense' ? (
                            <ArrowDownRight className="h-3 w-3 text-red-400" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                          )}
                        </div>
                        <span className="flex-1 truncate">{tx.merchant}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                        <span className={`text-xs font-medium ${tx.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                          {formatAmount(tx.amount)}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              <div className="border-t border-border/50 px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Close</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
