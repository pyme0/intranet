import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const folder = searchParams.get('folder') || 'INBOX'
    const account = searchParams.get('account')
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '50'
    
    if (!query.trim()) {
      return NextResponse.json({
        emails: [],
        total_count: 0,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: 0,
        query: query
      })
    }

    // Construir URL para el backend Python
    let url = `http://localhost:8080/api/search-emails?q=${encodeURIComponent(query)}&folder=${folder}&page=${page}&limit=${limit}`
    
    if (account) {
      url += `&account=${encodeURIComponent(account)}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Error en búsqueda de correos:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        emails: [],
        total_count: 0,
        page: 1,
        limit: 50,
        total_pages: 0,
        query: ''
      },
      { status: 500 }
    )
  }
}
