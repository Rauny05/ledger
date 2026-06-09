'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Upload, FileSpreadsheet, FileText, Check, AlertTriangle, ChevronDown, Loader2, Calendar, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { parseCSV, ParsedTransaction, detectDuplicates } from '@/services/csv-parser'
import { extractTextFromPDF, parsePDFTransactions, groupTransactionsByMonth, groupTransactionsByDate } from '@/services/pdf-parser'
import { parseXLS } from '@/services/xls-parser'
import { useTransactionStore } from '@/hooks/use-transaction-store'
import { useCategoryStore } from '@/hooks/use-category-store'
import { useAccountStore } from '@/hooks/use-account-store'
import { useFormat } from '@/hooks/use-format'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'

type ViewMode = 'flat' | 'by-date' | 'by-month'

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
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [fileType, setFileType] = useState<'csv' | 'pdf' | 'xls' | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('by-date')
  const [pdfPageCount, setPdfPageCount] = useState(0)

  const finalizeParsed = useCallback((results: ParsedTransaction[]) => {
    if (results.length === 0) {
      toast.error('Could not parse any transactions from this file')
      setIsParsing(false)
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
    setIsParsing(false)
    toast.success(`Found ${results.length} transactions`)
  }, [transactions])

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop()

    if (ext === 'pdf') {
      setFileType('pdf')
      setIsParsing(true)
      try {
        const pages = await extractTextFromPDF(file)
        setPdfPageCount(pages.length)
        const results = parsePDFTransactions(pages)
        finalizeParsed(results)
      } catch (err) {
        console.error('PDF parse error:', err)
        const msg = err instanceof Error ? err.message : 'Unknown error'
        toast.error(`PDF parse failed: ${msg}`, { duration: 6000 })
        setIsParsing(false)
      }
    } else if (ext === 'xls' || ext === 'xlsx') {
      setFileType('xls')
      setIsParsing(true)
      try {
        const results = await parseXLS(file)
        if (results.length === 0) {
          toast.error('No transactions found. Check that your Excel file has Date, Description, and Amount columns.', { duration: 6000 })
          setIsParsing(false)
        } else {
          finalizeParsed(results)
        }
      } catch (err) {
        console.error('XLS parse error:', err)
        const msg = err instanceof Error ? err.message : 'Unknown error'
        toast.error(`Excel parse failed: ${msg}`, { duration: 6000 })
        setIsParsing(false)
      }
    } else {
      setFileType('csv')
      setIsParsing(true)
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const results = parseCSV(text)
        finalizeParsed(results)
      }
      reader.readAsText(file)
    }
  }, [finalizeParsed])

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

  const groupedByDate = useMemo(() => {
    if (viewMode !== 'by-date') return null
    return groupTransactionsByDate(parsed)
  }, [parsed, viewMode])

  const groupedByMonth = useMemo(() => {
    if (viewMode !== 'by-month') return null
    return groupTransactionsByMonth(parsed)
  }, [parsed, viewMode])

  const monthSummaries = useMemo(() => {
    if (!groupedByMonth) return null
    const summaries = new Map<string, { expense: number; income: number; count: number }>()
    groupedByMonth.forEach((txns, month) => {
      const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      summaries.set(month, { expense, income, count: txns.length })
    })
    return summaries
  }, [groupedByMonth])

  const totalExpense = useMemo(() =>
    parsed.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [parsed])
  const totalIncome = useMemo(() =>
    parsed.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [parsed])

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

  const renderTransaction = (tx: ParsedTransaction, i: number) => {
    const isDupe = duplicates.has(i)
    const isSelected = selected.has(i)
    const cat = categories.find(c => c.name === tx.category)
    return (
      <motion.div
        key={i}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(i * 0.015, 0.4) }}
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
            {viewMode === 'flat' && (
              <span className="text-xs text-muted-foreground">· {tx.date}</span>
            )}
          </div>
          {tx.description && tx.description !== tx.merchant && (
            <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{tx.description}</p>
          )}
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

        <div className="flex items-center gap-0.5 shrink-0">
          {tx.type === 'expense' ? (
            <ArrowDownRight className="h-3 w-3 text-red-400" />
          ) : (
            <ArrowUpRight className="h-3 w-3 text-emerald-400" />
          )}
          <span className={`text-sm font-semibold ${tx.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
            {formatAmount(tx.amount)}
          </span>
        </div>
      </motion.div>
    )
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
            {isParsing ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-sm font-medium">Parsing your statement...</p>
                <p className="text-xs text-muted-foreground mt-1">Extracting transactions from {fileType?.toUpperCase()}</p>
              </div>
            ) : (
              <>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-border/50 bg-card'
                  }`}
                >
                  <div className="flex gap-3 mb-4">
                    <FileText className="h-10 w-10 text-red-400/70" />
                    <FileSpreadsheet className="h-10 w-10 text-emerald-400/70" />
                  </div>
                  <p className="text-sm font-medium mb-1">Drop your bank statement</p>
                  <p className="text-xs text-muted-foreground mb-4">PDF, CSV, or Excel files supported</p>
                  <label className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20">
                    Choose File
                    <input
                      type="file"
                      accept=".csv,.txt,.pdf,.xls,.xlsx"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="mt-6 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supported Formats</h3>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { label: 'PDF Bank Statements', desc: 'HDFC, ICICI, SBI, Axis, Kotak, Yes Bank' },
                      { label: 'PDF Credit Card Statements', desc: 'Most Indian banks supported' },
                      { label: 'CSV Bank Exports', desc: 'Standard CSV with date, description, amount' },
                      { label: 'Excel Files (XLS/XLSX)', desc: 'Bank statement exports in Excel format' },
                      { label: 'UPI Statement PDFs', desc: 'Google Pay, PhonePe, Paytm exports' },
                    ].map(fmt => (
                      <div key={fmt.label} className="flex items-start gap-2 rounded-xl bg-card border border-border/30 p-3">
                        <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium">{fmt.label}</p>
                          <p className="text-[10px] text-muted-foreground">{fmt.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-secondary/30 p-3">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    All files are processed locally in your browser. Nothing is uploaded to any server. Your financial data stays on your device.
                  </p>
                </div>
              </>
            )}
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
            {/* Summary header */}
            <div className="rounded-2xl bg-card border border-border/50 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {fileType === 'pdf' ? (
                    <FileText className="h-4 w-4 text-red-400" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  )}
                  <span className="text-sm font-semibold">{parsed.length} transactions</span>
                </div>
                {pdfPageCount > 0 && (
                  <span className="text-xs text-muted-foreground">{pdfPageCount} pages parsed</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Expenses</p>
                  <p className="text-sm font-bold text-red-400">{formatAmount(totalExpense)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Income</p>
                  <p className="text-sm font-bold text-emerald-400">{formatAmount(totalIncome)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Duplicates</p>
                  <p className="text-sm font-bold text-yellow-500">{duplicates.size}</p>
                </div>
              </div>
            </div>

            {/* View mode + selection controls */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1">
                {([['flat', 'All'], ['by-date', 'By Date'], ['by-month', 'By Month']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setViewMode(val)}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors ${
                      viewMode === val ? 'bg-primary/10 text-primary' : 'bg-secondary/50 text-muted-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(new Set(parsed.map((_, i) => i)))}
                  className="text-[10px] text-primary font-medium"
                >
                  All
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-[10px] text-muted-foreground font-medium"
                >
                  None
                </button>
              </div>
            </div>

            {/* Transaction list */}
            <div className="max-h-[50vh] overflow-y-auto hide-scrollbar space-y-1.5">
              {viewMode === 'flat' && parsed.map((tx, i) => renderTransaction(tx, i))}

              {viewMode === 'by-date' && groupedByDate && (
                Array.from(groupedByDate.entries()).map(([dateKey, txns]) => {
                  const globalIndices = txns.map(tx => parsed.indexOf(tx))
                  const dayTotal = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                  return (
                    <div key={dateKey} className="mb-3">
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">
                            {(() => {
                              try { return format(parseISO(dateKey), 'EEE, dd MMM yyyy') } catch { return dateKey }
                            })()}
                          </span>
                        </div>
                        <span className="text-xs text-red-400 font-medium">{formatAmount(dayTotal)}</span>
                      </div>
                      <div className="space-y-1">
                        {txns.map((tx) => {
                          const idx = parsed.indexOf(tx)
                          return renderTransaction(tx, idx)
                        })}
                      </div>
                    </div>
                  )
                })
              )}

              {viewMode === 'by-month' && groupedByMonth && monthSummaries && (
                Array.from(groupedByMonth.entries()).map(([monthKey, txns]) => {
                  const summary = monthSummaries.get(monthKey)!
                  return (
                    <div key={monthKey} className="mb-4">
                      <div className="rounded-xl bg-secondary/30 p-3 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold">
                            {(() => {
                              try { return format(parseISO(`${monthKey}-01`), 'MMMM yyyy') } catch { return monthKey }
                            })()}
                          </span>
                          <span className="text-xs text-muted-foreground">{summary.count} txns</span>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <span className="text-red-400">Spent: {formatAmount(summary.expense)}</span>
                          <span className="text-emerald-400">Earned: {formatAmount(summary.income)}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {txns.map((tx) => {
                          const idx = parsed.indexOf(tx)
                          return renderTransaction(tx, idx)
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Import button */}
            <div className="mt-4 flex gap-3 pb-8">
              <button
                onClick={() => { setStep('upload'); setParsed([]); setPdfPageCount(0) }}
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
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
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
            <div className="flex gap-3">
              <button
                onClick={() => { setStep('upload'); setParsed([]); setPdfPageCount(0) }}
                className="rounded-2xl border border-border px-6 py-3 text-sm font-medium"
              >
                Import Another
              </button>
              <button
                onClick={() => router.push('/transactions')}
                className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
              >
                View Transactions
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
