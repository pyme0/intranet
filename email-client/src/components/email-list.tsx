'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Mail, MailOpen, Loader2 } from 'lucide-react'
import { Email } from './email-client'
import { useEffect, useRef } from 'react'

interface EmailListProps {
  emails: Email[]
  selectedEmail: Email | null
  onSelectEmail: (email: Email) => void
  isLoading: boolean
  isSentView?: boolean
  currentFilter?: string
  onLoadMore?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
  totalCount?: number
}

// Función para decodificar nombres codificados en UTF-8
const decodeEmailName = (encodedName: string): string => {
  try {
    // Decodificar =?UTF-8?Q?...?= format
    if (encodedName.includes('=?UTF-8?Q?')) {
      const match = encodedName.match(/=\?UTF-8\?Q\?([^?]+)\?=/);
      if (match) {
        let decoded = match[1];
        // Reemplazar códigos de caracteres comunes
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

export function EmailList({
  emails,
  selectedEmail,
  onSelectEmail,
  isLoading,
  isSentView = false,
  currentFilter,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  totalCount = 0
}: EmailListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Detectar scroll para cargar más correos
  useEffect(() => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea || !onLoadMore || !hasMore) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea
      // Cargar más cuando esté cerca del final (80% del scroll)
      if (scrollTop + clientHeight >= scrollHeight * 0.8 && !isLoadingMore) {
        onLoadMore()
      }
    }

    scrollArea.addEventListener('scroll', handleScroll)
    return () => scrollArea.removeEventListener('scroll', handleScroll)
  }, [onLoadMore, hasMore, isLoadingMore])

  const getInitials = (fromField: string) => {
    const name = getDisplayName(fromField)
    const words = name.split(' ')
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const getDisplayName = (fromField: string): string => {
    try {
      // Decodificar primero
      const decoded = decodeEmailName(fromField)

      // Si tiene formato "Nombre <email@domain.com>"
      if (decoded.includes('<')) {
        const namePart = decoded.split('<')[0].trim()
        if (namePart) {
          return namePart
        }
      }

      // Si es solo el email, extraer la parte antes del @
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

  const getEmailAddress = (fromField: string): string => {
    if (fromField.includes('<')) {
      const match = fromField.match(/<(.+)>/)
      return match ? match[1] : fromField
    }
    return fromField
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)
      const diffInDays = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)

      // Si es hoy (menos de 24 horas)
      if (diffInHours < 24 && date.getDate() === now.getDate()) {
        const timeStr = date.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
        const relativeTime = formatDistanceToNow(date, { addSuffix: true, locale: es })
        return `${timeStr} • ${relativeTime}`
      }

      // Si es esta semana (menos de 7 días)
      if (diffInDays < 7) {
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                           'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

        const dayName = dayNames[date.getDay()]
        const day = date.getDate()
        const month = monthNames[date.getMonth()]

        return `${dayName} ${day} ${month}`
      }

      // Para fechas más antiguas
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: diffInDays > 365 ? 'numeric' : undefined
      })
    } catch {
      return dateString
    }
  }

  const cleanBody = (body: string) => {
    return body.replace(/\n/g, ' ').trim()
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center animate-in fade-in-50 duration-500">
          <div className="relative">
            <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-bounce" />
            <div className="absolute inset-0 h-8 w-8 mx-auto animate-ping">
              <Mail className="h-8 w-8 text-primary/20" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Cargando correos...</p>
        </div>
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No hay correos</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {isSentView ? 'Correos Enviados' : 'Bandeja Principal'}
          </h2>
          <Badge variant="secondary">{emails.length}</Badge>
        </div>
      </div>

      {/* Email List */}
      <ScrollArea className="flex-1 overflow-hidden" ref={scrollAreaRef}>
        <div className="p-3">
          {emails.map((email) => (
            <Card
              key={email.email_id}
              className={`mb-2 px-3 py-2 cursor-pointer transition-all duration-200 hover:bg-muted/50 hover:shadow-md hover:scale-[1.02] ${
                selectedEmail?.email_id === email.email_id
                  ? 'bg-muted border-primary shadow-sm'
                  : ''
              } ${
                !email.isRead
                  ? 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                  : 'border-l-4 border-l-transparent bg-muted/10'
              }`}
              onClick={() => onSelectEmail(email)}
            >
              <div className="flex items-start gap-2 w-full">
                {/* Avatar */}
                <Avatar className={`h-9 w-9 flex-shrink-0 ${
                  !email.isRead ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                }`}>
                  <AvatarFallback className={`text-xs ${
                    !email.isRead ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-muted text-muted-foreground'
                  }`}>
                    {getInitials(isSentView ? email.to : email.from)}
                  </AvatarFallback>
                </Avatar>

                {/* Email Content */}
                <div className="flex-1 min-w-0 overflow-hidden max-w-full">
                  {/* From/To and Date */}
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <p className={`text-sm truncate ${
                        !email.isRead ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'
                      }`}>
                        {isSentView ? (
                          <>
                            <span className="text-xs text-muted-foreground mr-1">Para:</span>
                            {getDisplayName(email.to)}
                          </>
                        ) : (
                          getDisplayName(email.from)
                        )}
                      </p>
                      {!email.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex-shrink-0 text-right leading-tight min-w-16 max-w-20">
                      {formatDate(email.date)}
                    </div>
                  </div>

                  {/* Email Address (if different from display name) */}
                  {isSentView ? (
                    getDisplayName(email.to) !== getEmailAddress(email.to) && (
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        {getEmailAddress(email.to)}
                      </p>
                    )
                  ) : (
                    getDisplayName(email.from) !== getEmailAddress(email.from) && (
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        {getEmailAddress(email.from)}
                      </p>
                    )
                  )}

                  {/* Subject */}
                  <p className={`text-sm mb-1 line-clamp-2 overflow-hidden ${
                    !email.isRead ? 'font-semibold text-foreground' : 'font-normal text-muted-foreground'
                  }`}>
                    {email.subject || 'Sin asunto'}
                  </p>

                  {/* Body Preview */}
                  <p className={`text-xs line-clamp-2 overflow-hidden ${
                    !email.isRead ? 'text-muted-foreground' : 'text-muted-foreground/80'
                  }`}>
                    {cleanBody(email.body) || 'Sin contenido'}
                  </p>
                </div>

                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {selectedEmail?.email_id === email.email_id ? (
                    <MailOpen className="h-4 w-4 text-primary" />
                  ) : !email.isRead ? (
                    <Mail className="h-4 w-4 text-blue-500" />
                  ) : (
                    <MailOpen className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </Card>
          ))}

          {/* Indicador de carga más correos */}
          {isLoadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Cargando más correos...</span>
            </div>
          )}

          {/* Botón cargar más (fallback si el scroll infinito no funciona) */}
          {hasMore && !isLoadingMore && onLoadMore && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                className="text-xs"
              >
                Cargar más correos
              </Button>
            </div>
          )}

          {/* Información de total de correos */}
          {totalCount > 0 && (
            <div className="text-center py-2 text-xs text-muted-foreground">
              Mostrando {emails.length} de {totalCount} correos
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
