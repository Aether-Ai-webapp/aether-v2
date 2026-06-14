'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, User, ArrowRight, Loader2, Brain } from 'lucide-react'
import { useAetherStore } from '@/lib/aether-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function AuthModal() {
  const { showAuthModal, setShowAuthModal, login, signup, darkMode } = useAetherStore()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [isLoading, setIsLoading] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const isDark = darkMode

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setName('')
    setIsLoading(false)
  }

  const handleClose = () => {
    setShowAuthModal(false)
    setTimeout(resetForm, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in email and password')
      return
    }
    if (mode === 'signup' && password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    try {
      const success = mode === 'login'
        ? await login(email.trim(), password)
        : await signup(email.trim(), password, name.trim())

      if (success) {
        toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!')
        handleClose()
      } else {
        toast.error(mode === 'login' ? 'Invalid email or password' : 'Signup failed. Email may already be in use.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClasses = cn(
    'pl-10 h-12 rounded-xl text-sm font-medium transition-all duration-200',
    isDark
      ? 'bg-zinc-900/60 border-white/[0.08] text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/40 focus-visible:ring-indigo-500/15 focus-visible:ring-2'
      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus-visible:ring-purple-400/20 focus-visible:ring-2'
  )

  const iconClasses = cn(
    'absolute left-3.5 top-1/2 -translate-y-1/2 size-4',
    isDark ? 'text-zinc-600' : 'text-gray-400'
  )

  const labelClasses = cn(
    'text-[10px] font-bold uppercase tracking-[0.15em]',
    isDark ? 'text-zinc-600' : 'text-gray-500'
  )

  return (
    <AnimatePresence>
      {showAuthModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, y: 30, filter: 'blur(8px)' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                'relative w-full max-w-md rounded-3xl p-8 shadow-2xl',
                isDark
                  ? 'bg-gradient-to-b from-[#181A20]/98 to-[#0D0E12]/98 backdrop-blur-2xl border border-white/[0.08] shadow-[0_0_80px_-20px_rgba(99,102,241,0.25)]'
                  : 'bg-white/98 backdrop-blur-2xl border border-gray-200 shadow-purple-500/5'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className={cn(
                  'absolute top-5 right-5 size-9 rounded-xl flex items-center justify-center transition-all duration-200',
                  isDark
                    ? 'bg-zinc-900/80 border border-white/10 text-zinc-600 hover:text-zinc-300 hover:border-white/20'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600'
                )}
              >
                <X className="size-4" />
              </button>

              {/* Header */}
              <div className="flex flex-col items-center mb-8">
                <motion.div
                  initial={{ scale: 0.7, rotate: -8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className="size-16 rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)] mb-5"
                >
                  <Brain className="size-8 text-white" />
                </motion.div>
                <h2 className={cn(
                  'text-2xl font-black tracking-tight',
                  isDark
                    ? 'bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent'
                    : 'text-gray-900'
                )}>
                  {mode === 'login' ? 'Welcome back' : 'Create account'}
                </h2>
                <p className={cn(
                  'text-sm mt-1.5 font-medium',
                  isDark ? 'text-zinc-600' : 'text-gray-400'
                )}>
                  {mode === 'login'
                    ? 'Sign in to sync your memories across devices'
                    : 'Start saving memories to the cloud'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label className={labelClasses}>Name</Label>
                    <div className="relative">
                      <User className={iconClasses} />
                      <Input
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClasses}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className={labelClasses}>Email</Label>
                  <div className="relative">
                    <Mail className={iconClasses} />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClasses}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={labelClasses}>Password</Label>
                  <div className="relative">
                    <Lock className={iconClasses} />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClasses}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-white transition-all duration-200 mt-2',
                    'bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500',
                    'hover:from-purple-500 hover:via-indigo-400 hover:to-blue-400',
                    'shadow-[0_0_30px_-5px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_-5px_rgba(99,102,241,0.6)]',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    <>
                      {mode === 'login' ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Switch mode */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className={cn(
                    'text-xs font-medium transition-colors',
                    isDark
                      ? 'text-zinc-600 hover:text-zinc-300'
                      : 'text-gray-400 hover:text-gray-700'
                  )}
                  disabled={isLoading}
                >
                  {mode === 'login'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
