#!/bin/bash

# Script para hacer build del cliente de correos antes del deploy

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log "🏗️  Preparando build del cliente de correos..."

# Verificar que estamos en el directorio correcto
if [ ! -d "email-client" ]; then
    echo "❌ Error: No se encuentra el directorio email-client"
    echo "Ejecuta este script desde el directorio raíz del proyecto"
    exit 1
fi

cd email-client

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado"
    exit 1
fi

log "📦 Instalando dependencias..."
npm install

log "🏗️  Creando build de producción..."
npm run build

success "Build completado"

# Verificar que el build se creó correctamente
if [ -d ".next" ]; then
    success "Directorio .next creado correctamente"
    
    # Mostrar tamaño del build
    BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1)
    log "📊 Tamaño del build: $BUILD_SIZE"
else
    echo "❌ Error: No se pudo crear el build"
    exit 1
fi

cd ..

success "Cliente de correos listo para deploy"

echo ""
echo "🚀 Para desplegar al servidor Vultr, ejecuta:"
echo "   ./deploy-to-vultr.sh TU_IP_SERVIDOR"
echo ""
echo "📧 Para migrar correos después del deploy:"
echo "   ssh root@TU_IP_SERVIDOR"
echo "   cd /opt/patricia-stocker"
echo "   ./migrate-emails.sh"
