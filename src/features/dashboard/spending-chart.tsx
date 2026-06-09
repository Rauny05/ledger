'use client'

import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface SpendingChartProps {
  data: { day: string; amount: number }[]
  formatAmount: (n: number) => string
}

export function SpendingChart({ data, formatAmount }: SpendingChartProps) {
  const maxAmount = Math.max(...data.map(d => d.amount), 1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl bg-card p-5 shadow-sm border border-border/50"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">This Week</h3>
        <span className="text-xs text-muted-foreground">
          {formatAmount(data.reduce((s, d) => s + d.amount, 0))} total
        </span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="25%">
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            />
            <YAxis hide domain={[0, maxAmount * 1.2]} />
            <Tooltip
              cursor={false}
              contentStyle={{
                background: 'var(--color-popover)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              formatter={(value) => [formatAmount(Number(value)), 'Spent']}
            />
            <Bar
              dataKey="amount"
              radius={[6, 6, 0, 0]}
              fill="var(--color-primary)"
              fillOpacity={0.85}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
