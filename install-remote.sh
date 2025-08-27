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

# Instalar imapsync
log "📧 Instalando imapsync..."
if ! command -v imapsync &> /dev/null; then
    sudo apt install -y imapsync
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

