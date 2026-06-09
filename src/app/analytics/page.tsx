'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTransactionStore } from '@/hooks/use-transaction-store'
import { useCategoryStore } from '@/hooks/use-category-store'
import { useFormat } from '@/hooks/use-format'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts'
import {
  startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval, format
} from 'date-fns'

export default function AnalyticsPage() {
  const transactions = useTransactionStore(s => s.transactions)
  const categories = useCategoryStore(s => s.categories)
  const { formatAmount } = useFormat()
  const [period, setPeriod] = useState<'month' | '3months' | 'year'>('month')

  const stats = useMemo(() => {
    const now = new Date()
    let startDate: Date
    if (period === 'month') startDate = startOfMonth(now)
    else if (period === '3months') startDate = startOfMonth(subMonths(now, 2))
    else startDate = startOfMonth(subMonths(now, 11))

    const endDate = endOfMonth(now)
    const filtered = transactions.filter(t => {
      const d = parseISO(t.date)
      return isWithinInterval(d, { start: startDate, end: endDate })
    })

    const expenses = filtered.filter(t => t.type === 'expense')
    const income = filtered.filter(t => t.type === 'income')
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
    const totalIncome = income.reduce((s, t) => s + t.amount, 0)

    const catMap = new Map<string, number>()
    expenses.forEach(t => catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount))
    const categoryData = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => {
        const c = categories.find(c => c.name === name)
        return { name, value, color: c?.color || '#6366F1', icon: c?.icon || '💸' }
      })

    const merchantMap = new Map<string, number>()
    expenses.forEach(t => merchantMap.set(t.merchant, (merchantMap.get(t.merchant) || 0) + t.amount))
    const topMerchants = Array.from(merchantMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }))

    const months = period === 'month' ? 1 : period === '3months' ? 3 : 12
    const monthlyData = Array.from({ length: months }, (_, i) => {
      const m = subMonths(now, months - 1 - i)
      const ms = startOfMonth(m)
      const me = endOfMonth(m)
      const mTxns = transactions.filter(t => {
        const d = parseISO(t.date)
        return isWithinInterval(d, { start: ms, end: me })
      })
      return {
        month: format(m, 'MMM'),
        income: mTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: mTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      }
    })

    const avgDaily = totalExpense / Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000))
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0

    return { totalExpense, totalIncome, categoryData, topMerchants, monthlyData, avgDaily, savingsRate }
  }, [transactions, categories, period])

  return (
    <div className="p-5 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Spending insights</p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {([['month', 'This Month'], ['3months', '3 Months'], ['year', 'Year']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setPeriod(val)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              period === val ? 'bg-primary/10 text-primary' : 'bg-secondary/50 text-muted-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-card p-4 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground">Expenses</p>
          <p className="text-base font-bold text-red-400 mt-1">{formatAmount(stats.totalExpense)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-card p-4 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground">Income</p>
          <p className="text-base font-bold text-emerald-400 mt-1">{formatAmount(stats.totalIncome)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-card p-4 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground">Savings</p>
          <p className="text-base font-bold mt-1">{stats.savingsRate.toFixed(0)}%</p>
        </motion.div>
      </div>

      {/* Income vs Expense Chart */}
      {stats.monthlyData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card p-5 border border-border/50">
          <h3 className="text-sm font-semibold mb-4">Income vs Expenses</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyData} barCategoryGap="20%">
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <YAxis hide />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    background: 'var(--color-popover)', border: '1px solid var(--color-border)',
                    borderRadius: '12px', fontSize: '12px',
                  }}
                  formatter={(value) => [formatAmount(Number(value))]}
                />
                <Bar dataKey="income" radius={[4, 4, 0, 0]} fill="#10B981" fillOpacity={0.8} />
                <Bar dataKey="expense" radius={[4, 4, 0, 0]} fill="#EF4444" fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Category Breakdown */}
      {stats.categoryData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-card p-5 border border-border/50">
          <h3 className="text-sm font-semibold mb-4">By Category</h3>
          <div className="flex items-center gap-4">
            <div className="h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%" cy="50%"
                    innerRadius={35} outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.categoryData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {stats.categoryData.slice(0, 5).map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs flex-1 truncate">{d.name}</span>
                  <span className="text-xs font-medium text-muted-foreground">{formatAmount(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Top Merchants */}
      {stats.topMerchants.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl bg-card p-5 border border-border/50">
          <h3 className="text-sm font-semibold mb-4">Top Merchants</h3>
          <div className="space-y-3">
            {stats.topMerchants.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                  <span className="text-sm">{m.name}</span>
                </div>
                <span className="text-sm font-semibold">{formatAmount(m.amount)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Average Daily */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl bg-card p-5 border border-border/50">
        <h3 className="text-sm font-semibold mb-1">Average Daily Spend</h3>
        <p className="text-2xl font-bold">{formatAmount(stats.avgDaily)}</p>
        <p className="text-xs text-muted-foreground mt-1">per day average</p>
      </motion.div>

      <div className="h-4" />
    </div>
  )
}
