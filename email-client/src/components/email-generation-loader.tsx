'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Loader2,
  Search,
  User,
  CheckCircle,
  AlertCircle,
  Plus,
  Mail,
  Save,
  X,
  Database,
  Filter,
  Eye,
  Zap
} from 'lucide-react'

interface EmailGenerationLoaderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEmailGenerated: (emailData: any) => void
  postItContent: string
  postItTitle: string
}

interface LoadingStep {
  id: string
  label: string
  status: 'pending' | 'loading' | 'complete' | 'error'
  icon: React.ReactNode
}

interface Contact {
  id: string
  name: string
  alias: string
  email: string
  phone?: string
}

export function EmailGenerationLoader({ 
  open, 
  onOpenChange, 
  onEmailGenerated,
  postItContent,
  postItTitle 
}: EmailGenerationLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [foundContact, setFoundContact] = useState<Contact | null>(null)
  const [showAddContact, setShowAddContact] = useState(false)
  const [companies, setCompanies] = useState<any[]>([])
  const [newContact, setNewContact] = useState({
    name: '',
    alias: '',
    email: '',
    phone: '',
    company_id: ''
  })

  // Estados para búsqueda en correos
  const [isSearchingEmails, setIsSearchingEmails] = useState(false)
  const [emailSearchProgress, setEmailSearchProgress] = useState({
    step: '',
    progress: 0,
    totalEmails: 0,
    analyzedEmails: 0,
    foundInfo: [] as string[],
    filters: [] as string[],
    detailedReport: null as any
  })
  const [showDetailedReport, setShowDetailedReport] = useState(false)

  // Función para extraer información del post-it (solo campos que se pueden identificar con certeza)
  const extractContactInfoFromPostIt = (title: string, content: string) => {
    const fullText = `${title} ${content}`
    const lowerText = fullText.toLowerCase()

    // Buscar emails (solo si es claramente un email válido)
    const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g
    const emails = fullText.match(emailRegex)

    // Buscar teléfonos (formato chileno y otros, solo si es claramente un teléfono)
    const phoneRegex = /(\+?56)?[\s-]?[0-9]{1,2}[\s-]?[0-9]{4}[\s-]?[0-9]{4}/g
    const phones = fullText.match(phoneRegex)

    // Buscar nombres con patrones específicos más conservadores
    let detectedName = ''
    let detectedAlias = ''

    // Patrones específicos para nombres en contexto
    const namePatterns = [
      /(?:hablar con|contactar|reunión con|llamar a|escribir a)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:dice|comenta|solicita|pregunta)/i,
      /(?:cliente|contacto|persona):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
    ]

    for (const pattern of namePatterns) {
      const match = fullText.match(pattern)
      if (match && match[1]) {
        const name = match[1].trim()
        // Filtrar palabras que no son nombres
        const excludeWords = ['Consulta', 'Marca', 'Registro', 'Cliente', 'Empresa', 'Abogado', 'Legal', 'Urgente', 'Pendiente', 'Solicitud', 'Carta', 'Documento']
        if (!excludeWords.some(word => name.includes(word)) && name.length > 2) {
          detectedName = name
          detectedAlias = name.split(' ')[0]
          break
        }
      }
    }

    return {
      name: detectedName,
      alias: detectedAlias,
      email: emails?.[0] || '',
      phone: phones?.[0]?.replace(/[\s-]/g, '') || '',
      company_id: ''
    }
  }

  const [steps, setSteps] = useState<LoadingStep[]>([
    {
      id: 'analyzing',
      label: 'Analizando contenido del post-it...',
      status: 'pending',
      icon: <Search className="h-4 w-4" />
    },
    {
      id: 'searching',
      label: 'Buscando contacto relacionado...',
      status: 'pending',
      icon: <User className="h-4 w-4" />
    },
    {
      id: 'generating',
      label: 'Generando correo con IA...',
      status: 'pending',
      icon: <Mail className="h-4 w-4" />
    }
  ])

  const updateStepStatus = (stepId: string, status: LoadingStep['status']) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ))
  }

  const generateEmail = async () => {
    try {
      // Paso 1: Analizar contenido
      setCurrentStep(0)
      updateStepStatus('analyzing', 'loading')
      await new Promise(resolve => setTimeout(resolve, 800))
      updateStepStatus('analyzing', 'complete')

      // Paso 2: Buscar contacto
      setCurrentStep(1)
      updateStepStatus('searching', 'loading')
      
      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postItTitle: postItTitle,
          postItContent: postItContent
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.email && data.email.contact) {
          // Contacto encontrado
          setFoundContact(data.email.contact)
          updateStepStatus('searching', 'complete')
          
          // Paso 3: Generar correo
          setCurrentStep(2)
          updateStepStatus('generating', 'loading')
          await new Promise(resolve => setTimeout(resolve, 1000))
          updateStepStatus('generating', 'complete')
          
          // Mostrar resultado final
          setTimeout(() => {
            onEmailGenerated(data.email)
            onOpenChange(false)
            resetState()
          }, 1000)
        } else {
          // No se encontró contacto - extraer información del post-it
          const extractedInfo = extractContactInfoFromPostIt(postItTitle, postItContent)
          setNewContact(extractedInfo)
          updateStepStatus('searching', 'error')
          setShowAddContact(true)
        }
      } else {
        const errorData = await response.json()
        updateStepStatus('searching', 'error')

        // Si el servidor sugiere información de contacto, usarla
        if (errorData.suggestedContact) {
          setNewContact(errorData.suggestedContact)
        } else {
          // Fallback a extracción local
          const extractedInfo = extractContactInfoFromPostIt(postItTitle, postItContent)
          setNewContact(extractedInfo)
        }

        setShowAddContact(true)
        console.error('Error:', errorData.error)
      }
    } catch (error) {
      console.error('Error generating email:', error)
      updateStepStatus(steps[currentStep]?.id || 'analyzing', 'error')
    }
  }

  // Función para buscar información en los correos
  const searchContactInEmails = async () => {
    setIsSearchingEmails(true)
    setEmailSearchProgress({
      step: 'Iniciando búsqueda...',
      progress: 0,
      totalEmails: 0,
      analyzedEmails: 0,
      foundInfo: [],
      filters: [],
      detailedReport: null
    })

    try {
      const response = await fetch('/api/search-contact-in-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactName: newContact.name,
          contactEmail: newContact.email,
          postItContent: postItContent,
          postItTitle: postItTitle
        }),
      })

      if (response.ok) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  setEmailSearchProgress(prev => ({
                    ...prev,
                    ...data
                  }))

                  // Si se encontró información, actualizar el contacto
                  if (data.contactInfo) {
                    setNewContact(prev => ({
                      ...prev,
                      ...data.contactInfo
                    }))
                  }

                  // Si se completó la búsqueda y hay reporte, mostrarlo automáticamente
                  if (data.detailedReport && data.progress === 100) {
                    setShowDetailedReport(true)
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e)
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error searching emails:', error)
      setEmailSearchProgress(prev => ({
        ...prev,
        step: 'Error en la búsqueda',
        progress: 100
      }))
    } finally {
      setIsSearchingEmails(false)
    }
  }

  const handleAddContact = async () => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newContact),
      })

      if (response.ok) {
        const data = await response.json()
        setFoundContact(data.contact)
        setShowAddContact(false)

        // Continuar con la generación del correo
        setCurrentStep(2)
        updateStepStatus('searching', 'complete')
        updateStepStatus('generating', 'loading')

        // Simular generación con el nuevo contacto
        setTimeout(async () => {
          try {
            const emailResponse = await fetch('/api/generate-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                postItTitle: postItTitle,
                postItContent: postItContent,
                forceContactId: data.contact.id
              }),
            })

            if (emailResponse.ok) {
              const emailData = await emailResponse.json()
              updateStepStatus('generating', 'complete')

              setTimeout(() => {
                onEmailGenerated(emailData.email)
                onOpenChange(false)
                resetState()
              }, 1000)
            }
          } catch (error) {
            updateStepStatus('generating', 'error')
          }
        }, 1000)
      }
    } catch (error) {
      console.error('Error adding contact:', error)
    }
  }

  const resetState = () => {
    setCurrentStep(0)
    setFoundContact(null)
    setShowAddContact(false)
    setNewContact({ name: '', alias: '', email: '', phone: '', company_id: '' })
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' })))
    setIsSearchingEmails(false)
    setEmailSearchProgress({
      step: '',
      progress: 0,
      totalEmails: 0,
      analyzedEmails: 0,
      foundInfo: [],
      filters: [],
      detailedReport: null
    })
    setShowDetailedReport(false)
  }

  // Cargar empresas
  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  useEffect(() => {
    if (open) {
      resetState()
      loadCompanies()
      generateEmail()
    }
  }, [open])

  const getStepIcon = (step: LoadingStep) => {
    switch (step.status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return step.icon
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={showAddContact ? "sm:max-w-lg" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showAddContact ? (
              <>
                <Plus className="h-5 w-5 text-blue-600" />
                Crear nuevo contacto
              </>
            ) : (
              <>
                <Mail className="h-5 w-5" />
                Generando correo con IA
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {!showAddContact ? (
          <div className="space-y-4">
            {/* Pasos de carga */}
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div 
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    index === currentStep ? 'bg-primary/10' : 
                    step.status === 'complete' ? 'bg-green-50' :
                    step.status === 'error' ? 'bg-red-50' : 'bg-muted/50'
                  }`}
                >
                  {getStepIcon(step)}
                  <span className={`text-sm ${
                    step.status === 'complete' ? 'text-green-700' :
                    step.status === 'error' ? 'text-red-700' : 'text-foreground'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Contacto encontrado */}
            {foundContact && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700">
                    Contacto encontrado
                  </span>
                </div>
                <div className="text-sm text-green-600">
                  <div><strong>{foundContact.name}</strong> ({foundContact.alias})</div>
                  <div>{foundContact.email}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Modal para agregar contacto */
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">
                  Crear nuevo contacto
                </span>
              </div>
              <p className="text-sm text-blue-600">
                No se encontró un contacto para "{postItTitle}".
                {(newContact.name || newContact.email) && (
                  <span className="block mt-1">
                    ✨ Se ha pre-llenado la información detectada automáticamente.
                  </span>
                )}
                <span className="block mt-1">
                  Revisa y completa los campos antes de guardar:
                </span>
              </p>
            </div>

            <div className="space-y-4">
              {/* Información básica */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 border-b pb-1">
                  Información básica
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="name">Nombre completo *</Label>
                    <Input
                      id="name"
                      value={newContact.name}
                      onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Juan Pérez"
                      className={newContact.name ? "border-green-300 bg-green-50" : ""}
                    />
                    {newContact.name && (
                      <span className="text-xs text-green-600">✓ Detectado automáticamente</span>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="alias">Alias</Label>
                    <Input
                      id="alias"
                      value={newContact.alias}
                      onChange={(e) => setNewContact(prev => ({ ...prev, alias: e.target.value }))}
                      placeholder="Ej: Juan"
                      className={newContact.alias ? "border-green-300 bg-green-50" : ""}
                    />
                    {newContact.alias && (
                      <span className="text-xs text-green-600">✓ Detectado automáticamente</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Búsqueda en correos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700 border-b pb-1 flex-1">
                    Búsqueda inteligente
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={searchContactInEmails}
                    disabled={isSearchingEmails || !newContact.name}
                    className="ml-3 text-xs"
                  >
                    {isSearchingEmails ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Database className="h-3 w-3 mr-1" />
                        Buscar en correos
                      </>
                    )}
                  </Button>
                </div>

                {isSearchingEmails && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700">
                        IA analizando correos
                      </span>
                    </div>

                    <div className="text-xs text-blue-600">
                      {emailSearchProgress.step}
                    </div>

                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${emailSearchProgress.progress}%` }}
                      />
                    </div>

                    {emailSearchProgress.totalEmails > 0 && (
                      <div className="text-xs text-blue-600">
                        📧 {emailSearchProgress.analyzedEmails} de {emailSearchProgress.totalEmails} correos analizados
                      </div>
                    )}

                    {emailSearchProgress.filters.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <Filter className="h-3 w-3" />
                          Filtros aplicados:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {emailSearchProgress.filters.map((filter, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              {filter}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {emailSearchProgress.foundInfo.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <Eye className="h-3 w-3" />
                          Información encontrada:
                        </div>
                        <div className="space-y-1">
                          {emailSearchProgress.foundInfo.map((info, index) => (
                            <div key={index} className="text-xs text-green-700 bg-green-100 p-2 rounded">
                              ✓ {info}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reporte detallado */}
                {emailSearchProgress.detailedReport && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-green-700 flex items-center gap-1">
                        📊 Reporte Detallado
                      </h5>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDetailedReport(!showDetailedReport)}
                        className="text-xs"
                      >
                        {showDetailedReport ? 'Ocultar' : 'Ver Detalles'}
                      </Button>
                    </div>

                    <div className="text-xs text-green-600 mb-2">
                      {emailSearchProgress.detailedReport.summary}
                    </div>

                    {showDetailedReport && (
                      <div className="space-y-3 mt-3">
                        {/* Comunicaciones */}
                        {emailSearchProgress.detailedReport.communications.length > 0 && (
                          <div>
                            <h6 className="text-xs font-medium text-green-700 mb-1">📧 Comunicaciones Relevantes:</h6>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {emailSearchProgress.detailedReport.communications.map((comm: any, index: number) => (
                                <div key={index} className="p-2 bg-white rounded border text-xs">
                                  <div className="font-medium text-gray-700">
                                    {comm.metadata?.subject || 'Sin asunto'}
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    De: {comm.metadata?.from} | Relevancia: {comm.relevanceScore}/10
                                  </div>
                                  {comm.communicationSummary && (
                                    <div className="text-gray-600 mt-1">
                                      {comm.communicationSummary}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Contactos relacionados */}
                        {emailSearchProgress.detailedReport.relatedContacts.length > 0 && (
                          <div>
                            <h6 className="text-xs font-medium text-green-700 mb-1">👥 Contactos Relacionados:</h6>
                            <div className="space-y-1">
                              {emailSearchProgress.detailedReport.relatedContacts.map((contact: any, index: number) => (
                                <div key={index} className="p-2 bg-white rounded border text-xs">
                                  <div className="font-medium">{contact.name}</div>
                                  {contact.email && <div className="text-gray-500">{contact.email}</div>}
                                  <div className="text-gray-600">{contact.relationship}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timeline */}
                        {emailSearchProgress.detailedReport.timeline.length > 0 && (
                          <div>
                            <h6 className="text-xs font-medium text-green-700 mb-1">📅 Timeline de Comunicaciones:</h6>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {emailSearchProgress.detailedReport.timeline.slice(0, 5).map((item: any, index: number) => (
                                <div key={index} className="p-2 bg-white rounded border text-xs">
                                  <div className="flex justify-between">
                                    <span className="font-medium">{item.subject}</span>
                                    <span className="text-gray-500">Rel: {item.relevance}/10</span>
                                  </div>
                                  <div className="text-gray-500">{item.date}</div>
                                  {item.summary && (
                                    <div className="text-gray-600 mt-1">{item.summary}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!newContact.name && (
                  <p className="text-xs text-gray-500">
                    💡 Ingresa un nombre primero para buscar información en los correos
                  </p>
                )}
              </div>

              {/* Información de contacto */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 border-b pb-1">
                  Información de contacto
                </h4>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Ej: juan@empresa.com"
                    className={newContact.email ? "border-green-300 bg-green-50" : ""}
                  />
                  {newContact.email && (
                    <span className="text-xs text-green-600">✓ Detectado automáticamente</span>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={newContact.phone}
                    onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Ej: +56912345678"
                    className={newContact.phone ? "border-green-300 bg-green-50" : ""}
                  />
                  {newContact.phone && (
                    <span className="text-xs text-green-600">✓ Detectado automáticamente</span>
                  )}
                </div>
              </div>

              {/* Empresa */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 border-b pb-1">
                  Empresa (opcional)
                </h4>
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Select
                    value={newContact.company_id || "none"}
                    onValueChange={(value) => setNewContact(prev => ({
                      ...prev,
                      company_id: value === "none" ? "" : value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empresa (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin empresa</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  resetState()
                }}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleAddContact}
                disabled={!newContact.name || !newContact.email}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar y continuar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
