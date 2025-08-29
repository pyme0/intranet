#!/usr/bin/env python3
"""
SERVIDOR DE EMAIL ULTRA SIMPLIFICADO
- UN SOLO ENDPOINT para obtener emails
- Previews simples desde body existente
- Sin caché complejo, sin múltiples endpoints
- Arquitectura limpia y directa
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import imaplib
import email
from email.header import decode_header
import sqlite3
import json
from datetime import datetime
import re

app = Flask(__name__)
CORS(app)

# Configuración IMAP - Hostinger (donde están los correos sincronizados)
IMAP_SERVER = 'imap.hostinger.com'
IMAP_PORT = 993
EMAIL_USER = 'tomas@patriciastocker.com'
EMAIL_PASS = '$Full5tack$'

# Base de datos simple
DB_FILE = 'emails_simple.db'

def init_db():
    """Inicializar base de datos simple"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS read_emails (
            email_id TEXT PRIMARY KEY,
            read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def connect_imap():
    """Conectar a IMAP de forma simple"""
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
        mail.login(EMAIL_USER, EMAIL_PASS)
        return mail
    except Exception as e:
        print(f"❌ Error conectando IMAP: {e}")
        return None

def clean_text(text):
    """Limpiar texto para preview"""
    if not text:
        return ""
    # Remover HTML básico
    text = re.sub(r'<[^>]+>', ' ', text)
    # Limpiar espacios
    text = re.sub(r'\s+', ' ', text)
    return text.strip()[:200]

def parse_email_simple(raw_email):
    """Parser de email ultra simple"""
    try:
        msg = email.message_from_bytes(raw_email)
        
        # Headers básicos
        subject = str(decode_header(msg['Subject'])[0][0]) if msg['Subject'] else 'Sin asunto'
        from_addr = msg['From'] or ''
        to_addr = msg['To'] or ''
        date_str = msg['Date'] or ''
        
        # Contenido simple
        body = ""
        html_body = ""
        
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                elif part.get_content_type() == "text/html":
                    html_body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
        else:
            body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
        
        # Preview simple
        preview = clean_text(html_body or body)
        
        return {
            'subject': subject,
            'from': from_addr,
            'to': to_addr,
            'date': date_str,
            'body': body,
            'html_body': html_body,
            'preview': preview
        }
    except Exception as e:
        print(f"❌ Error parsing email: {e}")
        return None

@app.route('/api/emails')
def get_emails():
    """ENDPOINT ÚNICO Y SIMPLE para obtener emails"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        folder = request.args.get('folder', 'INBOX')
        
        print(f"📧 Obteniendo emails - página {page}, límite {limit}")
        
        # Conectar IMAP
        mail = connect_imap()
        if not mail:
            return jsonify({'error': 'No se pudo conectar al servidor'}), 500
        
        # Seleccionar folder
        mail.select(folder)
        
        # Buscar emails
        status, messages = mail.search(None, 'ALL')
        if status != 'OK':
            return jsonify({'error': 'Error buscando emails'}), 500
        
        email_ids = messages[0].split()
        total_count = len(email_ids)
        
        # Paginación simple
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        page_email_ids = email_ids[start_idx:end_idx]
        
        emails = []
        for email_id in reversed(page_email_ids):  # Más recientes primero
            try:
                status, msg_data = mail.fetch(email_id, '(RFC822)')
                if status == 'OK':
                    raw_email = msg_data[0][1]
                    parsed = parse_email_simple(raw_email)
                    if parsed:
                        parsed['email_id'] = email_id.decode()
                        emails.append(parsed)
            except Exception as e:
                print(f"⚠️ Error procesando email {email_id}: {e}")
                continue
        
        mail.close()
        mail.logout()
        
        return jsonify({
            'emails': emails,
            'page': page,
            'limit': limit,
            'total': total_count,
            'total_count': total_count,
            'total_pages': (total_count + limit - 1) // limit,
            'status': {'connected': True, 'error': None, 'last_check': datetime.now().isoformat()}
        })
        
    except Exception as e:
        print(f"❌ Error en get_emails: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/read-status', methods=['GET', 'POST'])
def handle_read_status():
    """Manejar estado de lectura de emails"""
    if request.method == 'GET':
        try:
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute('SELECT email_id FROM read_emails')
            read_emails = [row[0] for row in cursor.fetchall()]
            conn.close()
            return jsonify({'readEmails': read_emails})
        except Exception as e:
            return jsonify({'readEmails': []})
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            email_id = data.get('emailId')
            if email_id:
                conn = sqlite3.connect(DB_FILE)
                cursor = conn.cursor()
                cursor.execute('INSERT OR IGNORE INTO read_emails (email_id) VALUES (?)', (email_id,))
                conn.commit()
                conn.close()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    print("🚀 Servidor de email simple iniciado en puerto 8080")
    app.run(host='0.0.0.0', port=8080, debug=True)
