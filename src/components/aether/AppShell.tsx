'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Search,
  Layers,
  Settings,
  Brain,
  LogIn,
  LogOut,
} from 'lucide-react'
import { useAetherStore, type AppView } from '@/lib/aether-store'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AuthModal } from '@/components/aether/AuthModal'
import { AuroraBackground } from '@/components/aether/AuroraBackground'
import { StarField } from '@/components/aether/StarField'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface NavItem {
  view: AppView
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: Home },
  { view: 'ask', label: 'Ask Aether', icon: Search },
  { view: 'collections', label: 'Collections', icon: Layers },
  { view: 'settings', label: 'Settings', icon: Settings },
]

const mobileNavItems: { view: AppView; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard', label: 'Home', icon: Home },
  { view: 'ask', label: 'Ask', icon: Search },
  { view: 'collections', label: 'Collections', icon: Layers },
  { view: 'settings', label: 'Settings', icon: Settings },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentView, setCurrentView, darkMode, isAuthenticated, user, setShowAuthModal, logout } = useAetherStore()
  const isMobile = useIsMobile()
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  const isDark = darkMode

  const handleSignOut = async () => {
    await logout()
    toast.success('Signed out')
  }

  return (
    <div className={cn(
      'min-h-screen flex flex-col transition-theme relative overflow-hidden',
      isDark ? 'bg-[#0B0C0E] text-zinc-100' : 'bg-[#f8f9fc] text-gray-900'
    )}>
      {/* ── Star Field ─────────────────────────────────────────────── */}
      <StarField isDark={isDark} />

      {/* ── Nebula Mesh Gradient Background ────────────────────────── */}
      <AuroraBackground isDark={isDark} />

      <div className="relative z-10 flex flex-1 min-h-0">
        {/* ── Glassmorphic Sidebar (Desktop) ──────────────────────── */}
        {!isMobile && (
          <aside
            className={cn(
              'h-screen fixed left-0 top-0 z-40 flex flex-col transition-all duration-500 ease-out',
              sidebarExpanded ? 'w-64' : 'w-20',
              isDark
                ? 'bg-[#0B0C0E]/80 backdrop-blur-2xl border-r border-white/[0.06]'
                : 'bg-white/70 backdrop-blur-2xl border-r border-gray-200/50'
            )}
            onMouseEnter={() => setSidebarExpanded(true)}
            onMouseLeave={() => setSidebarExpanded(false)}
          >
            {/* Logo + Auth Header */}
            <div className={cn(
              'flex items-center justify-between gap-2 h-16 shrink-0',
              sidebarExpanded ? 'px-4' : 'px-0 justify-center',
              isDark ? 'border-b border-white/[0.06]' : 'border-b border-gray-200/50'
            )}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  'size-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300',
                  'bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600',
                  isDark
                    ? 'shadow-[0_0_20px_-3px_rgba(99,102,241,0.4)]'
                    : 'shadow-lg shadow-purple-500/20'
                )}>
                  <Brain className="size-5 text-white" />
                </div>
                <AnimatePresence>
                  {sidebarExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className={cn(
                        'text-xl font-black tracking-tighter whitespace-nowrap overflow-hidden bg-clip-text text-transparent',
                        isDark
                          ? 'bg-gradient-to-r from-white via-zinc-200 to-zinc-500'
                          : 'bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600'
                      )}
                    >
                      AETHER
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Auth button in sidebar header */}
              <AnimatePresence>
                {sidebarExpanded && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="shrink-0"
                  >
                    {isAuthenticated ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'h-8 text-xs gap-1.5 px-3 rounded-lg font-medium',
                          isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100/60'
                        )}
                        onClick={handleSignOut}
                      >
                        <LogOut className="size-3" />
                        Log Out
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'h-8 text-xs gap-1.5 px-3 rounded-lg font-medium',
                          isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100/60'
                        )}
                        onClick={() => setShowAuthModal(true)}
                      >
                        <LogIn className="size-3" />
                        Sign In
                      </Button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto items-center">
              <TooltipProvider delayDuration={0}>
                {navItems.map((item) => {
                  const isActive = currentView === item.view
                  const Icon = item.icon
                  return (
                    <Tooltip key={item.view}>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={() => setCurrentView(item.view)}
                          whileHover={{ x: 4 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          className={cn(
                            'flex items-center gap-3 rounded-xl p-3 text-sm font-medium transition-all duration-200 w-full',
                            isActive
                              ? isDark
                                ? 'text-zinc-100 bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent shadow-[0_0_24px_-8px_rgba(99,102,241,0.2)] border-r-2 border-indigo-400/60'
                                : 'text-purple-700 bg-gradient-to-r from-purple-50 via-violet-50 to-transparent shadow-[0_0_20px_-5px_rgba(168,85,247,0.15)] border-r-2 border-purple-500'
                              : isDark
                                ? 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/40'
                                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100/60'
                          )}
                        >
                          <div className={cn(
                            'flex items-center justify-center',
                            isActive && isDark && 'animate-glow-pulse rounded-lg'
                          )}>
                            <Icon className={cn(
                              'w-5 h-5 shrink-0 transition-colors duration-200',
                              isActive
                                ? isDark ? 'text-indigo-400' : 'text-purple-600'
                                : ''
                            )} />
                          </div>
                          <AnimatePresence>
                            {sidebarExpanded && (
                              <motion.span
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -4 }}
                                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                className="whitespace-nowrap overflow-hidden"
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      </TooltipTrigger>
                      {!sidebarExpanded && (
                        <TooltipContent side="right" className="font-medium">
                          {item.label}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )
                })}
              </TooltipProvider>
            </nav>

            {/* Bottom: auth status */}
            <div className={cn(
              'p-3 shrink-0',
              isDark ? 'border-t border-white/[0.06]' : 'border-t border-gray-200/50'
            )}>
              {isAuthenticated && user && sidebarExpanded && (
                <div className={cn(
                  'text-[11px] px-2 truncate font-medium',
                  isDark ? 'text-zinc-600' : 'text-gray-400'
                )}>
                  {user.email}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ── Main Content Area ────────────────────────────────────── */}
        <main
          className={cn(
            'flex-1 flex flex-col min-h-0 transition-all duration-500 ease-out',
            !isMobile && (sidebarExpanded ? 'ml-64' : 'ml-20')
          )}
        >
          {/* Top auth bar on mobile */}
          {isMobile && (
            <div className={cn(
              'flex items-center justify-between px-4 h-14 shrink-0',
              isDark
                ? 'bg-[#0B0C0E]/80 backdrop-blur-2xl border-b border-white/[0.06]'
                : 'bg-white/70 backdrop-blur-2xl border-b border-gray-200/50'
            )}>
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 flex items-center justify-center shadow-[0_0_16px_-3px_rgba(99,102,241,0.3)]">
                  <Brain className="size-4 text-white" />
                </div>
                <span className={cn(
                  'font-black tracking-tighter text-base bg-clip-text text-transparent',
                  isDark
                    ? 'bg-gradient-to-r from-white via-zinc-200 to-zinc-500'
                    : 'bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600'
                )}>
                  AETHER
                </span>
              </div>
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 text-xs gap-1.5 px-3 rounded-lg font-medium',
                    isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-700'
                  )}
                  onClick={handleSignOut}
                >
                  <LogOut className="size-3" />
                  Log Out
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 text-xs gap-1.5 px-3 rounded-lg font-medium',
                    isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-700'
                  )}
                  onClick={() => setShowAuthModal(true)}
                >
                  <LogIn className="size-3" />
                  Sign In
                </Button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="p-4 md:p-6 lg:p-8"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ──────────────────────────────────── */}
      {isMobile && (
        <nav className={cn(
          'fixed bottom-0 left-0 right-0 z-40 safe-area-bottom transition-theme',
          isDark
            ? 'bg-[#0B0C0E]/90 backdrop-blur-2xl border-t border-white/[0.06]'
            : 'bg-white/80 backdrop-blur-2xl border-t border-gray-200/50'
        )}>
          <div className="flex items-center justify-around h-16 px-2 relative">
            {mobileNavItems.map((item) => {
              const isActive = currentView === item.view
              const Icon = item.icon
              return (
                <button
                  key={item.view}
                  onClick={() => setCurrentView(item.view)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 py-1.5 px-4 rounded-xl transition-all duration-200 min-w-[48px] min-h-[44px]',
                    isActive
                      ? isDark
                        ? 'text-indigo-400 bg-indigo-500/[0.06]'
                        : 'text-purple-600 bg-purple-50'
                      : isDark
                        ? 'text-zinc-600'
                        : 'text-gray-400'
                  )}
                >
                  <Icon className="size-5" />
                  <span className={cn(
                    'text-[10px] font-semibold',
                    isActive && 'font-bold'
                  )}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="mobileNavIndicator"
                      className={cn(
                        'absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full',
                        isDark ? 'bg-indigo-400/60' : 'bg-purple-600'
                      )}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
      )}

      {/* Auth Modal — global */}
      <AuthModal />
    </div>
  )
}
