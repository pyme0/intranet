import { NextRequest, NextResponse } from 'next/server'

// URL del servidor Python
const PYTHON_SERVER_URL = 'http://localhost:8080'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10') // Límite optimizado
    const folder = searchParams.get('folder') || 'INBOX'
    const searchQuery = searchParams.get('search') || ''

    console.log(`⚡ Proxy LIGERO: Obteniendo correos - página ${page}, límite ${limit}, carpeta: ${folder}`)
    
    if (searchQuery) {
      console.log(`🔍 Proxy LIGERO: Búsqueda: "${searchQuery}"`)
    }

    // Construir URL para el servidor Python (endpoint ligero)
    const pythonUrl = new URL('/api/emails/light', PYTHON_SERVER_URL)
    pythonUrl.searchParams.set('page', page.toString())
    pythonUrl.searchParams.set('limit', limit.toString())
    pythonUrl.searchParams.set('folder', folder)
    
    console.log(`🔗 Proxy LIGERO: Llamando a ${pythonUrl.toString()}`)

    // Hacer request al servidor Python
    const response = await fetch(pythonUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Error del servidor Python: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    console.log(`✅ Proxy LIGERO: Recibidos ${data.emails?.length || 0} correos de ${data.total || 0} total`)

    // Transformar los datos del servidor Python al formato esperado por el frontend
    const transformedEmails = (data.emails || []).map((email: any, index: number) => ({
      id: email.email_id || index.toString(),
      subject: email.subject || 'Sin asunto',
      from: email.from || 'Desconocido',
      fromName: email.from?.split('<')[0]?.trim().replace(/"/g, '') || email.from || 'Desconocido',
      to: email.to || '',
      date: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
      preview: email.preview || 'Sin contenido disponible',
      hasAttachments: false, // No detectamos attachments en modo ligero
      isRead: false, // Por implementar
      uid: email.email_id || index,
      // NO incluimos body ni html_body para reducir tamaño
      light_mode: true // Indicador de modo ligero
    }))

    // Filtrar por búsqueda si se especifica
    let filteredEmails = transformedEmails
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredEmails = transformedEmails.filter((email: any) => 
        email.subject.toLowerCase().includes(query) ||
        email.from.toLowerCase().includes(query) ||
        email.preview.toLowerCase().includes(query)
      )
    }

    // Calcular paginación para búsquedas
    const totalEmails = searchQuery ? filteredEmails.length : (data.total || 0)
    const totalPages = Math.ceil(totalEmails / limit)

    // Si hay búsqueda, aplicar paginación local
    let finalEmails = filteredEmails
    if (searchQuery) {
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      finalEmails = filteredEmails.slice(startIndex, endIndex)
    }

    return NextResponse.json({
      emails: finalEmails,
      count: totalEmails,
      page,
      limit,
      totalPages,
      folder,
      searchQuery: searchQuery || null,
      total_count: totalEmails,
      page_size: limit,
      total_pages: totalPages,
      light_mode: true, // Indicador de modo ligero
      status: {
        connected: true,
        error: null,
        last_check: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error en proxy ligero de correos:', error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error de conexión con servidor de correos',
      emails: [],
      count: 0,
      total_count: 0,
      page: 1,
      page_size: 10,
      total_pages: 0,
      folder: 'INBOX',
      searchQuery: null,
      light_mode: true,
      status: {
        connected: false,
        error: error instanceof Error ? error.message : 'Error de conexión con servidor de correos',
        last_check: new Date().toISOString()
      }
    }, { status: 500 })
  }
}
