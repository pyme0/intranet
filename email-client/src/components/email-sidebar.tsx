'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Mail,
  Send,
  Archive,
  Trash2,
  Star,
  Plus,
  Wifi,
  WifiOff,
  Clock,
  StickyNote,
  Users
} from 'lucide-react'
import { ConnectionStatus } from './email-client'
import { ThemeToggle } from './theme-toggle'

interface EmailSidebarProps {
  onCompose: () => void
  connectionStatus: ConnectionStatus
  emailCount: number
  unreadCount?: number
  emailFilter: 'inbox' | 'sent'
  onFilterChange: (filter: 'inbox' | 'sent') => void
  subFilter: 'all' | 'marcas' | 'tomas'
  onSubFilterChange: (filter: 'all' | 'marcas' | 'tomas') => void
  recipientFilter: 'marcas' | 'tomas'
  onRecipientFilterChange: (filter: 'marcas' | 'tomas') => void
  currentView: 'emails' | 'postits' | 'contacts'
  onViewChange: (view: 'emails' | 'postits' | 'contacts') => void
}

export function EmailSidebar({
  onCompose,
  connectionStatus,
  emailCount,
  unreadCount = 0,
  emailFilter,
  onFilterChange,
  subFilter,
  onSubFilterChange,
  recipientFilter,
  onRecipientFilterChange,
  currentView,
  onViewChange
}: EmailSidebarProps) {
  return (
    <div className="w-64 border-r bg-muted/10 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-foreground">
            📧 Patricia Stocker
          </h1>
          <ThemeToggle />
        </div>
        <p className="text-sm text-muted-foreground">
          tomas@patriciastocker.com
        </p>
      </div>

      {/* Compose Button */}
      <Button
        onClick={onCompose}
        className="w-full mb-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        size="lg"
      >
        <Plus className="mr-2 h-4 w-4" />
        Redactar
      </Button>

      {/* Navigation */}
      <div className="space-y-2 mb-6">
        {/* Selector de Vista */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg mb-4">
          <Button
            variant={currentView === 'emails' ? 'default' : 'ghost'}
            className="h-8 text-xs"
            size="sm"
            onClick={() => onViewChange('emails')}
          >
            <Mail className="mr-1 h-3 w-3" />
            Correos
          </Button>
          <Button
            variant={currentView === 'postits' ? 'default' : 'ghost'}
            className="h-8 text-xs"
            size="sm"
            onClick={() => onViewChange('postits')}
          >
            <StickyNote className="mr-1 h-3 w-3" />
            Notas
          </Button>
          <Button
            variant={currentView === 'contacts' ? 'default' : 'ghost'}
            className="h-8 text-xs"
            size="sm"
            onClick={() => onViewChange('contacts')}
          >
            <Users className="mr-1 h-3 w-3" />
            Contactos
          </Button>
        </div>

        {/* Filtros por Destinatario - Solo mostrar si estamos en vista de correos */}
        {currentView === 'emails' && (
          <>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground px-2">
                Filtrar Correos Por Destinatario
              </h3>

              {/* Filtro para Marcas */}
              <Button
                variant={recipientFilter === 'marcas' ? 'default' : 'ghost'}
                className="w-full justify-start"
                size="sm"
                onClick={() => onRecipientFilterChange('marcas')}
              >
                <Mail className="mr-2 h-4 w-4 text-green-600" />
                Para Marcas
                <div className="ml-auto flex items-center gap-1">
                  {recipientFilter === 'marcas' && emailCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {emailCount}
                    </Badge>
                  )}
                </div>
              </Button>

              {/* Filtro para Tomás */}
              <Button
                variant={recipientFilter === 'tomas' ? 'default' : 'ghost'}
                className="w-full justify-start"
                size="sm"
                onClick={() => onRecipientFilterChange('tomas')}
              >
                <Mail className="mr-2 h-4 w-4 text-blue-600" />
                Para Tomás
                <div className="ml-auto flex items-center gap-1">
                  {recipientFilter === 'tomas' && emailCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {emailCount}
                    </Badge>
                  )}
                </div>
              </Button>
            </div>
          </>
        )}


      </div>

      <Separator className="mb-6" />

      {/* Connection Status */}
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2">
          {connectionStatus.connected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className="text-sm font-medium">
            {connectionStatus.connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Última: {connectionStatus.last_check}</span>
          </div>
          
          {connectionStatus.error && (
            <div className="text-red-500 text-xs">
              Error: {connectionStatus.error}
            </div>
          )}
          
          <div className="mt-2 pt-2 border-t">
            <div className="text-xs">
              <strong>Servidor:</strong> Hostinger
            </div>
            <div className="text-xs">
              <strong>IMAP:</strong> imap.hostinger.com:993
            </div>
            <div className="text-xs">
              <strong>SMTP:</strong> smtp.hostinger.com:465
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
