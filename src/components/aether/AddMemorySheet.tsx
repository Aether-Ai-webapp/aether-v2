'use client'

import React, { useState, useCallback } from 'react'
import { FileText, Link2, ImageIcon, Mic, Loader2, Crown } from 'lucide-react'
import { useAetherStore, type MemoryType } from '@/lib/aether-store'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface AddMemorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddMemorySheet({ open, onOpenChange }: AddMemorySheetProps) {
  const isMobile = useIsMobile()
  const saveMemory = useAetherStore((s) => s.saveMemory)
  const requireAuth = useAetherStore((s) => s.requireAuth)
  const isAuthenticated = useAetherStore((s) => s.isAuthenticated)
  const memories = useAetherStore((s) => s.memories)

  // ── Free plan limit ──────────────────────────────────────────────────
  const FREE_MEMORY_LIMIT = 15

  // Text tab state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // Link tab state
  const [url, setUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [isFetchingTitle, setIsFetchingTitle] = useState(false)

  // Common state
  const [activeTab, setActiveTab] = useState('text')
  const [isSaving, setIsSaving] = useState(false)

  const resetForm = useCallback(() => {
    setTitle('')
    setContent('')
    setUrl('')
    setLinkTitle('')
    setActiveTab('text')
    setIsSaving(false)
    setIsFetchingTitle(false)
  }, [])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    setTimeout(resetForm, 300)
  }, [onOpenChange, resetForm])

  const fetchLinkTitle = useCallback(async () => {
    if (!url.trim()) return

    setIsFetchingTitle(true)
    try {
      const res = await fetch('/api/memories/fetch-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.title) {
          setLinkTitle(data.title)
        }
      }
    } catch {
      // Silently fail - user can type the title manually
    } finally {
      setIsFetchingTitle(false)
    }
  }, [url])

  const handleSave = useCallback(async () => {
    // ── Free plan paywall: block saves at 15 memories ──────────────
    if (memories.length >= FREE_MEMORY_LIMIT) {
      toast.error('Free limit reached — upgrade to Pro for unlimited memories', {
        icon: <Crown className="size-4" />,
      })
      return
    }

    const type = activeTab as MemoryType
    let memoryTitle = ''
    let memoryContent = ''
    let sourceUrl: string | null = null

    if (type === 'text') {
      memoryTitle = title.trim() || 'Untitled Note'
      memoryContent = content.trim()
      if (!memoryContent) return
    } else if (type === 'link') {
      memoryTitle = linkTitle.trim() || url.trim() || 'Untitled Link'
      memoryContent = url.trim()
      sourceUrl = url.trim()
      if (!sourceUrl) return
    } else if (type === 'image') {
      memoryTitle = title.trim() || 'Untitled Image'
      memoryContent = content.trim()
    } else if (type === 'voice') {
      memoryTitle = title.trim() || 'Voice Note'
      memoryContent = content.trim()
    }

    // Gate: if not authenticated, show auth modal and queue this save
    if (!isAuthenticated) {
      const savedType = type
      const savedTitle = memoryTitle
      const savedContent = memoryContent
      const savedSourceUrl = sourceUrl

      requireAuth(async () => {
        const result = await saveMemory({
          type: savedType,
          title: savedTitle,
          content: savedContent,
          sourceUrl: savedSourceUrl,
        })
        if (result) {
          toast.success('Memory saved!')
          // Note: saveMemory already handles background AI tagging, summary, link reading, and embedding
        }
      })
      handleClose()
      return
    }

    // Authenticated: save directly
    setIsSaving(true)
    try {
      const result = await saveMemory({
        type,
        title: memoryTitle,
        content: memoryContent,
        sourceUrl,
      })
      if (result) {
        handleClose()
        toast.success('Memory saved!')
        // Note: saveMemory already handles background AI tagging, summary, link reading, and embedding
      } else {
        toast.error('Failed to save memory')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsSaving(false)
    }
  }, [activeTab, title, content, linkTitle, url, isAuthenticated, requireAuth, saveMemory, handleClose, memories.length, FREE_MEMORY_LIMIT])

  const isSaveDisabled = () => {
    if (isSaving) return true
    if (activeTab === 'text') return !content.trim()
    if (activeTab === 'link') return !url.trim()
    return false
  }

  const sheetContent = (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="text" className="gap-1.5">
            <FileText className="size-4" />
            <span className="hidden sm:inline">Text</span>
          </TabsTrigger>
          <TabsTrigger value="link" className="gap-1.5">
            <Link2 className="size-4" />
            <span className="hidden sm:inline">Link</span>
          </TabsTrigger>
          <TabsTrigger value="image" className="gap-1.5">
            <ImageIcon className="size-4" />
            <span className="hidden sm:inline">Image</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="gap-1.5">
            <Mic className="size-4" />
            <span className="hidden sm:inline">Voice</span>
          </TabsTrigger>
        </TabsList>

        {/* Text Tab */}
        <TabsContent value="text" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="memory-title">Title</Label>
            <Input
              id="memory-title"
              placeholder="Give your memory a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memory-content">Content</Label>
            <Textarea
              id="memory-content"
              placeholder="Write your thoughts, notes, ideas..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[160px] resize-y"
            />
          </div>
        </TabsContent>

        {/* Link Tab */}
        <TabsContent value="link" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="link-url">URL</Label>
            <div className="flex gap-2">
              <Input
                id="link-url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => fetchLinkTitle()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchLinkTitle()
                }}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={fetchLinkTitle}
                disabled={isFetchingTitle || !url.trim()}
              >
                {isFetchingTitle ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Link2 className="size-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="link-title">Title</Label>
            <Input
              id="link-title"
              placeholder="Link title (auto-fetched or type manually)"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link-notes">Notes</Label>
            <Textarea
              id="link-notes"
              placeholder="Add notes about this link..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-y"
            />
          </div>
        </TabsContent>

        {/* Image Tab */}
        <TabsContent value="image" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="image-title">Title</Label>
            <Input
              id="image-title"
              placeholder="Image title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center">
            <ImageIcon className="size-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Image upload coming soon
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You can paste an image URL in the notes below
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="image-notes">Notes</Label>
            <Textarea
              id="image-notes"
              placeholder="Add notes or image URL..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-y"
            />
          </div>
        </TabsContent>

        {/* Voice Tab */}
        <TabsContent value="voice" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="voice-title">Title</Label>
            <Input
              id="voice-title"
              placeholder="Voice note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center">
            <Mic className="size-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Voice recording coming soon
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You can type your note content below
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="voice-notes">Transcript / Notes</Label>
            <Textarea
              id="voice-notes"
              placeholder="Write your note content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-y"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="pt-4 pb-2">
        <Button
          onClick={handleSave}
          disabled={isSaveDisabled()}
          className="w-full bg-gradient-to-r from-primary to-[#8B6F9A] text-primary-foreground hover:opacity-90"
        >
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Memory'
          )}
        </Button>
      </div>
    </>
  )

  // On mobile: use Drawer (slides up from bottom)
  // On desktop: use Sheet (slides from right)
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>New Memory</DrawerTitle>
            <DrawerDescription>
              Capture a thought, link, image, or voice note.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            {sheetContent}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New Memory</SheetTitle>
          <SheetDescription>
            Capture a thought, link, image, or voice note.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          {sheetContent}
        </div>
      </SheetContent>
    </Sheet>
  )
}
