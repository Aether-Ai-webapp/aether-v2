'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAetherStore } from '@/lib/aether-store'
import { useIsMobile } from '@/hooks/use-mobile'
import { AppShell } from '@/components/aether/AppShell'
import { Dashboard } from '@/components/aether/Dashboard'
import { AskAether } from '@/components/aether/AskAether'
import { Collections } from '@/components/aether/Collections'
import { Memories } from '@/components/aether/Memories'
import { Settings } from '@/components/aether/Settings'
import { LandingPage } from '@/components/aether/LandingPage'
import { AuthModal } from '@/components/aether/AuthModal'

function ViewRouter() {
  const currentView = useAetherStore((s) => s.currentView)

  const views: Record<string, React.ReactNode> = {
    dashboard: <Dashboard />,
    ask: <AskAether />,
    collections: <Collections />,
    memories: <Memories />,
    settings: <Settings />,
  }

  return <>{views[currentView] || <Dashboard />}</>
}

export default function Home() {
  const { checkSession, isAuthenticated } = useAetherStore()
  const isMobile = useIsMobile()
  const [hasEnteredApp, setHasEnteredApp] = useState(false)

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const handleEnterApp = useCallback(() => {
    setHasEnteredApp(true)
  }, [])

  // ── TWIN ARCHITECTURE ────────────────────────────────────────────────
  // Mobile (<768px): Always render the app immediately
  // Desktop (≥768px): Show landing page until user enters or authenticates

  // Mobile: App experience, always visible
  if (isMobile) {
    return (
      <AppShell>
        <ViewRouter />
      </AppShell>
    )
  }

  // Desktop: If authenticated, skip landing page
  const showApp = hasEnteredApp || isAuthenticated

  if (!showApp) {
    return (
      <>
        <LandingPage onEnterApp={handleEnterApp} />
        <AuthModal />
      </>
    )
  }

  // Desktop: Authenticated app experience
  return (
    <AppShell>
      <ViewRouter />
    </AppShell>
  )
}
