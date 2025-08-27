#!/bin/bash

# Script para monitorear el progreso de la sincronización

PID_FILE="/home/linuxuser/email-sync/sync-marcas.pid"
LOG_DIR="/home/linuxuser/email-sync/logs"

echo "🔍 Monitor de Sincronización de Correos"
echo "======================================"

# Verificar si hay un proceso corriendo
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null 2>&1; then
        echo "✅ Proceso de sincronización activo (PID: $PID)"
        
        # Mostrar información del proceso
        echo "📊 Información del proceso:"
        ps -p $PID -o pid,ppid,cmd,etime,pcpu,pmem
        
        # Mostrar el último log
        LATEST_LOG=$(ls -t $LOG_DIR/sync-marcas-*.log 2>/dev/null | head -1)
        if [ -n "$LATEST_LOG" ]; then
            echo ""
            echo "📄 Últimas líneas del log ($LATEST_LOG):"
            echo "----------------------------------------"
            tail -20 "$LATEST_LOG"
        fi
        
        echo ""
        echo "💡 Para ver el log completo en tiempo real:"
        echo "   tail -f $LATEST_LOG"
        
    else
        echo "❌ Archivo PID existe pero el proceso no está corriendo"
        echo "🧹 Limpiando archivo PID obsoleto..."
        rm -f "$PID_FILE"
    fi
else
    echo "⏹️  No hay procesos de sincronización corriendo"
    
    # Mostrar logs anteriores
    echo ""
    echo "📚 Logs de sincronizaciones anteriores:"
    ls -la $LOG_DIR/sync-marcas-*.log 2>/dev/null || echo "   No hay logs anteriores"
fi

echo ""
echo "🎛️  Comandos útiles:"
echo "   - Iniciar sincronización: /home/linuxuser/email-sync/sync-marcas.sh"
echo "   - Monitorear progreso: /home/linuxuser/email-sync/monitor-sync.sh"
echo "   - Detener proceso: kill \$(cat $PID_FILE) (si está corriendo)"
