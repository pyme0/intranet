#!/bin/bash

echo "🔄 Cargando TODOS los correos restantes para migración completa..."

# Cargar correos del rango 600-1500 (faltante)
echo "📧 Cargando correos 600-1500..."
curl -s "http://localhost:8080/api/load-more-emails?start_from=600&batch_size=900" | jq '.loaded, .remaining'

# Cargar correos del rango 2000-2200 (faltante)
echo "📧 Cargando correos 2000-2200..."
curl -s "http://localhost:8080/api/load-more-emails?start_from=2000&batch_size=200" | jq '.loaded, .remaining'

# Reclasificar todos los correos
echo "🔄 Reclasificando todos los correos..."
curl -s "http://localhost:8080/api/reclassify-emails" | jq '.total_in_cache, .reclassified'

# Verificar totales finales
echo "📊 Verificando totales finales..."
echo "Total correos para tomas@patriciastocker.com:"
curl -s "http://localhost:8080/api/emails/paginated?page=1&limit=5&account=tomas@patriciastocker.com" | jq '.total_count'

echo "Total correos para marcas@patriciastocker.com:"
curl -s "http://localhost:8080/api/emails/paginated?page=1&limit=5&account=marcas@patriciastocker.com" | jq '.total_count'

echo "Correos con 'test' para tomas@:"
curl -s "http://localhost:8080/api/emails/paginated?page=1&limit=100&account=tomas@patriciastocker.com" | jq -r '.emails[] | select(.subject | test("test"; "i")) | "- \(.subject) (ID: \(.email_id))"'

echo "✅ Carga completa terminada!"
