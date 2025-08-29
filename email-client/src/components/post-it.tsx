'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Trash2,
  Edit3,
  Check,
  X,
  MoreVertical,
  Palette,
  Mail,
  Sparkles,
  Archive,
  ArchiveRestore
} from 'lucide-react'
import { PostItData } from './post-it-board'

interface PostItProps {
  postIt: PostItData
  onUpdate: (id: string, updates: Partial<PostItData>) => void
  onDelete: (id: string) => void
  onArchive: (id: string, archived: boolean) => void
  onGenerateEmail?: (postIt: PostItData) => void
  onDragStart?: (postIt: PostItData) => void
  onDragEnd?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (postIt: PostItData) => void
  isDragging?: boolean
  viewMode?: 'active' | 'archived'
}

const POST_IT_COLORS = [
  { name: 'Amarillo', value: '#fef3c7', border: '#f59e0b' },
  { name: 'Rosa', value: '#fce7f3', border: '#ec4899' },
  { name: 'Azul', value: '#dbeafe', border: '#3b82f6' },
  { name: 'Verde', value: '#d1fae5', border: '#10b981' },
  { name: 'Naranja', value: '#fed7aa', border: '#f97316' },
  { name: 'Púrpura', value: '#e9d5ff', border: '#8b5cf6' },
  { name: 'Gris', value: '#f3f4f6', border: '#6b7280' },
]

export function PostIt({
  postIt,
  onUpdate,
  onDelete,
  onArchive,
  onGenerateEmail,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging = false,
  viewMode = 'active'
}: PostItProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(postIt.title)
  const [editContent, setEditContent] = useState(postIt.content)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus cuando entra en modo edición
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setEditTitle(postIt.title)
    setEditContent(postIt.content)
    setIsEditing(true)
  }

  const handleSave = () => {
    if (editTitle.trim() || editContent.trim()) {
      onUpdate(postIt.id, {
        title: editTitle.trim() || 'Sin título',
        content: editContent.trim()
      })
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(postIt.title)
    setEditContent(postIt.content)
    setIsEditing(false)
  }

  const handleColorChange = (color: string) => {
    onUpdate(postIt.id, { color })
  }

  const handleDelete = () => {
    if (confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
      onDelete(postIt.id)
    }
  }

  const handleGenerateEmail = () => {
    if (onGenerateEmail) {
      onGenerateEmail(postIt)
    }
  }

  const handleArchive = () => {
    const isCurrentlyArchived = postIt.archived === 1
    onArchive(postIt.id, !isCurrentlyArchived)
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(postIt)
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', postIt.id)
  }

  const handleDragEnd = () => {
    if (onDragEnd) {
      onDragEnd()
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (onDragOver) {
      onDragOver(e)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (onDrop) {
      onDrop(postIt)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const currentColor = POST_IT_COLORS.find(c => c.value === postIt.color) || POST_IT_COLORS[0]

  return (
    <Card
      className={`min-h-[120px] p-4 relative group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
      style={{
        backgroundColor: currentColor.value,
        borderColor: currentColor.border,
        borderWidth: '2px'
      }}
      onClick={!isEditing ? handleStartEdit : undefined}
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Botones de acción */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
        {isEditing ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-green-100"
              onClick={(e) => {
                e.stopPropagation()
                handleSave()
              }}
            >
              <Check className="h-3 w-3 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 hover:bg-red-100"
              onClick={(e) => {
                e.stopPropagation()
                handleCancel()
              }}
            >
              <X className="h-3 w-3 text-red-600" />
            </Button>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 hover:bg-black/10"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleStartEdit}>
                <Edit3 className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>

              {onGenerateEmail && (
                <DropdownMenuItem onClick={handleGenerateEmail}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generar correo con IA
                </DropdownMenuItem>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Palette className="mr-2 h-4 w-4" />
                    Cambiar color
                  </DropdownMenuItem>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="left" className="w-40">
                  {POST_IT_COLORS.map((color) => (
                    <DropdownMenuItem
                      key={color.value}
                      onClick={() => handleColorChange(color.value)}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ 
                          backgroundColor: color.value,
                          borderColor: color.border
                        }}
                      />
                      {color.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenuItem onClick={handleArchive}>
                {postIt.archived === 1 ? (
                  <>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Desarchivar
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archivar
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Contenido del post-it */}
      <div className="flex flex-col min-h-[80px]">
        {isEditing ? (
          <>
            <Input
              ref={titleInputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="mb-2 text-base font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-900 placeholder:text-gray-500"
              placeholder="Título de la nota..."
              onClick={(e) => e.stopPropagation()}
            />
            <Textarea
              ref={contentTextareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] text-sm bg-transparent border-none p-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-800 placeholder:text-gray-500"
              placeholder="Escribe tu nota aquí..."
              onClick={(e) => e.stopPropagation()}
            />
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold mb-2 text-gray-900 break-words leading-tight">
              {postIt.title || 'Sin título'}
            </h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
              {postIt.content || 'Haz clic para agregar contenido...'}
            </p>
          </>
        )}
      </div>

      {/* Fecha de creación */}
      <div className="absolute bottom-1 left-2 text-xs text-muted-foreground opacity-60">
        {new Date(postIt.created_at).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit'
        })}
      </div>
    </Card>
  )
}
