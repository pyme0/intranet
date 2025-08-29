#!/bin/bash

# Script para verificar que todos los servicios estén funcionando correctamente
# en el servidor Vultr después del despliegue

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración del servidor
SERVER_IP="${1:-64.176.6.196}"

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

log "🔍 Verificando despliegue en servidor: $SERVER_IP"

# Función para verificar endpoint
check_endpoint() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    
    log "Verificando $name: $url"
    
    if response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$url" 2>/dev/null); then
        if [ "$response" -eq "$expected_status" ]; then
            success "$name: ✅ Respondiendo (HTTP $response)"
            return 0
        else
            warning "$name: ⚠️ Respuesta inesperada (HTTP $response)"
            return 1
        fi
    else
        error "$name: ❌ No responde"
        return 1
    fi
}

# Verificar servicios principales
echo ""
log "🌐 Verificando servicios web..."

check_endpoint "http://$SERVER_IP:8000" "Intranet (Deno)"
check_endpoint "http://$SERVER_IP:8080/api/emails/paginated?page=1&limit=1" "API Correos (Python)"
check_endpoint "http://$SERVER_IP:3001" "Cliente Correos (Next.js)"

# Verificar webhook si está configurado
echo ""
log "🔗 Verificando webhook..."
if check_endpoint "http://$SERVER_IP:9000/health" "Webhook Server"; then
    check_endpoint "http://$SERVER_IP:9000/status" "Webhook Status"
else
    warning "Webhook no configurado (opcional)"
fi

# Verificar APIs específicas
echo ""
log "🔧 Verificando APIs específicas..."

check_endpoint "http://$SERVER_IP:8000/api/deudas" "API Deudas"
check_endpoint "http://$SERVER_IP:8000/api/resumen" "API Resumen"
check_endpoint "http://$SERVER_IP:8080/api/accounts" "API Cuentas de Correo"

# Resumen final
echo ""
log "📊 Resumen de verificación:"
echo ""
echo "🌐 URLs de acceso:"
echo "   - Intranet: http://$SERVER_IP:8000"
echo "   - Cliente Correos: http://$SERVER_IP:3001"
echo "   - API Correos: http://$SERVER_IP:8080"
echo "   - Webhook: http://$SERVER_IP:9000 (si está configurado)"
echo ""
echo "🔧 Para conectarse al servidor:"
echo "   sshpass -p ')4YuM3#-+X(##h}+' ssh linuxuser@$SERVER_IP"
echo ""
echo "📋 Comandos útiles en el servidor:"
echo "   cd /opt/patricia-stocker"
echo "   ./update-local.sh                    # Actualizar código"
echo "   systemctl status patricia-*          # Ver estado servicios"
echo "   journalctl -u patricia-intranet -f   # Ver logs"
echo ""

if [ $? -eq 0 ]; then
    success "🎉 ¡Verificación completada! Todos los servicios están funcionando."
else
    warning "⚠️ Algunos servicios pueden tener problemas. Revisa los logs."
fi
