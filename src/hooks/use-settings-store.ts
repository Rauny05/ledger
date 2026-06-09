'use client'

import { create } from 'zustand'
import { UserSettings } from '@/types'
import { localAdapter } from '@/database/adapters/local-adapter'
import { DEFAULT_SETTINGS } from '@/config/constants'

interface SettingsStore {
  settings: UserSettings
  isLoading: boolean
  load: () => Promise<void>
  update: (data: Partial<UserSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,

  load: async () => {
    set({ isLoading: true })
    const saved = await localAdapter.getSettings()
    if (saved) {
      set({ settings: saved, isLoading: false })
    } else {
      await localAdapter.saveSettings(DEFAULT_SETTINGS)
      set({ settings: DEFAULT_SETTINGS, isLoading: false })
    }
  },

  update: async (data) => {
    set(s => {
      const updated = { ...s.settings, ...data }
      localAdapter.saveSettings(updated)
      return { settings: updated }
    })
  },
}))
