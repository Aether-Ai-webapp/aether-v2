'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  Lightbulb,
  Heart,
  Briefcase,
  GraduationCap,
  Music,
  Plane,
  Coffee,
  Code,
  Palette,
  Check,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'
import { useAetherStore, type Collection } from '@/lib/aether-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ─── Preset Colors ──────────────────────────────────────────────────
const PRESET_COLORS = [
  '#6D597A', '#E07A5F', '#81B29A', '#F2CC8F',
  '#3D405B', '#E76F51', '#2A9D8F', '#E9C46A',
]

// ─── Preset Icons ────────────────────────────────────────────────────
const PRESET_ICONS = [
  { emoji: '💡', label: 'Idea', Icon: Lightbulb },
  { emoji: '❤️', label: 'Heart', Icon: Heart },
  { emoji: '💼', label: 'Work', Icon: Briefcase },
  { emoji: '🎓', label: 'Study', Icon: GraduationCap },
  { emoji: '🎵', label: 'Music', Icon: Music },
  { emoji: '✈️', label: 'Travel', Icon: Plane },
  { emoji: '☕', label: 'Coffee', Icon: Coffee },
  { emoji: '💻', label: 'Code', Icon: Code },
  { emoji: '🎨', label: 'Design', Icon: Palette },
]

// ─── Icon helpers ────────────────────────────────────────────────────
function CollectionIcon({ emoji, color }: { emoji: string; color: string }) {
  const preset = PRESET_ICONS.find((p) => p.emoji === emoji)
  if (preset) {
    const Icon = preset.Icon
    return <Icon className="size-4" style={{ color }} />
  }
  return <FolderOpen className="size-4" style={{ color }} />
}

function PresetIcon({ preset, selected }: { preset: { emoji: string; label: string; Icon: React.ElementType }; selected: boolean }) {
  const Icon = preset.Icon
  return <Icon className={cn('size-4', selected ? 'text-primary' : 'text-muted-foreground')} />
}

// ─── New Collection Dialog ──────────────────────────────────────────
function NewCollectionDialog({
  open,
  onOpenChange,
  editingCollection,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCollection?: Collection | null
}) {
  const addCollection = useAetherStore((s) => s.addCollection)
  const updateCollection = useAetherStore((s) => s.updateCollection)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [icon, setIcon] = useState(PRESET_ICONS[0].emoji)
  const [isSaving, setIsSaving] = useState(false)

  React.useEffect(() => {
    if (editingCollection) {
      setName(editingCollection.name)
      setColor(editingCollection.color)
      setIcon(editingCollection.icon)
    } else {
      setName('')
      setColor(PRESET_COLORS[0])
      setIcon(PRESET_ICONS[0].emoji)
    }
  }, [editingCollection, open])

  const handleSave = useCallback(async () => {
    if (!name.trim()) return
    setIsSaving(true)

    try {
      if (editingCollection) {
        const res = await fetch(`/api/collections/${editingCollection.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), color, icon }),
        })
        if (res.ok) {
          updateCollection(editingCollection.id, { name: name.trim(), color, icon })
        }
      } else {
        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), color, icon }),
        })
        if (res.ok) {
          const collection: Collection = await res.json()
          addCollection(collection)
        }
      }
      onOpenChange(false)
    } catch {
      // Handle error silently
    } finally {
      setIsSaving(false)
    }
  }, [name, color, icon, editingCollection, addCollection, updateCollection, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-white/95 border-black/[0.04]">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">
            {editingCollection ? 'Edit Collection' : 'New Collection'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="collection-name" className="text-xs text-zinc-400">Name</Label>
            <Input
              id="collection-name"
              placeholder="e.g. Design Inspiration"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) handleSave()
              }}
              className="h-10 text-sm border-b border-zinc-200 focus:border-purple-500 bg-transparent rounded-none px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'size-8 rounded-full transition-all duration-200 flex items-center justify-center',
                    color === c ? 'ring-2 ring-offset-2 ring-purple-300/50 scale-110' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                >
                  {color === c && <Check className="size-3 text-white drop-shadow-sm" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Icon</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((preset) => (
                <button
                  key={preset.emoji}
                  onClick={() => setIcon(preset.emoji)}
                  className={cn(
                    'size-9 rounded-xl transition-all duration-200 flex items-center justify-center',
                    icon === preset.emoji
                      ? 'border-2 border-primary bg-primary/10 scale-105'
                      : 'border border-black/[0.04] bg-white/60 hover:border-purple-200'
                  )}
                  aria-label={`Select ${preset.label} icon`}
                >
                  <PresetIcon preset={preset} selected={icon === preset.emoji} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={isSaving} className="text-xs">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs"
          >
            {isSaving ? (
              <><Loader2 className="size-3.5 animate-spin" /></>
            ) : editingCollection ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Collection Card ────────────────────────────────────────────────
function CollectionCard({
  collection,
  onClick,
  onEdit,
  onDelete,
}: {
  collection: Collection
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div whileTap={{ scale: 0.98 }}>
          <div
            onClick={onClick}
            className="relative overflow-hidden rounded-xl p-4 transition-all duration-200 cursor-pointer group bg-white/60 border border-black/[0.03] hover:bg-white/80 hover:border-black/[0.06]"
          >
            {/* Colored left border */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
              style={{ backgroundColor: collection.color }}
            />

            <div className="pl-3">
              {/* Icon + Name */}
              <div className="flex items-center gap-2.5 max-w-full overflow-hidden">
                <div
                  className="size-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${collection.color}15` }}
                >
                  <CollectionIcon emoji={collection.icon} color={collection.color} />
                </div>
                <p className="text-sm font-medium text-zinc-800 truncate max-w-full overflow-hidden">
                  {collection.name}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </ContextMenuTrigger>

      <ContextMenuContent align="start">
        <ContextMenuItem onClick={onEdit} className="gap-2 text-xs">
          <Pencil className="size-3.5" />
          Edit
        </ContextMenuItem>
        <ContextMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive text-xs">
          <Trash2 className="size-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

// ─── Collection Recap Drawer ────────────────────────────────────────
function CollectionRecapDrawer({
  collection,
  onClose,
}: {
  collection: Collection
  onClose: () => void
}) {
  const [recap, setRecap] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  React.useEffect(() => {
    const fetchRecap = async () => {
      try {
        const res = await fetch('/api/collection-recap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionId: collection.id }),
        })

        if (res.ok) {
          const data = await res.json()
          setRecap(data.recap || 'No memories in this collection yet.')
        } else {
          setRecap('Could not generate recap.')
        }
      } catch {
        setRecap('Could not generate recap.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchRecap()
  }, [collection.id])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-50"
        onClick={onClose}
      />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 right-0 h-full z-50 w-full max-w-md overflow-y-auto bg-white/95 backdrop-blur-2xl border-l border-black/[0.04]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-xl border-b border-black/[0.04]">
          <div className="flex items-center gap-2.5 max-w-full overflow-hidden">
            <div
              className="size-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${collection.color}15` }}
            >
              <CollectionIcon emoji={collection.icon} color={collection.color} />
            </div>
            <h2 className="text-sm font-medium tracking-tight text-zinc-800 pr-4 truncate">
              {collection.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="size-7 rounded-lg flex items-center justify-center transition-colors duration-200 shrink-0 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="px-6 py-6">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-purple-400" />
              <span className="text-xs text-zinc-400 font-medium">Synthesizing...</span>
            </div>
          ) : (
            <div className="rounded-xl p-4 bg-purple-50/30 border border-purple-100/20">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] uppercase tracking-[0.12em] text-purple-400 font-medium">Recap</span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-600 font-medium">
                {recap}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

// ─── Main Collections Component ─────────────────────────────────────
export function Collections() {
  const {
    collections,
    setCurrentView,
    setSelectedCollectionId,
    deleteCollection,
  } = useAetherStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [recapCollection, setRecapCollection] = useState<Collection | null>(null)

  const sortedCollections = useMemo(
    () => [...collections].sort((a, b) => a.name.localeCompare(b.name)),
    [collections]
  )

  const handleCardClick = useCallback(
    (collection: Collection) => {
      // Open recap drawer instead of navigating away
      setRecapCollection(collection)
    },
    []
  )

  const handleEdit = useCallback((collection: Collection) => {
    setEditingCollection(collection)
    setDialogOpen(true)
  }, [])

  const handleNewCollection = useCallback(() => {
    setEditingCollection(null)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/collections/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        deleteCollection(deleteTarget.id)
      }
    } catch {
      // Handle error silently
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, deleteCollection])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6 max-w-5xl mx-auto pb-24 md:pb-8"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end">
        <Button
          onClick={handleNewCollection}
          className="gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs shadow-sm h-8 px-3"
        >
          <Plus className="size-3.5" />
          New
        </Button>
      </div>

      {/* ── Collection Grid ─────────────────────────────────────────── */}
      {collections.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Button
            onClick={handleNewCollection}
            className="gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs shadow-sm"
          >
            <Plus className="size-3.5" />
            Create
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {sortedCollections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onClick={() => handleCardClick(collection)}
              onEdit={() => handleEdit(collection)}
              onDelete={() => setDeleteTarget(collection)}
            />
          ))}
        </div>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      <NewCollectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingCollection={editingCollection}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-white/95 border-black/[0.04]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-medium">Delete Collection</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-400">
              &ldquo;{deleteTarget?.name}&rdquo;
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
            >
              {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Collection Recap Drawer ─────────────────────────────────── */}
      <AnimatePresence>
        {recapCollection && (
          <CollectionRecapDrawer
            collection={recapCollection}
            onClose={() => setRecapCollection(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
