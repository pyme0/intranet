#!/bin/bash

# Script para desplegar el sistema completo en Vultr usando contraseña
# Incluye: Intranet (Deno), Cliente de Correos (Next.js + Python), y migración de correos

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

log "🚀 Iniciando despliegue en servidor Vultr: $SERVER_IP"

# Usar contraseña configurada
log "🔑 Usando credenciales: $SERVER_USER@$SERVER_IP"

# Verificar conexión
log "🔐 Verificando conexión..."
if ! sshpass -p "$SERVER_PASSWORD" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" exit 2>/dev/null; then
    error "No se puede conectar al servidor $SERVER_IP. Verifica la contraseña y que el servidor esté encendido."
fi
success "Conexión establecida"

# Crear directorio remoto
log "📁 Creando directorio de aplicación..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "sudo mkdir -p $SERVER_PATH && sudo chown $SERVER_USER:$SERVER_USER $SERVER_PATH"

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

# Sincronizar archivos usando sshpass
log "📦 Sincronizando archivos al servidor..."
sshpass -p "$SERVER_PASSWORD" rsync -avz --progress --delete \
    --exclude-from=.rsync-exclude \
    -e "ssh -o StrictHostKeyChecking=no" \
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
sudo apt update && sudo apt upgrade -y

log "📦 Instalando dependencias del sistema..."
sudo apt install -y curl unzip python3 python3-pip nodejs npm build-essential

# Instalar Deno
log "🦕 Instalando Deno..."
if ! command -v deno &> /dev/null; then
    curl -fsSL https://deno.land/x/install/install.sh | sh
    echo 'export PATH="$HOME/.deno/bin:$PATH"' >> ~/.bashrc
    export PATH="$HOME/.deno/bin:$PATH"
fi
success "Deno instalado"

# Instalar imapsync desde código fuente
log "📧 Instalando imapsync..."
if ! command -v imapsync &> /dev/null; then
    # Instalar dependencias de Perl para imapsync
    sudo apt install -y libauthen-ntlm-perl libcrypt-openssl-rsa-perl libdata-uniqid-perl libfile-copy-recursive-perl libio-socket-ssl-perl libio-tee-perl libjson-webtoken-perl libmail-imapclient-perl libparse-recdescent-perl libproc-processtable-perl libmodule-scandeps-perl libreadonly-perl libsys-meminfo-perl libterm-readkey-perl libtest-mockobject-perl libtest-pod-perl libunicode-string-perl liburi-perl libwww-perl libtest-nowarnings-perl libtest-deep-perl libtest-warn-perl

    # Descargar e instalar imapsync
    cd /tmp
    wget -N https://imapsync.lamiral.info/imapsync
    sudo cp imapsync /usr/local/bin/
    sudo chmod +x /usr/local/bin/imapsync
    cd /opt/patricia-stocker
fi
success "imapsync instalado"

# Instalar dependencias Python
log "🐍 Instalando dependencias Python..."
sudo pip3 install flask imaplib-ssl requests

# Instalar dependencias Node.js
log "📱 Instalando dependencias del cliente de correos..."
cd email-client
npm install
npm run build
cd ..

# Crear base de datos
log "🗄️ Configurando base de datos..."
$HOME/.deno/bin/deno run --allow-all setup-database.ts

# Crear servicios systemd
log "⚙️ Creando servicios systemd..."

# Servicio Intranet
sudo tee /etc/systemd/system/patricia-intranet.service << 'INTRANET_EOF'
[Unit]
Description=Patricia Stocker Intranet
After=network.target

[Service]
Type=simple
User=linuxuser
WorkingDirectory=/opt/patricia-stocker
Environment=PATH=/home/linuxuser/.deno/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/home/linuxuser/.deno/bin/deno run --allow-all server.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
INTRANET_EOF

# Servicio API Correos
sudo tee /etc/systemd/system/patricia-email-api.service << 'EMAIL_API_EOF'
[Unit]
Description=Patricia Stocker Email API
After=network.target

[Service]
Type=simple
User=linuxuser
WorkingDirectory=/opt/patricia-stocker
ExecStart=/usr/bin/python3 simple-mail-client.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EMAIL_API_EOF

# Servicio Cliente Correos
sudo tee /etc/systemd/system/patricia-email-client.service << 'EMAIL_CLIENT_EOF'
[Unit]
Description=Patricia Stocker Email Client
After=network.target

[Service]
Type=simple
User=linuxuser
WorkingDirectory=/opt/patricia-stocker/email-client
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EMAIL_CLIENT_EOF

# Recargar systemd y habilitar servicios
sudo systemctl daemon-reload
sudo systemctl enable patricia-intranet
sudo systemctl enable patricia-email-api
sudo systemctl enable patricia-email-client

log "🔥 Iniciando servicios..."
sudo systemctl start patricia-intranet
sudo systemctl start patricia-email-api
sudo systemctl start patricia-email-client

success "Servicios iniciados"

# Configurar firewall
log "🔒 Configurando firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 3001/tcp
sudo ufw --force enable

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
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no install-remote.sh "$SERVER_USER@$SERVER_IP:$SERVER_PATH/"

# Ejecutar instalación remota
log "🔧 Ejecutando instalación en el servidor..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "cd $SERVER_PATH && chmod +x install-remote.sh && ./install-remote.sh"

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
echo "📧 Para ejecutar la migración de correos:"
echo "   sshpass -p ')4YuM3#-+X(##h}+' ssh linuxuser@$SERVER_IP"
echo "   cd /opt/patricia-stocker"
echo "   ./migrate-emails.sh"
