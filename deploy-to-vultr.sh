#!/bin/bash

# Script para desplegar el sistema completo en Vultr
# Incluye: Intranet (Deno), Cliente de Correos (Next.js + Python), y migración de correos

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración del servidor
SERVER_IP="${1:-}"
SERVER_USER="root"
SERVER_PATH="/opt/patricia-stocker"
SSH_KEY_PATH="$HOME/.ssh/id_rsa"

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

# Verificar parámetros
if [ -z "$SERVER_IP" ]; then
    error "Uso: $0 <SERVER_IP>
    
Ejemplo: $0 164.90.123.456

Este script desplegará:
- Sistema Intranet (Deno) en puerto 8000
- Cliente de Correos (Next.js) en puerto 3001  
- API de Correos (Python) en puerto 8080
- Migración completa de correos con imapsync"
fi

log "🚀 Iniciando despliegue en servidor Vultr: $SERVER_IP"

# Verificar conexión SSH
log "🔐 Verificando conexión SSH..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_IP" exit 2>/dev/null; then
    error "No se puede conectar al servidor $SERVER_IP. Verifica:
- La IP del servidor
- Que tu clave SSH esté configurada
- Que el servidor esté encendido"
fi
success "Conexión SSH establecida"

# Crear directorio remoto
log "📁 Creando directorio de aplicación..."
ssh "$SERVER_USER@$SERVER_IP" "mkdir -p $SERVER_PATH && cd $SERVER_PATH"

# Crear archivo .rsync-exclude para excluir archivos innecesarios
cat > .rsync-exclude << 'EOF'
node_modules/
.next/
.git/
LOG_imapsync/
*.log
.DS_Store
.env*
email-client/data/
intranet.db
EOF

# Sincronizar archivos
log "📦 Sincronizando archivos al servidor..."
rsync -avz --progress --delete \
    --exclude-from=.rsync-exclude \
    ./ "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"

success "Archivos sincronizados"

# Crear script de instalación remota
cat > install-remote.sh << 'EOF'
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

log "🔧 Actualizando sistema..."
apt update && apt upgrade -y

log "📦 Instalando dependencias del sistema..."
apt install -y curl unzip python3 python3-pip nodejs npm build-essential

# Instalar Deno
log "🦕 Instalando Deno..."
if ! command -v deno &> /dev/null; then
    curl -fsSL https://deno.land/x/install/install.sh | sh
    echo 'export PATH="$HOME/.deno/bin:$PATH"' >> ~/.bashrc
    export PATH="$HOME/.deno/bin:$PATH"
fi
success "Deno instalado"

# Instalar imapsync
log "📧 Instalando imapsync..."
if ! command -v imapsync &> /dev/null; then
    apt install -y imapsync
fi
success "imapsync instalado"

# Instalar dependencias Python
log "🐍 Instalando dependencias Python..."
pip3 install flask imaplib-ssl requests

# Instalar dependencias Node.js
log "📱 Instalando dependencias del cliente de correos..."
cd email-client
npm install
npm run build
cd ..

# Crear base de datos
log "🗄️ Configurando base de datos..."
/root/.deno/bin/deno run --allow-all setup-database.ts

# Crear servicios systemd
log "⚙️ Creando servicios systemd..."

# Servicio Intranet
cat > /etc/systemd/system/patricia-intranet.service << 'INTRANET_EOF'
[Unit]
Description=Patricia Stocker Intranet
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/patricia-stocker
Environment=PATH=/root/.deno/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/root/.deno/bin/deno run --allow-all server.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
INTRANET_EOF

# Servicio API Correos
cat > /etc/systemd/system/patricia-email-api.service << 'EMAIL_API_EOF'
[Unit]
Description=Patricia Stocker Email API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/patricia-stocker
ExecStart=/usr/bin/python3 simple-mail-client.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EMAIL_API_EOF

# Servicio Cliente Correos
cat > /etc/systemd/system/patricia-email-client.service << 'EMAIL_CLIENT_EOF'
[Unit]
Description=Patricia Stocker Email Client
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/patricia-stocker/email-client
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EMAIL_CLIENT_EOF

# Recargar systemd y habilitar servicios
systemctl daemon-reload
systemctl enable patricia-intranet
systemctl enable patricia-email-api
systemctl enable patricia-email-client

log "🔥 Iniciando servicios..."
systemctl start patricia-intranet
systemctl start patricia-email-api
systemctl start patricia-email-client

success "Servicios iniciados"

# Configurar firewall
log "🔒 Configurando firewall..."
ufw allow 22/tcp
ufw allow 8000/tcp
ufw allow 8080/tcp
ufw allow 3001/tcp
ufw --force enable

success "Firewall configurado"

log "✅ Instalación completada!"
echo ""
echo "🌐 Servicios disponibles:"
echo "   - Intranet: http://$(curl -s ifconfig.me):8000"
echo "   - Cliente Correos: http://$(curl -s ifconfig.me):3001"
echo "   - API Correos: http://$(curl -s ifconfig.me):8080"
echo ""
echo "📊 Estado de servicios:"
systemctl status patricia-intranet --no-pager -l
systemctl status patricia-email-api --no-pager -l
systemctl status patricia-email-client --no-pager -l

EOF

# Enviar script de instalación al servidor
scp install-remote.sh "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"

# Ejecutar instalación remota
log "🔧 Ejecutando instalación en el servidor..."
ssh "$SERVER_USER@$SERVER_IP" "cd $SERVER_PATH && chmod +x install-remote.sh && ./install-remote.sh"

success "Instalación completada"

# Limpiar archivos temporales
rm -f .rsync-exclude install-remote.sh

log "🎉 ¡Despliegue completado exitosamente!"
echo ""
echo "🌐 Tu aplicación está disponible en:"
echo "   - Intranet: http://$SERVER_IP:8000"
echo "   - Cliente Correos: http://$SERVER_IP:3001"
echo "   - API Correos: http://$SERVER_IP:8080"
echo ""
echo "📧 Para ejecutar la migración de correos, conéctate al servidor:"
echo "   ssh root@$SERVER_IP"
echo "   cd /opt/patricia-stocker"
echo "   ./migrate-emails.sh"
