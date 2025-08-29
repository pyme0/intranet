#!/bin/bash

# Script para configurar el servidor de webhook automático en Vultr
# Configura el webhook server como servicio systemd

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

log "🔗 Configurando servidor de webhook en: $SERVER_IP"

# Verificar conexión
if ! sshpass -p "$SERVER_PASSWORD" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" exit 2>/dev/null; then
    error "No se puede conectar al servidor $SERVER_IP"
fi
success "Conexión establecida"

# Crear script de configuración de webhook
cat > setup-webhook-remote.sh << 'EOF'
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

log "🔗 Configurando servidor de webhook..."

# Crear servicio systemd para el webhook
sudo tee /etc/systemd/system/patricia-webhook.service << 'WEBHOOK_SERVICE_EOF'
[Unit]
Description=Patricia Stocker Webhook Server
After=network.target

[Service]
Type=simple
User=linuxuser
WorkingDirectory=/opt/patricia-stocker
ExecStart=/usr/bin/python3 webhook-server.py
Restart=always
RestartSec=10
Environment=PYTHONPATH=/opt/patricia-stocker

[Install]
WantedBy=multi-user.target
WEBHOOK_SERVICE_EOF

# Recargar systemd y habilitar el servicio
sudo systemctl daemon-reload
sudo systemctl enable patricia-webhook

log "🔥 Iniciando servidor de webhook..."
sudo systemctl start patricia-webhook

# Configurar firewall para el puerto 9000
log "🔒 Configurando firewall para webhook..."
sudo ufw allow 9000/tcp

# Esperar un momento para que el servicio se inicie
sleep 3

# Verificar estado del webhook
if systemctl is-active --quiet patricia-webhook; then
    success "patricia-webhook: ✅ Activo"
else
    warning "patricia-webhook: ❌ Inactivo"
fi

log "✅ Configuración de webhook completada!"
echo ""
echo "🔗 Webhook disponible en:"
echo "   - URL: http://$(curl -s ifconfig.me):9000/webhook"
echo "   - Status: http://$(curl -s ifconfig.me):9000/status"
echo "   - Health: http://$(curl -s ifconfig.me):9000/health"
echo ""
echo "📋 Para configurar en GitHub/GitLab:"
echo "   1. Ve a Settings > Webhooks"
echo "   2. URL: http://$(curl -s ifconfig.me):9000/webhook"
echo "   3. Content type: application/json"
echo "   4. Events: Push events (branch main)"
echo ""
echo "🧪 Probar webhook:"
echo "   curl -X POST http://$(curl -s ifconfig.me):9000/webhook"

EOF

# Enviar webhook server al servidor
log "📤 Enviando webhook server al servidor..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no webhook-server.py "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"

# Enviar y ejecutar script de configuración
log "📤 Enviando script de configuración..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no setup-webhook-remote.sh "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"

log "🔧 Ejecutando configuración de webhook..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "cd $SERVER_PATH && chmod +x setup-webhook-remote.sh && ./setup-webhook-remote.sh"

success "Configuración de webhook completada"

# Limpiar archivo temporal
rm -f setup-webhook-remote.sh

log "🎉 ¡Servidor de webhook configurado exitosamente!"
echo ""
echo "🔗 Tu webhook está disponible en:"
echo "   - URL: http://$SERVER_IP:9000/webhook"
echo "   - Status: http://$SERVER_IP:9000/status"
echo "   - Health: http://$SERVER_IP:9000/health"
echo ""
echo "📋 Configuración para GitHub:"
echo "   1. Ve a tu repositorio > Settings > Webhooks"
echo "   2. Click 'Add webhook'"
echo "   3. Payload URL: http://$SERVER_IP:9000/webhook"
echo "   4. Content type: application/json"
echo "   5. Events: Just the push event"
echo "   6. Branch: main"
echo ""
echo "🧪 Probar webhook:"
echo "   curl -X POST http://$SERVER_IP:9000/webhook"
