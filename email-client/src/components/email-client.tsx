'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

// Extender Window para incluir searchTimeout
declare global {
  interface Window {
    searchTimeout?: NodeJS.Timeout
  }
}
import { Card } from '@/components/ui/card'
import { EmailSidebar } from './email-sidebar'
import { EmailList } from './email-list'
import { EmailView } from './email-view'
import { ComposeDialog } from './compose-dialog'
import { PostItBoard } from './post-it-board'
import { ContactsManager } from './contacts-manager'
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
  const [currentView, setCurrentView] = useState<'emails' | 'postits' | 'contacts'>('emails')
  const [composePrefilledData, setComposePrefilledData] = useState<any>(null)
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [emailFilter, setEmailFilter] = useState<'inbox' | 'sent'>('inbox')
  const [subFilter, setSubFilter] = useState<'all' | 'marcas' | 'tomas'>('all')
  const [recipientFilter, setRecipientFilter] = useState<'marcas' | 'tomas'>('marcas') // Nuevo filtro por destinatario
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Email[]>([])
  const [searchTotalCount, setSearchTotalCount] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(0)

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(5) // Reducido de 10 a 5 para carga ultra rápida
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

  // Función para obtener correos con filtros IMAP eficientes
  const fetchEmails = useCallback(async (page = 1, append = false, isPolling = false) => {
    try {
      // Solo mostrar loading en carga inicial, no en polling
      if (!append && !isPolling) setIsLoading(true)
      else if (append) setIsLoadingMore(true)

      // Usar endpoints de filtrado IMAP eficientes
      let endpoint = recipientFilter === 'marcas' ? '/api/emails/for-marcas' : '/api/emails/for-tomas'
      let params = new URLSearchParams()

      params.append('limit', pageSize.toString())

      // Los filtros se manejan directamente en el endpoint IMAP
      // No necesitamos parámetros adicionales ya que el endpoint ya filtra por destinatario

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
      setTotalCount(data.total_found || 0)
      // Para filtros IMAP, no usamos paginación tradicional, solo mostramos los más recientes
      setTotalPages(1)
      setCurrentPage(1)

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
  }, [recipientFilter, pageSize])

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

  // Función para realizar búsqueda IMAP en el servidor
  const performSearch = async (query: string, page: number = 1) => {
    if (!query.trim()) {
      return
    }

    try {
      setIsSearching(true)

      // Usar el filtro de destinatario actual (marcas o tomas)
      const recipient = recipientFilter

      let url = `/api/emails/search?q=${encodeURIComponent(query)}&recipient=${recipient}&limit=20`

      console.log(`🔍 Frontend: Buscando "${query}" para ${recipient}@`)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      console.log(`✅ Frontend: Búsqueda encontró ${data.total_found} correos`)

      // Marcar correos como leídos si están en el estado local
      const emailsWithReadStatus = data.emails.map((email: any) => ({
        ...email,
        isRead: readEmails.has(email.id)
      }))

      // Para búsquedas, siempre reemplazar resultados (no paginación)
      setSearchResults(emailsWithReadStatus)
      setSearchTotalCount(data.total_found || 0)

    } catch (error) {
      console.error('❌ Error en búsqueda:', error)
      setSearchResults([])
      setSearchTotalCount(0)
    } finally {
      setIsSearching(false)
    }
  }

  // Función para manejar la búsqueda con debouncing
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)

    if (!query.trim()) {
      // Si no hay búsqueda, limpiar resultados y mostrar correos normales
      setSearchResults([])
      setSearchTotalCount(0)
      setIsSearching(false)
      return
    }

    // Cancelar búsqueda anterior si existe
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout)
    }

    // Mostrar estado de carga inmediatamente
    setIsSearching(true)

    // Debouncing: esperar 300ms después de que el usuario deje de escribir
    window.searchTimeout = setTimeout(() => {
      performSearch(query, 1)
    }, 300)
  }, [recipientFilter, readEmails])



  // Función para manejar selección de correo y marcarlo como leído
  const handleSelectEmail = useCallback(async (email: Email) => {
    // Seleccionar inmediatamente para UX rápida
    setSelectedEmail(email)

    // Cargar contenido completo en background si es necesario
    const fullEmail = await loadEmailContent(email)
    if (fullEmail !== email) {
      setSelectedEmail(fullEmail)
    }

    // Marcar como leído en la base de datos
    if (!readEmails.has(email.email_id)) {
      markAsRead(email.email_id)
    }
  }, [loadEmailContent, readEmails, markAsRead])

  // Efecto para cargar el estado de correos leídos al inicializar
  useEffect(() => {
    loadReadStatus()
  }, [loadReadStatus])

  // Efecto para cargar correos inmediatamente (sin polling)
  useEffect(() => {
    if (!isLoadingReadStatus) {
      fetchEmails()
    }
  }, [isLoadingReadStatus, fetchEmails])

  // Efecto para configurar polling después de la carga inicial
  useEffect(() => {
    if (!isLoadingReadStatus) {
      // Polling más inteligente: 10 segundos en lugar de 2
      // Solo recargar la primera página para detectar nuevos correos (sin mostrar loading)
      const interval = setInterval(() => {
        fetchEmails(1, false, true) // isPolling = true
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [fetchEmails, isLoadingReadStatus])

  // Efecto para resetear y cargar correos cuando cambia el filtro de destinatario
  useEffect(() => {
    setCurrentPage(1)
    setEmails([])
    setSearchQuery('') // Limpiar búsqueda al cambiar filtros
    setSearchResults([])
    setSearchTotalCount(0)
    if (!isLoadingReadStatus) {
      fetchEmails(1, false)
    }
  }, [recipientFilter, isLoadingReadStatus, fetchEmails])

  // Determinar qué correos mostrar (búsqueda o normales)
  const displayEmails = useMemo(() => {
    if (searchQuery.trim()) {
      return searchResults
    }
    return emails
  }, [emails, searchQuery, searchResults])

  // Determinar el total de correos para mostrar en el sidebar
  const totalDisplayCount = searchQuery.trim() ? searchTotalCount : totalCount

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <EmailSidebar
        onCompose={() => setIsComposeOpen(true)}
        connectionStatus={connectionStatus}
        emailCount={displayEmails.length}
        unreadCount={displayEmails.filter(email => !email.isRead).length}
        emailFilter={emailFilter}
        onFilterChange={setEmailFilter}
        subFilter={subFilter}
        onSubFilterChange={setSubFilter}
        recipientFilter={recipientFilter}
        onRecipientFilterChange={setRecipientFilter}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* Contenido principal */}
      {currentView === 'emails' ? (
        <>
          {/* Lista de correos */}
          <div className="w-[560px] min-w-[520px] max-w-[640px] border-r">
            <EmailList
              emails={displayEmails}
              selectedEmail={selectedEmail}
              onSelectEmail={handleSelectEmail}
              isLoading={isLoading && emails.length === 0}
              isSentView={emailFilter === 'sent'}
              currentFilter={emailFilter}
              onLoadMore={loadMoreEmails}
              hasMore={searchQuery.trim() ? false : currentPage < totalPages}
              isLoadingMore={isLoadingMore}
              totalCount={totalDisplayCount}
              onSearch={handleSearch}
              searchQuery={searchQuery}
              isInitialLoading={false}
              loadingProgress={loadingProgress}
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
        </>
      ) : currentView === 'postits' ? (
        /* Vista de Post-its */
        <PostItBoard
          onGenerateEmail={(emailData) => {
            // Configurar datos pre-rellenados y abrir el composer
            setComposePrefilledData({
              to: emailData.to,
              subject: emailData.subject,
              body: emailData.body
            })
            setSelectedEmail(null) // Limpiar email seleccionado para que use los datos pre-rellenados
            setIsComposeOpen(true)
          }}
        />
      ) : (
        /* Vista de Contactos */
        <ContactsManager />
      )}

      {/* Dialog para componer correos */}
      <ComposeDialog
        open={isComposeOpen}
        onOpenChange={(open) => {
          setIsComposeOpen(open)
          if (!open) {
            setComposePrefilledData(null) // Limpiar datos pre-rellenados al cerrar
          }
        }}
        replyTo={selectedEmail}
        prefilledData={composePrefilledData}
      />

      {/* Notificaciones */}
      <Toaster />
    </div>
  )
}
