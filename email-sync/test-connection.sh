#!/bin/bash

# Script para probar la conexión antes de la sincronización completa

echo "🔍 Probando conexiones IMAP..."
echo "================================"

# Configuración
SOURCE_HOST="mail.patriciastocker.com"
SOURCE_PORT="993"
SOURCE_USER="marcas@patriciastocker.com"
SOURCE_PASS="\$Full5tack\$"

DEST_HOST="imap.hostinger.com"
DEST_PORT="993"
DEST_USER="tomas@patriciastocker.com"
DEST_PASS="\$Full5tack\$"

echo "📧 Probando conexión ORIGEN:"
echo "   Host: $SOURCE_USER@$SOURCE_HOST:$SOURCE_PORT (cPanel user)"

imapsync \
    --host1 "$SOURCE_HOST" \
    --port1 "$SOURCE_PORT" \
    --user1 "$SOURCE_USER" \
    --password1 "$SOURCE_PASS" \
    --ssl1 \
    --host2 "$DEST_HOST" \
    --port2 "$DEST_PORT" \
    --user2 "$DEST_USER" \
    --password2 "$DEST_PASS" \
    --ssl2 \
    --justlogin

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Conexiones exitosas! Listo para sincronización completa."
    echo ""
    echo "🚀 Para iniciar la sincronización completa ejecuta:"
    echo "   /home/linuxuser/email-sync/sync-marcas.sh"
else
    echo ""
    echo "❌ Error en las conexiones. Verifica las credenciales."
fi
