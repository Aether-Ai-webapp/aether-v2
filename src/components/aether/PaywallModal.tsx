'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaywallModalProps {
  open: boolean
  onClose: () => void
  isDark?: boolean
}

export function PaywallModal({ open, onClose }: PaywallModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative rounded-2xl p-8 max-w-sm w-full text-center bg-white/80 backdrop-blur-2xl border border-black/[0.03] shadow-[0_8px_40px_rgb(0,0,0,0.04)]"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 size-7 rounded-lg flex items-center justify-center transition-colors text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
            >
              <X className="size-3.5" />
            </button>

            {/* Crown */}
            <div className="mx-auto mb-5 size-12 rounded-xl bg-purple-50/60 flex items-center justify-center">
              <Crown className="size-6 text-purple-400" />
            </div>

            {/* Title */}
            <h2 className="text-lg font-medium tracking-tight text-zinc-800 mb-1.5">
              Upgrade to Pro
            </h2>

            {/* Body */}
            <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
              You&apos;ve reached the free limit. Unlock unlimited memories and AI search.
            </p>

            {/* Price */}
            <p className="text-3xl font-medium text-zinc-800 mb-0.5">
              $5<span className="text-base font-normal text-zinc-400">/mo</span>
            </p>
            <p className="text-[11px] text-zinc-400 mb-5">
              Unlimited memories · AI search · Priority support
            </p>

            {/* CTA */}
            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full font-medium py-2.5 rounded-xl transition-colors bg-zinc-900 hover:bg-zinc-800 text-white"
            >
              <Sparkles className="size-3.5" />
              Upgrade
            </button>

            {/* Later */}
            <button
              onClick={onClose}
              className="mt-3 text-[11px] font-medium text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Maybe Later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
