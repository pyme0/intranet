'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Trash2,
  Star,
  Mail,
  Code,
  Eye,
  Paperclip,
  Download
} from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Email, Attachment } from './email-client'

interface EmailViewProps {
  email: Email | null
  onReply: () => void
}

// Función para decodificar nombres codificados en UTF-8 (igual que en EmailList)
const decodeEmailName = (encodedName: string): string => {
  try {
    if (encodedName.includes('=?UTF-8?Q?')) {
      const match = encodedName.match(/=\?UTF-8\?Q\?([^?]+)\?=/);
      if (match) {
        let decoded = match[1];
        decoded = decoded.replace(/=C3=A1/g, 'á');
        decoded = decoded.replace(/=C3=A9/g, 'é');
        decoded = decoded.replace(/=C3=AD/g, 'í');
        decoded = decoded.replace(/=C3=B3/g, 'ó');
        decoded = decoded.replace(/=C3=BA/g, 'ú');
        decoded = decoded.replace(/=C3=B1/g, 'ñ');
        decoded = decoded.replace(/=C3=81/g, 'Á');
        decoded = decoded.replace(/=C3=89/g, 'É');
        decoded = decoded.replace(/=C3=8D/g, 'Í');
        decoded = decoded.replace(/=C3=93/g, 'Ó');
        decoded = decoded.replace(/=C3=9A/g, 'Ú');
        decoded = decoded.replace(/=C3=91/g, 'Ñ');
        decoded = decoded.replace(/=20/g, ' ');
        decoded = decoded.replace(/_/g, ' ');
        return decoded;
      }
    }
    return encodedName;
  } catch {
    return encodedName;
  }
}

const getDisplayName = (fromField: string): string => {
  try {
    const decoded = decodeEmailName(fromField)
    if (decoded.includes('<')) {
      const namePart = decoded.split('<')[0].trim()
      if (namePart) {
        return namePart
      }
    }
    if (decoded.includes('@')) {
      const emailPart = decoded.includes('<')
        ? decoded.match(/<(.+)>/)?.[1] || decoded
        : decoded
      return emailPart.split('@')[0].replace(/[._]/g, ' ')
    }
    return decoded
  } catch {
    return fromField.split('@')[0]
  }
}

// Función para formatear el tamaño de archivos
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Función para descargar adjunto
const downloadAttachment = async (emailId: string, filename: string) => {
  try {
    const response = await fetch(`/api/attachment/${emailId}/${encodeURIComponent(filename)}`)

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()

      // Limpiar después de un pequeño delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }, 100)
    } else {
      console.error(`Error descargando adjunto: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('Error descargando adjunto:', error)
  }
}

export function EmailView({ email, onReply }: EmailViewProps) {
  const [showRawHtml, setShowRawHtml] = useState(false)

  const getInitials = (fromField: string) => {
    const name = getDisplayName(fromField)
    const words = name.split(' ')
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "PPP 'a las' p", { locale: es })
    } catch {
      return dateString
    }
  }

  const formatEmailBody = (body: string) => {
    // Convertir saltos de línea a <br> y preservar espacios
    return body
      .split('\n')
      .map(line => line.trim())
      .join('\n')
  }

  const isHtmlContent = (body: string) => {
    // Detectar si el contenido contiene HTML
    const htmlTags = /<\/?[a-z][\s\S]*>/i
    return htmlTags.test(body)
  }

  const sanitizeHtml = (html: string) => {
    // Función básica de sanitización - en producción usar una librería como DOMPurify
    let sanitized = html
      // Remover scripts
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remover iframes
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      // Remover javascript: URLs
      .replace(/javascript:/gi, '')
      // Remover event handlers
      .replace(/on\w+\s*=/gi, '')
      // Remover object y embed tags
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      // Remover form tags para evitar envíos no deseados
      .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
      // Limpiar estilos potencialmente problemáticos
      .replace(/position\s*:\s*fixed/gi, 'position: static')
      .replace(/position\s*:\s*absolute/gi, 'position: relative')

    return sanitized
  }

  if (!email) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/10">
        <div className="text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Selecciona un correo</h3>
          <p className="text-sm text-muted-foreground">
            Elige un correo de la lista para verlo aquí
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header with actions */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h2 className="text-lg font-semibold truncate">
              {email.subject || 'Sin asunto'}
            </h2>
            {!email.isRead && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  Nuevo
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle HTML/Raw buttons - only show if content has HTML */}
            {isHtmlContent(email.body) && (
              <>
                <Button
                  variant={showRawHtml ? "ghost" : "default"}
                  size="sm"
                  onClick={() => setShowRawHtml(false)}
                  className="hover:scale-105 transition-transform"
                  title="Vista HTML"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant={showRawHtml ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setShowRawHtml(true)}
                  className="hover:scale-105 transition-transform"
                  title="Código fuente"
                >
                  <Code className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
              </>
            )}

            <Button variant="ghost" size="sm" onClick={onReply} className="hover:scale-105 transition-transform">
              <Reply className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:scale-105 transition-transform">
              <ReplyAll className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:scale-105 transition-transform">
              <Forward className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" size="sm" className="hover:scale-105 transition-transform">
              <Archive className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:scale-105 transition-transform">
              <Star className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:scale-105 transition-transform hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Email content */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-6 animate-in fade-in-50 duration-300">
          <Card className="p-6 shadow-lg">
            {/* Email header */}
            <div className="flex items-start gap-4 mb-6">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {getInitials(email.from)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">
                      {getDisplayName(email.from)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {email.from.includes('<')
                        ? email.from.match(/<(.+)>/)?.[1] || email.from
                        : email.from
                      }
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(email.date)}
                  </p>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p><strong>Para:</strong> {email.to}</p>
                  {email.message_id && (
                    <p className="text-xs mt-1">
                      <strong>ID:</strong> {email.message_id}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Email body */}
            <div className="prose prose-sm max-w-none">
              {isHtmlContent(email.body) && !showRawHtml ? (
                // Vista HTML renderizada
                <div
                  className="email-html-content"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(email.body || 'Sin contenido')
                  }}
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    color: 'inherit'
                  }}
                />
              ) : (
                // Vista de código fuente o texto plano
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed bg-muted/20 p-4 rounded-lg overflow-x-auto">
                  {email.body || 'Sin contenido'}
                </pre>
              )}
            </div>

            {/* Sección de adjuntos */}
            {email.attachments && email.attachments.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm">
                    Adjuntos ({email.attachments.length})
                  </h3>
                </div>
                <div className="grid gap-2">
                  {email.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded">
                          <Paperclip className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{attachment.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)} • {attachment.content_type}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadAttachment(email.email_id, attachment.filename)}
                        className="hover:bg-primary/10"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </ScrollArea>

      {/* Quick actions footer */}
      <div className="p-4 border-t bg-muted/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button onClick={onReply} size="sm">
            <Reply className="h-4 w-4 mr-2" />
            Responder
          </Button>
          <Button variant="outline" size="sm">
            <Forward className="h-4 w-4 mr-2" />
            Reenviar
          </Button>
        </div>
      </div>
    </div>
  )
}
