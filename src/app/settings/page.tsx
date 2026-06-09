'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSettingsStore } from '@/hooks/use-settings-store'
import { useTransactionStore } from '@/hooks/use-transaction-store'
import { Currency } from '@/types'
import {
  Palette, Globe, DollarSign, Shield, Download, Upload,
  Moon, Sun, Smartphone, ChevronRight, Trash2
} from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const settings = useSettingsStore(s => s.settings)
  const updateSettings = useSettingsStore(s => s.update)
  const transactions = useTransactionStore(s => s.transactions)

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    updateSettings({ theme })
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    toast.success(`Theme set to ${theme}`)
  }

  const handleExport = () => {
    const data = JSON.stringify({ transactions, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Data exported')
  }

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Merchant', 'Category', 'Amount', 'Payment Method', 'Tags', 'Notes']
    const rows = transactions.map(t => [
      t.date, t.type, t.merchant, t.category, t.amount.toString(),
      t.paymentMethod, t.tags.join('; '), t.notes || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const currencies: { value: Currency; label: string; symbol: string }[] = [
    { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
    { value: 'USD', label: 'US Dollar', symbol: '$' },
    { value: 'EUR', label: 'Euro', symbol: '€' },
    { value: 'GBP', label: 'British Pound', symbol: '£' },
  ]

  return (
    <div className="p-5 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Personalize Ledger</p>
      </div>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-card p-4 border border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Appearance</h3>
        <div className="flex gap-2">
          {[
            { value: 'dark' as const, icon: Moon, label: 'Dark' },
            { value: 'light' as const, icon: Sun, label: 'Light' },
            { value: 'system' as const, icon: Smartphone, label: 'System' },
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => handleThemeChange(value)}
              className={`flex-1 flex flex-col items-center gap-2 rounded-xl py-3 text-xs font-medium transition-colors ${
                settings.theme === value
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'bg-secondary/50 text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Currency */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-card p-4 border border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Currency</h3>
        <div className="grid grid-cols-2 gap-2">
          {currencies.map(c => (
            <button
              key={c.value}
              onClick={() => updateSettings({ currency: c.value })}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                settings.currency === c.value
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'bg-secondary/50 text-muted-foreground'
              }`}
            >
              <span className="text-base font-semibold">{c.symbol}</span>
              <span className="text-xs">{c.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Budget */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-card p-4 border border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Monthly Budget</h3>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-muted-foreground">
            {currencies.find(c => c.value === settings.currency)?.symbol || '₹'}
          </span>
          <input
            type="number"
            value={settings.monthlyBudget}
            onChange={e => updateSettings({ monthlyBudget: parseFloat(e.target.value) || 0 })}
            className="flex-1 bg-transparent text-lg font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </motion.div>

      {/* Data */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="rounded-2xl bg-card border border-border/50 overflow-hidden">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-4 mb-2">Data</h3>
        <button onClick={handleExport} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
          <Download className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1 text-left">Export JSON</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button onClick={handleExportCSV} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
          <Download className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1 text-left">Export CSV</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </motion.div>

      {/* Info */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          Ledger v1.0 · Made with care
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {transactions.length} transactions stored locally
        </p>
      </motion.div>

      <div className="h-4" />
    </div>
  )
}
