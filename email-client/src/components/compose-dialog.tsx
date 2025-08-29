'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { Email } from './email-client'

interface ComposeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  replyTo?: Email | null
  prefilledData?: {
    to?: string
    subject?: string
    body?: string
  }
}

export function ComposeDialog({ open, onOpenChange, replyTo, prefilledData }: ComposeDialogProps) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Configurar campos cuando es una respuesta
  useEffect(() => {
    if (replyTo && open) {
      // Extraer email del campo 'from'
      const fromEmail = replyTo.from.includes('<') 
        ? replyTo.from.match(/<(.+)>/)?.[1] || replyTo.from
        : replyTo.from

      setTo(fromEmail)
      setSubject(replyTo.subject.startsWith('Re: ') 
        ? replyTo.subject 
        : `Re: ${replyTo.subject}`
      )
      
      // Crear cuerpo de respuesta
      const originalBody = replyTo.body
        .split('\n')
        .map(line => `> ${line}`)
        .join('\n')
      
      setBody(`\n\n--- Mensaje original ---\n${originalBody}`)
    } else if (open && !replyTo) {
      // Usar datos pre-rellenados si están disponibles
      if (prefilledData) {
        setTo(prefilledData.to || '')
        setSubject(prefilledData.subject || '')
        setBody(prefilledData.body || '')
      } else {
        // Limpiar campos para nuevo correo
        setTo('')
        setSubject('')
        setBody('')
      }
    }
  }, [replyTo, open, prefilledData])

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error('Por favor completa todos los campos')
      return
    }

    setIsSending(true)

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim(),
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Correo enviado exitosamente')
        onOpenChange(false)
        // Limpiar campos
        setTo('')
        setSubject('')
        setBody('')
      } else {
        toast.error(result.error || 'Error al enviar el correo')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Error de conexión al enviar el correo')
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    if (!isSending) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {replyTo ? 'Responder correo' : 'Redactar correo'}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isSending}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Para */}
          <div className="space-y-2">
            <Label htmlFor="to">Para</Label>
            <Input
              id="to"
              type="email"
              placeholder="destinatario@ejemplo.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={isSending}
            />
          </div>

          {/* Asunto */}
          <div className="space-y-2">
            <Label htmlFor="subject">Asunto</Label>
            <Input
              id="subject"
              placeholder="Asunto del correo"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
            />
          </div>

          {/* Cuerpo */}
          <div className="space-y-2 flex-1">
            <Label htmlFor="body">Mensaje</Label>
            <Textarea
              id="body"
              placeholder="Escribe tu mensaje aquí..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isSending}
              className="min-h-[200px] resize-none"
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {replyTo && (
              <span>Respondiendo a: {replyTo.from}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !to.trim() || !subject.trim() || !body.trim()}
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
