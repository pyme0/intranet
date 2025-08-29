#!/usr/bin/env python3
"""
🚀 SERVIDOR DE BÚSQUEDA INSTANTÁNEA
Búsqueda ultra-rápida usando SQLite FTS5 local
Tiempo objetivo: <100ms por búsqueda
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
import time
from datetime import datetime
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuración
DATABASE_PATH = 'email_cache.db'
PORT = 8081

def get_db_connection():
    """Conexión optimizada a SQLite"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    # Optimizaciones para velocidad
    conn.execute('PRAGMA journal_mode = WAL')
    conn.execute('PRAGMA synchronous = NORMAL')
    conn.execute('PRAGMA cache_size = 10000')
    conn.execute('PRAGMA temp_store = MEMORY')
    return conn

@app.route('/api/instant-search')
def instant_search():
    """
    🔍 BÚSQUEDA INSTANTÁNEA
    Busca en índice FTS local en <100ms
    """
    start_time = time.time()
    
    try:
        # Parámetros
        query = request.args.get('q', '').strip()
        recipient_filter = request.args.get('recipient', 'marcas')
        limit = int(request.args.get('limit', 20))
        
        if not query:
            return jsonify({
                'error': 'Query requerido',
                'emails': [],
                'total_found': 0,
                'search_time_ms': 0
            }), 400
        
        logger.info(f"🔍 Búsqueda instantánea: '{query}' para {recipient_filter}@")
        
        # Conectar a base de datos
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Construir filtro de destinatario
        recipient_email = f"{recipient_filter}@patriciastocker.com"
        
        # Búsqueda FTS5 optimizada
        # Usar MATCH para búsqueda full-text ultra-rápida
        fts_query = f'"{query}"*'  # Búsqueda de prefijo para mayor flexibilidad
        
        sql = """
        SELECT
            m.email_id,
            m.subject,
            m.from_addr,
            m.to_addr,
            m.date_str,
            m.timestamp,
            COALESCE(c.body, '') as body,
            COALESCE(c.html_body, '') as html_body,
            snippet(email_search_fts, 4, '<mark>', '</mark>', '...', 32) as snippet
        FROM email_search_fts
        JOIN email_metadata m ON email_search_fts.email_id = m.email_id
        LEFT JOIN email_content c ON m.email_id = c.email_id
        WHERE email_search_fts MATCH ?
        AND m.to_addr LIKE ?
        ORDER BY m.timestamp DESC
        LIMIT ?
        """
        
        cursor.execute(sql, (fts_query, f"%{recipient_email}%", limit))
        results = cursor.fetchall()
        
        # Contar total (sin límite)
        count_sql = """
        SELECT COUNT(*)
        FROM email_search_fts
        JOIN email_metadata m ON email_search_fts.email_id = m.email_id
        WHERE email_search_fts MATCH ?
        AND m.to_addr LIKE ?
        """
        
        cursor.execute(count_sql, (fts_query, f"%{recipient_email}%"))
        total_count = cursor.fetchone()[0]
        
        conn.close()
        
        # Formatear resultados
        emails = []
        for row in results:
            # Para búsqueda instantánea, usar solo lo que está en cache
            # El contenido completo se carga cuando se selecciona el correo
            body_text = row['body'] or ''
            preview = 'Sin contenido'

            if body_text:
                preview = body_text.replace('\r\n', ' ').replace('\n', ' ').strip()
                if len(preview) > 150:
                    preview = preview[:150] + '...'

            email = {
                'email_id': row['email_id'],
                'id': row['email_id'],
                'subject': row['subject'] or 'Sin asunto',
                'from': row['from_addr'] or 'Desconocido',
                'fromName': (row['from_addr'] or '').split('<')[0].strip().replace('"', '') or 'Desconocido',
                'to': row['to_addr'] or '',
                'date': row['date_str'] or '',
                'timestamp': row['timestamp'] or 0,
                'preview': preview,
                'body': body_text,
                'html_body': row['html_body'] or '',
                'snippet': row['snippet'] or '',
                'hasAttachments': False,
                'isRead': False,
                'uid': row['email_id'],
                'search_result': True,
                'search_query': query
            }
            emails.append(email)
        
        search_time = (time.time() - start_time) * 1000  # en ms
        
        logger.info(f"✅ Búsqueda completada: {len(emails)}/{total_count} resultados en {search_time:.1f}ms")
        
        return jsonify({
            'emails': emails,
            'total_found': total_count,
            'showing': len(emails),
            'query': query,
            'recipient_filter': recipient_filter,
            'search_time_ms': round(search_time, 1),
            'search_method': 'SQLite FTS5 Local',
            'status': {
                'connected': True,
                'error': None,
                'last_check': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        search_time = (time.time() - start_time) * 1000
        logger.error(f"❌ Error en búsqueda instantánea: {e}")
        
        return jsonify({
            'error': str(e),
            'emails': [],
            'total_found': 0,
            'showing': 0,
            'query': query,
            'search_time_ms': round(search_time, 1),
            'search_method': 'SQLite FTS5 Local',
            'status': {
                'connected': False,
                'error': str(e),
                'last_check': datetime.now().isoformat()
            }
        }), 500

@app.route('/api/search-stats')
def search_stats():
    """Estadísticas del índice de búsqueda"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Contar correos por destinatario
        cursor.execute("""
            SELECT 
                CASE 
                    WHEN to_addr LIKE '%marcas@%' THEN 'marcas'
                    WHEN to_addr LIKE '%tomas@%' THEN 'tomas'
                    ELSE 'otros'
                END as recipient,
                COUNT(*) as count
            FROM email_metadata 
            GROUP BY recipient
        """)
        
        stats = {}
        for row in cursor.fetchall():
            stats[row['recipient']] = row['count']
        
        # Total de correos indexados
        cursor.execute("SELECT COUNT(*) FROM email_metadata")
        total_emails = cursor.fetchone()[0]
        
        # Verificar índice FTS
        try:
            cursor.execute("SELECT COUNT(*) FROM email_search_fts")
            fts_count = cursor.fetchone()[0]
        except:
            fts_count = 0
        
        conn.close()
        
        return jsonify({
            'total_emails': total_emails,
            'fts_indexed': fts_count,
            'by_recipient': stats,
            'index_health': 'OK' if fts_count > 0 else 'NEEDS_REBUILD',
            'search_ready': fts_count > 0
        })
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo estadísticas: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rebuild-index')
def rebuild_index():
    """Reconstruir índice FTS si es necesario"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        logger.info("🔧 Reconstruyendo índice FTS...")
        
        # Limpiar índice actual
        cursor.execute("DELETE FROM email_search_fts")
        
        # Repoblar desde email_metadata
        cursor.execute("""
            INSERT INTO email_search_fts(email_id, subject, from_addr, to_addr, body)
            SELECT 
                m.email_id,
                m.subject,
                m.from_addr,
                m.to_addr,
                COALESCE(c.body, '') as body
            FROM email_metadata m
            LEFT JOIN email_content c ON m.email_id = c.email_id
        """)
        
        conn.commit()
        
        # Verificar resultado
        cursor.execute("SELECT COUNT(*) FROM email_search_fts")
        indexed_count = cursor.fetchone()[0]
        
        conn.close()
        
        logger.info(f"✅ Índice reconstruido: {indexed_count} correos indexados")
        
        return jsonify({
            'success': True,
            'indexed_emails': indexed_count,
            'message': f'Índice FTS reconstruido con {indexed_count} correos'
        })
        
    except Exception as e:
        logger.error(f"❌ Error reconstruyendo índice: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    """Health check"""
    return jsonify({
        'status': 'OK',
        'service': 'Instant Search Server',
        'database': DATABASE_PATH,
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    logger.info(f"🚀 Iniciando servidor de búsqueda instantánea en puerto {PORT}")
    logger.info(f"📁 Base de datos: {DATABASE_PATH}")
    
    # Verificar base de datos
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM email_metadata")
        email_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM email_search_fts")
        fts_count = cursor.fetchone()[0]
        conn.close()
        
        logger.info(f"📊 Correos en base: {email_count}, Indexados FTS: {fts_count}")
        
        if fts_count == 0 and email_count > 0:
            logger.warning("⚠️  Índice FTS vacío, considera ejecutar /api/rebuild-index")
            
    except Exception as e:
        logger.error(f"❌ Error verificando base de datos: {e}")
    
    app.run(host='0.0.0.0', port=PORT, debug=False)
