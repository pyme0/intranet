#!/bin/bash

# Script para cargar todos los correos en lotes
echo "🔄 Iniciando carga completa de correos..."

# Obtener el total de correos
total_emails=2376
batch_size=200
current_position=1000

while [ $current_position -lt $total_emails ]; do
    echo "📧 Cargando correos desde $current_position (lote de $batch_size)..."
    
    response=$(curl -s "http://localhost:8080/api/load-more-emails?start_from=$current_position&batch_size=$batch_size")
    
    # Extraer información de la respuesta
    loaded=$(echo $response | jq -r '.loaded // 0')
    remaining=$(echo $response | jq -r '.remaining // 0')
    completed=$(echo $response | jq -r '.completed // false')
    
    echo "✅ Cargados: $loaded correos, Restantes: $remaining"
    
    if [ "$completed" = "true" ]; then
        echo "🎉 ¡Carga completa terminada!"
        break
    fi
    
    # Avanzar a la siguiente posición
    current_position=$((current_position + batch_size))
    
    # Pequeña pausa para no sobrecargar el servidor
    sleep 2
done

echo "📊 Verificando correos con 'test'..."
sqlite3 email_cache.db "SELECT COUNT(*) FROM email_metadata WHERE subject LIKE '%test%' AND subject NOT LIKE '%CONTESTACION%';"

echo "📊 Total de correos cargados:"
sqlite3 email_cache.db "SELECT COUNT(*) FROM email_metadata;"

echo "📊 Correos para tomas@patriciastocker.com:"
sqlite3 email_cache.db "SELECT COUNT(*) FROM email_metadata WHERE account = 'tomas@patriciastocker.com';"
