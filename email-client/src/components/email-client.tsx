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

  // Función para obtener correos desde la API proxy
  const fetchEmails = useCallback(async () => {
    try {
      let endpoint = '/api/all-emails'
      let params = new URLSearchParams()

      // Configurar endpoint y parámetros según el filtro
      if (emailFilter === 'sent') {
        endpoint = '/api/sent-emails'
        // Para enviados, filtrar por cuenta de origen
        if (subFilter === 'marcas') {
          params.append('from_account', 'marcas@patriciastocker.com')
        } else if (subFilter === 'tomas') {
          params.append('from_account', 'tomas@patriciastocker.com')
        }
      } else {
        // Para bandeja principal, filtrar por cuenta de destino
        if (subFilter === 'marcas') {
          params.append('account', 'marcas@patriciastocker.com')
        } else if (subFilter === 'tomas') {
          params.append('account', 'tomas@patriciastocker.com')
        }
      }

      const url = params.toString() ? `${endpoint}?${params}` : endpoint
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

      setEmails(emailsWithReadStatus)

      setConnectionStatus(data.status)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching emails:', error)
      setConnectionStatus({
        connected: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        last_check: new Date().toLocaleTimeString()
      })
      setIsLoading(false)
    }
  }, [emailFilter, subFilter, readEmails])

  // Función para manejar selección de correo y marcarlo como leído
  const handleSelectEmail = (email: Email) => {
    setSelectedEmail(email)

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

      // Polling cada 2 segundos (igual que el cliente Python original)
      const interval = setInterval(fetchEmails, 2000)

      return () => clearInterval(interval)
    }
  }, [fetchEmails, isLoadingReadStatus])

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
