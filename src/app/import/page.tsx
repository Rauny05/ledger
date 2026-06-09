'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Upload, FileSpreadsheet, Check, X, AlertTriangle, ChevronDown } from 'lucide-react'
import { parseCSV, ParsedTransaction, detectDuplicates, categorizeTransaction } from '@/services/csv-parser'
import { useTransactionStore } from '@/hooks/use-transaction-store'
import { useCategoryStore } from '@/hooks/use-category-store'
import { useAccountStore } from '@/hooks/use-account-store'
import { useFormat } from '@/hooks/use-format'
import { toast } from 'sonner'

export default function ImportPage() {
  const router = useRouter()
  const addTransaction = useTransactionStore(s => s.add)
  const transactions = useTransactionStore(s => s.transactions)
  const loadTransactions = useTransactionStore(s => s.load)
  const categories = useCategoryStore(s => s.categories)
  const accounts = useAccountStore(s => s.accounts)
  const { formatAmount } = useFormat()

  const [parsed, setParsed] = useState<ParsedTransaction[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [duplicates, setDuplicates] = useState<Set<number>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const results = parseCSV(text)
      if (results.length === 0) {
        toast.error('Could not parse any transactions from this file')
        return
      }
      const dupes = detectDuplicates(
        results,
        transactions.map(t => ({ date: t.date, amount: t.amount, merchant: t.merchant }))
      )
      setDuplicates(dupes)
      setParsed(results)
      const initialSelected = new Set<number>()
      results.forEach((_, i) => { if (!dupes.has(i)) initialSelected.add(i) })
      setSelected(initialSelected)
      setStep('preview')
      toast.success(`Found ${results.length} transactions`)
    }
    reader.readAsText(file)
  }, [transactions])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const toggleSelect = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const updateCategory = (idx: number, category: string) => {
    setParsed(prev => prev.map((t, i) => i === idx ? { ...t, category } : t))
    setEditingIdx(null)
  }

  const handleImport = async () => {
    setIsImporting(true)
    const defaultAccount = accounts.find(a => a.isDefault) || accounts[0]
    if (!defaultAccount) {
      toast.error('No account found')
      setIsImporting(false)
      return
    }

    let imported = 0
    for (const idx of selected) {
      const tx = parsed[idx]
      await addTransaction({
        type: tx.type,
        amount: tx.amount,
        currency: 'INR',
        category: tx.category,
        merchant: tx.merchant,
        description: tx.description,
        date: tx.date,
        accountId: defaultAccount.id,
        paymentMethod: tx.paymentMethod,
        tags: [],
        attachments: [],
        isRecurring: false,
        isFavorite: false,
        referenceNumber: tx.referenceNumber,
      })
      imported++
    }

    await loadTransactions()
    setIsImporting(false)
    setStep('done')
    toast.success(`Imported ${imported} transactions`)
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="flex items-center justify-between p-4 pt-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm font-medium text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-base font-semibold">Import</h1>
        <div className="w-12" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-5 pt-4"
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border/50 bg-card'
              }`}
            >
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">Drop your bank statement</p>
              <p className="text-xs text-muted-foreground mb-4">CSV files supported</p>
              <label className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
                Choose File
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supported Formats</h3>
              <div className="space-y-2">
                {[
                  'HDFC Bank Statement (CSV)',
                  'ICICI Bank Statement (CSV)',
                  'SBI Bank Statement (CSV)',
                  'Axis Bank Statement (CSV)',
                  'Standard CSV (Date, Description, Debit, Credit)',
                  'Generic CSV with Amount column',
                ].map(fmt => (
                  <div key={fmt} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-emerald-400" />
                    {fmt}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-5 pt-2"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold">{parsed.length} transactions found</p>
                <p className="text-xs text-muted-foreground">
                  {selected.size} selected · {duplicates.size} duplicates
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(new Set(parsed.map((_, i) => i)))}
                  className="text-xs text-primary font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-muted-foreground font-medium"
                >
                  Deselect
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[55vh] overflow-y-auto hide-scrollbar">
              {parsed.map((tx, i) => {
                const isDupe = duplicates.has(i)
                const isSelected = selected.has(i)
                const cat = categories.find(c => c.name === tx.category)
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                      isDupe ? 'border-yellow-500/30 bg-yellow-500/5' :
                      isSelected ? 'border-primary/30 bg-primary/5' : 'border-border/30 bg-card'
                    }`}
                  >
                    <button
                      onClick={() => toggleSelect(i)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        isSelected ? 'bg-primary border-primary' : 'border-border'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{tx.merchant}</p>
                        {isDupe && <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <button
                          onClick={() => setEditingIdx(editingIdx === i ? null : i)}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                        >
                          {cat?.icon || '📁'} {tx.category}
                          <ChevronDown className="h-2.5 w-2.5" />
                        </button>
                        <span className="text-xs text-muted-foreground">· {tx.date}</span>
                      </div>
                      <AnimatePresence>
                        {editingIdx === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-2"
                          >
                            <div className="flex flex-wrap gap-1.5">
                              {categories
                                .filter(c => c.type === tx.type)
                                .map(c => (
                                  <button
                                    key={c.id}
                                    onClick={() => updateCategory(i, c.name)}
                                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                                      tx.category === c.name ? 'bg-primary/10 text-primary' : 'bg-secondary/50 text-muted-foreground'
                                    }`}
                                  >
                                    {c.icon} {c.name}
                                  </button>
                                ))
                              }
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <span className={`text-sm font-semibold shrink-0 ${tx.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {tx.type === 'expense' ? '-' : '+'}{formatAmount(tx.amount)}
                    </span>
                  </motion.div>
                )
              })}
            </div>

            <div className="mt-4 flex gap-3 pb-8">
              <button
                onClick={() => { setStep('upload'); setParsed([]) }}
                className="flex-1 rounded-2xl border border-border py-3.5 text-sm font-medium"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleImport}
                disabled={selected.size === 0 || isImporting}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {isImporting ? 'Importing...' : `Import ${selected.size}`}
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center px-5 pt-20"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 mb-6"
            >
              <Check className="h-10 w-10 text-emerald-500" />
            </motion.div>
            <h2 className="text-xl font-bold mb-2">Import Complete</h2>
            <p className="text-sm text-muted-foreground mb-8">
              {selected.size} transactions imported successfully
            </p>
            <button
              onClick={() => router.push('/transactions')}
              className="rounded-2xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground"
            >
              View Transactions
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
