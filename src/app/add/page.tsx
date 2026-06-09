'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactionStore } from '@/hooks/use-transaction-store'
import { useCategoryStore } from '@/hooks/use-category-store'
import { useAccountStore } from '@/hooks/use-account-store'
import { useSettingsStore } from '@/hooks/use-settings-store'
import { useFormat } from '@/hooks/use-format'
import { TransactionType, PaymentMethod, Currency } from '@/types'
import { ArrowLeft, Check, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'upi', label: 'UPI', icon: '📱' },
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'credit_card', label: 'Credit Card', icon: '💳' },
  { value: 'debit_card', label: 'Debit Card', icon: '🏧' },
  { value: 'net_banking', label: 'Net Banking', icon: '🏦' },
  { value: 'wallet', label: 'Wallet', icon: '👛' },
]

export default function AddTransactionPage() {
  const router = useRouter()
  const add = useTransactionStore(s => s.add)
  const categories = useCategoryStore(s => s.categories)
  const accounts = useAccountStore(s => s.accounts)
  const settings = useSettingsStore(s => s.settings)
  const { symbol } = useFormat()

  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [merchant, setMerchant] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState(accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [showCategories, setShowCategories] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const filteredCategories = categories.filter(c => c.type === type)
  const selectedCategory = categories.find(c => c.id === categoryId)

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (!merchant.trim()) {
      toast.error('Enter a merchant name')
      return
    }
    if (!categoryId) {
      toast.error('Select a category')
      return
    }

    setIsSaving(true)
    try {
      await add({
        type,
        amount: parseFloat(amount),
        currency: settings.currency,
        category: selectedCategory?.name || '',
        merchant: merchant.trim(),
        date,
        accountId: accountId || accounts[0]?.id || '',
        paymentMethod,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        notes: notes.trim() || undefined,
        attachments: [],
        isRecurring: false,
        isFavorite: false,
      })
      toast.success('Transaction added')
      router.back()
    } catch {
      toast.error('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="flex items-center justify-between p-4 pt-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm font-medium text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-base font-semibold">Add Transaction</h1>
        <div className="w-12" />
      </div>

      {/* Type Toggle */}
      <div className="px-5 mb-4">
        <div className="flex gap-1 rounded-xl bg-secondary p-1">
          {(['expense', 'income'] as TransactionType[]).map(t => (
            <button
              key={t}
              onClick={() => { setType(t); setCategoryId('') }}
              className={`relative flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors ${
                type === t ? '' : 'text-muted-foreground'
              }`}
            >
              {type === t && (
                <motion.div
                  layoutId="type-pill"
                  className="absolute inset-0 rounded-lg bg-card shadow-sm"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">{t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount Input */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-center gap-1 py-6">
          <span className="text-3xl font-light text-muted-foreground">{symbol}</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full bg-transparent text-center text-5xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            autoFocus
          />
        </div>
      </div>

      {/* Merchant */}
      <div className="px-5 space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Merchant</label>
          <input
            type="text"
            placeholder="e.g. Starbucks, Amazon, Uber"
            value={merchant}
            onChange={e => setMerchant(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="w-full flex items-center justify-between rounded-xl border border-border/50 bg-card px-4 py-3 text-sm"
          >
            {selectedCategory ? (
              <span className="flex items-center gap-2">
                <span>{selectedCategory.icon}</span>
                <span>{selectedCategory.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Select category</span>
            )}
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCategories ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showCategories && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {filteredCategories.map(cat => (
                    <motion.button
                      key={cat.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setCategoryId(cat.id); setShowCategories(false) }}
                      className={`flex flex-col items-center gap-1 rounded-xl p-3 text-xs transition-colors ${
                        categoryId === cat.id
                          ? 'bg-primary/10 ring-1 ring-primary/30'
                          : 'bg-secondary/50 hover:bg-secondary'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="font-medium truncate w-full text-center">{cat.name}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Date */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          />
        </div>

        {/* Payment Method */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment Method</label>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {PAYMENT_METHODS.map(pm => (
              <button
                key={pm.value}
                onClick={() => setPaymentMethod(pm.value)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  paymentMethod === pm.value
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                    : 'bg-secondary/50 text-muted-foreground'
                }`}
              >
                <span>{pm.icon}</span>
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Account */}
        {accounts.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Account</label>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => setAccountId(acc.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                    accountId === acc.id
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'bg-secondary/50 text-muted-foreground'
                  }`}
                >
                  <span>{acc.icon}</span>
                  {acc.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes</label>
          <textarea
            placeholder="Add a note..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-border/50 bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-shadow resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tags (comma separated)</label>
          <input
            type="text"
            placeholder="e.g. business, travel, tax"
            value={tags}
            onChange={e => setTags(e.target.value)}
            className="w-full rounded-xl border border-border/50 bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="p-5 mt-4 mb-8">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Transaction'}
        </motion.button>
      </div>
    </div>
  )
}
