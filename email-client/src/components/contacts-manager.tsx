'use client'

import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  User,
  Mail,
  Phone,
  Edit,
  Trash2,
  Plus,
  Search,
  Save,
  X,
  Building,
  ChevronDown,
  ChevronRight,
  Tag,
  Calendar,
  FileText,
  Download
} from 'lucide-react'

interface Contact {
  id: string
  name: string
  alias: string
  email: string
  phone?: string
  company_id?: string
  company_name?: string
  company_description?: string
  rut?: string
  address?: string
  represented_company?: string
  represented_company_rut?: string
  gender?: string
  // Datos de marca para poderes
  brand_class?: string
  brand_type?: string
  brand_coverage?: string
  brand_description?: string
  brand_registration_number?: string
  brand_application_number?: string
  brand_logo?: string // Base64 del logo
  power_purpose?: string // Propósito específico del poder (ej: "renovación de marca")
  created_at: string
  updated_at: string
}

interface Company {
  id: string
  name: string
  description?: string
  website?: string
  phone?: string
  address?: string
  brands?: Brand[]
  created_at: string
  updated_at: string
}

interface Brand {
  id: string
  name: string
  company_id: string
  company_name?: string
  description?: string
  status: string
  registration_date?: string
  registration_number?: string
  class_nice?: string
  notes?: string
  created_at: string
  updated_at: string
}

export function ContactsManager() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [isAddBrandDialogOpen, setIsAddBrandDialogOpen] = useState(false)
  const [selectedCompanyForBrand, setSelectedCompanyForBrand] = useState<Company | null>(null)
  const [newBrand, setNewBrand] = useState({
    name: '',
    description: '',
    status: 'pending',
    registration_date: '',
    registration_number: '',
    class_nice: '',
    notes: ''
  })
  const [newContact, setNewContact] = useState({
    name: '',
    alias: '',
    email: '',
    phone: '',
    company_id: ''
  })

  // Estado para crear poder
  const [isPowerDialogOpen, setIsPowerDialogOpen] = useState(false)
  const [selectedContactForPower, setSelectedContactForPower] = useState<Contact | null>(null)
  const [powerData, setPowerData] = useState({
    rut: '',
    address: '',
    represented_company: '',
    represented_company_rut: '',
    mandante_type: 'empresa', // 'persona' o 'empresa'
    gender: 'masculino', // 'masculino' o 'femenino'
    // Datos de marca
    power_purpose: 'renovación de marca',
    brand_class: '',
    brand_type: 'Marca Mixta',
    brand_coverage: 'Marca de servicios',
    brand_description: '',
    brand_registration_number: '',
    brand_application_number: '',
    brand_logo: '' // Base64 del logo
  })
  const [generatedPowerPDF, setGeneratedPowerPDF] = useState<string | null>(null)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Cargar contactos
  const loadContacts = async () => {
    try {
      setIsLoading(true)
      const url = searchTerm
        ? `/api/contacts?search=${encodeURIComponent(searchTerm)}`
        : '/api/contacts'

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setIsLoading(false)
    }
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
    loadContacts()
  }, [searchTerm])

  useEffect(() => {
    loadCompanies()
  }, [])

  // Agregar marca a empresa
  const handleAddBrand = async () => {
    if (!selectedCompanyForBrand || !newBrand.name) return

    try {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBrand,
          company_id: selectedCompanyForBrand.id
        })
      })

      if (response.ok) {
        // Recargar empresas para obtener las marcas actualizadas
        await loadCompanies()
        setIsAddBrandDialogOpen(false)
        setSelectedCompanyForBrand(null)
        setNewBrand({
          name: '',
          description: '',
          status: 'pending',
          registration_date: '',
          registration_number: '',
          class_nice: '',
          notes: ''
        })
      }
    } catch (error) {
      console.error('Error adding brand:', error)
    }
  }

  // Obtener empresa con sus marcas
  const getCompanyWithBrands = (companyId: string) => {
    return companies.find(c => c.id === companyId)
  }

  // Agregar contacto
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
        setContacts(prev => [data.contact, ...prev])
        setNewContact({ name: '', alias: '', email: '', phone: '', company_id: '' })
        setIsAddDialogOpen(false)
      }
    } catch (error) {
      console.error('Error adding contact:', error)
    }
  }

  // Actualizar contacto
  const handleUpdateContact = async (contact: Contact) => {
    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: contact.name,
          alias: contact.alias,
          email: contact.email,
          phone: contact.phone,
          company_id: contact.company_id
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setContacts(prev => prev.map(c => 
          c.id === contact.id ? data.contact : c
        ))
        setEditingContact(null)
      }
    } catch (error) {
      console.error('Error updating contact:', error)
    }
  }

  // Eliminar contacto
  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      return
    }

    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setContacts(prev => prev.filter(c => c.id !== contactId))
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
    }
  }

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.alias.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Función para abrir el modal de crear poder
  const handleCreatePower = (contact: Contact) => {
    console.log('🔍 Abriendo modal para contacto:', contact.name)
    console.log('📊 Datos existentes del contacto:', {
      rut: contact.rut,
      address: contact.address,
      brand_class: contact.brand_class,
      brand_description: contact.brand_description,
      brand_registration_number: contact.brand_registration_number,
      brand_application_number: contact.brand_application_number
    })

    setSelectedContactForPower(contact)
    const powerDataToSet = {
      rut: contact.rut || '',
      address: contact.address || '',
      represented_company: contact.represented_company || '',
      represented_company_rut: contact.represented_company_rut || '',
      mandante_type: contact.represented_company ? 'empresa' : 'persona',
      gender: contact.gender || 'masculino',
      // Datos de marca existentes
      power_purpose: contact.power_purpose || 'renovación de marca',
      brand_class: contact.brand_class || '',
      brand_type: contact.brand_type || 'Marca Mixta',
      brand_coverage: contact.brand_coverage || 'Marca de servicios',
      brand_description: contact.brand_description || '',
      brand_registration_number: contact.brand_registration_number || '',
      brand_application_number: contact.brand_application_number || '',
      brand_logo: contact.brand_logo || ''
    }

    console.log('📝 Datos que se cargarán en el formulario:', powerDataToSet)
    setPowerData(powerDataToSet)
    setGeneratedPowerPDF(null) // Limpiar PDF anterior
    setIsPowerDialogOpen(true)
  }

  // Función para cerrar el modal y limpiar estado
  const handleClosePowerDialog = () => {
    setIsPowerDialogOpen(false)
    setGeneratedPowerPDF(null)
    setSelectedContactForPower(null)
  }

  // Función para guardar datos del poder en el contacto
  const saveContactData = async () => {
    if (!selectedContactForPower) return

    try {
      const updatedContact = {
        ...selectedContactForPower,
        rut: powerData.rut,
        address: powerData.address,
        represented_company: powerData.represented_company,
        represented_company_rut: powerData.represented_company_rut,
        gender: powerData.gender,
        power_purpose: powerData.power_purpose,
        brand_class: powerData.brand_class,
        brand_type: powerData.brand_type,
        brand_coverage: powerData.brand_coverage,
        brand_description: powerData.brand_description,
        brand_registration_number: powerData.brand_registration_number,
        brand_application_number: powerData.brand_application_number,
        brand_logo: powerData.brand_logo
      }

      const response = await fetch(`/api/contacts/${selectedContactForPower.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedContact),
      })

      if (response.ok) {
        const responseData = await response.json()
        console.log('✅ Respuesta del servidor:', responseData)

        // Actualizar el contacto en la lista local
        setContacts(prev => prev.map(contact =>
          contact.id === selectedContactForPower.id ? updatedContact : contact
        ))

        // Actualizar también el contacto seleccionado
        setSelectedContactForPower(updatedContact)

        // Recargar el contacto desde la base de datos para verificar
        try {
          const verifyResponse = await fetch(`/api/contacts/${selectedContactForPower.id}`)
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json()
            console.log('🔍 Verificación - Contacto en BD:', verifyData.contact)
          }
        } catch (error) {
          console.log('⚠️ No se pudo verificar el contacto en BD:', error)
        }

        console.log('✅ Datos del contacto actualizados localmente')
        console.log('📊 Datos guardados:', {
          rut: updatedContact.rut,
          address: updatedContact.address,
          brand_class: updatedContact.brand_class,
          brand_description: updatedContact.brand_description
        })
      } else {
        const errorData = await response.text()
        console.error('❌ Error actualizando contacto:', response.status, errorData)
      }
    } catch (error) {
      console.error('❌ Error guardando datos del contacto:', error)
    }
  }

  // Función para convertir imagen a base64 y obtener dimensiones
  const getImageAsBase64 = (url: string): Promise<{dataURL: string, width: number, height: number}> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      // No usar crossOrigin para archivos locales
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)
        const dataURL = canvas.toDataURL('image/png')
        resolve({
          dataURL,
          width: img.width,
          height: img.height
        })
      }
      img.onerror = (error) => {
        console.error(`❌ Error cargando imagen ${url}:`, error)
        reject(new Error(`No se pudo cargar la imagen: ${url}`))
      }
      img.src = url
    })
  }

  // Función para generar el PDF del poder
  const generatePowerPDF = async () => {
    if (!selectedContactForPower) return

    try {
      setIsGeneratingPDF(true)

      // Cargar el logo
      let logoData: {dataURL: string, width: number, height: number} | null = null
      try {
        // Intentar cargar desde public/logo.png
        logoData = await getImageAsBase64('/logo.png')
        console.log('✅ Logo cargado exitosamente')
      } catch (error) {
        console.warn('⚠️ No se pudo cargar el logo desde /logo.png:', error)
        // Intentar ruta alternativa
        try {
          logoData = await getImageAsBase64('./logo.png')
          console.log('✅ Logo cargado desde ruta alternativa')
        } catch (error2) {
          console.warn('⚠️ No se pudo cargar el logo desde ./logo.png:', error2)
        }
      }

      // Crear nuevo documento PDF
      const doc = new jsPDF()

      // Configurar márgenes y dimensiones
      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height
      const leftMargin = 25
      const rightMargin = 25
      const topMargin = 30
      const textWidth = pageWidth - leftMargin - rightMargin

      // Agregar logo en la esquina superior derecha
      if (logoData) {
        try {
          // Calcular dimensiones manteniendo aspect ratio (doble de tamaño)
          const maxLogoWidth = 60
          const maxLogoHeight = 40

          let logoWidth = maxLogoWidth
          let logoHeight = maxLogoHeight

          // Mantener proporción original
          if (logoData.width > 0 && logoData.height > 0) {
            const aspectRatio = logoData.width / logoData.height

            if (aspectRatio > 1) {
              // Logo más ancho que alto
              logoWidth = maxLogoWidth
              logoHeight = maxLogoWidth / aspectRatio
            } else {
              // Logo más alto que ancho
              logoHeight = maxLogoHeight
              logoWidth = maxLogoHeight * aspectRatio
            }
          }

          const logoX = pageWidth - rightMargin - logoWidth
          const logoY = 15

          doc.addImage(logoData.dataURL, 'PNG', logoX, logoY, logoWidth, logoHeight)
        } catch (error) {
          console.warn('Error agregando logo al PDF:', error)
        }
      }

      // Título centrado
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('PODER', pageWidth / 2, topMargin, { align: 'center' })

      // Configurar fuente para el contenido
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')

      let yPosition = topMargin + 25

      // Función para agregar texto justificado
      const addJustifiedText = (text: string, isLastLine = false) => {
        if (yPosition > pageHeight - 40) {
          doc.addPage()
          yPosition = topMargin
        }

        if (isLastLine) {
          // Última línea de párrafo - no justificar
          doc.text(text, leftMargin, yPosition)
        } else {
          // Justificar texto
          const words = text.split(' ')
          if (words.length === 1) {
            doc.text(text, leftMargin, yPosition)
          } else {
            const textWidthMeasured = doc.getTextWidth(text)
            if (textWidthMeasured < textWidth) {
              // Calcular espacios adicionales para justificar
              const totalSpaces = words.length - 1
              const extraSpace = (textWidth - textWidthMeasured) / totalSpaces

              let xPosition = leftMargin
              words.forEach((word, index) => {
                doc.text(word, xPosition, yPosition)
                if (index < words.length - 1) {
                  xPosition += doc.getTextWidth(word) + doc.getTextWidth(' ') + extraSpace
                }
              })
            } else {
              doc.text(text, leftMargin, yPosition)
            }
          }
        }
        yPosition += 6
      }

      // Contenido del poder con texto justificado (condicional según tipo de mandante y género)
      const domiciliadoText = powerData.gender === 'femenino' ? 'domiciliada' : 'domiciliado'
      const domiciliadosText = powerData.gender === 'femenino' ? 'ambas domiciliadas' : 'ambos domiciliados'

      const firstParagraph = powerData.mandante_type === 'persona'
        ? `Por el presente instrumento, yo, ${selectedContactForPower.name}, RUT ${powerData.rut}, ${domiciliadoText} en ${powerData.address}; vengo en otorgar poder especial a don TOMÁS ALBERTO BARRIENTOS STOCKER, RUT Nº 21.043.144-6, domiciliado en Bello Horizonte 960, departamento 64, Las Condes, Santiago, para que en nombre y representación del poderdante proceda a gestionar todos los asuntos relacionados con marcas, frases de propaganda, patentes de invención, modelos de utilidad, diseños y/o dibujos industriales, nombres de dominio, derechos de autor y todo otro asunto relacionado con la Propiedad Industrial e Intelectual.`
        : `Por el presente instrumento, yo, ${selectedContactForPower.name}, RUT ${powerData.rut}, en representación de ${powerData.represented_company}, RUT ${powerData.represented_company_rut}, ${domiciliadosText} en ${powerData.address}; vengo en otorgar poder especial a don TOMÁS ALBERTO BARRIENTOS STOCKER, RUT Nº 21.043.144-6, domiciliado en Bello Horizonte 960, departamento 64, Las Condes, Santiago, para que en nombre y representación del poderdante proceda a gestionar todos los asuntos relacionados con marcas, frases de propaganda, patentes de invención, modelos de utilidad, diseños y/o dibujos industriales, nombres de dominio, derechos de autor y todo otro asunto relacionado con la Propiedad Industrial e Intelectual.`

      const paragraphs = [
        firstParagraph,

        `Con este objeto se le faculta para efectuar ante las autoridades competentes todas las gestiones necesarias para el cumplimiento de lo encomendado, tales como presentar solicitudes, hacer declaraciones y modificaciones, pagar impuestos, solicitar copias autorizadas, solicitar renovaciones de registros y anotaciones marginales, presentar defensas de solicitudes, desistirse y limitar solicitudes, contestar y deducir oposiciones, nulidades, cancelaciones por falta de uso, apelaciones y otros recursos, dándose también facultades para delegar el presente poder.`
      ]

      // Procesar cada párrafo
      paragraphs.forEach((paragraph, paragraphIndex) => {
        const lines = doc.splitTextToSize(paragraph, textWidth)

        lines.forEach((line: string, lineIndex: number) => {
          const isLastLineOfParagraph = lineIndex === lines.length - 1
          addJustifiedText(line, isLastLineOfParagraph)
        })

        // Espacio entre párrafos
        if (paragraphIndex < paragraphs.length - 1) {
          yPosition += 8
        }
      })

      // Espacio para la firma
      yPosition += 40

      // Línea para la firma
      const signatureLineY = yPosition
      doc.line(leftMargin, signatureLineY, leftMargin + 80, signatureLineY)

      // Texto de firma
      yPosition += 8
      doc.setFont('helvetica', 'normal')
      doc.text('FIRMA Mandante', leftMargin, yPosition)

      // Fecha en la esquina superior derecha
      const currentDate = new Date().toLocaleDateString('es-CL')
      doc.setFontSize(10)
      doc.text(`Santiago, ${currentDate}`, pageWidth - rightMargin, topMargin + 10, { align: 'right' })

      // Generar nombre del archivo
      const fileName = `Poder_${selectedContactForPower.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`

      // Obtener el PDF como base64 para envío por correo
      const pdfBase64 = doc.output('datauristring').split(',')[1]
      setGeneratedPowerPDF(pdfBase64)

      // Guardar datos en el contacto
      await saveContactData()

      // Descargar el PDF
      doc.save(fileName)

      // No cerrar el modal automáticamente - mostrar opciones de envío
      // setIsPowerDialogOpen(false)

    } catch (error) {
      console.error('Error generando poder:', error)
      alert('Error al generar el poder. Por favor, intenta nuevamente.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Función para enviar correo con poder adjunto
  const sendPowerByEmail = async () => {
    if (!selectedContactForPower || !generatedPowerPDF) return

    setIsSendingEmail(true)

    try {
      const fileName = `Poder_${selectedContactForPower.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`

      // Email de prueba (tobarrientos1@gmail.com) o email real del contacto
      const recipientEmail = 'tobarrientos1@gmail.com' // Para pruebas
      // const recipientEmail = selectedContactForPower.email // Para producción

      // Determinar saludo según género
      const saludo = powerData.gender === 'femenino' ? 'Estimada' : 'Estimado'

      // Construir información de la marca
      const brandInfo = `
DATOS DE LA MARCA:
• Propósito: ${powerData.power_purpose}
• Clase Niza: ${powerData.brand_class}
• Tipo de Marca: ${powerData.brand_type}
• Cobertura: ${powerData.brand_coverage}
• Descripción: ${powerData.brand_description}
• Número de Registro: ${powerData.brand_registration_number}
• Número de Solicitud: ${powerData.brand_application_number}`

      // Agregar referencia al logo si es marca mixta
      const logoReference = (powerData.brand_type === 'Marca Mixta' && powerData.brand_logo)
        ? '\n• Logo de la marca: Ver imagen adjunta'
        : ''

      const emailBody = `${saludo} ${selectedContactForPower.name},

Junto con saludar, adjunto el poder legal solicitado para la gestión de ${powerData.power_purpose}.

${brandInfo}${logoReference}

El documento se encuentra debidamente firmado y listo para su uso ante las autoridades competentes.

Cualquier consulta, no dude en contactarnos.

Saludos cordiales,

Tomás Barrientos
Director Ejecutivo
Patricia Stocker | Propiedad Intelectual
tomas@patriciastocker.com
+56 9 XXXX XXXX

---
Este correo es enviado desde el sistema de gestión de Patricia Stocker.`

      // Preparar adjuntos
      const attachments = [{
        type: 'file',
        filename: fileName,
        content: generatedPowerPDF
      }]

      // Agregar logo de la marca si existe y es marca mixta
      if (powerData.brand_type === 'Marca Mixta' && powerData.brand_logo) {
        attachments.push({
          type: 'embedded',
          filename: 'logo_marca.png',
          cid: 'logo_marca',
          path: '', // No se usa para base64
          content: powerData.brand_logo.split(',')[1] // Remover data:image/...;base64,
        })
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `Poder Legal - ${selectedContactForPower.name}`,
          body: emailBody,
          attachments: attachments
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert('✅ Correo enviado exitosamente con el poder adjunto')
        handleClosePowerDialog()
      } else {
        alert(`❌ Error al enviar correo: ${result.error}`)
      }

    } catch (error) {
      console.error('Error enviando correo:', error)
      alert('❌ Error al enviar el correo. Por favor, intenta nuevamente.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">👥 Contactos</h1>
          <p className="text-sm text-muted-foreground">
            {contacts.length} {contacts.length === 1 ? 'contacto' : 'contactos'}
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Contacto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Contacto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="add-name">Nombre completo *</Label>
                <Input
                  id="add-name"
                  value={newContact.name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <Label htmlFor="add-alias">Alias</Label>
                <Input
                  id="add-alias"
                  value={newContact.alias}
                  onChange={(e) => setNewContact(prev => ({ ...prev, alias: e.target.value }))}
                  placeholder="Ej: Juan"
                />
              </div>
              <div>
                <Label htmlFor="add-email">Email *</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Ej: juan@empresa.com"
                />
              </div>
              <div>
                <Label htmlFor="add-phone">Teléfono</Label>
                <Input
                  id="add-phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Ej: +56912345678"
                />
              </div>
              <div>
                <Label htmlFor="add-company">Empresa</Label>
                <Select
                  value={newContact.company_id || "none"}
                  onValueChange={(value) => setNewContact(prev => ({ ...prev, company_id: value === "none" ? "" : value }))}
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
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    setNewContact({ name: '', alias: '', email: '', phone: '', company_id: '' })
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddContact}
                  disabled={!newContact.name || !newContact.email}
                  className="flex-1"
                >
                  Agregar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo para agregar marca */}
        <Dialog open={isAddBrandDialogOpen} onOpenChange={setIsAddBrandDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Agregar Marca a {selectedCompanyForBrand?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="brand-name">Nombre de la Marca *</Label>
                <Input
                  id="brand-name"
                  value={newBrand.name}
                  onChange={(e) => setNewBrand(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Canadian"
                />
              </div>
              <div>
                <Label htmlFor="brand-description">Descripción</Label>
                <Input
                  id="brand-description"
                  value={newBrand.description}
                  onChange={(e) => setNewBrand(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción de la marca"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand-status">Estado</Label>
                  <Select
                    value={newBrand.status}
                    onValueChange={(value) => setNewBrand(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="registered">Registrada</SelectItem>
                      <SelectItem value="rejected">Rechazada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="brand-class">Clase Niza</Label>
                  <Input
                    id="brand-class"
                    value={newBrand.class_nice}
                    onChange={(e) => setNewBrand(prev => ({ ...prev, class_nice: e.target.value }))}
                    placeholder="Ej: 35"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand-date">Fecha de Registro</Label>
                  <Input
                    id="brand-date"
                    type="date"
                    value={newBrand.registration_date}
                    onChange={(e) => setNewBrand(prev => ({ ...prev, registration_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="brand-number">Número de Registro</Label>
                  <Input
                    id="brand-number"
                    value={newBrand.registration_number}
                    onChange={(e) => setNewBrand(prev => ({ ...prev, registration_number: e.target.value }))}
                    placeholder="Ej: 123456"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="brand-notes">Notas</Label>
                <Input
                  id="brand-notes"
                  value={newBrand.notes}
                  onChange={(e) => setNewBrand(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionales"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddBrandDialogOpen(false)
                    setSelectedCompanyForBrand(null)
                    setNewBrand({
                      name: '',
                      description: '',
                      status: 'pending',
                      registration_date: '',
                      registration_number: '',
                      class_nice: '',
                      notes: ''
                    })
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddBrand}
                  disabled={!newBrand.name}
                  className="flex-1"
                >
                  Agregar Marca
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar contactos por nombre, alias o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de contactos */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Cargando contactos...</div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {searchTerm ? 'No se encontraron contactos' : 'No hay contactos'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda'
                : 'Agrega tu primer contacto para empezar'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredContacts.map((contact) => (
              <Card key={contact.id} className="p-4">
                {editingContact?.id === contact.id ? (
                  /* Modo edición */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`edit-name-${contact.id}`}>Nombre</Label>
                        <Input
                          id={`edit-name-${contact.id}`}
                          value={editingContact.name}
                          onChange={(e) => setEditingContact(prev => 
                            prev ? { ...prev, name: e.target.value } : null
                          )}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-alias-${contact.id}`}>Alias</Label>
                        <Input
                          id={`edit-alias-${contact.id}`}
                          value={editingContact.alias}
                          onChange={(e) => setEditingContact(prev => 
                            prev ? { ...prev, alias: e.target.value } : null
                          )}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`edit-email-${contact.id}`}>Email</Label>
                      <Input
                        id={`edit-email-${contact.id}`}
                        type="email"
                        value={editingContact.email}
                        onChange={(e) => setEditingContact(prev => 
                          prev ? { ...prev, email: e.target.value } : null
                        )}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`edit-phone-${contact.id}`}>Teléfono</Label>
                      <Input
                        id={`edit-phone-${contact.id}`}
                        value={editingContact.phone || ''}
                        onChange={(e) => setEditingContact(prev =>
                          prev ? { ...prev, phone: e.target.value } : null
                        )}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`edit-company-${contact.id}`}>Empresa</Label>
                      <Select
                        value={editingContact.company_id || 'none'}
                        onValueChange={(value) => setEditingContact(prev =>
                          prev ? { ...prev, company_id: value === 'none' ? null : value } : null
                        )}
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateContact(editingContact)}
                        className="flex-1"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingContact(null)}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Modo vista */
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-medium text-foreground">
                          {contact.name}
                        </h3>
                        {contact.alias && (
                          <span className="text-sm text-muted-foreground">
                            ({contact.alias})
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </div>
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </div>
                        )}
                        {contact.company_name && (
                          <div className="space-y-2">
                            <div
                              className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                              onClick={() => setExpandedCompany(
                                expandedCompany === contact.company_id ? null : contact.company_id
                              )}
                            >
                              <Building className="h-3 w-3" />
                              {contact.company_name}
                              {expandedCompany === contact.company_id ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </div>

                            {/* Marcas de la empresa */}
                            {expandedCompany === contact.company_id && contact.company_id && (
                              <div className="ml-6 space-y-2 border-l-2 border-muted pl-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-muted-foreground">MARCAS</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                      const company = getCompanyWithBrands(contact.company_id!)
                                      if (company) {
                                        setSelectedCompanyForBrand(company)
                                        setIsAddBrandDialogOpen(true)
                                      }
                                    }}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>

                                {(() => {
                                  const company = getCompanyWithBrands(contact.company_id!)
                                  const brands = company?.brands || []

                                  if (brands.length === 0) {
                                    return (
                                      <div className="text-xs text-muted-foreground italic">
                                        No hay marcas registradas
                                      </div>
                                    )
                                  }

                                  return brands.map((brand) => (
                                    <div key={brand.id} className="flex items-center gap-2 text-xs">
                                      <Tag className="h-3 w-3 text-blue-500" />
                                      <span className="font-medium">{brand.name}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                                        brand.status === 'registered'
                                          ? 'bg-green-100 text-green-700'
                                          : brand.status === 'pending'
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-gray-100 text-gray-700'
                                      }`}>
                                        {brand.status === 'registered' ? 'Registrada' :
                                         brand.status === 'pending' ? 'Pendiente' : 'Rechazada'}
                                      </span>
                                    </div>
                                  ))
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreatePower(contact)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Crear Poder"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingContact(contact)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteContact(contact.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Modal para crear poder */}
      <Dialog open={isPowerDialogOpen} onOpenChange={setIsPowerDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Crear Poder - {selectedContactForPower?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Complete los datos faltantes para generar el poder legal:
            </p>

            {/* Selectores de tipo de mandante y género */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mandante-type">Tipo de Mandante *</Label>
                <Select
                  value={powerData.mandante_type}
                  onValueChange={(value) => setPowerData(prev => ({
                    ...prev,
                    mandante_type: value,
                    // Limpiar campos de empresa si se cambia a persona
                    ...(value === 'persona' ? { represented_company: '', represented_company_rut: '' } : {})
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="persona">👤 Persona Natural</SelectItem>
                    <SelectItem value="empresa">🏢 Representante de Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="gender">Género del Mandante *</Label>
                <Select
                  value={powerData.gender}
                  onValueChange={(value) => setPowerData(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">♂️ Masculino</SelectItem>
                    <SelectItem value="femenino">♀️ Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="power-rut">RUT del Mandante *</Label>
                <Input
                  id="power-rut"
                  value={powerData.rut}
                  onChange={(e) => setPowerData(prev => ({ ...prev, rut: e.target.value }))}
                  placeholder="Ej: 12.345.678-9"
                />
              </div>

              {powerData.mandante_type === 'empresa' && (
                <div>
                  <Label htmlFor="power-company-rut">RUT de la Empresa Representada *</Label>
                  <Input
                    id="power-company-rut"
                    value={powerData.represented_company_rut}
                    onChange={(e) => setPowerData(prev => ({ ...prev, represented_company_rut: e.target.value }))}
                    placeholder="Ej: 76.123.456-7"
                  />
                </div>
              )}
            </div>

            {powerData.mandante_type === 'empresa' && (
              <div>
                <Label htmlFor="power-company">Empresa Representada *</Label>
                <Input
                  id="power-company"
                  value={powerData.represented_company}
                  onChange={(e) => setPowerData(prev => ({ ...prev, represented_company: e.target.value }))}
                  placeholder="Ej: Empresa ABC S.A."
                />
              </div>
            )}

            <div>
              <Label htmlFor="power-address">Domicilio *</Label>
              <Textarea
                id="power-address"
                value={powerData.address}
                onChange={(e) => setPowerData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Ej: Av. Providencia 1234, Providencia, Santiago"
                rows={2}
              />
            </div>

            {/* Sección de datos de marca */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium text-sm mb-4 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Datos de la Marca
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="power-purpose">Propósito del Poder *</Label>
                  <Select
                    value={powerData.power_purpose}
                    onValueChange={(value) => setPowerData(prev => ({ ...prev, power_purpose: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="renovación de marca">Renovación de Marca</SelectItem>
                      <SelectItem value="registro de marca">Registro de Marca</SelectItem>
                      <SelectItem value="oposición de marca">Oposición de Marca</SelectItem>
                      <SelectItem value="cancelación de marca">Cancelación de Marca</SelectItem>
                      <SelectItem value="transferencia de marca">Transferencia de Marca</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="brand-class">Clase Niza *</Label>
                  <Input
                    id="brand-class"
                    value={powerData.brand_class}
                    onChange={(e) => setPowerData(prev => ({ ...prev, brand_class: e.target.value }))}
                    placeholder="Ej: 41"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="brand-type">Tipo de Marca</Label>
                  <Select
                    value={powerData.brand_type}
                    onValueChange={(value) => setPowerData(prev => ({ ...prev, brand_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Marca Mixta">Marca Mixta</SelectItem>
                      <SelectItem value="Marca Denominativa">Marca Denominativa</SelectItem>
                      <SelectItem value="Marca Figurativa">Marca Figurativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="brand-coverage">Cobertura de la Marca</Label>
                  <Select
                    value={powerData.brand_coverage}
                    onValueChange={(value) => setPowerData(prev => ({ ...prev, brand_coverage: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Marca de servicios">Marca de servicios</SelectItem>
                      <SelectItem value="Marca de productos">Marca de productos</SelectItem>
                      <SelectItem value="Marca mixta">Marca mixta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="brand-description">Descripción de la Marca *</Label>
                <Textarea
                  id="brand-description"
                  value={powerData.brand_description}
                  onChange={(e) => setPowerData(prev => ({ ...prev, brand_description: e.target.value }))}
                  placeholder="Ej: Servicios de instrucción, educación y manejo de conductores; servicios educacionales en todos sus grados y capacitación técnico profesional."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="brand-registration">Número de Registro</Label>
                  <Input
                    id="brand-registration"
                    value={powerData.brand_registration_number}
                    onChange={(e) => setPowerData(prev => ({ ...prev, brand_registration_number: e.target.value }))}
                    placeholder="Ej: 1178528"
                  />
                </div>

                <div>
                  <Label htmlFor="brand-application">Número de Solicitud</Label>
                  <Input
                    id="brand-application"
                    value={powerData.brand_application_number}
                    onChange={(e) => setPowerData(prev => ({ ...prev, brand_application_number: e.target.value }))}
                    placeholder="Ej: 1158385"
                  />
                </div>
              </div>

              {/* Campo para logo de marca mixta */}
              {powerData.brand_type === 'Marca Mixta' && (
                <div className="mt-4">
                  <Label htmlFor="brand-logo">Logo de la Marca (solo para Marca Mixta)</Label>
                  <Input
                    id="brand-logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string
                          setPowerData(prev => ({ ...prev, brand_logo: base64 }))
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    className="cursor-pointer"
                  />
                  {powerData.brand_logo && (
                    <div className="mt-2">
                      <img
                        src={powerData.brand_logo}
                        alt="Logo de la marca"
                        className="max-w-32 max-h-32 object-contain border rounded"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {!generatedPowerPDF ? (
              // Botones antes de generar el PDF
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={generatePowerPDF}
                  disabled={
                    !powerData.rut ||
                    !powerData.address ||
                    !powerData.brand_class ||
                    !powerData.brand_description ||
                    (powerData.mandante_type === 'empresa' && (!powerData.represented_company || !powerData.represented_company_rut)) ||
                    isGeneratingPDF
                  }
                  className="flex-1"
                >
                  {isGeneratingPDF ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generar Poder
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleClosePowerDialog}
                  disabled={isGeneratingPDF}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              // Botones después de generar el PDF
              <div className="space-y-4 pt-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">PDF generado exitosamente</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    El poder ha sido descargado. ¿Deseas enviarlo por correo?
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={sendPowerByEmail}
                    disabled={isSendingEmail}
                    className="flex-1"
                  >
                    {isSendingEmail ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar por Correo (PRUEBA)
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleClosePowerDialog}
                    disabled={isSendingEmail}
                  >
                    Cerrar
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  📧 El correo se enviará a <strong>tobarrientos1@gmail.com</strong> para pruebas
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
