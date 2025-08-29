import { NextRequest, NextResponse } from 'next/server'
import { imapPool, listMailboxes } from '@/lib/imap-connection'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando diagnóstico completo de IMAP...')
    
    const client = await imapPool.getConnection()
    
    // Listar todas las carpetas
    const mailboxes = await listMailboxes()
    
    // Obtener información detallada de cada carpeta
    const folderStats = []
    
    for (const mailbox of mailboxes) {
      try {
        console.log(`📂 Analizando carpeta: ${mailbox.name}`)
        
        const lock = await client.getMailboxLock(mailbox.name)
        
        try {
          const stats = {
            name: mailbox.name,
            exists: lock.exists || 0,
            recent: lock.recent || 0,
            unseen: lock.unseen || 0,
            flags: Array.isArray(mailbox.flags) ? Array.from(mailbox.flags) : [],
            path: mailbox.path || mailbox.name,
            delimiter: mailbox.delimiter || '.',
            subscribed: mailbox.subscribed || false,
            selectable: !mailbox.flags || !mailbox.flags.has('\\Noselect')
          }
          
          folderStats.push(stats)
          console.log(`📊 ${mailbox.name}: ${stats.exists} correos, ${stats.unseen} no leídos`)
          
        } finally {
          lock.release()
        }
        
      } catch (error) {
        console.error(`❌ Error analizando carpeta ${mailbox.name}:`, error)
        folderStats.push({
          name: mailbox.name,
          error: error instanceof Error ? error.message : 'Error desconocido',
          exists: 0,
          recent: 0,
          unseen: 0,
          flags: [],
          path: mailbox.path || mailbox.name,
          delimiter: mailbox.delimiter || '.',
          subscribed: false,
          selectable: false
        })
      }
    }
    
    // Calcular totales
    const totalEmails = folderStats.reduce((sum, folder) => sum + (folder.exists || 0), 0)
    const totalUnseen = folderStats.reduce((sum, folder) => sum + (folder.unseen || 0), 0)
    
    // Información detallada de conexión
    const connectionInfo = {
      host: 'imap.hostinger.com',
      port: 993,
      secure: true,
      user: 'tomas@patriciastocker.com',
      connected: !client.destroyed,
      timestamp: new Date().toISOString(),
      server_info: {
        greeting: client.greeting || 'No disponible',
        capabilities: client.capabilities ? Array.from(client.capabilities) : [],
        namespace: client.namespace || null,
        id: client.id || null
      }
    }
    
    const diagnostics = {
      connection: connectionInfo,
      folders: folderStats,
      summary: {
        total_folders: folderStats.length,
        total_emails: totalEmails,
        total_unseen: totalUnseen,
        folders_with_emails: folderStats.filter(f => (f.exists || 0) > 0).length,
        largest_folder: folderStats.reduce((max, folder) => 
          (folder.exists || 0) > (max.exists || 0) ? folder : max, 
          { name: 'ninguna', exists: 0 }
        )
      },
      recommendations: []
    }
    
    // Generar recomendaciones
    if (totalEmails === 0) {
      diagnostics.recommendations.push({
        type: 'warning',
        message: 'No se encontraron correos en ninguna carpeta. Verificar credenciales o configuración de cuenta.'
      })
    }
    
    if (folderStats.some(f => f.error)) {
      diagnostics.recommendations.push({
        type: 'error',
        message: 'Algunas carpetas no pudieron ser analizadas. Revisar permisos de acceso.'
      })
    }
    
    if (totalEmails > 0) {
      const mainFolder = folderStats.find(f => f.name === 'INBOX') || folderStats[0]
      diagnostics.recommendations.push({
        type: 'success',
        message: `Se encontraron ${totalEmails} correos. Carpeta principal: ${diagnostics.summary.largest_folder.name} con ${diagnostics.summary.largest_folder.exists} correos.`
      })
    }
    
    console.log('✅ Diagnóstico completo finalizado')
    console.log(`📊 Resumen: ${totalEmails} correos en ${folderStats.length} carpetas`)
    
    return NextResponse.json(diagnostics)
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error)
    
    return NextResponse.json({
      connection: {
        host: 'imap.hostinger.com',
        port: 993,
        secure: true,
        user: 'tomas@patriciastocker.com',
        connected: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      folders: [],
      summary: {
        total_folders: 0,
        total_emails: 0,
        total_unseen: 0,
        folders_with_emails: 0,
        largest_folder: { name: 'error', exists: 0 }
      },
      recommendations: [{
        type: 'error',
        message: `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }]
    }, { status: 500 })
  }
}
