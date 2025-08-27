'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { EmailSidebar } from './email-sidebar'
import { EmailList } from './email-list'
import { EmailView } from './email-view'
import { ComposeDialog } from './compose-dialog'
import { Toaster } from '@/components/ui/sonner'

export interface Attachment {
  filename: string
  content_type: string
  size: number
}

export interface Email {
  email_id: string
  subject: string
  from: string
  to: string
  date: string
  body: string
  html_body?: string
  attachments?: Attachment[]
  message_id: string
  received_at: string
  isRead?: boolean  // Agregar estado de leído
}

export interface ConnectionStatus {
  connected: boolean
  error: string | null
  last_check: string
}

export interface EmailData {
  emails: Email[]
  status: ConnectionStatus
  count: number
  total_count?: number
  page?: number
  page_size?: number
  total_pages?: number
}

export function EmailClient() {
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [readEmails, setReadEmails] = useState<Set<string>>(new Set())
  const [isLoadingReadStatus, setIsLoadingReadStatus] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    error: null,
    last_check: 'Nunca'
  })
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [emailFilter, setEmailFilter] = useState<'inbox' | 'sent'>('inbox')
  const [subFilter, setSubFilter] = useState<'all' | 'marcas' | 'tomas'>('all')

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(50)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Función para cargar el estado de correos leídos desde la base de datos
  const loadReadStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/read-status')
      if (response.ok) {
        const data = await response.json()
        setReadEmails(new Set(data.readEmails || []))
      }
    } catch (error) {
      console.error('Error loading read status:', error)
    } finally {
      setIsLoadingReadStatus(false)
    }
  }, [])

  // Función para marcar un correo como leído en la base de datos
  const markAsRead = useCallback(async (emailId: string) => {
    try {
      const response = await fetch('/api/read-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId }),
      })

      if (response.ok) {
        setReadEmails(prev => new Set([...prev, emailId]))
      }
    } catch (error) {
      console.error('Error marking email as read:', error)
    }
  }, [])

  // Función para obtener correos con paginación
  const fetchEmails = useCallback(async (page = 1, append = false, isPolling = false) => {
    try {
      // Solo mostrar loading en carga inicial, no en polling
      if (!append && !isPolling) setIsLoading(true)
      else if (append) setIsLoadingMore(true)

      let endpoint = '/api/emails/paginated'
      let params = new URLSearchParams()

      params.append('page', page.toString())
      params.append('limit', pageSize.toString())

      // Configurar endpoint y parámetros según el filtro
      if (emailFilter === 'sent') {
        params.append('folder', 'INBOX.Sent')
        // Para enviados, filtrar por cuenta de origen
        if (subFilter === 'marcas') {
          params.append('account', 'marcas@patriciastocker.com')
        } else if (subFilter === 'tomas') {
          params.append('account', 'tomas@patriciastocker.com')
        }
      } else {
        params.append('folder', 'INBOX')
        // Para bandeja principal, filtrar por cuenta de destino
        if (subFilter === 'marcas') {
          params.append('account', 'marcas@patriciastocker.com')
        } else if (subFilter === 'tomas') {
          params.append('account', 'tomas@patriciastocker.com')
        }
      }

      const url = `${endpoint}?${params}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: EmailData = await response.json()

      // Marcar correos como leídos/no leídos usando el estado actual de readEmails
      const emailsWithReadStatus = (data.emails || []).map(email => ({
        ...email,
        isRead: readEmails.has(email.email_id)
      }))

      if (append) {
        setEmails(prev => [...prev, ...emailsWithReadStatus])
      } else {
        setEmails(emailsWithReadStatus)
      }

      setConnectionStatus(data.status)
      setTotalCount(data.total_count || 0)
      setTotalPages(data.total_pages || 1)
      setCurrentPage(page)

      setIsLoading(false)
      setIsLoadingMore(false)
    } catch (error) {
      console.error('Error fetching emails:', error)
      setConnectionStatus({
        connected: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        last_check: new Date().toLocaleTimeString()
      })
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [emailFilter, subFilter, readEmails, pageSize])

  // Función para cargar más correos (scroll infinito)
  const loadMoreEmails = useCallback(() => {
    if (currentPage < totalPages && !isLoadingMore) {
      fetchEmails(currentPage + 1, true)
    }
  }, [currentPage, totalPages, isLoadingMore, fetchEmails])

  // Función para cargar contenido completo de un correo
  const loadEmailContent = useCallback(async (email: Email) => {
    try {
      // Si el correo ya tiene contenido completo, no necesitamos cargarlo
      if (!email.body && !email.html_body) {
        const folder = emailFilter === 'sent' ? 'INBOX.Sent' : 'INBOX'
        const response = await fetch(`/api/email/${email.email_id}/content?folder=${folder}`)

        if (response.ok) {
          const data = await response.json()
          if (data.email) {
            // Actualizar el correo en la lista con el contenido completo
            setEmails(prev => prev.map(e =>
              e.email_id === email.email_id
                ? { ...e, ...data.email, isRead: e.isRead }
                : e
            ))
            return data.email
          }
        }
      }
      return email
    } catch (error) {
      console.error('Error loading email content:', error)
      return email
    }
  }, [emailFilter])

  // Función para manejar selección de correo y marcarlo como leído
  const handleSelectEmail = async (email: Email) => {
    // Cargar contenido completo si es necesario
    const fullEmail = await loadEmailContent(email)
    setSelectedEmail(fullEmail)

    // Marcar como leído en la base de datos
    if (!readEmails.has(email.email_id)) {
      markAsRead(email.email_id)
    }
  }

  // Efecto para cargar el estado de correos leídos al inicializar
  useEffect(() => {
    loadReadStatus()
  }, [loadReadStatus])

  // Efecto para cargar correos inicialmente y configurar polling
  useEffect(() => {
    // Solo iniciar el polling después de cargar el estado de lectura
    if (!isLoadingReadStatus) {
      fetchEmails()

      // Polling más inteligente: 10 segundos en lugar de 2
      // Solo recargar la primera página para detectar nuevos correos (sin mostrar loading)
      const interval = setInterval(() => {
        fetchEmails(1, false, true) // isPolling = true
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [fetchEmails, isLoadingReadStatus])

  // Efecto para resetear paginación cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
    setEmails([])
    if (!isLoadingReadStatus) {
      fetchEmails(1, false)
    }
  }, [emailFilter, subFilter, isLoadingReadStatus])

  // Los correos ya vienen filtrados del backend
  const filteredEmails = emails

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <EmailSidebar
        onCompose={() => setIsComposeOpen(true)}
        connectionStatus={connectionStatus}
        emailCount={filteredEmails.length}
        unreadCount={filteredEmails.filter(email => !email.isRead).length}
        emailFilter={emailFilter}
        onFilterChange={setEmailFilter}
        subFilter={subFilter}
        onSubFilterChange={setSubFilter}
      />

      {/* Lista de correos */}
      <div className="w-[560px] min-w-[520px] max-w-[640px] border-r">
        <EmailList
          emails={filteredEmails}
          selectedEmail={selectedEmail}
          onSelectEmail={handleSelectEmail}
          isLoading={isLoading}
          isSentView={emailFilter === 'sent'}
          currentFilter={emailFilter}
          onLoadMore={loadMoreEmails}
          hasMore={currentPage < totalPages}
          isLoadingMore={isLoadingMore}
          totalCount={totalCount}
        />
      </div>

      {/* Vista del correo seleccionado */}
      <div className="flex-1">
        <EmailView
          email={selectedEmail}
          onReply={() => {
            if (selectedEmail) {
              setIsComposeOpen(true)
            }
          }}
        />
      </div>

      {/* Dialog para componer correos */}
      <ComposeDialog
        open={isComposeOpen}
        onOpenChange={setIsComposeOpen}
        replyTo={selectedEmail}
      />

      {/* Notificaciones */}
      <Toaster />
    </div>
  )
}
