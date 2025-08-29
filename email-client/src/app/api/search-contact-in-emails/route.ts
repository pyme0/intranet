import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { contactName, contactEmail, postItContent } = await request.json()

    if (!contactName) {
      return new Response(JSON.stringify({ error: 'Contact name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const encoder = new TextEncoder()
    let controller: ReadableStreamDefaultController<Uint8Array>

    const stream = new ReadableStream({
      start(ctrl) {
        controller = ctrl
      }
    })

    const sendProgress = (data: any) => {
      const message = `data: ${JSON.stringify(data)}\n\n`
      controller.enqueue(encoder.encode(message))
    }

    const searchEmails = async () => {
      try {
        sendProgress({
          step: 'Conectando con servidor de correos...',
          progress: 10,
          filters: ['Conexión a Hostinger Mail']
        })

        const emailsResponse = await fetch('http://localhost:8080/api/emails/with-preview?limit=100')
        if (!emailsResponse.ok) {
          throw new Error('No se pudo conectar al servidor de correos')
        }

        const emailsData = await emailsResponse.json()
        const emails = emailsData.emails || []

        sendProgress({
          step: 'Correos obtenidos, aplicando filtros...',
          progress: 30,
          totalEmails: emails.length,
          filters: ['Conexión exitosa', `${emails.length} correos disponibles`]
        })

        // SISTEMA DE FILTRADO INTELIGENTE MEJORADO
        // Soluciona el problema de filtros irrelevantes como ["deberia", "desistir", "del", "uso", "marca", "statsen"]

        // Stop words expandidas en español (palabras que NUNCA deben usarse como filtros)
        const stopWords = [
          // Artículos, preposiciones, conjunciones básicas
          'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'sobre', 'todo', 'también', 'tras', 'otro', 'algún', 'tanto', 'muy', 'ya', 'sea', 'puede', 'tiene', 'hace', 'hay', 'está', 'han', 'ser', 'si', 'me', 'mi', 'tu', 'él', 'ella', 'nos', 'vos', 'ellos', 'ellas',
          // Verbos y palabras funcionales problemáticas identificadas
          'deberia', 'desistir', 'del', 'uso', 'utilizado', 'preguntarle', 'pregunta', 'consulta', 'sobre', 'acerca', 'respecto', 'mediante', 'durante', 'antes', 'después', 'mientras', 'cuando', 'donde', 'como', 'porque', 'aunque', 'sino', 'pero', 'mas', 'menos', 'mucho', 'poco', 'bien', 'mal', 'mejor', 'peor',
          // Verbos adicionales que causan ruido
          'debería', 'deberían', 'podría', 'podrían', 'tendría', 'tendrían', 'haría', 'harían', 'sería', 'serían', 'estaría', 'estarían',
          'preguntarle', 'preguntarles', 'consultarle', 'consultarles', 'contactar', 'contactarle', 'contactarles',
          'enviar', 'mandar', 'escribir', 'llamar', 'hablar', 'decir', 'comentar', 'informar', 'avisar', 'notificar',
          'revisar', 'verificar', 'confirmar', 'validar', 'comprobar', 'chequear',
          // Palabras temporales y de contexto
          'ayer', 'hoy', 'mañana', 'ahora', 'luego', 'después', 'antes', 'pronto', 'tarde', 'temprano',
          'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo',
          'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ]

        // LISTA DE EMPLEADOS INTERNOS Y EMPRESA (NO deben ser filtros de búsqueda)
        const internalExclusions = [
          // Empleados de Patricia Stocker
          'patricia', 'stocker', 'marcos', 'marco', 'hermes', 'tomas', 'tomás', 'monica',
          // Cuentas de email internas
          'marcas', 'tomas@patriciastocker.com', 'marcas@patriciastocker.com',
          // Nombre de la empresa
          'patriciastocker'
        ]

        // PALABRAS QUE NUNCA SON NOMBRES PROPIOS (aunque empiecen con mayúscula)
        const neverProperNouns = [
          // Verbos que pueden aparecer capitalizados
          'viene', 'quizá', 'quiza', 'restringir', 'esto', 'compensarlo',
          'tiene', 'tengo', 'tienes', 'hacer', 'hago', 'haces', 'dice', 'digo', 'dices',
          'viene', 'vengo', 'vienes', 'puede', 'puedo', 'puedes', 'debe', 'debo', 'debes',
          // Pronombres y adverbios
          'esto', 'esta', 'este', 'eso', 'esa', 'ese', 'aquí', 'aqui', 'allí', 'alli',
          'ahora', 'entonces', 'luego', 'después', 'despues', 'antes', 'siempre', 'nunca',
          // Conectores y preposiciones que pueden aparecer capitalizadas
          'para', 'por', 'con', 'sin', 'sobre', 'bajo', 'entre', 'durante', 'mediante',
          'según', 'segun', 'hacia', 'hasta', 'desde', 'contra', 'ante', 'tras'
          // NOTA: "caso", "marca", "solicitud" etc. se manejan como términos de contexto, no como nombres propios
        ]

        // Función ULTRA-ESTRICTA para detectar nombres propios
        const isProperNoun = (word: string) => {
          const lowerWord = word.toLowerCase()

          // REGLA 1: Debe empezar con mayúscula y tener al menos 3 caracteres
          if (!/^[A-Z][a-z]{2,}/.test(word)) return false

          // REGLA 2: No debe estar en stop words
          if (stopWords.includes(lowerWord)) return false

          // REGLA 3: NO debe ser empleado interno o empresa
          if (internalExclusions.includes(lowerWord)) return false

          // REGLA 4: NO debe estar en la lista de "nunca nombres propios"
          if (neverProperNouns.includes(lowerWord)) return false

          // REGLA 5: Excluir patrones que claramente no son nombres propios
          const excludePatterns = [
            /^(Consulta|Marca|Registro|Cliente|Empresa|Abogado|Legal|Urgente|Pendiente|Solicitud|Carta|Documento|Email|Correo|Reunión|Meeting|Llamada|Teléfono)$/i,
            /^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)$/i,
            /^(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)$/i,
            /^(Hay|Que|Para|Con|Sin|Por|Sobre|Desde|Hasta|Cuando|Donde|Como|Porque|Aunque|Pero|Mas|Menos|Muy|Bien|Mal|Mejor|Peor)$/i,
            // Patrones adicionales para verbos y palabras problemáticas
            /^(Viene|Tiene|Hace|Dice|Puede|Debe|Quiere|Sabe|Está|Estás|Están)$/i,
            /^(Esto|Esta|Este|Eso|Esa|Ese|Aquí|Allí|Ahora|Entonces|Luego|Después|Antes|Siempre|Nunca)$/i
          ]

          // REGLA 6: Debe parecer un nombre real (no contener números o caracteres especiales)
          if (/[0-9@#$%^&*()_+=\-\[\]{}|\\:";'<>?,./]/.test(word)) return false

          // REGLA 7: Lista blanca SOLO para nombres externos específicos conocidos
          const knownExternalNames = ['Statsen', 'Stetson', 'Focovi', 'Canadian', 'Nuvola', 'Patagonia']
          if (knownExternalNames.includes(word)) return true

          // REGLA 8: Debe pasar todas las exclusiones
          if (excludePatterns.some(pattern => pattern.test(word))) return false

          // REGLA 9: Verificación adicional - debe tener características de nombre propio
          // (al menos 4 caracteres para evitar abreviaciones problemáticas)
          if (word.length < 4) return false

          return true
        }

        // Función para detectar sustantivos relevantes ESPECÍFICOS (NO genéricos como "caso")
        const isRelevantNoun = (word: string) => {
          // SOLO términos muy específicos del contexto legal, NO genéricos
          const specificLegalTerms = [
            // Términos específicos de marcas (NO "marca" genérico)
            'inapi', 'tribunal', 'patente', 'oposicion', 'renovacion', 'renovación',
            // Términos específicos de propiedad intelectual
            'propiedad', 'intelectual', 'comercial', 'industrial'
            // EXCLUIDOS: "marca", "registro", "solicitud", "caso", "derecho" (demasiado genéricos)
          ]
          return specificLegalTerms.includes(word.toLowerCase())
        }

        // Función para detectar nombres de empresas EXTERNAS conocidas (NO internas)
        const isKnownCompany = (word: string) => {
          const lowerWord = word.toLowerCase()

          // NO incluir empleados internos o la empresa propia
          if (internalExclusions.includes(lowerWord)) return false

          // SOLO empresas externas/clientes conocidos
          const externalCompanies = ['statsen', 'stetson', 'focovi', 'canadian', 'dbv', 'nuvola', 'patagonia', 'berries', 'farms']
          return externalCompanies.includes(lowerWord)
        }

        // SISTEMA DE RANKING DE TÉRMINOS
        const allWords = `${contactName} ${postItContent}`.split(/\s+/).filter(word => word.length > 0)

        // Crear objetos de términos con ranking y explicación
        const termAnalysis = allWords.map(word => {
          const lowerWord = word.toLowerCase()
          let score = 0
          let reasons = []
          let category = 'descartado'

          // SCORING SYSTEM
          if (isProperNoun(word)) {
            score += 100
            reasons.push('Nombre propio detectado')
            category = 'nombre_propio'
          }

          if (isKnownCompany(word)) {
            score += 90
            reasons.push('Empresa conocida')
            category = 'empresa'
          }

          if (isRelevantNoun(word)) {
            score += 50
            reasons.push('Término legal relevante')
            if (category === 'descartado') category = 'contexto_legal'
          }

          if (stopWords.includes(lowerWord)) {
            score = 0
            reasons = ['Stop word - palabra funcional sin valor de búsqueda']
            category = 'stop_word'
          }

          if (word.length < 3) {
            score = Math.max(0, score - 30)
            reasons.push('Palabra muy corta')
          }

          return {
            original: word,
            normalized: lowerWord,
            score,
            reasons,
            category
          }
        })

        // Ordenar por score y seleccionar SOLO los mejores (nombres específicos)
        const rankedTerms = termAnalysis
          .filter(term => term.score > 0)
          .sort((a, b) => b.score - a.score)

        // ESTRATEGIA ULTRA-ESPECÍFICA: SOLO nombres propios y empresas (score >= 80)
        const priorityTerms = rankedTerms
          .filter(term => term.score >= 80) // Solo nombres propios y empresas
          .map(term => term.normalized)

        // Email si está disponible
        if (contactEmail) {
          priorityTerms.push(contactEmail.toLowerCase())
        }

        // NO usar términos de contexto genéricos - solo nombres específicos
        const finalPriorityTerms = [...new Set(priorityTerms)]
        const finalContextTerms: string[] = [] // Vacío - no usar contexto genérico

        // Si no hay nombres específicos, no buscar nada
        if (finalPriorityTerms.length === 0) {
          console.log('⚠️ No se detectaron nombres específicos - no se realizará búsqueda')
        }

        // ANÁLISIS DETALLADO CON RANKING PARA DEBUGGING
        const analysisDetails = {
          originalText: `${contactName} ${postItContent}`,
          allWords: allWords,
          termAnalysis: termAnalysis,
          rankedTerms: rankedTerms,
          finalPriorityTerms: finalPriorityTerms,
          finalContextTerms: finalContextTerms,
          topRankedTerms: rankedTerms.slice(0, 5)
        }

        sendProgress({
          step: 'Análisis inteligente de términos completado...',
          progress: 35,
          filters: [
            'Conexión exitosa',
            `📝 Texto original: "${analysisDetails.originalText}"`,
            `🔍 Palabras analizadas: ${analysisDetails.allWords.length}`,
            `📊 RANKING DE TÉRMINOS (Top 5):`,
            ...analysisDetails.topRankedTerms.map(term =>
              `   ${term.score}pts - "${term.original}" (${term.category}): ${term.reasons.join(', ')}`
            ),
            `🎯 FILTROS SELECCIONADOS:`,
            `   Prioritarios (score ≥80): [${finalPriorityTerms.join(', ') || 'ninguno'}]`,
            `   Contexto (score 40-79): [${finalContextTerms.join(', ') || 'ninguno'}]`,
            finalPriorityTerms.length === 0 && finalContextTerms.length === 0 ?
              '⚠️ NO SE ENCONTRARON TÉRMINOS VÁLIDOS - Revise el contenido del post-it' :
              `✅ Se usarán ${finalPriorityTerms.length + finalContextTerms.length} términos para la búsqueda`
          ],
          analysisDetails: analysisDetails
        })

        // BÚSQUEDA PROGRESIVA INTELIGENTE CON INFORMACIÓN DETALLADA
        let relevantEmails: any[] = []
        const totalEmails = emails.length

        sendProgress({
          step: `Iniciando búsqueda en ${totalEmails} correos...`,
          progress: 40,
          filters: [
            'Conexión exitosa',
            `📧 Total de correos disponibles: ${totalEmails}`,
            `🔍 Iniciando búsqueda con términos rankeados...`
          ]
        })

        // PASO 1: Búsqueda ULTRA-ESPECÍFICA solo con nombres propios (score ≥80)
        if (finalPriorityTerms.length > 0) {
          relevantEmails = emails.filter((email: any) => {
            // BUSCAR EN TODO EL CONTENIDO: asunto, remitente, preview Y body completo
            const emailText = `${email.subject || ''} ${email.from_name || ''} ${email.from_email || ''} ${email.preview || ''} ${email.body || ''} ${email.html_body || ''}`.toLowerCase()
            return finalPriorityTerms.some(term => emailText.includes(term))
          })

          sendProgress({
            step: `Búsqueda prioritaria completada: ${relevantEmails.length}/${totalEmails} correos`,
            progress: 50,
            filters: [
              'Conexión exitosa',
              `🎯 Términos prioritarios usados: [${finalPriorityTerms.join(', ')}]`,
              `📊 Resultados: ${relevantEmails.length} de ${totalEmails} correos (${((relevantEmails.length/totalEmails)*100).toFixed(1)}%)`,
              relevantEmails.length > 0 ?
                `✅ Encontrados correos específicos - Búsqueda exitosa` :
                `⚠️ Sin resultados con términos prioritarios`
            ]
          })

          // Si encontramos resultados específicos, SOLO usar esos (no expandir con contexto genérico)
          if (relevantEmails.length > 0) {
            sendProgress({
              step: `Análisis completado - Usando resultados específicos`,
              progress: 60,
              filters: [
                'Conexión exitosa',
                `🎯 Estrategia: Búsqueda específica exitosa`,
                `📧 Correos analizados: ${relevantEmails.length} (filtrados por relevancia)`,
                `🔍 Términos efectivos: [${finalPriorityTerms.join(', ')}]`,
                `✅ No se expandirá la búsqueda - Resultados específicos encontrados`
              ]
            })
          }
        }

        // NO HAY PASO 2: No expandir con contexto genérico
        // Solo usamos nombres específicos - si no hay resultados, no hay resultados

        // PASO 2: Si no hay resultados específicos, informar claramente
        if (relevantEmails.length === 0) {
          const noResultsReason = finalPriorityTerms.length === 0 ?
            'No se detectaron nombres específicos en el post-it' :
            `No se encontraron correos que mencionen: [${finalPriorityTerms.join(', ')}]`

          sendProgress({
            step: `Búsqueda completada - Sin resultados específicos`,
            progress: 60,
            filters: [
              'Conexión exitosa',
              `🎯 Estrategia: Solo búsqueda por nombres específicos`,
              `❌ ${noResultsReason}`,
              `📧 Correos analizados: ${totalEmails}`,
              finalPriorityTerms.length === 0 ?
                `💡 El post-it debe contener nombres específicos de personas o empresas` :
                `💡 "${finalPriorityTerms.join(', ')}" no aparece en ningún correo`,
              `✅ No se usaron términos genéricos para evitar resultados irrelevantes`
            ]
          })
        }

        // Limitar a los 20 más relevantes
        relevantEmails = relevantEmails.slice(0, 20)

        sendProgress({
          step: `${relevantEmails.length} correos relevantes encontrados`,
          progress: 50,
          totalEmails: relevantEmails.length,
          filters: [`${relevantEmails.length} correos filtrados`, 'Iniciando análisis']
        })

        let foundInfo: string[] = []
        let contactInfo: any = {}
        let detailedReport: any = {
          contactProfile: {
            name: contactName,
            searchContext: postItContent,
            emailsAnalyzed: relevantEmails.length,
            analysisDate: new Date().toISOString()
          },
          searchStrategy: {
            totalEmailsAvailable: totalEmails,
            filtersUsed: {
              priority: finalPriorityTerms,
              context: finalContextTerms
            },
            termAnalysis: rankedTerms.slice(0, 10), // Top 10 términos analizados
            searchApproach: finalPriorityTerms.length > 0 ? 'Búsqueda específica por nombres propios' :
                           finalContextTerms.length > 0 ? 'Búsqueda expandida por contexto' :
                           'Sin términos válidos detectados'
          },
          communications: [],
          relatedContacts: [],
          timeline: [],
          summary: ''
        }

        for (let i = 0; i < relevantEmails.length; i++) {
          const email = relevantEmails[i]
          
          sendProgress({
            step: `Analizando correo ${i + 1} de ${relevantEmails.length}...`,
            progress: 50 + (i / relevantEmails.length) * 40,
            analyzedEmails: i + 1,
            filters: [`Analizando: "${email.subject?.substring(0, 30)}..."`]
          })

          // Analizar TODO el contenido del correo: asunto, remitente, preview Y body completo
          const emailContent = `${email.subject} ${email.from_name} ${email.from_email} ${email.preview || ''} ${email.body || ''} ${email.html_body || ''}`
          
          const phoneMatch = emailContent.match(/(\+?56)?[\s-]?[0-9]{1,2}[\s-]?[0-9]{4}[\s-]?[0-9]{4}/g)
          if (phoneMatch && !contactInfo.phone) {
            contactInfo.phone = phoneMatch[0]
            foundInfo.push(`📞 Teléfono: ${phoneMatch[0]}`)
          }

          const companyMatch = emailContent.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(SpA|Ltda|SA|SRL|Corp|Inc|LLC)\b/g)
          if (companyMatch && !contactInfo.company) {
            contactInfo.company = companyMatch[0]
            foundInfo.push(`🏢 Empresa: ${companyMatch[0]}`)
          }

          detailedReport.communications.push({
            emailId: i + 1,
            relevanceScore: 5,
            metadata: {
              from: `${email.from_name} <${email.from_email}>`,
              to: email.to || 'No disponible',
              subject: email.subject,
              date: email.date || 'No disponible'
            },
            communicationSummary: `Correo de ${email.from_name} sobre: ${email.subject}`
          })
          
          detailedReport.timeline.push({
            date: email.date || 'Fecha no disponible',
            subject: email.subject,
            from: `${email.from_name} <${email.from_email}>`,
            summary: `Correo de ${email.from_name}`,
            relevance: 5
          })

          if (email.from_email && email.from_email !== contactEmail) {
            const existingContact = detailedReport.relatedContacts.find((c: any) => c.email === email.from_email)
            if (!existingContact) {
              detailedReport.relatedContacts.push({
                name: email.from_name || 'Nombre no disponible',
                email: email.from_email,
                relationship: 'Comunicación por email'
              })
              foundInfo.push(`👤 Contacto: ${email.from_name} (${email.from_email})`)
            }
          }

          await new Promise(resolve => setTimeout(resolve, 50))
        }

        const totalCommunications = detailedReport.communications.length
        const relatedContactsCount = detailedReport.relatedContacts.length
        
        const searchTermsUsed = [...finalPriorityTerms, ...finalContextTerms]
        const filterExplanation = finalPriorityTerms.length > 0 ?
          `Se utilizó búsqueda específica con términos prioritarios: [${finalPriorityTerms.join(', ')}]` :
          finalContextTerms.length > 0 ?
          `Se utilizó búsqueda por contexto con términos: [${finalContextTerms.join(', ')}]` :
          'No se detectaron términos válidos para la búsqueda'

        detailedReport.summary = `${filterExplanation}. Se analizaron ${relevantEmails.length} correos de un total de ${totalEmails} disponibles. Se encontraron ${totalCommunications} comunicaciones relevantes. Se identificaron ${relatedContactsCount} contactos relacionados. ${foundInfo.length > 0 ? `Se extrajo información: ${foundInfo.slice(0, 3).join(', ')}.` : 'No se encontró información de contacto específica.'}`

        sendProgress({
          step: 'Búsqueda completada - Reporte generado',
          progress: 100,
          analyzedEmails: relevantEmails.length,
          foundInfo: foundInfo,
          contactInfo: contactInfo,
          detailedReport: detailedReport,
          filters: [
            'Búsqueda completada',
            `${foundInfo.length} datos encontrados`,
            `${detailedReport.communications.length} comunicaciones analizadas`
          ]
        })

      } catch (error) {
        console.error('Error in email search:', error)
        sendProgress({
          step: 'Error en la búsqueda: ' + (error instanceof Error ? error.message : 'Error desconocido'),
          progress: 100,
          filters: ['Error en búsqueda']
        })
      } finally {
        controller.close()
      }
    }

    searchEmails()

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Error in search endpoint:', error)
    return new Response(JSON.stringify({ 
      error: 'Error in email search: ' + (error instanceof Error ? error.message : 'Unknown error') 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
