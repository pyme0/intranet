import { NextRequest, NextResponse } from 'next/server'
import { imapPool } from '@/lib/imap-connection'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando diagnóstico profundo de IMAP...')
    
    const client = await imapPool.getConnection()
    
    const diagnostics = {
      connection: {
        host: 'imap.hostinger.com',
        port: 993,
        secure: true,
        user: 'tomas@patriciastocker.com',
        connected: !client.destroyed,
        timestamp: new Date().toISOString()
      },
      folder_exploration: [],
      namespace_info: null,
      capabilities: [],
      recommendations: []
    }
    
    // 1. Obtener información de namespace
    try {
      diagnostics.namespace_info = client.namespace || null
      console.log('📋 Namespace info:', diagnostics.namespace_info)
    } catch (error) {
      console.log('❌ Error obteniendo namespace:', error)
    }
    
    // 2. Obtener capabilities
    try {
      diagnostics.capabilities = client.capabilities ? Array.from(client.capabilities) : []
      console.log('🔧 Capabilities:', diagnostics.capabilities.length, 'disponibles')
    } catch (error) {
      console.log('❌ Error obteniendo capabilities:', error)
    }
    
    // 3. Explorar diferentes patrones de carpetas
    const patterns = [
      { name: 'Root level', pattern: '', reference: '' },
      { name: 'INBOX children', pattern: '*', reference: 'INBOX' },
      { name: 'INBOX.* pattern', pattern: 'INBOX.*', reference: '' },
      { name: 'All folders', pattern: '*', reference: '' },
      { name: 'Deep search', pattern: '**', reference: '' }
    ]
    
    for (const patternInfo of patterns) {
      try {
        console.log(`🔍 Explorando: ${patternInfo.name} (${patternInfo.reference}/${patternInfo.pattern})`)
        
        const folders = await client.list(patternInfo.reference, patternInfo.pattern)
        
        const folderInfo = {
          pattern: patternInfo.name,
          reference: patternInfo.reference,
          search_pattern: patternInfo.pattern,
          folders_found: folders.length,
          folders: folders.map(f => ({
            name: f.name,
            path: f.path || f.name,
            flags: f.flags ? (f.flags instanceof Set ? Array.from(f.flags) : f.flags) : [],
            delimiter: f.delimiter || '.',
            subscribed: f.subscribed || false,
            selectable: !f.flags || !f.flags.has || !f.flags.has('\\Noselect')
          }))
        }
        
        diagnostics.folder_exploration.push(folderInfo)
        
        console.log(`📁 ${patternInfo.name}: ${folders.length} carpetas encontradas`)
        folders.forEach(f => {
          console.log(`   - ${f.name} (${f.path || f.name})`)
        })
        
      } catch (error) {
        console.log(`❌ Error explorando ${patternInfo.name}:`, error)
        diagnostics.folder_exploration.push({
          pattern: patternInfo.name,
          reference: patternInfo.reference,
          search_pattern: patternInfo.pattern,
          error: error instanceof Error ? error.message : 'Error desconocido',
          folders_found: 0,
          folders: []
        })
      }
    }
    
    // 4. Intentar acceder a carpetas específicas que podrían tener correos
    const testFolders = [
      'INBOX',
      'INBOX.INBOX', 
      'Inbox',
      'Mail',
      'INBOX.Mail',
      'Sent',
      'INBOX.Sent',
      'Sent Messages',
      'INBOX.Sent Messages'
    ]
    
    const folderTests = []
    
    for (const folderName of testFolders) {
      try {
        console.log(`🧪 Probando acceso a carpeta: ${folderName}`)
        
        const lock = await client.getMailboxLock(folderName)
        
        const testResult = {
          folder_name: folderName,
          accessible: true,
          exists: lock.exists || 0,
          recent: lock.recent || 0,
          unseen: lock.unseen || 0,
          uidNext: lock.uidNext || 0,
          uidValidity: lock.uidValidity || 0
        }
        
        folderTests.push(testResult)
        
        console.log(`✅ ${folderName}: ${testResult.exists} correos, ${testResult.unseen} no leídos`)
        
        lock.release()
        
      } catch (error) {
        console.log(`❌ ${folderName}: No accesible - ${error}`)
        folderTests.push({
          folder_name: folderName,
          accessible: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
          exists: 0,
          recent: 0,
          unseen: 0
        })
      }
    }
    
    diagnostics.folder_tests = folderTests
    
    // 5. Generar recomendaciones
    const totalEmails = folderTests.reduce((sum, test) => sum + (test.exists || 0), 0)
    
    if (totalEmails === 0) {
      diagnostics.recommendations.push({
        type: 'critical',
        message: 'No se encontraron correos en ninguna carpeta probada. Posibles causas: cuenta vacía, credenciales incorrectas, o estructura de carpetas no estándar.'
      })
    }
    
    const accessibleFolders = folderTests.filter(t => t.accessible)
    if (accessibleFolders.length > 0) {
      diagnostics.recommendations.push({
        type: 'info',
        message: `Se pudieron acceder a ${accessibleFolders.length} carpetas: ${accessibleFolders.map(f => f.folder_name).join(', ')}`
      })
    }
    
    const foldersWithEmails = folderTests.filter(t => (t.exists || 0) > 0)
    if (foldersWithEmails.length > 0) {
      diagnostics.recommendations.push({
        type: 'success',
        message: `Carpetas con correos encontradas: ${foldersWithEmails.map(f => `${f.folder_name} (${f.exists})`).join(', ')}`
      })
    }
    
    console.log('✅ Diagnóstico profundo completado')
    
    return NextResponse.json(diagnostics)
    
  } catch (error) {
    console.error('❌ Error en diagnóstico profundo:', error)
    
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
      folder_exploration: [],
      folder_tests: [],
      namespace_info: null,
      capabilities: [],
      recommendations: [{
        type: 'error',
        message: `Error crítico en diagnóstico: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }]
    }, { status: 500 })
  }
}
