'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Archive, ArrowLeft } from 'lucide-react'
import { PostIt } from './post-it'
import { NoteCreator } from './note-creator'
import { EmailGenerationLoader } from './email-generation-loader'

export interface PostItData {
  id: string
  title: string
  content: string
  color: string
  position: number
  archived: number
  created_at: string
  updated_at: string
}

interface PostItBoardProps {
  onGenerateEmail?: (emailData: any) => void
}

export function PostItBoard({ onGenerateEmail }: PostItBoardProps = {}) {
  const [postIts, setPostIts] = useState<PostItData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draggedItem, setDraggedItem] = useState<PostItData | null>(null)
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false)
  const [currentPostIt, setCurrentPostIt] = useState<PostItData | null>(null)
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active')

  // Cargar post-its al inicializar y cuando cambie el modo de vista
  useEffect(() => {
    loadPostIts()
  }, [viewMode])

  const loadPostIts = async () => {
    try {
      setIsLoading(true)
      const archivedParam = viewMode === 'archived' ? '?archived=1' : '?archived=0'
      const response = await fetch(`/api/post-its${archivedParam}`)
      if (response.ok) {
        const data = await response.json()
        setPostIts(data.postIts || [])
      }
    } catch (error) {
      console.error('Error loading post-its:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createNewPostIt = async (title: string, content: string, color: string) => {
    try {
      const newPostIt = {
        title: title || 'Nueva Nota',
        content: content || '',
        color: color || '#fef3c7',
        position: 0 // Se colocará al inicio
      }

      const response = await fetch('/api/post-its', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPostIt),
      })

      if (response.ok) {
        const data = await response.json()
        // Agregar al inicio de la lista
        setPostIts(prev => [data.postIt, ...prev])
      }
    } catch (error) {
      console.error('Error creating post-it:', error)
    }
  }

  const updatePostIt = async (id: string, updates: Partial<PostItData>) => {
    try {
      const response = await fetch(`/api/post-its/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const data = await response.json()
        setPostIts(prev => prev.map(postIt => 
          postIt.id === id ? data.postIt : postIt
        ))
      }
    } catch (error) {
      console.error('Error updating post-it:', error)
    }
  }

  const deletePostIt = async (id: string) => {
    try {
      const response = await fetch(`/api/post-its/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPostIts(prev => prev.filter(postIt => postIt.id !== id))
      }
    } catch (error) {
      console.error('Error deleting post-it:', error)
    }
  }

  const archivePostIt = async (id: string, archived: boolean) => {
    try {
      const response = await fetch(`/api/post-its/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archived: archived ? 1 : 0 }),
      })

      if (response.ok) {
        // Remover de la lista actual ya que cambió de estado
        setPostIts(prev => prev.filter(postIt => postIt.id !== id))
      }
    } catch (error) {
      console.error('Error archiving post-it:', error)
    }
  }

  const handleGenerateEmail = (postIt: PostItData) => {
    setCurrentPostIt(postIt)
    setIsGeneratingEmail(true)
  }

  const handleEmailGenerated = (emailData: any) => {
    if (onGenerateEmail) {
      onGenerateEmail(emailData)
    } else {
      // Fallback: mostrar el correo generado
      console.log('📧 Correo generado:', emailData)
      alert(`Correo generado para ${emailData.to}:\n\nAsunto: ${emailData.subject}\n\n${emailData.body.substring(0, 200)}...`)
    }
  }

  // Funciones de drag & drop
  const handleDragStart = (postIt: PostItData) => {
    setDraggedItem(postIt)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetPostIt: PostItData) => {
    if (!draggedItem || draggedItem.id === targetPostIt.id) {
      return
    }

    try {
      // Encontrar las posiciones actuales
      const draggedIndex = postIts.findIndex(p => p.id === draggedItem.id)
      const targetIndex = postIts.findIndex(p => p.id === targetPostIt.id)

      if (draggedIndex === -1 || targetIndex === -1) return

      // Crear nueva lista reordenada
      const newPostIts = [...postIts]
      const [removed] = newPostIts.splice(draggedIndex, 1)
      newPostIts.splice(targetIndex, 0, removed)

      // Actualizar el estado local inmediatamente
      setPostIts(newPostIts)

      // Actualizar las posiciones en la base de datos
      const updatePromises = newPostIts.map((postIt, index) =>
        updatePostIt(postIt.id, { position: index })
      )

      await Promise.all(updatePromises)
      console.log('✅ Posiciones actualizadas')

    } catch (error) {
      console.error('Error reordenando post-its:', error)
      // Recargar para restaurar el orden correcto
      loadPostIts()
    }
  }

  // Organizar post-its en filas de 5 columnas
  const organizePostIts = (postIts: PostItData[]) => {
    const rows: PostItData[][] = []
    for (let i = 0; i < postIts.length; i += 5) {
      rows.push(postIts.slice(i, i + 5))
    }
    return rows
  }

  const postItRows = organizePostIts(postIts)

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando notas...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 max-w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1" />
          <h1 className="text-2xl font-bold text-foreground">
            📝 {viewMode === 'active' ? 'Mis Notas' : 'Notas Archivadas'}
          </h1>
          <div className="flex-1 flex justify-end">
            <Button
              variant={viewMode === 'archived' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')}
              className="flex items-center gap-2"
            >
              {viewMode === 'active' ? (
                <>
                  <Archive className="h-4 w-4" />
                  Archivadas
                </>
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  Activas
                </>
              )}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {postIts.length} {postIts.length === 1 ? 'nota' : 'notas'} {viewMode === 'active' ? 'activas' : 'archivadas'}
        </p>
      </div>

      {/* Note Creator - Solo en vista activa */}
      {viewMode === 'active' && <NoteCreator onCreateNote={createNewPostIt} />}

      {/* Post-its Grid - Optimizado para usar todo el espacio */}
      <div className="w-full">
        {postIts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">
              {viewMode === 'active' ? '📝' : '📦'}
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {viewMode === 'active'
                ? 'Las notas que agregues aparecerán aquí'
                : 'No hay notas archivadas'
              }
            </h3>
            <p className="text-sm text-muted-foreground">
              {viewMode === 'active'
                ? 'Usa el campo de arriba para crear tu primera nota'
                : 'Las notas archivadas aparecerán aquí'
              }
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4 space-y-4 w-full">
            {postIts.map((postIt) => (
              <div key={postIt.id} className="break-inside-avoid mb-4">
                <PostIt
                  postIt={postIt}
                  onUpdate={updatePostIt}
                  onDelete={deletePostIt}
                  onArchive={archivePostIt}
                  onGenerateEmail={handleGenerateEmail}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  viewMode={viewMode}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragging={draggedItem?.id === postIt.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loader de generación de correo */}
      <EmailGenerationLoader
        open={isGeneratingEmail}
        onOpenChange={setIsGeneratingEmail}
        onEmailGenerated={handleEmailGenerated}
        postItContent={currentPostIt?.content || ''}
        postItTitle={currentPostIt?.title || ''}
      />
    </div>
  )
}
