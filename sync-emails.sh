#!/bin/bash

# Script para sincronizar correos de marcas@patriciastocker.com hacia tomas@patriciastocker.com
# Ejecuta imapsync para mantener los correos actualizados

echo "🔄 Iniciando sincronización de correos..."
echo "📧 Desde: marcas@patriciastocker.com"
echo "📧 Hacia: tomas@patriciastocker.com"
echo "🕐 Fecha: $(date)"

# Configuración
SOURCE_HOST="patriciastocker.com"
SOURCE_USER="marcas@patriciastocker.com"
SOURCE_PASS="$Full5tack$"

DEST_HOST="imap.hostinger.com"
DEST_USER="tomas@patriciastocker.com"
DEST_PASS="$Full5tack$"

# Crear directorio de logs si no existe
mkdir -p LOG_imapsync

# Ejecutar imapsync
echo "🚀 Ejecutando imapsync..."

imapsync \
  --host1 "$SOURCE_HOST" \
  --user1 "$SOURCE_USER" \
  --password1 "$SOURCE_PASS" \
  --port1 993 \
  --ssl1 \
  --host2 "$DEST_HOST" \
  --user2 "$DEST_USER" \
  --password2 "$DEST_PASS" \
  --port2 993 \
  --ssl2 \
  --syncinternaldates \
  --exclude "Junk|spam" \
  --automap

# Verificar resultado
if [ $? -eq 0 ]; then
    echo "✅ Sincronización completada exitosamente"
    echo "📊 Revisa los logs en el directorio LOG_imapsync/"
else
    echo "❌ Error en la sincronización"
    echo "📋 Revisa los logs para más detalles"
    exit 1
fi

echo "🏁 Sincronización finalizada: $(date)"
