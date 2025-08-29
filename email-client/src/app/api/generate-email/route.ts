import { NextRequest, NextResponse } from 'next/server'
import sqlite3 from 'sqlite3'

const CONTACTS_DB_PATH = './contacts.db'

async function getContactsDatabase() {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    const db = new sqlite3.Database(CONTACTS_DB_PATH, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve(db)
      }
    })
  })
}

async function findRelatedContactsWithAI(content: string): Promise<any[]> {
  const OPENROUTER_API_KEY = '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'
  const MODEL = 'meta-llama/llama-3.3-70b-instruct:free'

  const db = await getContactsDatabase()
  const allContacts = await new Promise<any[]>((resolve, reject) => {
    db.all('SELECT * FROM contacts ORDER BY name ASC', (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows || [])
      }
      db.close()
    })
  })

  if (allContacts.length === 0) {
    return []
  }

  const contactsList = allContacts.map(c => `- ${c.name} (${c.alias}) - ${c.email}`).join('\n')

  const prompt = `Analiza el siguiente contenido de un post-it y encuentra el contacto más relevante de la lista.

CONTENIDO DEL POST-IT:
${content}

LISTA DE CONTACTOS DISPONIBLES:
${contactsList}

INSTRUCCIONES:
1. Analiza el contenido del post-it buscando nombres, referencias a personas, o contexto que pueda relacionarse con algún contacto
2. Encuentra el contacto más probable basándote en:
   - Nombres mencionados directamente
   - Alias o apodos
   - Contexto profesional o personal
   - Referencias indirectas
3. Si no encuentras una relación clara, responde "NINGUNO"

Responde SOLO con el nombre del contacto encontrado o "NINGUNO".`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Patricia Stocker Contact Finder'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 100,
        top_p: 1
      })
    })

    if (!response.ok) {
      console.error('OpenRouter API error:', response.status)
      return fallbackContactSearch(content, allContacts)
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content?.trim()

    if (!aiResponse || aiResponse === 'NINGUNO') {
      return fallbackContactSearch(content, allContacts)
    }

    const foundContact = allContacts.find(contact =>
      contact.name.toLowerCase() === aiResponse.toLowerCase() ||
      aiResponse.toLowerCase().includes(contact.name.toLowerCase()) ||
      aiResponse.toLowerCase().includes(contact.alias.toLowerCase())
    )

    if (foundContact) {
      console.log(`🤖 IA encontró contacto: ${foundContact.name}`)
      return [foundContact]
    } else {
      console.log(`🤖 IA sugirió "${aiResponse}" pero no se encontró en la base de datos`)
      return fallbackContactSearch(content, allContacts)
    }

  } catch (error) {
    console.error('Error with AI contact search:', error)
    return fallbackContactSearch(content, allContacts)
  }
}

function fallbackContactSearch(content: string, allContacts: any[]): any[] {
  // FILTRADO INTELIGENTE MEJORADO - Evitar términos irrelevantes

  // Stop words que no deben usarse para búsqueda de contactos
  const stopWords = [
    'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'sobre', 'todo', 'también', 'tras', 'otro', 'algún', 'tanto', 'muy', 'ya', 'sea', 'puede', 'tiene', 'hace', 'hay', 'está', 'han', 'ser', 'si', 'me', 'mi', 'tu', 'él', 'ella', 'nos', 'vos', 'ellos', 'ellas',
    'deberia', 'desistir', 'del', 'uso', 'utilizado', 'preguntarle', 'pregunta', 'consulta', 'sobre', 'acerca', 'respecto', 'mediante', 'durante', 'antes', 'después', 'mientras', 'cuando', 'donde', 'como', 'porque', 'aunque', 'sino', 'pero', 'mas', 'menos', 'mucho', 'poco', 'bien', 'mal', 'mejor', 'peor',
    'debería', 'deberían', 'podría', 'podrían', 'tendría', 'tendrían', 'haría', 'harían', 'sería', 'serían', 'estaría', 'estarían',
    'preguntarle', 'preguntarles', 'consultarle', 'consultarles', 'contactar', 'contactarle', 'contactarles',
    'enviar', 'mandar', 'escribir', 'llamar', 'hablar', 'decir', 'comentar', 'informar', 'avisar', 'notificar',
    'revisar', 'verificar', 'confirmar', 'validar', 'comprobar', 'chequear'
  ]

  // Función para detectar nombres propios
  const isProperNoun = (word: string) => {
    if (!/^[A-Z][a-z]{2,}/.test(word)) return false

    const excludePatterns = [
      /^(Consulta|Marca|Registro|Cliente|Empresa|Abogado|Legal|Urgente|Pendiente|Solicitud|Carta|Documento|Email|Correo|Reunión|Meeting|Llamada|Teléfono)$/i,
      /^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)$/i,
      /^(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)$/i
    ]

    return !excludePatterns.some(pattern => pattern.test(word))
  }

  const words = content.split(/\s+/).filter(word => word.length > 0)

  // Priorizar nombres propios sobre palabras comunes
  const properNouns = words
    .filter(word => isProperNoun(word))
    .filter(word => !stopWords.includes(word.toLowerCase()))
    .map(word => word.toLowerCase())

  // Solo usar nombres propios para búsqueda de contactos
  const searchTerms = properNouns.length > 0 ? properNouns :
    words.filter(word => word.length > 2 && !stopWords.includes(word.toLowerCase()))

  if (searchTerms.length === 0) {
    return []
  }

  const matches = allContacts.filter(contact => {
    const contactText = `${contact.name} ${contact.alias} ${contact.email}`.toLowerCase()
    return searchTerms.some(term => contactText.includes(term))
  })

  return matches
}

function extractContactInfoFromContent(text: string) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const emails = text.match(emailRegex)

  const phoneRegex = /(\+?56)?[\s-]?[0-9]{1,2}[\s-]?[0-9]{4}[\s-]?[0-9]{4}/g
  const phones = text.match(phoneRegex)

  let detectedName = ''
  let detectedAlias = ''

  const contextPatterns = [
    /(?:reunión|meeting|junta|cita)\s+con\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /(?:hablar|llamar|contactar|escribir)\s+(?:a|con)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /(?:pregunt[aá]r|consultar)\s+a\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /(?:enviar|mandar)\s+(?:a|para)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /(?:cliente|sr|sra|don|doña)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:me|nos)\s+(?:escribió|llamó|contactó)/i
  ]

  for (const pattern of contextPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      detectedName = match[1].trim()
      detectedAlias = detectedName.split(' ')[0]
      break
    }
  }

  if (!detectedName) {
    const nameRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
    const possibleNames = text.match(nameRegex)

    const excludeWords = ['Consulta', 'Marca', 'Registro', 'Cliente', 'Empresa', 'Abogado', 'Legal', 'Urgente', 'Pendiente', 'Reunión', 'Meeting', 'Email', 'Correo']
    const filteredNames = possibleNames?.filter(name =>
      !excludeWords.some(word => name.includes(word)) && 
      name.length > 2 &&
      !/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo|Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)$/i.test(name)
    )

    if (filteredNames && filteredNames.length > 0) {
      detectedName = filteredNames[0]
      detectedAlias = detectedName.split(' ')[0]
    }
  }

  return {
    email: emails?.[0] || '',
    phone: phones?.[0]?.replace(/[\s-]/g, '') || '',
    name: detectedName,
    alias: detectedAlias
  }
}

export async function POST(request: NextRequest) {
  try {
    const { postItContent, postItTitle, forceContactId } = await request.json()
    
    if (!postItContent) {
      return NextResponse.json(
        { error: 'Post-it content is required' },
        { status: 400 }
      )
    }
    
    console.log('🤖 Generando correo para:', postItTitle)
    console.log('📝 Contenido:', postItContent.substring(0, 100) + '...')
    
    let selectedContact = null
    
    if (forceContactId) {
      console.log('🎯 Usando contacto forzado:', forceContactId)
      const db = await getContactsDatabase()
      selectedContact = await new Promise<any>((resolve, reject) => {
        db.get('SELECT * FROM contacts WHERE id = ?', [forceContactId], (err, row) => {
          if (err) {
            reject(err)
          } else {
            resolve(row)
          }
          db.close()
        })
      })
      
      if (!selectedContact) {
        return NextResponse.json(
          { error: 'Contacto especificado no encontrado' },
          { status: 404 }
        )
      }
    } else {
      const relatedContacts = await findRelatedContactsWithAI(postItContent + ' ' + (postItTitle || ''))
      
      console.log('👥 Contactos encontrados:', relatedContacts.length)
      
      if (relatedContacts.length > 0) {
        selectedContact = relatedContacts[0]
        console.log('✅ Contacto seleccionado:', selectedContact.name)
      } else {
        const extractedInfo = extractContactInfoFromContent(postItContent + ' ' + (postItTitle || ''))
        
        console.log('❌ No se encontró contacto existente')
        console.log('📋 Información extraída:', extractedInfo)
        
        return NextResponse.json(
          {
            error: 'No se pudo identificar un contacto en el contenido del post-it',
            suggestedContact: extractedInfo
          },
          { status: 400 }
        )
      }
    }
    
    const emailData = {
      to: selectedContact.email,
      subject: `Consulta - ${postItTitle || 'Post-it'}`,
      body: `Hola ${selectedContact.alias || selectedContact.name},

Te escribo para consultarte sobre lo siguiente:

${postItContent}

Saludos cordiales,
Patricia Stocker`,
      contact: selectedContact,
      aiGenerated: false
    }
    
    console.log('📧 Correo generado para:', emailData.to)
    
    return NextResponse.json({
      success: true,
      email: emailData
    })
    
  } catch (error) {
    console.error('❌ Error generating email:', error)
    return NextResponse.json(
      { error: 'Error generating email: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
