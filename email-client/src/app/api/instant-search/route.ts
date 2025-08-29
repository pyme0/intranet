import { NextRequest, NextResponse } from 'next/server'

// URL del servidor de búsqueda instantánea
const INSTANT_SEARCH_URL = 'http://localhost:8081'

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
        recipient_filter: recipientFilter,
        search_time_ms: 0
      }, { status: 400 })
    }

    console.log(`⚡ Búsqueda instantánea: "${query}" para ${recipientFilter}@ - límite: ${limit}`)

    // Construir URL para el servidor de búsqueda instantánea
    const searchUrl = new URL('/api/instant-search', INSTANT_SEARCH_URL)
    searchUrl.searchParams.set('q', query)
    searchUrl.searchParams.set('recipient', recipientFilter)
    searchUrl.searchParams.set('limit', limit.toString())
    
    console.log(`🔗 Llamando a búsqueda instantánea: ${searchUrl.toString()}`)

    const startTime = Date.now()

    // Hacer request al servidor de búsqueda instantánea
    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const endTime = Date.now()
    const totalTime = endTime - startTime

    if (!response.ok) {
      throw new Error(`Error del servidor de búsqueda: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    console.log(`⚡ Búsqueda instantánea completada: ${data.total_found} correos en ${totalTime}ms (servidor: ${data.search_time_ms}ms)`)

    // Los datos ya vienen en el formato correcto del servidor instantáneo
    return NextResponse.json({
      ...data,
      proxy_time_ms: totalTime,
      total_time_ms: totalTime + (data.search_time_ms || 0)
    })

  } catch (error) {
    console.error('❌ Error en proxy de búsqueda instantánea:', error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error en búsqueda instantánea',
      emails: [],
      total_found: 0,
      showing: 0,
      query: searchParams.get('q') || '',
      recipient_filter: searchParams.get('recipient') || 'marcas',
      search_time_ms: 0,
      search_method: 'SQLite FTS5 Local (Error)',
      status: {
        connected: false,
        error: error instanceof Error ? error.message : 'Error en búsqueda instantánea',
        last_check: new Date().toISOString()
      }
    }, { status: 500 })
  }
}
