#!/usr/bin/env python3
"""
🔄 SCRIPT PARA SINCRONIZAR CONTENIDO DE CORREOS
Sincroniza el contenido de correos desde el servidor Python al cache SQLite
para que la búsqueda instantánea tenga previews de contenido
"""

import sqlite3
import requests
import json
import time
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_PATH = 'email_cache.db'
PYTHON_SERVER_URL = 'http://localhost:8080'
BATCH_SIZE = 10  # Procesar en lotes para no sobrecargar el servidor

def get_emails_without_content():
    """Obtener emails que no tienen contenido en el cache"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Buscar emails en metadata que no tienen contenido o tienen contenido vacío
    cursor.execute("""
        SELECT m.email_id, m.subject 
        FROM email_metadata m
        LEFT JOIN email_content c ON m.email_id = c.email_id
        WHERE c.body IS NULL OR c.body = ''
        ORDER BY m.timestamp DESC
        LIMIT 100
    """)
    
    emails = cursor.fetchall()
    conn.close()
    
    return [(row[0], row[1]) for row in emails]

def fetch_email_content(email_id):
    """Obtener contenido de un correo desde el servidor Python"""
    try:
        response = requests.get(
            f'{PYTHON_SERVER_URL}/api/emails/{email_id}/full',
            timeout=10
        )
        
        if response.ok:
            data = response.json()
            email = data.get('email', {})
            return {
                'email_id': email_id,
                'body': email.get('body', ''),
                'html_body': email.get('html_body', ''),
                'preview': email.get('preview', ''),
                'success': True
            }
        else:
            logger.warning(f"Error HTTP {response.status_code} para email {email_id}")
            return {'email_id': email_id, 'success': False, 'error': f'HTTP {response.status_code}'}
            
    except Exception as e:
        logger.warning(f"Error obteniendo contenido para email {email_id}: {e}")
        return {'email_id': email_id, 'success': False, 'error': str(e)}

def update_email_content(email_data):
    """Actualizar contenido de correo en la base de datos"""
    if not email_data['success']:
        return False
        
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Insertar o actualizar en email_content
        cursor.execute("""
            INSERT OR REPLACE INTO email_content (email_id, folder, body, html_body)
            VALUES (?, 'INBOX', ?, ?)
        """, (
            email_data['email_id'],
            email_data['body'],
            email_data['html_body']
        ))
        
        # Actualizar el índice FTS con el nuevo contenido
        cursor.execute("""
            UPDATE email_search_fts 
            SET body = ?
            WHERE email_id = ?
        """, (email_data['body'], email_data['email_id']))
        
        conn.commit()
        conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f"Error actualizando contenido para email {email_data['email_id']}: {e}")
        return False

def sync_email_content():
    """Sincronizar contenido de correos"""
    logger.info("🔄 Iniciando sincronización de contenido de correos...")
    
    # Obtener emails sin contenido
    emails_to_sync = get_emails_without_content()
    
    if not emails_to_sync:
        logger.info("✅ Todos los correos ya tienen contenido sincronizado")
        return
    
    logger.info(f"📧 Encontrados {len(emails_to_sync)} correos para sincronizar")
    
    # Procesar en lotes para no sobrecargar el servidor
    total_synced = 0
    total_errors = 0
    
    for i in range(0, len(emails_to_sync), BATCH_SIZE):
        batch = emails_to_sync[i:i + BATCH_SIZE]
        logger.info(f"📦 Procesando lote {i//BATCH_SIZE + 1}/{(len(emails_to_sync) + BATCH_SIZE - 1)//BATCH_SIZE}")
        
        # Usar ThreadPoolExecutor para procesar en paralelo (pero limitado)
        with ThreadPoolExecutor(max_workers=3) as executor:
            # Enviar requests
            future_to_email = {
                executor.submit(fetch_email_content, email_id): email_id 
                for email_id, subject in batch
            }
            
            # Procesar resultados
            for future in as_completed(future_to_email):
                email_id = future_to_email[future]
                try:
                    email_data = future.result()
                    
                    if email_data['success']:
                        if update_email_content(email_data):
                            total_synced += 1
                            logger.info(f"✅ Sincronizado: {email_id}")
                        else:
                            total_errors += 1
                            logger.error(f"❌ Error actualizando: {email_id}")
                    else:
                        total_errors += 1
                        logger.error(f"❌ Error obteniendo: {email_id} - {email_data.get('error', 'Unknown')}")
                        
                except Exception as e:
                    total_errors += 1
                    logger.error(f"❌ Error procesando {email_id}: {e}")
        
        # Pausa entre lotes para no sobrecargar
        if i + BATCH_SIZE < len(emails_to_sync):
            time.sleep(1)
    
    logger.info(f"🎉 Sincronización completada:")
    logger.info(f"   ✅ Sincronizados: {total_synced}")
    logger.info(f"   ❌ Errores: {total_errors}")
    logger.info(f"   📊 Total procesados: {total_synced + total_errors}")

def verify_sync():
    """Verificar que la sincronización funcionó"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Contar emails con contenido
    cursor.execute("SELECT COUNT(*) FROM email_content WHERE body IS NOT NULL AND body != ''")
    content_count = cursor.fetchone()[0]
    
    # Contar emails en FTS con contenido
    cursor.execute("SELECT COUNT(*) FROM email_search_fts WHERE body IS NOT NULL AND body != ''")
    fts_count = cursor.fetchone()[0]
    
    # Total de emails
    cursor.execute("SELECT COUNT(*) FROM email_metadata")
    total_count = cursor.fetchone()[0]
    
    conn.close()
    
    logger.info(f"📊 Verificación de sincronización:")
    logger.info(f"   📧 Total emails: {total_count}")
    logger.info(f"   💾 Con contenido en cache: {content_count}")
    logger.info(f"   🔍 Con contenido en FTS: {fts_count}")
    logger.info(f"   📈 Porcentaje sincronizado: {(content_count/total_count)*100:.1f}%")

if __name__ == '__main__':
    logger.info("🚀 Iniciando sincronización de contenido de correos...")
    
    try:
        # Verificar que el servidor Python esté disponible
        response = requests.get(f'{PYTHON_SERVER_URL}/api/emails/for-marcas?limit=1', timeout=5)
        if not response.ok:
            logger.error("❌ Servidor Python no disponible")
            exit(1)
        
        # Ejecutar sincronización
        sync_email_content()
        
        # Verificar resultados
        verify_sync()
        
        logger.info("✅ Sincronización completada exitosamente")
        
    except Exception as e:
        logger.error(f"❌ Error en sincronización: {e}")
        exit(1)
