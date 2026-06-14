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
  const { showAuthModal, setShowAuthModal, login, signup } = useAetherStore()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [isLoading, setIsLoading] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

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
        toast.success(mode === 'login' ? 'Welcome back' : 'Account created')
        handleClose()
      } else {
        toast.error(mode === 'login' ? 'Invalid email or password' : 'Signup failed')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClasses = cn(
    'pl-10 h-11 rounded-xl text-sm font-medium transition-all duration-200',
    'bg-white/60 border border-black/[0.03] text-zinc-800 placeholder:text-zinc-300',
    'focus:border-purple-300/60 focus:shadow-[0_0_30px_rgba(168,85,247,0.04)] focus-visible:ring-0'
  )

  const iconClasses = 'absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-300'

  const labelClasses = 'text-[10px] font-medium uppercase tracking-widest text-zinc-400'

  return (
    <AnimatePresence>
      {showAuthModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative w-full max-w-sm rounded-2xl p-8 bg-white/80 backdrop-blur-2xl border border-black/[0.03] shadow-[0_8px_40px_rgb(0,0,0,0.04)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 size-7 rounded-lg flex items-center justify-center transition-colors text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
              >
                <X className="size-3.5" />
              </button>

              {/* Header */}
              <div className="flex flex-col items-center mb-7">
                <div className="size-12 rounded-xl bg-zinc-900 flex items-center justify-center mb-4">
                  <Brain className="size-6 text-white" />
                </div>
                <h2 className="text-lg font-medium tracking-tight text-zinc-800">
                  {mode === 'login' ? 'Welcome back' : 'Create account'}
                </h2>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'signup' && (
                  <div className="space-y-1.5">
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

                <div className="space-y-1.5">
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

                <div className="space-y-1.5">
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 h-11 rounded-xl font-medium transition-colors duration-150 mt-1',
                    'bg-zinc-900 hover:bg-zinc-800 text-white',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      {mode === 'login' ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="size-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Switch mode */}
              <div className="mt-5 text-center">
                <button
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600 transition-colors"
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
