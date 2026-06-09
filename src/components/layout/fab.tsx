'use client'

import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export function FAB() {
  return (
    <Link href="/add">
      <motion.div
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        className="fixed bottom-20 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </motion.div>
    </Link>
  )
}
