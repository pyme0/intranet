import { NextRequest, NextResponse } from 'next/server'

// URL del servidor Python
const PYTHON_SERVER_URL = 'http://localhost:8080'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const emailId = params.id

    console.log(`📧 Proxy COMPLETO: Obteniendo correo completo - ID: ${emailId}`)

    // Construir URL para el servidor Python
    const pythonUrl = new URL(`/api/emails/${emailId}/full`, PYTHON_SERVER_URL)
    
    console.log(`🔗 Proxy COMPLETO: Llamando a ${pythonUrl.toString()}`)

    // Hacer request al servidor Python
    const response = await fetch(pythonUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Correo no encontrado' },
          { status: 404 }
        )
      }
      throw new Error(`Error del servidor Python: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    console.log(`✅ Proxy COMPLETO: Correo completo obtenido - ID: ${emailId}`)

    // Transformar los datos del servidor Python al formato esperado por el frontend
    const email = data.email
    const transformedEmail = {
      id: email.email_id || emailId,
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
      uid: email.email_id || emailId,
      full_content: true // Indicador de contenido completo
    }

    return NextResponse.json({
      email: transformedEmail,
      status: {
        connected: true,
        error: null,
        last_check: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error(`❌ Error en proxy completo de correo ${params.id}:`, error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error obteniendo correo completo',
      status: {
        connected: false,
        error: error instanceof Error ? error.message : 'Error obteniendo correo completo',
        last_check: new Date().toISOString()
      }
    }, { status: 500 })
  }
}
