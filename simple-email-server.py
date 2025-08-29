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
    """Limpiar texto para preview con caracteres correctos"""
    if not text:
        return ""

    # Asegurar que el texto sea string
    if isinstance(text, bytes):
        # Intentar decodificar si es bytes
        for encoding in ['utf-8', 'iso-8859-1', 'windows-1252']:
            try:
                text = text.decode(encoding)
                break
            except:
                continue
        else:
            text = text.decode('utf-8', errors='ignore')

    # Remover HTML básico
    text = re.sub(r'<[^>]+>', ' ', text)
    # Limpiar espacios múltiples
    text = re.sub(r'\s+', ' ', text)
    # Remover caracteres de control
    text = re.sub(r'[\x00-\x1f\x7f-\x9f]', ' ', text)
    # Preview optimizado: 100 chars (aumentado de 50 para mejor legibilidad)
    return text.strip()[:100]

def decode_header_properly(header_value):
    """Decodificar headers de email correctamente"""
    if not header_value:
        return ''

    try:
        decoded_parts = decode_header(header_value)
        decoded_string = ''

        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                if encoding:
                    decoded_string += part.decode(encoding, errors='ignore')
                else:
                    # Intentar diferentes codificaciones comunes
                    for enc in ['utf-8', 'iso-8859-1', 'windows-1252']:
                        try:
                            decoded_string += part.decode(enc)
                            break
                        except:
                            continue
                    else:
                        decoded_string += part.decode('utf-8', errors='ignore')
            else:
                decoded_string += str(part)

        return decoded_string.strip()
    except Exception as e:
        print(f"⚠️ Error decodificando header: {e}")
        return str(header_value)

def decode_payload(part):
    """Decodificar payload con múltiples codificaciones"""
    try:
        payload = part.get_payload(decode=True)
        if isinstance(payload, bytes):
            # Intentar diferentes codificaciones
            for encoding in ['utf-8', 'iso-8859-1', 'windows-1252', 'latin1']:
                try:
                    return payload.decode(encoding)
                except:
                    continue
            # Si nada funciona, usar utf-8 con errores ignorados
            return payload.decode('utf-8', errors='ignore')
        return str(payload)
    except Exception as e:
        print(f"⚠️ Error decodificando payload: {e}")
        return ""

def parse_email_simple(raw_email):
    """Parser de email con decodificación correcta"""
    try:
        msg = email.message_from_bytes(raw_email)

        # Headers básicos con decodificación correcta
        subject = decode_header_properly(msg['Subject']) if msg['Subject'] else 'Sin asunto'
        from_addr = decode_header_properly(msg['From']) if msg['From'] else ''
        to_addr = decode_header_properly(msg['To']) if msg['To'] else ''
        date_str = msg['Date'] or ''

        # Contenido con decodificación mejorada
        body = ""
        html_body = ""

        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    body = decode_payload(part)
                elif part.get_content_type() == "text/html":
                    html_body = decode_payload(part)
        else:
            body = decode_payload(msg)

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

def parse_email_ultra_light(raw_email):
    """Parser ultra ligero - SOLO headers con decodificación correcta"""
    try:
        msg = email.message_from_bytes(raw_email)

        # Solo headers básicos con decodificación correcta
        subject = decode_header_properly(msg['Subject']) if msg['Subject'] else 'Sin asunto'
        from_addr = decode_header_properly(msg['From']) if msg['From'] else ''
        to_addr = decode_header_properly(msg['To']) if msg['To'] else ''
        date_str = msg['Date'] or ''

        # Preview mínimo desde el subject si no hay contenido rápido
        preview = subject[:50] if subject != 'Sin asunto' else "Correo sin preview"

        return {
            'subject': subject,
            'from': from_addr,
            'to': to_addr,
            'date': date_str,
            'preview': preview
            # NO procesamos body para máxima velocidad
        }
    except Exception as e:
        print(f"❌ Error parsing email ultra light: {e}")
        return None

def parse_email_light(raw_email):
    """Parser de email ligero - headers y preview con decodificación correcta"""
    try:
        msg = email.message_from_bytes(raw_email)

        # Headers básicos con decodificación correcta
        subject = decode_header_properly(msg['Subject']) if msg['Subject'] else 'Sin asunto'
        from_addr = decode_header_properly(msg['From']) if msg['From'] else ''
        to_addr = decode_header_properly(msg['To']) if msg['To'] else ''
        date_str = msg['Date'] or ''

        # Preview básico con decodificación mejorada
        preview = ""
        try:
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        content = decode_payload(part)
                        preview = clean_text(content)
                        break  # Solo el primer texto plano
            else:
                content = decode_payload(msg)
                preview = clean_text(content)
        except:
            preview = subject[:100] if subject != 'Sin asunto' else "Sin contenido"

        return {
            'subject': subject,
            'from': from_addr,
            'to': to_addr,
            'date': date_str,
            'preview': preview
            # No incluimos body ni html_body para reducir tamaño
        }
    except Exception as e:
        print(f"❌ Error parsing email light: {e}")
        return None

@app.route('/api/emails')
def get_emails():
    """ENDPOINT ÚNICO Y SIMPLE para obtener emails"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))  # Reducido por defecto
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

@app.route('/api/emails/ultra-light')
def get_emails_ultra_light():
    """ENDPOINT ULTRA LIGERO para carga inicial ultra rápida - SOLO headers"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 5))  # Límite ultra bajo
        folder = request.args.get('folder', 'INBOX')

        print(f"🚀 Obteniendo emails ULTRA LIGEROS - página {page}, límite {limit}")

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
                # Solo headers - ultra rápido
                status, msg_data = mail.fetch(email_id, '(RFC822)')
                if status == 'OK':
                    raw_email = msg_data[0][1]
                    parsed = parse_email_ultra_light(raw_email)  # Parser ultra ligero
                    if parsed:
                        parsed['email_id'] = email_id.decode()
                        emails.append(parsed)
            except Exception as e:
                print(f"⚠️ Error procesando email ultra ligero {email_id}: {e}")
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
            'status': {'connected': True, 'error': None, 'last_check': datetime.now().isoformat()},
            'ultra_light_mode': True  # Indicador de modo ultra ligero
        })

    except Exception as e:
        print(f"❌ Error en get_emails_ultra_light: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/emails/light')
def get_emails_light():
    """ENDPOINT LIGERO para carga inicial rápida - solo headers y preview"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 5))  # Reducido a 5
        folder = request.args.get('folder', 'INBOX')

        print(f"⚡ Obteniendo emails LIGEROS - página {page}, límite {limit}")

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
                # Solo headers para ser más rápido
                status, msg_data = mail.fetch(email_id, '(RFC822)')
                if status == 'OK':
                    raw_email = msg_data[0][1]
                    parsed = parse_email_light(raw_email)  # Usar parser ligero
                    if parsed:
                        parsed['email_id'] = email_id.decode()
                        emails.append(parsed)
            except Exception as e:
                print(f"⚠️ Error procesando email ligero {email_id}: {e}")
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
            'status': {'connected': True, 'error': None, 'last_check': datetime.now().isoformat()},
            'light_mode': True  # Indicador de que es modo ligero
        })

    except Exception as e:
        print(f"❌ Error en get_emails_light: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/emails/for-marcas')
def get_emails_for_marcas():
    """ENDPOINT para correos enviados a marcas@patriciastocker.com"""
    try:
        limit = int(request.args.get('limit', 5))
        date_from = request.args.get('date_from', '')

        print(f"📧 Buscando correos para MARCAS - límite: {limit}")

        # Conectar IMAP
        mail = connect_imap()
        if not mail:
            return jsonify({'error': 'No se pudo conectar al servidor'}), 500

        # Seleccionar INBOX
        mail.select('INBOX')

        # Construir criterio de búsqueda IMAP eficiente
        search_criteria = 'TO "marcas@patriciastocker.com"'

        if date_from:
            # Convertir fecha al formato IMAP (DD-Mon-YYYY)
            try:
                date_obj = datetime.strptime(date_from, '%Y-%m-%d')
                imap_date = date_obj.strftime('%d-%b-%Y')
                search_criteria += f' SINCE {imap_date}'
            except:
                pass  # Ignorar fecha inválida

        print(f"🔍 Criterio de búsqueda: {search_criteria}")

        # Buscar correos usando IMAP SEARCH
        status, messages = mail.search(None, search_criteria)
        if status != 'OK':
            return jsonify({'error': 'Error en búsqueda IMAP'}), 500

        email_ids = messages[0].split()
        total_count = len(email_ids)

        print(f"📊 Encontrados {total_count} correos para marcas@")

        # Ordenar por fecha (más recientes primero) usando SORT de IMAP
        if email_ids:
            try:
                # Intentar usar SORT para ordenar por fecha descendente
                status, sorted_messages = mail.sort('(REVERSE DATE)', 'UTF-8', search_criteria)
                if status == 'OK' and sorted_messages[0]:
                    email_ids = sorted_messages[0].split()
                    print(f"✅ Correos ordenados por fecha usando IMAP SORT")
                else:
                    print(f"⚠️ SORT no disponible, usando orden de IDs")
            except Exception as e:
                print(f"⚠️ Error con SORT, usando orden de IDs: {e}")

        # Tomar solo los más recientes
        recent_email_ids = email_ids[:limit] if email_ids else []

        emails = []
        for email_id in recent_email_ids:  # Ya ordenados por fecha (más recientes primero)
            try:
                status, msg_data = mail.fetch(email_id, '(RFC822)')
                if status == 'OK':
                    raw_email = msg_data[0][1]
                    parsed = parse_email_simple(raw_email)
                    if parsed:
                        parsed['email_id'] = email_id.decode()
                        emails.append(parsed)
            except Exception as e:
                print(f"⚠️ Error procesando correo {email_id}: {e}")
                continue

        mail.close()
        mail.logout()

        return jsonify({
            'emails': emails,
            'total_found': total_count,
            'showing': len(emails),
            'filter': 'marcas@patriciastocker.com',
            'date_from': date_from or None,
            'status': {'connected': True, 'error': None, 'last_check': datetime.now().isoformat()}
        })

    except Exception as e:
        print(f"❌ Error buscando correos para marcas: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/emails/for-tomas')
def get_emails_for_tomas():
    """ENDPOINT para correos enviados a tomas@patriciastocker.com"""
    try:
        limit = int(request.args.get('limit', 5))
        date_from = request.args.get('date_from', '')

        print(f"📧 Buscando correos para TOMÁS - límite: {limit}")

        # Conectar IMAP
        mail = connect_imap()
        if not mail:
            return jsonify({'error': 'No se pudo conectar al servidor'}), 500

        # Seleccionar INBOX
        mail.select('INBOX')

        # Construir criterio de búsqueda IMAP eficiente
        search_criteria = 'TO "tomas@patriciastocker.com"'

        if date_from:
            # Convertir fecha al formato IMAP (DD-Mon-YYYY)
            try:
                date_obj = datetime.strptime(date_from, '%Y-%m-%d')
                imap_date = date_obj.strftime('%d-%b-%Y')
                search_criteria += f' SINCE {imap_date}'
            except:
                pass  # Ignorar fecha inválida

        print(f"🔍 Criterio de búsqueda: {search_criteria}")

        # Buscar correos usando IMAP SEARCH
        status, messages = mail.search(None, search_criteria)
        if status != 'OK':
            return jsonify({'error': 'Error en búsqueda IMAP'}), 500

        email_ids = messages[0].split()
        total_count = len(email_ids)

        print(f"📊 Encontrados {total_count} correos para tomas@")

        # Ordenar por fecha (más recientes primero) usando SORT de IMAP
        if email_ids:
            try:
                # Intentar usar SORT para ordenar por fecha descendente
                status, sorted_messages = mail.sort('(REVERSE DATE)', 'UTF-8', search_criteria)
                if status == 'OK' and sorted_messages[0]:
                    email_ids = sorted_messages[0].split()
                    print(f"✅ Correos ordenados por fecha usando IMAP SORT")
                else:
                    print(f"⚠️ SORT no disponible, usando orden de IDs")
            except Exception as e:
                print(f"⚠️ Error con SORT, usando orden de IDs: {e}")

        # Tomar solo los más recientes
        recent_email_ids = email_ids[:limit] if email_ids else []

        emails = []
        for email_id in recent_email_ids:  # Ya ordenados por fecha (más recientes primero)
            try:
                status, msg_data = mail.fetch(email_id, '(RFC822)')
                if status == 'OK':
                    raw_email = msg_data[0][1]
                    parsed = parse_email_simple(raw_email)
                    if parsed:
                        parsed['email_id'] = email_id.decode()
                        emails.append(parsed)
            except Exception as e:
                print(f"⚠️ Error procesando correo {email_id}: {e}")
                continue

        mail.close()
        mail.logout()

        return jsonify({
            'emails': emails,
            'total_found': total_count,
            'showing': len(emails),
            'filter': 'tomas@patriciastocker.com',
            'date_from': date_from or None,
            'status': {'connected': True, 'error': None, 'last_check': datetime.now().isoformat()}
        })

    except Exception as e:
        print(f"❌ Error buscando correos para tomas: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/emails/<email_id>/full')
def get_email_full(email_id):
    """ENDPOINT para obtener contenido completo de un correo específico"""
    try:
        print(f"📧 Obteniendo correo completo - ID: {email_id}")

        # Conectar IMAP
        mail = connect_imap()
        if not mail:
            return jsonify({'error': 'No se pudo conectar al servidor'}), 500

        # Seleccionar INBOX por defecto
        mail.select('INBOX')

        # Buscar el correo específico por ID
        status, msg_data = mail.fetch(email_id, '(RFC822)')
        if status != 'OK':
            return jsonify({'error': 'Correo no encontrado'}), 404

        raw_email = msg_data[0][1]
        parsed = parse_email_simple(raw_email)  # Usar parser completo

        if not parsed:
            return jsonify({'error': 'Error procesando correo'}), 500

        parsed['email_id'] = email_id

        mail.close()
        mail.logout()

        return jsonify({
            'email': parsed,
            'status': {'connected': True, 'error': None, 'last_check': datetime.now().isoformat()}
        })

    except Exception as e:
        print(f"❌ Error obteniendo correo completo {email_id}: {e}")
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
