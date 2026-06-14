'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
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
} from 'lucide-react'
import { useAetherStore, type Collection } from '@/lib/aether-store'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
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
  '#6D597A', // Primary purple
  '#E07A5F', // Warm coral
  '#81B29A', // Sage green
  '#F2CC8F', // Soft gold
  '#3D405B', // Deep navy
  '#E76F51', // Burnt orange
  '#2A9D8F', // Teal
  '#E9C46A', // Honey
]

// ─── Preset Icons (lucide components + emoji fallback) ──────────────
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

// ─── Animation variants ─────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
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

  // Pre-fill form when editing
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
        // Update existing collection
        const res = await fetch(`/api/collections/${editingCollection.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            color,
            icon,
          }),
        })
        if (res.ok) {
          updateCollection(editingCollection.id, {
            name: name.trim(),
            color,
            icon,
          })
        }
      } else {
        // Create new collection
        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            color,
            icon,
          }),
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
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {editingCollection ? 'Edit Collection' : 'New Collection'}
          </DialogTitle>
          <DialogDescription>
            {editingCollection
              ? 'Update your collection details.'
              : 'Organize your memories into themed collections.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="collection-name">Name</Label>
            <Input
              id="collection-name"
              placeholder="e.g. Design Inspiration"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) handleSave()
              }}
              className="h-10"
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'size-9 rounded-full transition-all duration-150 flex items-center justify-center',
                    'hover:scale-110 active:scale-95',
                    'ring-2 ring-offset-2 ring-offset-background',
                    color === c ? 'ring-primary/50 scale-110' : 'ring-transparent'
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                >
                  {color === c && (
                    <Check className="size-4 text-white drop-shadow-sm" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selector */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_ICONS.map((preset) => (
                <button
                  key={preset.emoji}
                  onClick={() => setIcon(preset.emoji)}
                  className={cn(
                    'size-10 rounded-xl transition-all duration-150 flex items-center justify-center',
                    'hover:scale-110 active:scale-95',
                    'border-2',
                    icon === preset.emoji
                      ? 'border-primary bg-primary/10 scale-110'
                      : 'border-border bg-card hover:border-primary/30'
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
            <Button variant="outline" disabled={isSaving}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="bg-gradient-to-r from-primary to-[#8B6F9A] text-primary-foreground hover:opacity-90"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : editingCollection ? (
              'Update'
            ) : (
              'Create'
            )}
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
        <motion.div variants={cardVariants} whileTap={{ scale: 0.98 }}>
          <Card
            className="relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group bg-white/60 border border-black/[0.03] hover:bg-white/70 hover:border-black/[0.06]"
            onClick={onClick}
          >
            {/* Colored left border */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl"
              style={{ backgroundColor: collection.color }}
            />

            <CardContent className="p-4 pl-5 space-y-3">
              {/* Icon + Name */}
              <div className="flex items-center gap-2.5">
                <div
                  className="size-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${collection.color}18` }}
                >
                  <CollectionIcon emoji={collection.icon} color={collection.color} />
                </div>
                <p className="text-sm font-semibold text-foreground truncate flex-1">
                  {collection.name}
                </p>
              </div>

              {/* Memory count */}
              <div className="flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {collection.memoryCount}{' '}
                  {collection.memoryCount === 1 ? 'memory' : 'memories'}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </ContextMenuTrigger>

      <ContextMenuContent align="start">
        <ContextMenuItem onClick={onEdit} className="gap-2">
          <Pencil className="size-4" />
          Edit
        </ContextMenuItem>
        <ContextMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
          <Trash2 className="size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

// ─── Empty State ────────────────────────────────────────────────────
function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="size-20 rounded-2xl bg-[#6D597A]/10 flex items-center justify-center mb-6">
        <FolderOpen className="size-10 text-[#6D597A]/40" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        No collections yet
      </h3>

      <p className="text-sm text-muted-foreground max-w-[260px] mb-6">
        Create collections to organize your memories by topic, project, or anything you like.
      </p>

      <Button
        onClick={onCreateClick}
        className="gap-2 bg-gradient-to-r from-primary to-[#8B6F9A] text-primary-foreground hover:opacity-90 shadow-md"
      >
        <Plus className="size-4" />
        Create First Collection
      </Button>
    </motion.div>
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

  // Sort collections alphabetically
  const sortedCollections = useMemo(
    () => [...collections].sort((a, b) => a.name.localeCompare(b.name)),
    [collections]
  )

  const handleCardClick = useCallback(
    (collection: Collection) => {
      setSelectedCollectionId(collection.id)
      setCurrentView('memories')
    },
    [setSelectedCollectionId, setCurrentView]
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
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-5xl mx-auto pb-24 md:pb-8"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <motion.div
        variants={cardVariants}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <FolderOpen className="size-7 text-[#6D597A]" />
            Collections
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
          </p>
        </div>

        <Button
          onClick={handleNewCollection}
          className="gap-2 bg-gradient-to-r from-primary to-[#8B6F9A] text-primary-foreground hover:opacity-90 shadow-md"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New Collection</span>
          <span className="sm:hidden">New</span>
        </Button>
      </motion.div>

      {/* ── Collection Grid ─────────────────────────────────────────── */}
      {collections.length === 0 ? (
        <EmptyState onCreateClick={handleNewCollection} />
      ) : (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
        >
          {sortedCollections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onClick={() => handleCardClick(collection)}
              onEdit={() => handleEdit(collection)}
              onDelete={() => setDeleteTarget(collection)}
            />
          ))}
        </motion.div>
      )}

      {/* ── New / Edit Dialog ───────────────────────────────────────── */}
      <NewCollectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingCollection={editingCollection}
      />

      {/* ── Delete Confirmation ─────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? Memories in this
              collection won&apos;t be deleted, but they&apos;ll be removed from this collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
