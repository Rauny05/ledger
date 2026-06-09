'use client'

import { motion } from 'framer-motion'

interface BudgetRingProps {
  spent: number
  budget: number
  formatAmount: (n: number) => string
}

export function BudgetRing({ spent, budget, formatAmount }: BudgetRingProps) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const isOverBudget = spent > budget
  const radius = 58
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  const strokeColor = isOverBudget ? '#EF4444' : pct > 75 ? '#F59E0B' : 'var(--color-primary)'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
      className="rounded-2xl bg-card p-5 shadow-sm border border-border/50"
    >
      <h3 className="text-sm font-semibold mb-4">Monthly Budget</h3>
      <div className="flex items-center justify-center">
        <div className="relative h-36 w-36">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
            <circle
              cx="64" cy="64" r={radius}
              fill="none"
              stroke="var(--color-secondary)"
              strokeWidth="10"
            />
            <motion.circle
              cx="64" cy="64" r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ delay: 0.3, duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground">Spent</span>
            <span className="text-lg font-bold">{formatAmount(spent)}</span>
            <span className="text-xs text-muted-foreground">of {formatAmount(budget)}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-between text-xs">
        <div>
          <span className="text-muted-foreground">Remaining</span>
          <p className={`font-semibold ${isOverBudget ? 'text-red-400' : 'text-emerald-400'}`}>
            {isOverBudget ? '-' : ''}{formatAmount(Math.abs(budget - spent))}
          </p>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">Daily target</span>
          <p className="font-semibold">
            {formatAmount(Math.max(0, (budget - spent)) / Math.max(1, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()))}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
