'use client'

import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { useFormat } from '@/hooks/use-format'
import { StatCard } from '@/features/dashboard/stat-card'
import { SpendingChart } from '@/features/dashboard/spending-chart'
import { CategoryBreakdown } from '@/features/dashboard/category-breakdown'
import { RecentTransactions } from '@/features/dashboard/recent-transactions'
import { BudgetRing } from '@/features/dashboard/budget-ring'
import { TrendingDown, TrendingUp, PiggyBank, Calendar as CalendarIcon, Upload, Target, CalendarDays } from 'lucide-react'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import Link from 'next/link'

export default function DashboardPage() {
  const stats = useDashboardStats()
  const { formatAmount } = useFormat()

  if (stats.isLoading) {
    return (
      <div className="p-5 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-2"
      >
        <h1 className="text-2xl font-bold tracking-tight">Ledger</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, dd MMMM')}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Today"
          value={formatAmount(stats.todaySpending)}
          icon={CalendarIcon}
          color="#6366F1"
          delay={0}
        />
        <StatCard
          title="This Week"
          value={formatAmount(stats.weekSpending)}
          icon={TrendingDown}
          color="#EF4444"
          delay={0.05}
        />
        <StatCard
          title="Income"
          value={formatAmount(stats.monthIncome)}
          icon={TrendingUp}
          color="#10B981"
          delay={0.1}
        />
        <StatCard
          title="Savings"
          value={formatAmount(stats.savings)}
          icon={PiggyBank}
          color="#F59E0B"
          delay={0.15}
        />
      </div>

      <BudgetRing
        spent={stats.monthSpending}
        budget={stats.monthBudget}
        formatAmount={formatAmount}
      />

      <SpendingChart data={stats.weeklyTrend} formatAmount={formatAmount} />

      <CategoryBreakdown data={stats.topCategories} formatAmount={formatAmount} />

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex gap-2 overflow-x-auto hide-scrollbar pb-1"
      >
        {[
          { href: '/calendar', icon: CalendarDays, label: 'Calendar', color: '#6366F1' },
          { href: '/budgets', icon: Target, label: 'Budgets', color: '#F59E0B' },
          { href: '/import', icon: Upload, label: 'Import CSV', color: '#10B981' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-xl bg-card border border-border/50 px-4 py-2.5 text-xs font-medium whitespace-nowrap hover:border-border transition-colors"
          >
            <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
            {item.label}
          </Link>
        ))}
      </motion.div>

      <RecentTransactions />

      <div className="h-4" />
    </div>
  )
}
