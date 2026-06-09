'use client'

import { motion } from 'framer-motion'

interface CategoryBreakdownProps {
  data: { category: string; amount: number; color: string }[]
  formatAmount: (n: number) => string
}

export function CategoryBreakdown({ data, formatAmount }: CategoryBreakdownProps) {
  const total = data.reduce((s, d) => s + d.amount, 0) || 1

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-card p-5 shadow-sm border border-border/50"
      >
        <h3 className="text-sm font-semibold mb-3">Top Categories</h3>
        <p className="text-sm text-muted-foreground text-center py-6">
          No expenses this month yet
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl bg-card p-5 shadow-sm border border-border/50"
    >
      <h3 className="text-sm font-semibold mb-4">Top Categories</h3>
      <div className="space-y-3">
        {data.map((item, i) => {
          const pct = (item.amount / total) * 100
          return (
            <motion.div
              key={item.category}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.05 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{item.category}</span>
                <span className="text-xs text-muted-foreground">{formatAmount(item.amount)}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
