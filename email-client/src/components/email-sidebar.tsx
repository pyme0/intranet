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
  Clock
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
}

export function EmailSidebar({
  onCompose,
  connectionStatus,
  emailCount,
  unreadCount = 0,
  emailFilter,
  onFilterChange,
  subFilter,
  onSubFilterChange
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
        {/* Sección Principal */}
        <Button
          variant={emailFilter === 'inbox' ? 'default' : 'ghost'}
          className="w-full justify-start"
          size="sm"
          onClick={() => onFilterChange('inbox')}
        >
          <Mail className="mr-2 h-4 w-4" />
          Bandeja Principal
          <div className="ml-auto flex items-center gap-1">
            {emailFilter === 'inbox' && unreadCount > 0 && (
              <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                {unreadCount}
              </Badge>
            )}
            {emailFilter === 'inbox' && emailCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {emailCount}
              </Badge>
            )}
          </div>
        </Button>

        {/* Filtros para Bandeja Principal */}
        {emailFilter === 'inbox' && (
          <div className="ml-4 space-y-1">
            <Button
              variant={subFilter === 'all' ? 'secondary' : 'ghost'}
              className="w-full justify-start text-sm"
              size="sm"
              onClick={() => onSubFilterChange('all')}
            >
              Todos los correos
            </Button>
            <Button
              variant={subFilter === 'marcas' ? 'secondary' : 'ghost'}
              className="w-full justify-start text-sm"
              size="sm"
              onClick={() => onSubFilterChange('marcas')}
            >
              <Mail className="mr-2 h-3 w-3 text-green-600" />
              Correos a Marcas
            </Button>
            <Button
              variant={subFilter === 'tomas' ? 'secondary' : 'ghost'}
              className="w-full justify-start text-sm"
              size="sm"
              onClick={() => onSubFilterChange('tomas')}
            >
              <Mail className="mr-2 h-3 w-3 text-blue-600" />
              Correos a Tomas
            </Button>
          </div>
        )}

        {/* Sección Enviados */}
        <Button
          variant={emailFilter === 'sent' ? 'default' : 'ghost'}
          className="w-full justify-start"
          size="sm"
          onClick={() => onFilterChange('sent')}
        >
          <Send className="mr-2 h-4 w-4 text-purple-600" />
          Enviados
          {emailFilter === 'sent' && emailCount > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {emailCount}
            </Badge>
          )}
        </Button>

        {/* Filtros para Enviados */}
        {emailFilter === 'sent' && (
          <div className="ml-4 space-y-1">
            <Button
              variant={subFilter === 'all' ? 'secondary' : 'ghost'}
              className="w-full justify-start text-sm"
              size="sm"
              onClick={() => onSubFilterChange('all')}
            >
              Todos los enviados
            </Button>
            <Button
              variant={subFilter === 'marcas' ? 'secondary' : 'ghost'}
              className="w-full justify-start text-sm"
              size="sm"
              onClick={() => onSubFilterChange('marcas')}
            >
              <Send className="mr-2 h-3 w-3 text-green-600" />
              Desde Marcas
            </Button>
            <Button
              variant={subFilter === 'tomas' ? 'secondary' : 'ghost'}
              className="w-full justify-start text-sm"
              size="sm"
              onClick={() => onSubFilterChange('tomas')}
            >
              <Send className="mr-2 h-3 w-3 text-blue-600" />
              Desde Tomas
            </Button>
          </div>
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
