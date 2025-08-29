'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { 
  Check, 
  X, 
  Image,
  Palette,
  Archive
} from 'lucide-react'

interface NoteCreatorProps {
  onCreateNote: (title: string, content: string, color: string) => void
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

export function NoteCreator({ onCreateNote }: NoteCreatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedColor, setSelectedColor] = useState(POST_IT_COLORS[0].value)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus cuando se expande
  useEffect(() => {
    if (isExpanded && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [isExpanded])

  const handleExpand = () => {
    setIsExpanded(true)
  }

  const handleClose = () => {
    if (title.trim() || content.trim()) {
      onCreateNote(
        title.trim() || 'Nueva nota',
        content.trim(),
        selectedColor
      )
    }
    
    // Reset form
    setTitle('')
    setContent('')
    setSelectedColor(POST_IT_COLORS[0].value)
    setIsExpanded(false)
    setShowColorPicker(false)
  }

  const handleCancel = () => {
    setTitle('')
    setContent('')
    setSelectedColor(POST_IT_COLORS[0].value)
    setIsExpanded(false)
    setShowColorPicker(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleClose()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const currentColor = POST_IT_COLORS.find(c => c.value === selectedColor) || POST_IT_COLORS[0]

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <Card 
        className={`transition-all duration-200 cursor-text ${
          isExpanded ? 'shadow-lg' : 'shadow-md hover:shadow-lg'
        }`}
        style={{ 
          backgroundColor: currentColor.value,
          borderColor: currentColor.border,
          borderWidth: '1px'
        }}
        onClick={!isExpanded ? handleExpand : undefined}
      >
        <div className="p-4">
          {!isExpanded ? (
            // Vista colapsada - similar a Google Keep
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-muted-foreground text-sm">
                  Añade una nota...
                </p>
              </div>
              <div className="flex gap-2 opacity-60">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-black/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExpand()
                  }}
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-black/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExpand()
                  }}
                >
                  <Image className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            // Vista expandida
            <div className="space-y-3">
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-base font-medium bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                placeholder="Título"
              />
              
              <Textarea
                ref={contentTextareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[80px] bg-transparent border-none p-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                placeholder="Crear una nota..."
              />

              {/* Barra de herramientas */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {/* Selector de color */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-black/10"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                    >
                      <Palette className="h-4 w-4" />
                    </Button>
                    
                    {showColorPicker && (
                      <div className="absolute top-10 left-0 z-10 bg-background border rounded-lg shadow-lg p-2">
                        <div className="grid grid-cols-4 gap-2">
                          {POST_IT_COLORS.map((color) => (
                            <button
                              key={color.value}
                              className={`w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform ${
                                selectedColor === color.value ? 'ring-2 ring-primary' : ''
                              }`}
                              style={{ 
                                backgroundColor: color.value,
                                borderColor: color.border
                              }}
                              onClick={() => {
                                setSelectedColor(color.value)
                                setShowColorPicker(false)
                              }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="hover:bg-red-100 hover:text-red-600"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleClose}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Listo
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
