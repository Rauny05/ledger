'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactionStore } from '@/hooks/use-transaction-store'
import { useCategoryStore } from '@/hooks/use-category-store'
import { useFormat } from '@/hooks/use-format'
import { ChevronLeft, ChevronRight, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isSameDay, addMonths, subMonths, parseISO, isToday, isSameMonth
} from 'date-fns'

export default function CalendarPage() {
  const transactions = useTransactionStore(s => s.transactions)
  const categories = useCategoryStore(s => s.categories)
  const { formatAmount } = useFormat()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const dayTotals = useMemo(() => {
    const map = new Map<string, { expense: number; income: number }>()
    transactions.forEach(t => {
      const key = t.date.slice(0, 10)
      const existing = map.get(key) || { expense: 0, income: 0 }
      if (t.type === 'expense') existing.expense += t.amount
      else if (t.type === 'income') existing.income += t.amount
      map.set(key, existing)
    })
    return map
  }, [transactions])

  const selectedTransactions = useMemo(() => {
    if (!selectedDate) return []
    const key = format(selectedDate, 'yyyy-MM-dd')
    return transactions.filter(t => t.date.startsWith(key))
  }, [selectedDate, transactions])

  const maxDayExpense = useMemo(() => {
    let max = 1
    dayTotals.forEach(v => { if (v.expense > max) max = v.expense })
    return max
  }, [dayTotals])

  const startOffset = getDay(startOfMonth(currentMonth))
  const adjustedOffset = startOffset === 0 ? 6 : startOffset - 1

  return (
    <div className="p-5">
      <div className="pt-2 mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">Daily spending overview</p>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-xl hover:bg-secondary/50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-xl hover:bg-secondary/50 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: adjustedOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const totals = dayTotals.get(key)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isCurrentDay = isToday(day)
          const intensity = totals ? Math.min(totals.expense / maxDayExpense, 1) : 0

          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedDate(day)}
              className={`relative flex flex-col items-center justify-center rounded-xl p-1.5 min-h-[44px] transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : isCurrentDay
                  ? 'ring-1 ring-primary/50'
                  : ''
              }`}
            >
              {totals && !isSelected && (
                <div
                  className="absolute inset-1 rounded-lg"
                  style={{
                    backgroundColor: `rgba(239, 68, 68, ${intensity * 0.15})`,
                  }}
                />
              )}
              <span className={`relative text-xs font-medium ${
                isSelected ? '' : isCurrentDay ? 'text-primary' : ''
              }`}>
                {format(day, 'd')}
              </span>
              {totals && totals.expense > 0 && (
                <span className={`relative text-[8px] font-medium mt-0.5 ${
                  isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                }`}>
                  {totals.expense >= 1000 ? `${(totals.expense / 1000).toFixed(0)}k` : totals.expense}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Selected Day Detail */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={format(selectedDate, 'yyyy-MM-dd')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">
                {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, dd MMM')}
              </h3>
              {selectedTransactions.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedTransactions.length} transactions
                </span>
              )}
            </div>

            {selectedTransactions.length === 0 ? (
              <div className="rounded-2xl bg-card border border-border/50 p-8 text-center">
                <p className="text-sm text-muted-foreground">No transactions this day</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {selectedTransactions.map(tx => {
                  const cat = categories.find(c => c.name === tx.category)
                  const isExpense = tx.type === 'expense'
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border/30"
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-base"
                        style={{ backgroundColor: `${cat?.color || '#6366F1'}15` }}
                      >
                        {cat?.icon || '💸'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.merchant}</p>
                        <p className="text-xs text-muted-foreground">{tx.category}</p>
                      </div>
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
                    </div>
                  )
                })}
                <div className="flex justify-between px-2 pt-2 text-xs">
                  <span className="text-muted-foreground">Day Total</span>
                  <span className="font-semibold">
                    {formatAmount(selectedTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-4" />
    </div>
  )
}
