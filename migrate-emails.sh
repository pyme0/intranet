#!/bin/bash

# Script para migrar correos de marcas@patriciastocker.com a tomas@patriciastocker.com
# Se ejecuta en el servidor Vultr y se detiene automáticamente al completarse

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuración de correos
SOURCE_HOST="patriciastocker.com"
SOURCE_USER="marcas@patriciastocker.com"
SOURCE_PASS="\$Full5tack\$"

DEST_HOST="imap.hostinger.com"
DEST_USER="tomas@patriciastocker.com"
DEST_PASS="\$Full5tack\$"

# Directorio de logs
LOG_DIR="LOG_imapsync"
TIMESTAMP=$(date +"%Y_%m_%d_%H_%M_%S")
LOG_FILE="$LOG_DIR/${TIMESTAMP}_migration_complete.txt"

# Funciones de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

# Crear directorio de logs
mkdir -p "$LOG_DIR"

# Banner inicial
echo -e "${CYAN}"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                    MIGRACIÓN DE CORREOS                     ║
║                   Patricia Stocker System                   ║
╠══════════════════════════════════════════════════════════════╣
║  Origen:  marcas@patriciastocker.com                        ║
║  Destino: tomas@patriciastocker.com                         ║
║  Método:  imapsync con SSL/TLS                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

log "🚀 Iniciando migración completa de correos..."
log "📧 Desde: $SOURCE_USER"
log "📧 Hacia: $DEST_USER"
log "📝 Log: $LOG_FILE"

# Verificar que imapsync esté instalado
if ! command -v imapsync &> /dev/null; then
    error "imapsync no está instalado. Instalando..."
    apt update && apt install -y imapsync
fi

# Función para mostrar estadísticas
show_stats() {
    log "📊 Verificando estado actual de las cuentas..."
    
    # Verificar cuenta origen
    log "🔍 Analizando cuenta origen ($SOURCE_USER)..."
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
        --dry \
        --justfolders \
        --nolog | grep -E "(messages|Size|folder)" | tee -a "$LOG_FILE"
}

# Mostrar estadísticas iniciales
show_stats

# Confirmar migración
echo ""
warning "⚠️  ATENCIÓN: Esta migración transferirá TODOS los correos de marcas@patriciastocker.com"
warning "    hacia tomas@patriciastocker.com. Esto puede tomar varias horas."
echo ""
info "📈 Estimación basada en logs anteriores:"
info "   - ~19,500 mensajes a transferir"
info "   - ~8.6 GB de datos"
info "   - Velocidad estimada: ~1.3 msgs/s"
info "   - Tiempo estimado: ~4-6 horas"
echo ""

read -p "¿Continuar con la migración? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    warning "Migración cancelada por el usuario"
    exit 0
fi

# Ejecutar migración completa
log "🔄 Iniciando migración completa..."
log "⏰ Hora de inicio: $(date)"

# Crear archivo de estado
echo "RUNNING" > migration_status.txt
echo "$(date)" >> migration_status.txt

# Ejecutar imapsync SIN --dry para migración real
log "🚀 Ejecutando imapsync (migración real)..."

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
    --automap \
    --logfile "$LOG_FILE" \
    2>&1 | tee -a "$LOG_FILE"

# Verificar resultado
MIGRATION_RESULT=$?

if [ $MIGRATION_RESULT -eq 0 ]; then
    success "🎉 ¡Migración completada exitosamente!"
    echo "COMPLETED" > migration_status.txt
    echo "$(date)" >> migration_status.txt
    
    # Mostrar estadísticas finales
    log "📊 Mostrando estadísticas finales..."
    show_stats
    
    # Crear resumen
    log "📋 Creando resumen de migración..."
    cat > migration_summary.txt << EOF
RESUMEN DE MIGRACIÓN - $(date)
================================

Estado: COMPLETADA ✅
Origen: $SOURCE_USER
Destino: $DEST_USER
Inicio: $(head -2 migration_status.txt | tail -1)
Fin: $(date)

Log completo: $LOG_FILE

Para verificar los correos migrados:
- Accede al cliente web: http://$(curl -s ifconfig.me):3001
- O revisa directamente en Hostinger

IMPORTANTE: La migración está completa. 
Los servicios seguirán funcionando normalmente.
EOF

    success "📄 Resumen guardado en migration_summary.txt"
    
    # Mostrar URLs de acceso
    echo ""
    echo -e "${GREEN}🌐 Accede a tu cliente de correos:${NC}"
    echo -e "${CYAN}   http://$(curl -s ifconfig.me):3001${NC}"
    echo ""
    
    # Detener el script de migración (no los servicios)
    log "🛑 Migración finalizada. Los servicios continúan ejecutándose."
    
else
    error "❌ Error en la migración (código: $MIGRATION_RESULT)"
    echo "FAILED" > migration_status.txt
    echo "$(date)" >> migration_status.txt
    echo "Error code: $MIGRATION_RESULT" >> migration_status.txt
    
    warning "📋 Revisa el log para más detalles: $LOG_FILE"
    exit $MIGRATION_RESULT
fi

log "✅ Script de migración completado"
echo ""
echo -e "${GREEN}🎊 ¡MIGRACIÓN EXITOSA!${NC}"
echo -e "${CYAN}📧 Todos los correos han sido transferidos${NC}"
echo -e "${CYAN}🌐 Cliente disponible en: http://$(curl -s ifconfig.me):3001${NC}"
echo ""
