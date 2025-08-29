#!/bin/bash

# Script para monitorear y detener imapsync cuando llegue a 2500 correos
TARGET_EMAILS=2500
INITIAL_COUNT=529  # Correos ya transferidos hoy (262 + 267)
LOG_FILE="/home/linuxuser/email-sync/LOG_imapsync/2025_08_29_17_13_47_741_marcas@patriciastocker.com_tomas@patriciastocker.com.txt"

echo "🔍 Monitoreando sincronización - Objetivo: $TARGET_EMAILS correos"
echo "📊 Ya transferidos: $INITIAL_COUNT correos"
echo "🎯 Faltan: $((TARGET_EMAILS - INITIAL_COUNT)) correos"
echo ""

while true; do
    # Verificar si el proceso sigue ejecutándose
    if ! ssh linuxuser@64.176.6.196 "ps aux | grep -q '[i]mapsync'"; then
        echo "⚠️  Proceso imapsync terminó"
        break
    fi
    
    # Obtener estadísticas actuales
    STATS=$(ssh linuxuser@64.176.6.196 "tail -20 '$LOG_FILE' | grep 'Messages transferred' | tail -1")
    
    if [[ $STATS =~ Messages\ transferred[[:space:]]*:[[:space:]]*([0-9]+) ]]; then
        CURRENT_SESSION=${BASH_REMATCH[1]}
        TOTAL_TODAY=$((INITIAL_COUNT + CURRENT_SESSION))
        
        echo "📧 Sesión actual: $CURRENT_SESSION | Total hoy: $TOTAL_TODAY | Objetivo: $TARGET_EMAILS"
        
        # Verificar si hemos alcanzado el límite
        if [ $TOTAL_TODAY -ge $TARGET_EMAILS ]; then
            echo ""
            echo "🎯 ¡LÍMITE ALCANZADO! Deteniendo sincronización..."
            echo "📊 Total transferido hoy: $TOTAL_TODAY correos"
            
            # Detener el proceso
            ssh linuxuser@64.176.6.196 "kill \$(cat /tmp/imapsync.pid) 2>/dev/null"
            
            echo "✅ Proceso detenido exitosamente"
            echo "📈 Resumen del día:"
            echo "   - Sesión 1: $INITIAL_COUNT correos"
            echo "   - Sesión 2: $CURRENT_SESSION correos"
            echo "   - Total: $TOTAL_TODAY correos"
            break
        fi
    else
        echo "⏳ Esperando estadísticas..."
    fi
    
    # Esperar 30 segundos antes de la próxima verificación
    sleep 30
done

echo ""
echo "🏁 Monitoreo finalizado"
