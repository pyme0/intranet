import { NextRequest, NextResponse } from 'next/server'

// URL del servidor Python
const PYTHON_SERVER_URL = 'http://localhost:8080'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '5')
    const dateFrom = searchParams.get('date_from') || ''

    console.log(`📧 Proxy TOMÁS: Obteniendo correos para tomas@ - límite: ${limit}, fecha: ${dateFrom}`)

    // Construir URL para el servidor Python
    const pythonUrl = new URL('/api/emails/for-tomas', PYTHON_SERVER_URL)
    pythonUrl.searchParams.set('limit', limit.toString())
    if (dateFrom) {
      pythonUrl.searchParams.set('date_from', dateFrom)
    }
    
    console.log(`🔗 Proxy TOMÁS: Llamando a ${pythonUrl.toString()}`)

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
    
    console.log(`✅ Proxy TOMÁS: Encontrados ${data.total_found} correos, mostrando ${data.showing}`)

    // Transformar los datos del servidor Python al formato esperado por el frontend
    const transformedEmails = (data.emails || []).map((email: any, index: number) => ({
      id: email.email_id || index.toString(),
      email_id: email.email_id || index.toString(), // Agregar email_id para compatibilidad
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
      filter_applied: 'tomas@patriciastocker.com'
    }))

    return NextResponse.json({
      emails: transformedEmails,
      total_found: data.total_found || 0,
      showing: data.showing || 0,
      filter: 'tomas@patriciastocker.com',
      date_from: dateFrom || null,
      status: {
        connected: true,
        error: null,
        last_check: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error en proxy de correos para tomas:', error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error obteniendo correos para tomas',
      emails: [],
      total_found: 0,
      showing: 0,
      filter: 'tomas@patriciastocker.com',
      date_from: null,
      status: {
        connected: false,
        error: error instanceof Error ? error.message : 'Error obteniendo correos para tomas',
        last_check: new Date().toISOString()
      }
    }, { status: 500 })
  }
}
