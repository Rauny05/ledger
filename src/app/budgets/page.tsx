'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTransactionStore } from '@/hooks/use-transaction-store'
import { useCategoryStore } from '@/hooks/use-category-store'
import { useSettingsStore } from '@/hooks/use-settings-store'
import { useFormat } from '@/hooks/use-format'
import { ArrowLeft, Plus, AlertTriangle, TrendingDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns'

interface CategoryBudget {
  categoryName: string
  icon: string
  color: string
  budget: number
  spent: number
}

export default function BudgetsPage() {
  const router = useRouter()
  const transactions = useTransactionStore(s => s.transactions)
  const categories = useCategoryStore(s => s.categories)
  const settings = useSettingsStore(s => s.settings)
  const updateSettings = useSettingsStore(s => s.update)
  const { formatAmount } = useFormat()

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const monthExpenses = useMemo(() => {
    return transactions.filter(t => {
      const d = parseISO(t.date)
      return t.type === 'expense' && isWithinInterval(d, { start: monthStart, end: monthEnd })
    })
  }, [transactions, monthStart, monthEnd])

  const totalSpent = monthExpenses.reduce((s, t) => s + t.amount, 0)
  const overallPct = settings.monthlyBudget > 0 ? (totalSpent / settings.monthlyBudget) * 100 : 0
  const daysInMonth = monthEnd.getDate()
  const dayOfMonth = now.getDate()
  const idealPct = (dayOfMonth / daysInMonth) * 100

  const categoryBudgets: CategoryBudget[] = useMemo(() => {
    const expenseCategories = categories.filter(c => c.type === 'expense')
    return expenseCategories.map(cat => {
      const spent = monthExpenses
        .filter(t => t.category === cat.name)
        .reduce((s, t) => s + t.amount, 0)
      const budget = cat.budget || Math.round(settings.monthlyBudget / expenseCategories.length)
      return {
        categoryName: cat.name,
        icon: cat.icon,
        color: cat.color,
        budget,
        spent,
      }
    }).filter(b => b.spent > 0).sort((a, b) => b.spent - a.spent)
  }, [categories, monthExpenses, settings.monthlyBudget])

  return (
    <div className="p-5">
      <div className="flex items-center gap-3 pt-2 mb-4">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground">Monthly spending limits</p>
        </div>
      </div>

      {/* Overall Budget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card p-5 border border-border/50 mb-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Monthly Budget</h3>
          {overallPct > idealPct && (
            <div className="flex items-center gap-1 text-xs text-yellow-500">
              <AlertTriangle className="h-3 w-3" />
              Ahead of pace
            </div>
          )}
        </div>

        <div className="flex items-end gap-4 mb-4">
          <div>
            <span className="text-3xl font-bold">{formatAmount(totalSpent)}</span>
            <span className="text-sm text-muted-foreground ml-1">
              / {formatAmount(settings.monthlyBudget)}
            </span>
          </div>
        </div>

        <div className="h-3 rounded-full bg-secondary overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(overallPct, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              backgroundColor: overallPct > 100 ? '#EF4444' : overallPct > 75 ? '#F59E0B' : 'var(--color-primary)',
            }}
          />
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Day {dayOfMonth} of {daysInMonth}</span>
          <span>{formatAmount(Math.max(0, settings.monthlyBudget - totalSpent))} remaining</span>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Daily Target</p>
            <p className="text-sm font-semibold">
              {formatAmount(Math.max(0, settings.monthlyBudget - totalSpent) / Math.max(1, daysInMonth - dayOfMonth))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Avg/Day</p>
            <p className="text-sm font-semibold">
              {formatAmount(totalSpent / Math.max(1, dayOfMonth))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Forecast</p>
            <p className={`text-sm font-semibold ${
              (totalSpent / dayOfMonth) * daysInMonth > settings.monthlyBudget ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {formatAmount((totalSpent / Math.max(1, dayOfMonth)) * daysInMonth)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Category Budgets */}
      <h3 className="text-sm font-semibold mb-3">By Category</h3>
      <div className="space-y-2">
        {categoryBudgets.map((cb, i) => {
          const pct = cb.budget > 0 ? (cb.spent / cb.budget) * 100 : 0
          const isOver = pct > 100
          return (
            <motion.div
              key={cb.categoryName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl bg-card p-3 border border-border/30"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                  style={{ backgroundColor: `${cb.color}20` }}
                >
                  {cb.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{cb.categoryName}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${isOver ? 'text-red-400' : ''}`}>
                    {formatAmount(cb.spent)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    / {formatAmount(cb.budget)}
                  </p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(pct, 100)}%` }}
                  transition={{ delay: 0.2 + i * 0.03, duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: isOver ? '#EF4444' : cb.color }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>

      {categoryBudgets.length === 0 && (
        <div className="rounded-2xl bg-card border border-border/50 p-8 text-center">
          <TrendingDown className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No expenses this month</p>
          <p className="text-xs text-muted-foreground mt-1">Add transactions to see budget progress</p>
        </div>
      )}

      <div className="h-4" />
    </div>
  )
}
