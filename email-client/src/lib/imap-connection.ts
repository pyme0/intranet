import { ImapFlow } from 'imapflow'

// Configuración IMAP para Hostinger
const IMAP_CONFIG = {
  host: 'imap.hostinger.com',
  port: 993,
  secure: true,
  auth: {
    user: 'tomas@patriciastocker.com',
    pass: '$Full5tack$'
  },
  logger: false
}

// Pool de conexiones IMAP
class IMAPConnectionPool {
  private connections: Map<string, ImapFlow> = new Map()
  private connectionPromises: Map<string, Promise<ImapFlow>> = new Map()

  async getConnection(key: string = 'default'): Promise<ImapFlow> {
    // Si ya existe una conexión activa, reutilizarla
    const existingConnection = this.connections.get(key)
    if (existingConnection && !existingConnection.destroyed) {
      return existingConnection
    }

    // Si ya hay una promesa de conexión en progreso, esperarla
    const existingPromise = this.connectionPromises.get(key)
    if (existingPromise) {
      return existingPromise
    }

    // Crear nueva conexión
    const connectionPromise = this.createConnection(key)
    this.connectionPromises.set(key, connectionPromise)

    try {
      const connection = await connectionPromise
      this.connections.set(key, connection)
      this.connectionPromises.delete(key)
      return connection
    } catch (error) {
      this.connectionPromises.delete(key)
      throw error
    }
  }

  private async createConnection(key: string): Promise<ImapFlow> {
    console.log(`🔗 Creando nueva conexión IMAP: ${key}`)
    
    const client = new ImapFlow(IMAP_CONFIG)
    
    // Manejar eventos de conexión
    client.on('error', (error) => {
      console.error(`❌ Error en conexión IMAP ${key}:`, error)
      this.connections.delete(key)
    })

    client.on('close', () => {
      console.log(`🔌 Conexión IMAP cerrada: ${key}`)
      this.connections.delete(key)
    })

    await client.connect()
    console.log(`✅ Conexión IMAP establecida: ${key}`)
    
    return client
  }

  async closeConnection(key: string = 'default') {
    const connection = this.connections.get(key)
    if (connection && !connection.destroyed) {
      await connection.logout()
      this.connections.delete(key)
    }
  }

  async closeAllConnections() {
    const closePromises = Array.from(this.connections.keys()).map(key => 
      this.closeConnection(key)
    )
    await Promise.all(closePromises)
  }
}

// Instancia singleton del pool
const imapPool = new IMAPConnectionPool()

// Funciones de utilidad para correos
export interface EmailHeader {
  uid: number
  email_id: string
  subject: string
  from: string
  from_name: string
  from_email: string
  to: string
  date: string
  parsed_date: string
  timestamp: number
  message_id: string
  preview?: string
  attachments?: Array<{
    filename: string
    content_type: string
    size: number
  }>
  isRead?: boolean
}

export interface EmailsResponse {
  emails: EmailHeader[]
  count: number
  total_count: number
  page: number
  page_size: number
  total_pages: number
  status: {
    connected: boolean
    error: string | null
    last_check: string
  }
}

export async function listMailboxes(): Promise<any[]> {
  try {
    const client = await imapPool.getConnection()

    // Listar todas las carpetas incluyendo subcarpetas
    const mailboxes = await client.list()
    console.log('📁 Carpetas disponibles:', mailboxes.map(m => {
      let flags = 'sin flags'
      if (m.flags) {
        if (Array.isArray(m.flags)) {
          flags = m.flags.join(', ')
        } else if (m.flags instanceof Set) {
          flags = Array.from(m.flags).join(', ')
        } else {
          flags = String(m.flags)
        }
      }
      return `${m.name} (${flags})`
    }))

    // También listar subcarpetas específicamente bajo INBOX
    try {
      const inboxSubfolders = await client.list('INBOX', '*')
      console.log('📂 Subcarpetas de INBOX:', inboxSubfolders.map(m => {
        let flags = 'sin flags'
        if (m.flags) {
          if (Array.isArray(m.flags)) {
            flags = m.flags.join(', ')
          } else if (m.flags instanceof Set) {
            flags = Array.from(m.flags).join(', ')
          } else {
            flags = String(m.flags)
          }
        }
        return `${m.name} (${flags})`
      }))
    } catch (subError) {
      console.log('📂 No se pudieron listar subcarpetas de INBOX:', subError)
    }

    return mailboxes
  } catch (error) {
    console.error('❌ Error listando carpetas:', error)
    return []
  }
}

export async function getEmailsWithPreview(
  page: number = 1,
  limit: number = 50,
  folder: string = 'INBOX'
): Promise<EmailsResponse> {
  try {
    const client = await imapPool.getConnection()

    // Primero listar carpetas para debug
    await listMailboxes()

    // Seleccionar carpeta
    console.log(`📂 Intentando seleccionar carpeta: ${folder}`)
    const mailbox = await client.getMailboxLock(folder)
    
    try {
      // Obtener total de correos
      const totalCount = mailbox.exists || 0
      const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 0

      console.log(`📊 Total de correos en ${folder}: ${totalCount}`)

      // Si no hay correos, retornar respuesta vacía
      if (totalCount === 0) {
        return {
          emails: [],
          count: 0,
          total_count: 0,
          page,
          page_size: limit,
          total_pages: 0,
          status: {
            connected: true,
            error: null,
            last_check: new Date().toISOString()
          }
        }
      }

      // Calcular rango de UIDs para la página
      const startIndex = Math.max(1, totalCount - (page * limit) + 1)
      const endIndex = Math.max(1, totalCount - ((page - 1) * limit))

      console.log(`📍 Rango calculado: ${startIndex}:${endIndex} (página ${page}, límite ${limit})`)

      if (startIndex > totalCount) {
        return {
          emails: [],
          count: 0,
          total_count: totalCount,
          page,
          page_size: limit,
          total_pages: totalPages,
          status: {
            connected: true,
            error: null,
            last_check: new Date().toISOString()
          }
        }
      }

      // Obtener correos con headers
      const messages = client.fetch(`${startIndex}:${endIndex}`, {
        envelope: true,
        bodyStructure: true,
        uid: true,
        flags: true,
        bodyParts: ['TEXT'] // Para preview
      })

      const emails: EmailHeader[] = []
      
      for await (const message of messages) {
        const envelope = message.envelope
        if (!envelope) continue

        // Extraer preview del texto
        let preview = ''
        if (message.bodyParts && message.bodyParts.get('TEXT')) {
          const textPart = message.bodyParts.get('TEXT')
          if (textPart) {
            preview = textPart.toString().substring(0, 200).replace(/\s+/g, ' ').trim()
          }
        }

        // Procesar remitente
        const fromAddress = envelope.from?.[0]
        const fromName = fromAddress?.name || fromAddress?.address || 'Desconocido'
        const fromEmail = fromAddress?.address || ''

        // Procesar destinatario
        const toAddress = envelope.to?.[0]?.address || ''

        const email: EmailHeader = {
          uid: message.uid,
          email_id: message.uid.toString(),
          subject: envelope.subject || 'Sin asunto',
          from: `${fromName} <${fromEmail}>`,
          from_name: fromName,
          from_email: fromEmail,
          to: toAddress,
          date: envelope.date?.toISOString() || new Date().toISOString(),
          parsed_date: envelope.date?.toISOString() || new Date().toISOString(),
          timestamp: envelope.date?.getTime() || Date.now(),
          message_id: envelope.messageId || `${message.uid}@local`,
          preview,
          attachments: [], // TODO: Procesar attachments si es necesario
          isRead: message.flags?.has('\\Seen') || false
        }

        emails.push(email)
      }

      // Ordenar por timestamp descendente (más recientes primero)
      emails.sort((a, b) => b.timestamp - a.timestamp)

      return {
        emails,
        count: emails.length,
        total_count: totalCount,
        page,
        page_size: limit,
        total_pages: totalPages,
        status: {
          connected: true,
          error: null,
          last_check: new Date().toISOString()
        }
      }

    } finally {
      mailbox.release()
    }

  } catch (error) {
    console.error('❌ Error obteniendo correos:', error)
    
    return {
      emails: [],
      count: 0,
      total_count: 0,
      page,
      page_size: limit,
      total_pages: 0,
      status: {
        connected: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        last_check: new Date().toISOString()
      }
    }
  }
}

export { imapPool }
