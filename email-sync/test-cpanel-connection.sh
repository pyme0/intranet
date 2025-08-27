#!/bin/bash

# Script para probar la conexión con el servidor cPanel origen
# Se ejecuta desde el VPS Vultr hacia el servidor cPanel

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funciones de logging
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
}

echo "🔍 PRUEBA DE CONEXIÓN CON SERVIDOR CPANEL ORIGEN"
echo "==============================================="

# Configuración del servidor VPS
SERVER_IP="64.176.6.196"
SERVER_USER="linuxuser"

log "🌐 Ejecutando desde VPS: $SERVER_USER@$SERVER_IP"
log "🎯 Destino: Servidor cPanel con correos de marcas@patriciastocker.com"

# Crear script para ejecutar remotamente en el VPS
cat > /tmp/test_cpanel_imap.sh << 'EOF'
#!/bin/bash

echo "=== PRUEBA DE CONEXIÓN CON SERVIDOR CPANEL ==="
echo "Fecha: $(date)"
echo "Ejecutando desde VPS: $(hostname)"
echo "IP del VPS: $(curl -s ifconfig.me 2>/dev/null || echo 'unknown')"
echo ""

# Configuración del servidor cPanel ORIGEN
CPANEL_HOSTS=("patriciastocker.com" "mail.patriciastocker.com" "45.239.218.18")
CPANEL_PORT="993"
DEST_HOST="imap.hostinger.com"
DEST_PORT="993"
DEST_USER="tomas@patriciastocker.com"
DEST_PASS="\$Full5tack\$"

# Array de combinaciones de credenciales para cPanel
declare -a CPANEL_CREDENTIALS=(
    "marcas@patriciastocker.com:\$Full5tack\$:Usuario completo de correo"
    "marcas:\$Full5tack\$:Solo nombre de usuario"
    "patriciastocker:\$Full5tack\$:Usuario cPanel principal"
)

echo "--- Verificando conectividad con servidores cPanel ---"

# Test 1: Verificar resolución DNS y conectividad
for host in "${CPANEL_HOSTS[@]}"; do
    echo ""
    echo "🌐 Probando host: $host"
    
    # Resolución DNS
    if nslookup "$host" > /dev/null 2>&1; then
        IP=$(nslookup "$host" | grep -A1 "Name:" | tail -1 | awk '{print $2}' || echo "unknown")
        echo "   ✅ DNS resuelve a: $IP"
    else
        echo "   ❌ No se puede resolver DNS para $host"
        continue
    fi
    
    # Conectividad puerto 993
    if timeout 10 bash -c "</dev/tcp/$host/$CPANEL_PORT" 2>/dev/null; then
        echo "   ✅ Puerto $CPANEL_PORT accesible"
        
        # Obtener banner SSL
        BANNER=$(timeout 10 bash -c "echo | openssl s_client -connect $host:$CPANEL_PORT -servername $host 2>/dev/null" | head -1 2>/dev/null || echo "Error obteniendo banner")
        if [[ "$BANNER" != "Error obteniendo banner" ]]; then
            echo "   ✅ Banner IMAP: $BANNER"
        else
            echo "   ⚠️  No se pudo obtener banner IMAP"
        fi
        
        # Probar credenciales con este host
        echo ""
        echo "   🔐 Probando credenciales con $host:"
        
        for cred in "${CPANEL_CREDENTIALS[@]}"; do
            IFS=':' read -r test_user test_pass test_desc <<< "$cred"
            
            echo "      Probando: $test_desc ($test_user)"
            
            # Crear archivo temporal para capturar output
            TEMP_LOG=$(mktemp)
            
            if timeout 45 imapsync \
                --host1 "$host" \
                --port1 "$CPANEL_PORT" \
                --user1 "$test_user" \
                --password1 "$test_pass" \
                --ssl1 \
                --host2 "$DEST_HOST" \
                --port2 "$DEST_PORT" \
                --user2 "$DEST_USER" \
                --password2 "$DEST_PASS" \
                --ssl2 \
                --justlogin > "$TEMP_LOG" 2>&1; then
                
                echo "      ✅ AUTENTICACIÓN EXITOSA!"
                echo ""
                echo "🎉 CREDENCIALES CORRECTAS ENCONTRADAS:"
                echo "   Servidor: $host"
                echo "   Puerto: $CPANEL_PORT"
                echo "   Usuario: $test_user"
                echo "   Contraseña: $test_pass"
                echo "   Descripción: $test_desc"
                
                # Mostrar información del servidor
                echo ""
                echo "📊 Información del servidor origen:"
                grep -E "(Host1|capabilities)" "$TEMP_LOG" | sed 's/^/   /' || true
                
                # Hacer prueba de listado de carpetas
                echo ""
                echo "📁 Probando listado de carpetas del buzón:"
                timeout 60 imapsync \
                    --host1 "$host" \
                    --port1 "$CPANEL_PORT" \
                    --user1 "$test_user" \
                    --password1 "$test_pass" \
                    --ssl1 \
                    --host2 "$DEST_HOST" \
                    --port2 "$DEST_PORT" \
                    --user2 "$DEST_USER" \
                    --password2 "$DEST_PASS" \
                    --ssl2 \
                    --dry \
                    --justfolders 2>/dev/null | grep -E "folder|Host1|messages|Host2" | head -20 | sed 's/^/   /' || echo "   No se pudieron listar carpetas"
                
                rm -f "$TEMP_LOG"
                echo ""
                echo "🚀 CONFIGURACIÓN LISTA PARA SINCRONIZACIÓN:"
                echo "   SOURCE_HOST=\"$host\""
                echo "   SOURCE_PORT=\"$CPANEL_PORT\""
                echo "   SOURCE_USER=\"$test_user\""
                echo "   SOURCE_PASS=\"$test_pass\""
                echo ""
                echo "✅ Puedes proceder con la sincronización completa!"
                exit 0
                
            else
                echo "      ❌ Falló autenticación"
                
                # Mostrar motivo del error
                if grep -q "AUTHENTICATIONFAILED\|Authentication failed" "$TEMP_LOG"; then
                    echo "         Motivo: Credenciales incorrectas"
                elif grep -q "Connection refused\|Connection timed out" "$TEMP_LOG"; then
                    echo "         Motivo: Problema de conectividad"
                elif grep -q "SSL\|TLS\|certificate" "$TEMP_LOG"; then
                    echo "         Motivo: Problema SSL/TLS"
                else
                    echo "         Motivo: Error desconocido"
                    echo "         Detalles:"
                    tail -2 "$TEMP_LOG" | sed 's/^/            /'
                fi
            fi
            
            rm -f "$TEMP_LOG"
        done
        
    else
        echo "   ❌ Puerto $CPANEL_PORT no accesible"
    fi
done

echo ""
echo "❌ NO SE ENCONTRARON CREDENCIALES VÁLIDAS"
echo ""
echo "📋 RESUMEN DEL DIAGNÓSTICO:"
echo "   - Se probaron múltiples hosts cPanel"
echo "   - Se probaron diferentes combinaciones de credenciales"
echo "   - Verificar que las credenciales sean correctas"
echo "   - Verificar que el servidor cPanel permita conexiones IMAP externas"

echo ""
echo "💡 RECOMENDACIONES:"
echo "   1. Verificar en cPanel que IMAP esté habilitado"
echo "   2. Verificar que no haya restricciones de IP"
echo "   3. Confirmar las credenciales exactas"
echo "   4. Probar con puerto 143 (no SSL) si 993 falla"

echo ""
echo "=== FIN DE LA PRUEBA CPANEL ==="
EOF

chmod +x /tmp/test_cpanel_imap.sh

log "📤 Subiendo script de prueba cPanel al VPS..."

# Usar scp para subir el script
REMOTE_SCRIPT_PATH="/tmp/test_cpanel_imap_$(date +%s).sh"

if scp -o ConnectTimeout=10 -o StrictHostKeyChecking=no /tmp/test_cpanel_imap.sh "$SERVER_USER@$SERVER_IP:$REMOTE_SCRIPT_PATH" 2>/dev/null; then
    success "Script subido exitosamente"
    
    log "🚀 Ejecutando prueba de conexión con cPanel..."
    
    # Ejecutar el script remotamente
    if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "chmod +x $REMOTE_SCRIPT_PATH && $REMOTE_SCRIPT_PATH && rm -f $REMOTE_SCRIPT_PATH" 2>/dev/null; then
        success "Prueba de conexión cPanel completada"
    else
        error "Error ejecutando prueba de conexión cPanel"
    fi
else
    error "No se pudo subir el script al servidor"
    warning "Verifica que tengas acceso SSH configurado al servidor"
fi

# Limpiar archivo temporal local
rm -f /tmp/test_cpanel_imap.sh

echo ""
success "🏁 PRUEBA DE CONEXIÓN CPANEL COMPLETADA"
echo ""
log "💡 Si se encontraron credenciales correctas:"
log "   1. Las credenciales se mostrarán arriba"
log "   2. Actualiza sync-marcas.sh con esas credenciales"
log "   3. Ejecuta la sincronización completa"
