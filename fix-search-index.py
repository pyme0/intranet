#!/usr/bin/env python3
"""
🔧 SCRIPT PARA ARREGLAR ÍNDICE DE BÚSQUEDA
Recrea el índice FTS5 correctamente
"""

import sqlite3
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_PATH = 'email_cache.db'

def fix_search_index():
    """Arreglar el índice de búsqueda FTS"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        logger.info("🔧 Arreglando índice de búsqueda...")
        
        # 1. Eliminar índice FTS corrupto
        logger.info("1. Eliminando índice FTS corrupto...")
        cursor.execute("DROP TABLE IF EXISTS email_search_fts")
        
        # 2. Eliminar triggers relacionados
        logger.info("2. Eliminando triggers...")
        cursor.execute("DROP TRIGGER IF EXISTS email_search_fts_insert")
        cursor.execute("DROP TRIGGER IF EXISTS email_search_fts_update") 
        cursor.execute("DROP TRIGGER IF EXISTS email_search_fts_delete")
        
        # 3. Crear nuevo índice FTS5 simple
        logger.info("3. Creando nuevo índice FTS5...")
        cursor.execute("""
            CREATE VIRTUAL TABLE email_search_fts USING fts5(
                email_id UNINDEXED,
                subject,
                from_addr,
                to_addr,
                body
            )
        """)
        
        # 4. Poblar índice con datos existentes
        logger.info("4. Poblando índice con datos existentes...")
        cursor.execute("""
            INSERT INTO email_search_fts(email_id, subject, from_addr, to_addr, body)
            SELECT 
                m.email_id,
                COALESCE(m.subject, '') as subject,
                COALESCE(m.from_addr, '') as from_addr,
                COALESCE(m.to_addr, '') as to_addr,
                COALESCE(c.body, '') as body
            FROM email_metadata m
            LEFT JOIN email_content c ON m.email_id = c.email_id
        """)
        
        # 5. Crear triggers para mantener sincronización
        logger.info("5. Creando triggers de sincronización...")
        
        # Trigger para INSERT
        cursor.execute("""
            CREATE TRIGGER email_search_fts_insert AFTER INSERT ON email_metadata 
            BEGIN
                INSERT INTO email_search_fts(email_id, subject, from_addr, to_addr, body)
                VALUES (
                    new.email_id, 
                    COALESCE(new.subject, ''),
                    COALESCE(new.from_addr, ''),
                    COALESCE(new.to_addr, ''),
                    COALESCE((SELECT body FROM email_content WHERE email_id = new.email_id), '')
                );
            END
        """)
        
        # Trigger para UPDATE
        cursor.execute("""
            CREATE TRIGGER email_search_fts_update AFTER UPDATE ON email_metadata 
            BEGIN
                UPDATE email_search_fts SET
                    subject = COALESCE(new.subject, ''),
                    from_addr = COALESCE(new.from_addr, ''),
                    to_addr = COALESCE(new.to_addr, ''),
                    body = COALESCE((SELECT body FROM email_content WHERE email_id = new.email_id), '')
                WHERE email_id = new.email_id;
            END
        """)
        
        # Trigger para DELETE
        cursor.execute("""
            CREATE TRIGGER email_search_fts_delete AFTER DELETE ON email_metadata 
            BEGIN
                DELETE FROM email_search_fts WHERE email_id = old.email_id;
            END
        """)
        
        conn.commit()
        
        # 6. Verificar resultado
        cursor.execute("SELECT COUNT(*) FROM email_metadata")
        total_emails = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM email_search_fts")
        indexed_emails = cursor.fetchone()[0]
        
        conn.close()
        
        logger.info(f"✅ Índice arreglado exitosamente!")
        logger.info(f"📊 Total correos: {total_emails}")
        logger.info(f"📊 Correos indexados: {indexed_emails}")
        
        if indexed_emails == total_emails:
            logger.info("🎉 Todos los correos están indexados correctamente!")
        else:
            logger.warning(f"⚠️  Faltan {total_emails - indexed_emails} correos por indexar")
            
        return True
        
    except Exception as e:
        logger.error(f"❌ Error arreglando índice: {e}")
        return False

def test_search():
    """Probar búsqueda después del arreglo"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        logger.info("🧪 Probando búsqueda...")
        
        # Búsqueda de prueba
        test_query = "a"
        cursor.execute("""
            SELECT COUNT(*) 
            FROM email_search_fts 
            WHERE email_search_fts MATCH ?
        """, (f'"{test_query}"*',))
        
        count = cursor.fetchone()[0]
        logger.info(f"🔍 Búsqueda de '{test_query}': {count} resultados")
        
        # Búsqueda con filtro de destinatario
        cursor.execute("""
            SELECT COUNT(*) 
            FROM email_search_fts fts
            JOIN email_metadata m ON fts.email_id = m.email_id
            WHERE fts MATCH ? 
            AND m.to_addr LIKE ?
        """, (f'"{test_query}"*', "%marcas@patriciastocker.com%"))
        
        filtered_count = cursor.fetchone()[0]
        logger.info(f"🔍 Búsqueda de '{test_query}' para marcas@: {filtered_count} resultados")
        
        conn.close()
        
        return count > 0
        
    except Exception as e:
        logger.error(f"❌ Error probando búsqueda: {e}")
        return False

if __name__ == '__main__':
    logger.info("🚀 Iniciando arreglo de índice de búsqueda...")
    
    if fix_search_index():
        if test_search():
            logger.info("✅ Índice de búsqueda arreglado y funcionando!")
        else:
            logger.error("❌ Índice arreglado pero búsqueda no funciona")
    else:
        logger.error("❌ No se pudo arreglar el índice")
