import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '50'
    const account = searchParams.get('account')
    const folder = searchParams.get('folder') || 'INBOX'
    
    // Usar el nuevo endpoint que carga preview
    let url = `http://localhost:8080/api/emails/with-preview?page=${page}&limit=${limit}&folder=${folder}`
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
    console.error('❌ Error en proxy de emails con preview:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        emails: [],
        count: 0,
        total_count: 0,
        page: 1,
        page_size: 50,
        total_pages: 0
      },
      { status: 500 }
    )
  }
}
