'use client'

import { create } from 'zustand'
import { Category } from '@/types'
import { categoryRepo } from '@/database/repositories/category-repo'
import { DEFAULT_CATEGORIES } from '@/config/constants'

interface CategoryStore {
  categories: Category[]
  isLoading: boolean
  load: () => Promise<void>
  add: (data: Omit<Category, 'id' | 'createdAt'>) => Promise<Category>
  update: (id: string, data: Partial<Category>) => Promise<void>
  remove: (id: string) => Promise<void>
  getByType: (type: 'expense' | 'income') => Category[]
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: [],
  isLoading: true,

  load: async () => {
    set({ isLoading: true })
    await categoryRepo.initDefaults(DEFAULT_CATEGORIES)
    const categories = await categoryRepo.getAll()
    set({ categories, isLoading: false })
  },

  add: async (data) => {
    const category = await categoryRepo.create(data)
    set(s => ({ categories: [...s.categories, category] }))
    return category
  },

  update: async (id, data) => {
    await categoryRepo.update(id, data)
    set(s => ({
      categories: s.categories.map(c => c.id === id ? { ...c, ...data } : c),
    }))
  },

  remove: async (id) => {
    await categoryRepo.delete(id)
    set(s => ({ categories: s.categories.filter(c => c.id !== id) }))
  },

  getByType: (type) => get().categories.filter(c => c.type === type),
}))
