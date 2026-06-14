'use client'

import React from 'react'
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
import { AuthModal } from '@/components/aether/AuthModal'
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentView, setCurrentView, isAuthenticated, user, setShowAuthModal, logout } = useAetherStore()
  const isMobile = useIsMobile()

  const handleSignOut = async () => {
    await logout()
    toast.success('Signed out')
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen flex flex-col relative bg-[#F9FAFB] text-zinc-950 font-sans tracking-tight antialiased">
      <div className="relative z-10 flex flex-1 min-h-0 w-full">
        {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
        {!isMobile && (
          <aside
            className={cn(
              'h-screen fixed left-0 top-0 z-40 flex flex-col w-14',
              'bg-white/50 backdrop-blur-xl border-r border-black/[0.03]'
            )}
          >
            {/* Logo */}
            <div className="flex items-center justify-center h-14 shrink-0 border-b border-black/[0.03]">
              <div className="size-7 rounded-lg flex items-center justify-center shrink-0 bg-zinc-900 text-white">
                <Brain className="size-3.5" />
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-2 flex flex-col gap-0.5 px-2 overflow-y-auto items-center">
              {navItems.map((item) => {
                const isActive = currentView === item.view
                const Icon = item.icon
                return (
                  <button
                    key={item.view}
                    onClick={() => setCurrentView(item.view)}
                    className={cn(
                      'flex items-center justify-center rounded-xl p-2.5 transition-all duration-200 w-full',
                      isActive
                        ? 'text-zinc-800 bg-zinc-100/60'
                        : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50/60'
                    )}
                  >
                    <Icon className={cn(
                      'w-4 h-4 shrink-0 transition-colors duration-200',
                      isActive ? 'text-zinc-800' : ''
                    )} />
                  </button>
                )
              })}
            </nav>

            {/* Bottom: auth */}
            <div className="p-2 shrink-0 border-t border-black/[0.03] flex justify-center">
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
                  onClick={handleSignOut}
                >
                  <LogOut className="size-3.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
                  onClick={() => setShowAuthModal(true)}
                >
                  <LogIn className="size-3.5" />
                </Button>
              )}
            </div>
          </aside>
        )}

        {/* ── Main Content ────────────────────────────────────────────── */}
        <main
          className={cn(
            'flex-1 flex flex-col min-h-0 w-full max-w-full overflow-x-hidden transition-all duration-200 ease-in-out',
            !isMobile && 'ml-14'
          )}
        >
          {/* Mobile header */}
          {isMobile && (
            <div className="flex items-center justify-between px-4 h-11 shrink-0 bg-white/50 backdrop-blur-xl border-b border-black/[0.03]">
              <div className="size-6 rounded-lg flex items-center justify-center bg-zinc-900 text-white">
                <Brain className="size-3" />
              </div>
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1 px-2 rounded-lg font-medium text-zinc-400 hover:text-zinc-600"
                  onClick={handleSignOut}
                >
                  <LogOut className="size-3" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1.5 px-2 rounded-lg font-medium text-zinc-400 hover:text-zinc-600"
                  onClick={() => setShowAuthModal(true)}
                >
                  <LogIn className="size-3" />
                </Button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
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
          <div className="flex items-center justify-around h-12 px-2 relative">
            {navItems.map((item) => {
              const isActive = currentView === item.view
              const Icon = item.icon
              return (
                <button
                  key={item.view}
                  onClick={() => setCurrentView(item.view)}
                  className={cn(
                    'flex items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 min-w-[44px] min-h-[44px]',
                    isActive
                      ? 'text-zinc-800'
                      : 'text-zinc-400'
                  )}
                >
                  <Icon className="size-[18px]" />
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
