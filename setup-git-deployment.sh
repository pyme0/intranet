#!/bin/bash

# Script para configurar el despliegue automático con Git en el servidor Vultr
# Configura el repositorio Git y crea scripts de actualización automática

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración del servidor
SERVER_IP="${1:-64.176.6.196}"
SERVER_USER="linuxuser"
SERVER_PASSWORD=")4YuM3#-+X(##h}+"
SERVER_PATH="/opt/patricia-stocker"

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

log "🚀 Configurando despliegue automático con Git en servidor: $SERVER_IP"

# Verificar conexión
log "🔐 Verificando conexión..."
if ! sshpass -p "$SERVER_PASSWORD" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" exit 2>/dev/null; then
    error "No se puede conectar al servidor $SERVER_IP"
fi
success "Conexión establecida"

# Obtener la URL del repositorio Git
REPO_URL=$(git remote get-url origin)
log "📦 Repositorio detectado: $REPO_URL"

# Crear script de configuración Git remota
cat > setup-git-remote.sh << 'EOF'
#!/bin/bash

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

cd /opt/patricia-stocker

# Instalar Git si no está instalado
log "📦 Instalando Git..."
sudo apt update
sudo apt install -y git

# Configurar Git (usuario genérico para el servidor)
log "⚙️ Configurando Git..."
git config --global user.name "Patricia Stocker Server"
git config --global user.email "server@patriciastocker.com"
git config --global init.defaultBranch main

# Si ya existe un repositorio, hacer backup
if [ -d ".git" ]; then
    log "🔄 Repositorio Git existente encontrado, actualizando..."
    git fetch origin
    git reset --hard origin/main
else
    log "📥 Clonando repositorio..."
    cd /opt
    sudo rm -rf patricia-stocker
    git clone REPO_URL_PLACEHOLDER patricia-stocker
    sudo chown -R linuxuser:linuxuser patricia-stocker
    cd patricia-stocker
fi

success "Repositorio Git configurado"

# Crear script de actualización local
log "📝 Creando script de actualización local..."
cat > update-local.sh << 'UPDATE_EOF'
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

log "🔄 Actualizando desde Git..."
git fetch origin
git reset --hard origin/main
success "Código actualizado"

log "📦 Instalando/actualizando dependencias..."

# Actualizar dependencias Python
sudo pip3 install --upgrade flask imaplib-ssl requests

# Actualizar dependencias Node.js
cd email-client
npm install
npm run build
cd ..

log "🔄 Reiniciando servicios..."
sudo systemctl restart patricia-intranet
sudo systemctl restart patricia-email-api  
sudo systemctl restart patricia-email-client

sleep 3

log "📊 Estado de servicios:"
systemctl status patricia-intranet --no-pager -l | head -3
systemctl status patricia-email-api --no-pager -l | head -3
systemctl status patricia-email-client --no-pager -l | head -3

success "Actualización completada!"
UPDATE_EOF

chmod +x update-local.sh

# Crear script de webhook (opcional para GitHub/GitLab)
log "🔗 Creando script de webhook..."
cat > webhook-update.sh << 'WEBHOOK_EOF'
#!/bin/bash

# Script para ser llamado por webhooks de GitHub/GitLab
# Uso: curl -X POST http://64.176.6.196:9000/webhook

set -e

cd /opt/patricia-stocker

echo "$(date): Webhook recibido, iniciando actualización..." >> /var/log/patricia-webhook.log

# Ejecutar actualización
./update-local.sh >> /var/log/patricia-webhook.log 2>&1

echo "$(date): Actualización completada" >> /var/log/patricia-webhook.log
WEBHOOK_EOF

chmod +x webhook-update.sh

success "Scripts de actualización creados"

log "✅ Configuración Git completada!"
echo ""
echo "📋 Scripts disponibles:"
echo "   - ./update-local.sh - Actualizar manualmente"
echo "   - ./webhook-update.sh - Para webhooks automáticos"
echo ""
echo "🔧 Para actualizar manualmente:"
echo "   ssh linuxuser@$(curl -s ifconfig.me)"
echo "   cd /opt/patricia-stocker"
echo "   ./update-local.sh"

EOF

# Reemplazar placeholder con la URL real del repositorio
sed -i.bak "s|REPO_URL_PLACEHOLDER|$REPO_URL|g" setup-git-remote.sh

# Enviar y ejecutar script de configuración
log "📤 Enviando script de configuración Git al servidor..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no setup-git-remote.sh "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"

log "🔧 Ejecutando configuración Git en el servidor..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "cd $SERVER_PATH && chmod +x setup-git-remote.sh && ./setup-git-remote.sh"

success "Configuración Git completada"

# Limpiar archivos temporales
rm -f setup-git-remote.sh setup-git-remote.sh.bak

log "🎉 ¡Configuración de Git completada exitosamente!"
echo ""
echo "🔄 Para actualizar el servidor ahora puedes usar:"
echo "   ./update-server.sh"
echo ""
echo "🔧 O conectarte directamente al servidor:"
echo "   sshpass -p ')4YuM3#-+X(##h}+' ssh linuxuser@$SERVER_IP"
echo "   cd /opt/patricia-stocker"
echo "   ./update-local.sh"
