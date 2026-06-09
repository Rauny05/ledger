'use client'

import { useSettingsStore } from './use-settings-store'
import { CURRENCY_SYMBOLS } from '@/config/constants'
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns'

export function useFormat() {
  const settings = useSettingsStore(s => s.settings)
  const symbol = CURRENCY_SYMBOLS[settings.currency] || '₹'

  const formatAmount = (amount: number, showSign = false) => {
    const formatted = new Intl.NumberFormat(settings.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount))

    const sign = showSign ? (amount >= 0 ? '+' : '-') : ''
    return `${sign}${symbol}${formatted}`
  }

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    if (isThisWeek(date)) return format(date, 'EEEE')
    if (isThisYear(date)) return format(date, 'dd MMM')
    return format(date, 'dd MMM yyyy')
  }

  const formatFullDate = (dateStr: string) => {
    return format(parseISO(dateStr), settings.dateFormat)
  }

  return { formatAmount, formatDate, formatFullDate, symbol }
}
