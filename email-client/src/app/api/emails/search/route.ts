import { NextRequest, NextResponse } from 'next/server'

// URL del servidor Python
const PYTHON_SERVER_URL = 'http://localhost:8080'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const recipientFilter = searchParams.get('recipient') || 'marcas'
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query.trim()) {
      return NextResponse.json({
        error: 'Query de búsqueda requerido',
        emails: [],
        total_found: 0,
        showing: 0,
        query: '',
        recipient_filter: recipientFilter
      }, { status: 400 })
    }

    console.log(`🔍 Proxy BÚSQUEDA: "${query}" para ${recipientFilter}@ - límite: ${limit}`)

    // Construir URL para el servidor Python
    const pythonUrl = new URL('/api/emails/search', PYTHON_SERVER_URL)
    pythonUrl.searchParams.set('q', query)
    pythonUrl.searchParams.set('recipient', recipientFilter)
    pythonUrl.searchParams.set('limit', limit.toString())
    
    console.log(`🔗 Proxy BÚSQUEDA: Llamando a ${pythonUrl.toString()}`)

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
    
    console.log(`✅ Proxy BÚSQUEDA: Encontrados ${data.total_found} correos, mostrando ${data.showing}`)

    // Transformar los datos del servidor Python al formato esperado por el frontend
    const transformedEmails = (data.emails || []).map((email: any, index: number) => ({
      id: email.email_id || index.toString(),
      subject: email.subject || 'Sin asunto',
      from: email.from || 'Desconocido',
      fromName: email.from?.split('<')[0]?.trim().replace(/"/g, '') || email.from || 'Desconocido',
      to: email.to || '',
      date: email.date ? new Date(email.date).toISOString() : new Date().toISOString(),
      preview: email.preview || 'Sin contenido disponible',
      body: email.body || '',
      html_body: email.html_body || '',
      hasAttachments: false, // Por implementar
      isRead: false, // Por implementar
      uid: email.email_id || index,
      search_result: true, // Indicador de resultado de búsqueda
      search_query: query
    }))

    return NextResponse.json({
      emails: transformedEmails,
      total_found: data.total_found || 0,
      showing: data.showing || 0,
      query: query,
      recipient_filter: recipientFilter,
      search_criteria: data.search_criteria || '',
      status: {
        connected: true,
        error: null,
        last_check: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error en proxy de búsqueda de correos:', error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error en búsqueda de correos',
      emails: [],
      total_found: 0,
      showing: 0,
      query: searchParams.get('q') || '',
      recipient_filter: searchParams.get('recipient') || 'marcas',
      search_criteria: '',
      status: {
        connected: false,
        error: error instanceof Error ? error.message : 'Error en búsqueda de correos',
        last_check: new Date().toISOString()
      }
    }, { status: 500 })
  }
}
