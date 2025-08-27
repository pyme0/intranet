#!/bin/bash

# Script de sincronización de correos para marcas@patriciastocker.com
# Este script sincroniza todos los correos desde el servidor origen al servidor destino
# y se detiene automáticamente cuando termina la sincronización

# Configuración
SCRIPT_NAME="sync-marcas"
LOG_DIR="/home/linuxuser/email-sync/logs"
LOG_FILE="$LOG_DIR/${SCRIPT_NAME}-$(date +%Y%m%d-%H%M%S).log"
PID_FILE="/home/linuxuser/email-sync/${SCRIPT_NAME}.pid"

# Crear directorio de logs si no existe
mkdir -p "$LOG_DIR"

# Función para logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Función para limpiar al salir
cleanup() {
    log "🛑 Proceso de sincronización terminado"
    rm -f "$PID_FILE"
    exit 0
}

# Configurar trap para limpiar al salir
trap cleanup EXIT INT TERM

# Verificar si ya hay un proceso corriendo
if [ -f "$PID_FILE" ]; then
    if ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
        log "❌ Ya hay un proceso de sincronización corriendo (PID: $(cat $PID_FILE))"
        exit 1
    else
        log "🧹 Eliminando archivo PID obsoleto"
        rm -f "$PID_FILE"
    fi
fi

# Guardar PID del proceso actual
echo $$ > "$PID_FILE"

log "🚀 Iniciando sincronización de marcas@patriciastocker.com"
log "📁 Log: $LOG_FILE"
log "🆔 PID: $$"

# Configuración de servidores
SOURCE_HOST="mail.patriciastocker.com"
SOURCE_PORT="993"
SOURCE_USER="patriciastocker"
SOURCE_PASS="\$Full5tack\$"

DEST_HOST="imap.hostinger.com"
DEST_PORT="993"
DEST_USER="tomas@patriciastocker.com"
DEST_PASS="\$Full5tack\$"

log "📧 Origen: $SOURCE_USER@$SOURCE_HOST:$SOURCE_PORT"
log "📧 Destino: $DEST_USER@$DEST_HOST:$DEST_PORT"

# Ejecutar imapsync
log "🔄 Iniciando sincronización con imapsync..."

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
    --automap \
    --syncinternaldates \
    --syncacls \
    --regextrans2 's/INBOX\.//g' \
    --nofoldersizes \
    --useheader 'Message-ID' \
    --useheader 'Date' \
    --skipsize \
    --allowsizemismatch \
    --delete2 2>&1 | tee -a "$LOG_FILE"

SYNC_RESULT=$?

if [ $SYNC_RESULT -eq 0 ]; then
    log "✅ Sincronización completada exitosamente"
else
    log "❌ Error en la sincronización (código: $SYNC_RESULT)"
fi

log "📊 Estadísticas del proceso:"
log "   - Inicio: $(head -1 $LOG_FILE | cut -d']' -f1 | tr -d '[')"
log "   - Fin: $(date '+%Y-%m-%d %H:%M:%S')"
log "   - Duración: $(($(date +%s) - $(date -d "$(head -1 $LOG_FILE | cut -d']' -f1 | tr -d '[')" +%s))) segundos"

log "🏁 Proceso finalizado. El script se detendrá automáticamente."
