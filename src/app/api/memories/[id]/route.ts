import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/memories/:id - Update a memory (Supabase-first, Prisma fallback)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { title, content, tags, sourceUrl, isFavorite, type, summary, recap, imageUrl, collectionIds } = body

    // ── Try Supabase first if authenticated ──
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const updateData: Record<string, unknown> = {}
        if (title !== undefined) updateData.title = title
        if (content !== undefined) updateData.content = content
        if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags.join(',') : tags
        if (sourceUrl !== undefined) updateData.source_url = sourceUrl
        if (isFavorite !== undefined) updateData.is_favorite = isFavorite
        if (type !== undefined) updateData.type = type
        if (summary !== undefined) updateData.summary = summary
        if (recap !== undefined) updateData.recap = recap
        if (imageUrl !== undefined) updateData.image_url = imageUrl

        const { error } = await supabase
          .from('memories')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id)

        if (!error) {
          // Handle collection membership updates in Supabase
          if (collectionIds !== undefined && Array.isArray(collectionIds)) {
            // Delete existing junction rows
            await supabase.from('memory_collections').delete().eq('memory_id', id)
            // Insert new ones
            if (collectionIds.length > 0) {
              await supabase.from('memory_collections').insert(
                collectionIds.map((cid: string) => ({
                  memory_id: id,
                  collection_id: cid,
                }))
              )
            }
          }

          // Fetch the updated row to return
          const { data: updatedRow } = await supabase
            .from('memories')
            .select('*, memory_collections(collection_id, collections(id, name, color, icon))')
            .eq('id', id)
            .single()

          if (updatedRow) {
            const m = updatedRow as Record<string, unknown>
            return NextResponse.json({
              id: m.id,
              type: m.type,
              title: m.title,
              content: m.content,
              summary: m.summary,
              tags: m.tags ? (m.tags as string).split(',').filter(Boolean) : [],
              sourceUrl: m.source_url,
              fileUrl: m.file_url,
              imagePreview: m.image_preview,
              imageUrl: m.image_url,
              recap: m.recap,
              isFavorite: m.is_favorite,
              createdAt: m.created_at,
              updatedAt: m.updated_at,
              collections: (m.memory_collections as Record<string, Record<string, unknown>>[])?.map((mc: Record<string, unknown>) => ({
                id: (mc.collections as Record<string, unknown>)?.id,
                name: (mc.collections as Record<string, unknown>)?.name,
                color: (mc.collections as Record<string, unknown>)?.color,
                icon: (mc.collections as Record<string, unknown>)?.icon,
              })) || [],
            })
          }
        }
        console.warn('[PATCH /api/memories/:id] Supabase update failed:', error?.message)
        // Fall through to Prisma
      }
    } catch (supabaseErr) {
      console.warn('[PATCH /api/memories/:id] Supabase error:', supabaseErr instanceof Error ? supabaseErr.message : 'Unknown')
      // Fall through to Prisma
    }

    // ── Fallback: Prisma ──
    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags.join(',') : tags
    if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite
    if (type !== undefined) updateData.type = type
    if (summary !== undefined) updateData.summary = summary
    if (recap !== undefined) updateData.recap = recap
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl

    // Handle collection membership updates
    if (collectionIds !== undefined) {
      // Delete existing and recreate
      await db.memoryCollection.deleteMany({ where: { memoryId: id } })
      if (Array.isArray(collectionIds) && collectionIds.length > 0) {
        updateData.collections = {
          create: collectionIds.map((cid: string) => ({ collectionId: cid })),
        }
      }
    }

    const memory = await db.memory.update({
      where: { id },
      data: updateData,
      include: {
        collections: {
          include: {
            collection: {
              select: { id: true, name: true, color: true, icon: true },
            },
          },
        },
      },
    })

    return NextResponse.json({
      id: memory.id,
      type: memory.type,
      title: memory.title,
      content: memory.content,
      summary: memory.summary,
      tags: memory.tags ? memory.tags.split(',').filter(Boolean) : [],
      sourceUrl: memory.sourceUrl,
      fileUrl: memory.fileUrl,
      imagePreview: memory.imagePreview,
      imageUrl: memory.imageUrl,
      recap: memory.recap,
      isFavorite: memory.isFavorite,
      createdAt: memory.createdAt.toISOString(),
      updatedAt: memory.updatedAt.toISOString(),
      collections: memory.collections.map((mc) => ({
        id: mc.collection.id,
        name: mc.collection.name,
        color: mc.collection.color,
        icon: mc.collection.icon,
      })),
    })
  } catch (error) {
    console.error('[PATCH /api/memories/:id] Failed:', error)
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 })
  }
}

// DELETE /api/memories/:id - Delete a memory (Supabase-first, Prisma fallback)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // ── Try Supabase first if authenticated ──
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { error } = await supabase
          .from('memories')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)

        if (!error) {
          return NextResponse.json({ success: true })
        }
        console.warn('[DELETE /api/memories/:id] Supabase delete failed:', error?.message)
        // Fall through to Prisma
      }
    } catch (supabaseErr) {
      console.warn('[DELETE /api/memories/:id] Supabase error:', supabaseErr instanceof Error ? supabaseErr.message : 'Unknown')
      // Fall through to Prisma
    }

    // ── Fallback: Prisma ──
    await db.memory.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/memories/:id] Failed:', error)
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 })
  }
}
