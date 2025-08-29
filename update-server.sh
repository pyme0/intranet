#!/bin/bash

# Script para actualizar el servidor Patricia Stocker en Vultr usando Git
# Actualiza el código, reinstala dependencias y reinicia servicios

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración del servidor
SERVER_IP="${1:-64.176.6.196}"
SERVER_USER="linuxuser"
SERVER_PASSWORD=")4YuM3#-+X(##h}+"
SERVER_PATH="/opt/patricia-stocker"

# Función para mostrar mensajes
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
    exit 1
}

log "🔄 Iniciando actualización del servidor Vultr: $SERVER_IP"

# Verificar conexión
log "🔐 Verificando conexión..."
if ! sshpass -p "$SERVER_PASSWORD" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" exit 2>/dev/null; then
    error "No se puede conectar al servidor $SERVER_IP. Verifica que el servidor esté encendido."
fi
success "Conexión establecida"

# Crear script de actualización remota
cat > update-remote.sh << 'EOF'
#!/bin/bash

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

cd /opt/patricia-stocker

log "🔄 Actualizando código desde Git..."
git fetch origin
git reset --hard origin/main
success "Código actualizado"

log "📦 Actualizando dependencias del sistema..."
sudo apt update

# Actualizar dependencias Python si es necesario
log "🐍 Verificando dependencias Python..."
sudo pip3 install --upgrade flask imaplib-ssl requests

# Actualizar dependencias Node.js del cliente
log "📱 Actualizando dependencias del cliente de correos..."
cd email-client
npm install
npm run build
cd ..

log "🔄 Reiniciando servicios..."
sudo systemctl restart patricia-intranet
sudo systemctl restart patricia-email-api
sudo systemctl restart patricia-email-client

# Esperar un momento para que los servicios se inicien
sleep 5

log "📊 Verificando estado de servicios..."
if systemctl is-active --quiet patricia-intranet; then
    success "patricia-intranet: ✅ Activo"
else
    warning "patricia-intranet: ❌ Inactivo"
fi

if systemctl is-active --quiet patricia-email-api; then
    success "patricia-email-api: ✅ Activo"
else
    warning "patricia-email-api: ❌ Inactivo"
fi

if systemctl is-active --quiet patricia-email-client; then
    success "patricia-email-client: ✅ Activo"
else
    warning "patricia-email-client: ❌ Inactivo"
fi

log "✅ Actualización completada!"
echo ""
echo "🌐 Servicios disponibles:"
echo "   - Intranet: http://$(curl -s ifconfig.me):8000"
echo "   - Cliente Correos: http://$(curl -s ifconfig.me):3001"
echo "   - API Correos: http://$(curl -s ifconfig.me):8080"

EOF

# Enviar script de actualización al servidor
log "📤 Enviando script de actualización al servidor..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no update-remote.sh "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"

# Ejecutar actualización remota
log "🔧 Ejecutando actualización en el servidor..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "cd $SERVER_PATH && chmod +x update-remote.sh && ./update-remote.sh"

success "Actualización completada"

# Limpiar archivo temporal
rm -f update-remote.sh

log "🎉 ¡Actualización completada exitosamente!"
echo ""
echo "🌐 Tu aplicación actualizada está disponible en:"
echo "   - Intranet: http://$SERVER_IP:8000"
echo "   - Cliente Correos: http://$SERVER_IP:3001"
echo "   - API Correos: http://$SERVER_IP:8080"
