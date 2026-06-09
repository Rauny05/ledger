'use client'

import { useMemo } from 'react'
import { useTransactionStore } from './use-transaction-store'
import { useSettingsStore } from './use-settings-store'
import { useCategoryStore } from './use-category-store'
import { DashboardStats } from '@/types'
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subDays, format, parseISO, isWithinInterval, subMonths
} from 'date-fns'

export function useDashboardStats(): DashboardStats & { isLoading: boolean } {
  const transactions = useTransactionStore(s => s.transactions)
  const isLoading = useTransactionStore(s => s.isLoading)
  const settings = useSettingsStore(s => s.settings)
  const categories = useCategoryStore(s => s.categories)

  return useMemo(() => {
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    const todayTxns = transactions.filter(t => {
      const d = parseISO(t.date)
      return isWithinInterval(d, { start: todayStart, end: todayEnd })
    })
    const weekTxns = transactions.filter(t => {
      const d = parseISO(t.date)
      return isWithinInterval(d, { start: weekStart, end: weekEnd })
    })
    const monthTxns = transactions.filter(t => {
      const d = parseISO(t.date)
      return isWithinInterval(d, { start: monthStart, end: monthEnd })
    })

    const sumExpenses = (txns: typeof transactions) =>
      txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const sumIncome = (txns: typeof transactions) =>
      txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

    const todaySpending = sumExpenses(todayTxns)
    const weekSpending = sumExpenses(weekTxns)
    const monthSpending = sumExpenses(monthTxns)
    const monthIncome = sumIncome(monthTxns)
    const monthBudget = settings.monthlyBudget
    const monthRemaining = monthBudget - monthSpending

    const expenses = monthTxns.filter(t => t.type === 'expense')
    const largestExpense = expenses.length > 0
      ? expenses.reduce((a, b) => a.amount > b.amount ? a : b)
      : null

    const categoryTotals = new Map<string, number>()
    expenses.forEach(t => {
      categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + t.amount)
    })
    const topCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cat, amount]) => {
        const c = categories.find(c => c.name === cat)
        return { category: cat, amount, color: c?.color || '#6366F1' }
      })

    const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
      const day = subDays(now, 6 - i)
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayTxns = transactions.filter(t => t.date.startsWith(dayStr) && t.type === 'expense')
      return { day: format(day, 'EEE'), amount: dayTxns.reduce((s, t) => s + t.amount, 0) }
    })

    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i)
      const ms = startOfMonth(m)
      const me = endOfMonth(m)
      const mTxns = transactions.filter(t => {
        const d = parseISO(t.date)
        return isWithinInterval(d, { start: ms, end: me })
      })
      return {
        month: format(m, 'MMM'),
        income: sumIncome(mTxns),
        expense: sumExpenses(mTxns),
      }
    })

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    return {
      isLoading,
      todaySpending,
      weekSpending,
      monthSpending,
      monthIncome,
      monthBudget,
      monthRemaining,
      savings: totalIncome - totalExpense,
      netBalance: totalIncome - totalExpense,
      largestExpense,
      topCategories,
      weeklyTrend,
      monthlyTrend,
    }
  }, [transactions, isLoading, settings.monthlyBudget, categories])
}
