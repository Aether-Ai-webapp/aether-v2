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
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface NavItem {
  view: AppView
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { view: 'dashboard', label: 'Home', icon: Home },
  { view: 'ask', label: 'Ask', icon: Search },
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
  const { currentView, setCurrentView, isAuthenticated, user, setShowAuthModal, logout } = useAetherStore()
  const isMobile = useIsMobile()
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  const handleSignOut = async () => {
    await logout()
    toast.success('Signed out')
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen flex flex-col relative bg-[#F9FAFB] text-zinc-800">
      {/* ── Ambient Gradient ──────────────────────────────────────────── */}
      <AuroraBackground />

      <div className="relative z-10 flex flex-1 min-h-0 w-full">
        {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
        {!isMobile && (
          <aside
            className={cn(
              'h-screen fixed left-0 top-0 z-40 flex flex-col transition-all duration-500 ease-out',
              sidebarExpanded ? 'w-56' : 'w-16',
              'bg-white/60 backdrop-blur-xl border-r border-black/[0.03]'
            )}
            onMouseEnter={() => setSidebarExpanded(true)}
            onMouseLeave={() => setSidebarExpanded(false)}
          >
            {/* Logo */}
            <div className={cn(
              'flex items-center gap-3 h-14 shrink-0',
              sidebarExpanded ? 'px-4' : 'px-0 justify-center',
              'border-b border-black/[0.03]'
            )}>
              <div className="size-8 rounded-lg flex items-center justify-center shrink-0 bg-zinc-900 text-white">
                <Brain className="size-4" />
              </div>
              <AnimatePresence>
                {sidebarExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="text-sm font-medium tracking-tight text-zinc-800 whitespace-nowrap overflow-hidden"
                  >
                    Aether
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2 overflow-y-auto items-center">
              <TooltipProvider delayDuration={0}>
                {navItems.map((item) => {
                  const isActive = currentView === item.view
                  const Icon = item.icon
                  return (
                    <Tooltip key={item.view}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setCurrentView(item.view)}
                          className={cn(
                            'flex items-center gap-3 rounded-xl p-2.5 text-sm font-medium transition-all duration-150 w-full',
                            isActive
                              ? 'text-zinc-800 bg-zinc-100/80'
                              : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50/80'
                          )}
                        >
                          <Icon className={cn(
                            'w-[18px] h-[18px] shrink-0 transition-colors duration-150',
                            isActive ? 'text-zinc-800' : ''
                          )} />
                          <AnimatePresence>
                            {sidebarExpanded && (
                              <motion.span
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -4 }}
                                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                                className="whitespace-nowrap overflow-hidden"
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </button>
                      </TooltipTrigger>
                      {!sidebarExpanded && (
                        <TooltipContent side="right" className="font-medium text-xs">
                          {item.label}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )
                })}
              </TooltipProvider>
            </nav>

            {/* Bottom: auth */}
            <div className="p-2 shrink-0 border-t border-black/[0.03]">
              {isAuthenticated ? (
                <AnimatePresence>
                  {sidebarExpanded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-between px-2"
                    >
                      <span className="text-[11px] text-zinc-400 truncate font-medium">
                        {user?.email}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] gap-1 px-2 rounded-lg font-medium text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
                        onClick={handleSignOut}
                      >
                        <LogOut className="size-3" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : (
                <AnimatePresence>
                  {sidebarExpanded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="px-2"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] gap-1.5 px-2 rounded-lg font-medium text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 w-full justify-start"
                        onClick={() => setShowAuthModal(true)}
                      >
                        <LogIn className="size-3" />
                        Sign In
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </aside>
        )}

        {/* ── Main Content ────────────────────────────────────────────── */}
        <main
          className={cn(
            'flex-1 flex flex-col min-h-0 w-full max-w-full overflow-x-hidden transition-all duration-500 ease-out',
            !isMobile && (sidebarExpanded ? 'ml-56' : 'ml-16')
          )}
        >
          {/* Mobile header */}
          {isMobile && (
            <div className="flex items-center justify-between px-4 h-12 shrink-0 bg-white/60 backdrop-blur-xl border-b border-black/[0.03]">
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-lg flex items-center justify-center bg-zinc-900 text-white">
                  <Brain className="size-3.5" />
                </div>
                <span className="text-sm font-medium tracking-tight text-zinc-800">
                  Aether
                </span>
              </div>
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] gap-1 px-2 rounded-lg font-medium text-zinc-400 hover:text-zinc-600"
                  onClick={handleSignOut}
                >
                  <LogOut className="size-3" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] gap-1.5 px-2 rounded-lg font-medium text-zinc-400 hover:text-zinc-600"
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
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="p-4 md:p-6 lg:p-10"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ──────────────────────────────────── */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom bg-white/70 backdrop-blur-xl border-t border-black/[0.03]">
          <div className="flex items-center justify-around h-14 px-2 relative">
            {mobileNavItems.map((item) => {
              const isActive = currentView === item.view
              const Icon = item.icon
              return (
                <button
                  key={item.view}
                  onClick={() => setCurrentView(item.view)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-150 min-w-[44px] min-h-[44px]',
                    isActive
                      ? 'text-zinc-800'
                      : 'text-zinc-400'
                  )}
                >
                  <Icon className="size-[18px]" />
                  <span className={cn(
                    'text-[10px] font-medium',
                    isActive && 'font-semibold'
                  )}>
                    {item.label}
                  </span>
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
