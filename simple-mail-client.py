#!/usr/bin/env python3
"""
Cliente de correo simple para patriciastocker.com
Conecta por IMAP y muestra correos en tiempo real
"""

import imaplib
import smtplib
import email
import email.header
import email.utils
import time
import json
from datetime import datetime
from flask import Flask, render_template_string, jsonify, request
from flask_cors import CORS
import threading
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage

app = Flask(__name__)
CORS(app)  # Habilitar CORS para todas las rutas

# Configuración del servidor de correo - HOSTINGER
IMAP_SERVER = "imap.hostinger.com"  # Servidor IMAP de Hostinger
IMAP_PORT = 993  # SSL/TLS seguro
SMTP_SERVER = "smtp.hostinger.com"  # Servidor SMTP de Hostinger
SMTP_PORT = 465  # SSL/TLS seguro
EMAIL_USER = "tomas@patriciastocker.com"
EMAIL_PASS = "$Full5tack$"  # Usar la misma contraseña

# Ahora tenemos SMTP disponible con Hostinger
USE_EXTERNAL_SMTP = False

# Listas globales para almacenar correos
emails_list = []  # Correos recibidos (INBOX)
sent_emails_list = []  # Correos enviados (INBOX.Sent)
connection_status = {"connected": False, "last_check": None, "error": None}

def connect_imap():
    """Conectar al servidor IMAP de Hostinger"""
    try:
        print(f"🔗 Conectando a IMAP Hostinger: {IMAP_SERVER}:{IMAP_PORT}")
        # Configuración SSL para Hostinger (ignorar verificación de certificados)
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        # Conectar al servidor IMAP
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT, ssl_context=context)
        mail.login(EMAIL_USER, EMAIL_PASS)
        print(f"✅ Conectado exitosamente a {IMAP_SERVER}")
        return mail
    except Exception as e:
        print(f"❌ Error conectando IMAP: {e}")
        connection_status["error"] = str(e)
        return None

def decode_mime_header(header_value):
    """Decodificar headers MIME encoded como =?UTF-8?Q?...?= o =?iso-8859-1?Q?...?="""
    if not header_value:
        return ""

    try:
        # Decodificar usando email.header.decode_header
        decoded_parts = email.header.decode_header(header_value)
        decoded_string = ""

        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                if encoding:
                    decoded_string += part.decode(encoding, errors='ignore')
                else:
                    # Intentar UTF-8 primero, luego latin-1 como fallback
                    try:
                        decoded_string += part.decode('utf-8')
                    except UnicodeDecodeError:
                        decoded_string += part.decode('latin-1', errors='ignore')
            else:
                decoded_string += str(part)

        return decoded_string.strip()
    except Exception as e:
        print(f"⚠️ Error decodificando header '{header_value}': {e}")
        return str(header_value)

def create_focovi_email_html():
    """Crear el HTML del correo de Focovi con logo embebido"""
    return """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Renovación Marca Focovi</title>
    <style>
        body {
            font-family: 'Georgia', 'Times New Roman', serif;
            line-height: 1.6;
            color: #333;
            max-width: 580px;
            margin: 0 auto;
            padding: 0;
            background-color: #ffffff;
        }

        .email-container {
            background: white;
            border: 1px solid #e5e5e5;
        }

        .header {
            background-color: #ffffff;
            padding: 25px 30px 15px 30px;
            border-bottom: 2px solid #e50d1c;
            text-align: center;
        }

        .logo-img {
            max-width: 200px;
            height: auto;
            margin-bottom: 10px;
        }

        .company-tagline {
            font-size: 13px;
            color: #666;
            font-style: italic;
        }

        .content {
            padding: 30px;
        }

        .greeting {
            margin-bottom: 25px;
            font-size: 16px;
            color: #333;
        }

        .section {
            margin: 30px 0;
            padding: 0;
        }

        .section h3 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #333;
            font-size: 16px;
            font-weight: normal;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1px solid #e50d1c;
            padding-bottom: 8px;
        }

        .marca-info {
            background: none;
            padding: 20px 0;
            border-top: 1px solid #f0f0f0;
            border-bottom: 1px solid #f0f0f0;
        }

        .costos-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
        }

        .costos-table th {
            background-color: #f8f8f8;
            color: #333;
            padding: 15px 20px;
            text-align: left;
            font-weight: normal;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 13px;
            border-bottom: 2px solid #e50d1c;
        }

        .costos-table td {
            padding: 15px 20px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 15px;
        }

        .total-row {
            background-color: #f9f9f9;
            font-weight: bold;
            font-size: 16px;
            border-top: 1px solid #e50d1c;
        }

        .benefit-box {
            background-color: #f9f9f9;
            border-left: 3px solid #e50d1c;
            padding: 20px;
            margin: 25px 0;
            font-style: italic;
        }

        .steps-list {
            margin: 20px 0;
            padding-left: 0;
        }

        .steps-list li {
            margin: 15px 0;
            padding: 0;
            list-style: none;
            position: relative;
            padding-left: 20px;
            font-size: 15px;
        }

        .steps-list li::before {
            content: "•";
            color: #e50d1c;
            position: absolute;
            left: 0;
            font-weight: bold;
        }

        .signature {
            background: #f9f9f9;
            padding: 25px 30px;
            margin-top: 30px;
            border-top: 1px solid #e0e0e0;
        }

        .signature-name {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }

        .signature-title {
            color: #666;
            margin-bottom: 8px;
            font-style: italic;
        }

        .signature-company {
            font-weight: normal;
            color: #333;
            margin-bottom: 3px;
            font-size: 16px;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .signature-tagline {
            color: #666;
            font-size: 13px;
            margin-bottom: 20px;
            font-style: italic;
        }

        .contact-info {
            font-size: 14px;
            color: #666;
            border-top: 1px solid #e0e0e0;
            padding-top: 15px;
        }

        .contact-info span {
            margin-right: 20px;
            display: block;
            margin-bottom: 5px;
        }

        .red-accent {
            color: #e50d1c;
            font-weight: normal;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <img src="cid:logo" alt="Patricia Stocker" class="logo-img">
            <div class="company-tagline">Especialistas en Propiedad Intelectual</div>
        </div>
        <div class="content">
            <div class="greeting">
                <strong>Estimados,</strong>
            </div>

            <p>Tal como conversamos, les envío los detalles de la renovación de su marca <strong class="red-accent">Focovi</strong> de forma más ordenada.</p>

            <div class="section marca-info">
                <h3>Marca a Renovar</h3>
                <p><strong>Denominación:</strong> Focovi</p>
                <p><strong>Clase:</strong> 41 - Servicios de instrucción, educación y manejo de conductores; servicios educacionales en todos sus grados y capacitación técnico profesional.</p>
            </div>

            <div class="section">
                <h3>Costos Desglosados</h3>
                <table class="costos-table">
                    <thead>
                        <tr>
                            <th>Concepto</th>
                            <th>Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Impuestos</td>
                            <td>6 UTM</td>
                        </tr>
                        <tr>
                            <td>Honorarios profesionales</td>
                            <td>2 UTM</td>
                        </tr>
                        <tr class="total-row">
                            <td><strong>TOTAL</strong></td>
                            <td><strong>8 UTM</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="benefit-box">
                <strong>BENEFICIO DE LA RENOVACIÓN:</strong><br>
                Al completar el proceso de renovación, usted recibirá el nuevo título que certificará oficialmente que su marca <strong class="red-accent">Focovi</strong> está protegida por 10 años adicionales. El diploma llegará con el logo de <strong class="red-accent">Focovi</strong> incluido.
            </div>

            <div class="section">
                <h3>Próximos Pasos</h3>
                <ul class="steps-list">
                    <li><strong>Datos para facturación:</strong> Por favor, facilítenos los datos necesarios para realizar la factura correspondiente.</li>
                    <li><strong>Datos bancarios:</strong> Mañana le enviaremos un correo con nuestros datos bancarios para proceder con el pago.</li>
                </ul>
                <p>Una vez recibidos sus datos, procederemos inmediatamente con la facturación y podremos iniciar el trámite de renovación.</p>
            </div>

            <p>Quedamos disponibles para cualquier consulta adicional que pueda tener.</p>
        </div>

        <div class="signature">
            <div class="signature-name">Tomás B. Stocker</div>
            <div class="signature-title">Director Ejecutivo</div>
            <div class="signature-company">PATRICIA STOCKER</div>
            <div class="signature-tagline">Especialistas en Propiedad Intelectual</div>
            <div class="contact-info">
                <span>📧 tomas@patriciastocker.com</span>
                <span>📱 +56 9 5146 6684</span>
            </div>
        </div>
    </div>
</body>
</html>"""

def save_to_sent_folder(msg, to_email, subject, body):
    """Guardar correo enviado en la carpeta INBOX.Sent vía IMAP"""
    try:
        # Conectar a IMAP
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT, ssl_context=context)
        mail.login(EMAIL_USER, EMAIL_PASS)

        # Seleccionar carpeta Sent
        mail.select('INBOX.Sent')

        # Crear mensaje con fecha actual
        from datetime import datetime
        import email.utils

        # Agregar headers necesarios
        msg['Date'] = email.utils.formatdate(localtime=True)
        msg['Message-ID'] = email.utils.make_msgid()

        # Convertir mensaje a bytes
        msg_bytes = msg.as_bytes()

        # Guardar en carpeta Sent
        mail.append('INBOX.Sent', '\\Seen', None, msg_bytes)

        mail.close()
        mail.logout()

        print("📁 Correo guardado en carpeta Sent")

    except Exception as e:
        print(f"❌ Error guardando en carpeta Sent: {e}")
        raise e

def send_email(to_email, subject, body, attachments=None, cc_email=None):
    """Enviar correo usando SMTP de Hostinger con soporte para adjuntos embebidos y CC"""
    if USE_EXTERNAL_SMTP:
        # Por ahora, simular envío exitoso
        # TODO: Integrar con Resend.com o servicio similar
        print(f"📤 Simulando envío de correo:")
        print(f"   Para: {to_email}")
        print(f"   Asunto: {subject}")
        print(f"   Cuerpo: {body[:50]}...")

        return {"success": True, "message": "Correo enviado exitosamente (simulado)"}

    # Envío real usando SMTP de Hostinger
    try:
        print(f"📤 Enviando correo vía SMTP Hostinger:")
        print(f"   Para: {to_email}")
        print(f"   Asunto: {subject}")

        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context)
        server.login(EMAIL_USER, EMAIL_PASS)

        msg = MIMEMultipart('related')
        msg['From'] = EMAIL_USER
        msg['To'] = to_email
        msg['Subject'] = subject

        # Agregar CC si se especifica
        if cc_email:
            msg['Cc'] = cc_email

        # Detectar si el contenido es HTML
        is_html = body.strip().startswith('<!DOCTYPE html') or body.strip().startswith('<html')
        content_type = 'html' if is_html else 'plain'

        msg.attach(MIMEText(body, content_type))

        # Agregar adjuntos embebidos si existen
        if attachments:
            for attachment in attachments:
                if attachment['type'] == 'embedded':
                    with open(attachment['path'], 'rb') as f:
                        img_data = f.read()

                    # Determinar el subtipo MIME basado en la extensión
                    filename = attachment['filename'].lower()
                    if filename.endswith('.png'):
                        subtype = 'png'
                    elif filename.endswith('.jpg') or filename.endswith('.jpeg'):
                        subtype = 'jpeg'
                    elif filename.endswith('.gif'):
                        subtype = 'gif'
                    elif filename.endswith('.webp'):
                        subtype = 'webp'
                    else:
                        subtype = 'png'  # default

                    image = MIMEImage(img_data, _subtype=subtype)
                    image.add_header('Content-ID', f"<{attachment['cid']}>")
                    image.add_header('Content-Disposition', 'inline', filename=attachment['filename'])
                    msg.attach(image)

        text = msg.as_string()

        # Crear lista de destinatarios (TO + CC)
        recipients = [to_email]
        if cc_email:
            recipients.append(cc_email)

        server.sendmail(EMAIL_USER, recipients, text)
        server.quit()

        print("✅ Correo enviado exitosamente")

        # Guardar copia en carpeta Sent vía IMAP
        try:
            save_to_sent_folder(msg, to_email, subject, body)
        except Exception as e:
            print(f"⚠️ Error guardando en carpeta Sent: {e}")

        return {"success": True, "message": "Correo enviado exitosamente"}
    except Exception as e:
        print(f"❌ Error enviando correo: {e}")
        return {"success": False, "error": str(e)}

def parse_email(raw_email):
    """Parsear email crudo y extraer información"""
    try:
        msg = email.message_from_bytes(raw_email)

        # Extraer información básica y decodificar headers MIME
        subject = decode_mime_header(msg.get('Subject', 'Sin asunto'))
        from_addr = decode_mime_header(msg.get('From', 'Desconocido'))
        to_addr = decode_mime_header(msg.get('To', 'Desconocido'))
        date_str = str(msg.get('Date', ''))
        message_id = str(msg.get('Message-ID', ''))
        
        # Extraer cuerpo del mensaje y adjuntos
        body = ""
        html_body = ""
        attachments = []

        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))

                # Texto plano
                if content_type == "text/plain" and "attachment" not in content_disposition:
                    if not body:  # Solo tomar el primer texto plano
                        body = part.get_payload(decode=True).decode('utf-8', errors='ignore')

                # HTML
                elif content_type == "text/html" and "attachment" not in content_disposition:
                    if not html_body:  # Solo tomar el primer HTML
                        html_body = part.get_payload(decode=True).decode('utf-8', errors='ignore')

                # Adjuntos
                elif "attachment" in content_disposition or part.get_filename():
                    filename = part.get_filename()
                    if filename:
                        # Decodificar nombre del archivo si está encoded
                        filename = decode_mime_header(filename)

                        attachment_info = {
                            'filename': filename,
                            'content_type': content_type,
                            'size': len(part.get_payload(decode=True)) if part.get_payload(decode=True) else 0
                        }
                        attachments.append(attachment_info)
        else:
            # Mensaje simple (no multipart)
            content_type = msg.get_content_type()
            if content_type == "text/plain":
                body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
            elif content_type == "text/html":
                html_body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')

        # Parsear fecha para ordenamiento
        parsed_date = None
        try:
            if date_str:
                parsed_date = email.utils.parsedate_to_datetime(date_str)
        except Exception as e:
            print(f"⚠️ Error parseando fecha '{date_str}': {e}")
            parsed_date = datetime.now()

        if not parsed_date:
            parsed_date = datetime.now()

        return {
            'subject': subject,
            'from': from_addr,
            'to': to_addr,
            'date': date_str,
            'parsed_date': parsed_date.isoformat(),
            'timestamp': parsed_date.timestamp(),
            'body': body,
            'html_body': html_body,
            'attachments': attachments,
            'message_id': message_id,
            'received_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    except Exception as e:
        print(f"Error parseando email: {e}")
        return None

def check_emails():
    """Verificar nuevos correos recibidos y enviados"""
    global emails_list, sent_emails_list, connection_status
    
    while True:
        try:
            mail = connect_imap()
            if not mail:
                connection_status["connected"] = False
                time.sleep(10)
                continue
            
            connection_status["connected"] = True
            connection_status["error"] = None
            connection_status["last_check"] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Listar todas las carpetas disponibles y contar correos
            status, folders = mail.list()
            if status == 'OK':
                print("📁 Carpetas disponibles:")
                for folder in folders:
                    folder_name = folder.decode().split('"."')[-1].strip()
                    try:
                        mail.select(folder_name)
                        status_count, messages_count = mail.search(None, 'ALL')
                        if status_count == 'OK':
                            count = len(messages_count[0].split()) if messages_count[0] else 0
                            print(f"   {folder_name}: {count} correos")
                    except:
                        print(f"   {folder_name}: Error al acceder")

            # Obtener correos de INBOX solamente (correos recibidos)
            all_emails = []

            try:
                mail.select('INBOX')
                status, messages = mail.search(None, 'ALL')

                if status == 'OK':
                    email_ids = messages[0].split()

                    print(f"📊 INBOX: {len(email_ids)} correos")
                    if len(email_ids) > 0:
                        print(f"📊 INBOX - Rango de IDs: {email_ids[0].decode()} a {email_ids[-1].decode()}")

                    # Tomar los últimos 50 correos de INBOX
                    recent_email_ids = email_ids[-50:] if len(email_ids) > 50 else email_ids

                    for email_id in recent_email_ids:
                        status, msg_data = mail.fetch(email_id, '(RFC822)')
                        if status == 'OK':
                            raw_email = msg_data[0][1]
                            parsed_email = parse_email(raw_email)
                            if parsed_email:
                                parsed_email['email_id'] = email_id.decode()
                                parsed_email['folder'] = 'INBOX'
                                # Determinar la cuenta basándose en el destinatario
                                to_addr = parsed_email.get('to', '').lower()
                                if 'marcas@patriciastocker.com' in to_addr:
                                    parsed_email['account'] = 'marcas@patriciastocker.com'
                                elif 'tomas@patriciastocker.com' in to_addr:
                                    parsed_email['account'] = 'tomas@patriciastocker.com'
                                else:
                                    parsed_email['account'] = 'unknown'
                                all_emails.append(parsed_email)
            except Exception as e:
                print(f"❌ Error procesando INBOX: {e}")

            # Ordenar todos los correos por timestamp (más recientes primero)
            emails_list = sorted(all_emails, key=lambda x: x.get('timestamp', 0), reverse=True)

            # Procesar correos enviados (INBOX.Sent)
            sent_emails = []
            try:
                mail.select('INBOX.Sent')
                status, messages = mail.search(None, 'ALL')

                if status == 'OK':
                    email_ids = messages[0].split()

                    print(f"📊 INBOX.Sent: {len(email_ids)} correos")
                    if len(email_ids) > 0:
                        print(f"📊 INBOX.Sent - Rango de IDs: {email_ids[0].decode()} a {email_ids[-1].decode()}")

                    # Tomar todos los correos enviados (son pocos)
                    for email_id in email_ids:
                        status, msg_data = mail.fetch(email_id, '(RFC822)')
                        if status == 'OK':
                            raw_email = msg_data[0][1]
                            parsed_email = parse_email(raw_email)
                            if parsed_email:
                                parsed_email['email_id'] = f"sent_{email_id.decode()}"
                                parsed_email['folder'] = 'INBOX.Sent'
                                # Los correos enviados son desde tomas@patriciastocker.com
                                parsed_email['account'] = 'tomas@patriciastocker.com'
                                sent_emails.append(parsed_email)
            except Exception as e:
                print(f"❌ Error procesando INBOX.Sent: {e}")

            # Ordenar correos enviados por timestamp (más recientes primero)
            sent_emails_list = sorted(sent_emails, key=lambda x: x.get('timestamp', 0), reverse=True)

            print(f"✅ Verificación completada: {len(emails_list)} correos recibidos, {len(sent_emails_list)} correos enviados")
            
            mail.close()
            mail.logout()
            
        except Exception as e:
            print(f"❌ Error verificando correos: {e}")
            connection_status["connected"] = False
            connection_status["error"] = str(e)
        
        # Esperar 2 segundos antes de la siguiente verificación (actualización rápida)
        time.sleep(2)

# Template HTML simple
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Cliente de Correo - patriciastocker.com</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .status { padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        .status.connected { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status.disconnected { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .email-list { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .email-item { border-bottom: 1px solid #eee; padding: 15px; }
        .email-item:last-child { border-bottom: none; }
        .email-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .email-subject { font-weight: bold; color: #2c3e50; }
        .email-from { color: #7f8c8d; font-size: 0.9em; }
        .email-date { color: #95a5a6; font-size: 0.8em; }
        .email-body { background: #f8f9fa; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-family: monospace; font-size: 0.9em; max-height: 200px; overflow-y: auto; }
        .refresh-btn { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-left: 10px; }
        .refresh-btn:hover { background: #2980b9; }
        .refresh-btn:active { background: #1f5f8b; transform: scale(0.98); }
        .manual-refresh { background: #27ae60; margin-left: 10px; }
        .manual-refresh:hover { background: #229954; }
        .no-emails { text-align: center; padding: 40px; color: #7f8c8d; }
        .auto-refresh { color: #27ae60; font-size: 0.9em; }
        .compose-section { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; padding: 20px; }
        .compose-form { display: grid; gap: 15px; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { font-weight: bold; margin-bottom: 5px; color: #2c3e50; }
        .form-group input, .form-group textarea { padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        .form-group textarea { min-height: 120px; resize: vertical; font-family: Arial, sans-serif; }
        .send-btn { background: #27ae60; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; }
        .send-btn:hover { background: #229954; }
        .send-btn:disabled { background: #95a5a6; cursor: not-allowed; }
        .compose-toggle { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-bottom: 20px; }
        .compose-toggle:hover { background: #2980b9; }
        .hidden { display: none; }
        .send-status { padding: 10px; border-radius: 5px; margin-top: 10px; }
        .send-status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .send-status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📧 Cliente de Correo - patriciastocker.com</h1>
            <p>Usuario: {{ email_user }} | Servidor: {{ server }}</p>
        </div>
        
        <div id="status" class="status">
            <span id="status-text">Cargando...</span>
            <button class="refresh-btn" onclick="refreshEmails()">🔄 Actualizar</button>
            <button class="refresh-btn manual-refresh" onclick="forceRefresh()">⚡ Actualizar Ahora</button>
        </div>

        <div class="auto-refresh">
            ⚡ Actualización automática cada 2 segundos | <span id="last-update">Nunca</span>
        </div>

        <button class="compose-toggle" onclick="toggleCompose()">✉️ Redactar Correo</button>

        <div id="compose-section" class="compose-section hidden">
            <h3>📝 Redactar Nuevo Correo</h3>
            <form class="compose-form" onsubmit="sendEmail(event)">
                <div class="form-group">
                    <label for="to-email">Para:</label>
                    <input type="email" id="to-email" name="to" required placeholder="destinatario@ejemplo.com">
                </div>
                <div class="form-group">
                    <label for="subject">Asunto:</label>
                    <input type="text" id="subject" name="subject" required placeholder="Asunto del correo">
                </div>
                <div class="form-group">
                    <label for="body">Mensaje:</label>
                    <textarea id="body" name="body" required placeholder="Escribe tu mensaje aquí..."></textarea>
                </div>
                <button type="submit" class="send-btn" id="send-btn">📤 Enviar Correo</button>
                <div id="send-status" class="send-status hidden"></div>
            </form>
        </div>

        <div class="email-list">
            <div id="emails-container">
                <div class="no-emails">Cargando correos...</div>
            </div>
        </div>
    </div>

    <script>
        function updateStatus(data) {
            const statusDiv = document.getElementById('status');
            const statusText = document.getElementById('status-text');
            
            if (data.connected) {
                statusDiv.className = 'status connected';
                statusText.innerHTML = `✅ Conectado | Última verificación: ${data.last_check}`;
            } else {
                statusDiv.className = 'status disconnected';
                statusText.innerHTML = `❌ Desconectado | Error: ${data.error || 'Desconocido'}`;
            }
        }
        
        function updateEmails(emails) {
            const container = document.getElementById('emails-container');
            
            if (emails.length === 0) {
                container.innerHTML = '<div class="no-emails">📭 No hay correos</div>';
                return;
            }
            
            let html = '';
            emails.forEach(email => {
                html += `
                    <div class="email-item">
                        <div class="email-header">
                            <div>
                                <div class="email-subject">${email.subject}</div>
                                <div class="email-from">De: ${email.from}</div>
                            </div>
                            <div class="email-date">${email.received_at}</div>
                        </div>
                        <div class="email-body">${email.body}</div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        }
        
        function refreshEmails() {
            fetch('/api/emails')
                .then(response => response.json())
                .then(data => {
                    updateStatus(data.status);
                    updateEmails(data.emails);
                    // Actualizar timestamp
                    const now = new Date().toLocaleTimeString();
                    document.getElementById('last-update').innerHTML = `Última: ${now}`;
                })
                .catch(error => {
                    console.error('Error:', error);
                    document.getElementById('status-text').innerHTML = '❌ Error cargando datos';
                });
        }

        function forceRefresh() {
            // Actualización forzada inmediata
            document.getElementById('status-text').innerHTML = '🔄 Actualizando...';
            refreshEmails();
        }

        function toggleCompose() {
            const composeSection = document.getElementById('compose-section');
            const toggleBtn = document.querySelector('.compose-toggle');

            if (composeSection.classList.contains('hidden')) {
                composeSection.classList.remove('hidden');
                toggleBtn.textContent = '❌ Cerrar Redacción';
            } else {
                composeSection.classList.add('hidden');
                toggleBtn.textContent = '✉️ Redactar Correo';
                // Limpiar formulario
                document.getElementById('to-email').value = '';
                document.getElementById('subject').value = '';
                document.getElementById('body').value = '';
                document.getElementById('send-status').classList.add('hidden');
            }
        }

        function sendEmail(event) {
            event.preventDefault();

            const sendBtn = document.getElementById('send-btn');
            const statusDiv = document.getElementById('send-status');

            // Deshabilitar botón
            sendBtn.disabled = true;
            sendBtn.textContent = '📤 Enviando...';

            // Obtener datos del formulario
            const formData = {
                to: document.getElementById('to-email').value,
                subject: document.getElementById('subject').value,
                body: document.getElementById('body').value
            };

            // Enviar correo
            fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                statusDiv.classList.remove('hidden');

                if (data.success) {
                    statusDiv.className = 'send-status success';
                    statusDiv.textContent = '✅ ' + data.message;
                    // Limpiar formulario
                    document.getElementById('to-email').value = '';
                    document.getElementById('subject').value = '';
                    document.getElementById('body').value = '';
                } else {
                    statusDiv.className = 'send-status error';
                    statusDiv.textContent = '❌ Error: ' + data.error;
                }
            })
            .catch(error => {
                statusDiv.classList.remove('hidden');
                statusDiv.className = 'send-status error';
                statusDiv.textContent = '❌ Error de conexión: ' + error.message;
            })
            .finally(() => {
                // Rehabilitar botón
                sendBtn.disabled = false;
                sendBtn.textContent = '📤 Enviar Correo';
            });
        }

        // Actualizar cada 2 segundos (actualización rápida)
        setInterval(refreshEmails, 2000);

        // Cargar inicial
        refreshEmails();
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE, 
                                email_user=EMAIL_USER, 
                                server=f"{IMAP_SERVER}:{IMAP_PORT}")

@app.route('/api/emails')
def api_emails():
    """Obtener correos recibidos con filtros opcionales"""
    account_filter = request.args.get('account', None)

    filtered_emails = emails_list
    if account_filter:
        filtered_emails = [email for email in emails_list if email.get('account') == account_filter]

    return jsonify({
        'emails': filtered_emails,
        'status': connection_status,
        'count': len(filtered_emails),
        'total_count': len(emails_list),
        'filter': account_filter
    })

@app.route('/api/sent-emails')
def api_sent_emails():
    """Obtener correos enviados con filtros opcionales"""
    from_account_filter = request.args.get('from_account', None)

    filtered_emails = sent_emails_list

    if from_account_filter:
        # Filtrar por cuenta de origen (From)
        filtered_emails = [email for email in sent_emails_list
                          if email.get('from', '').lower() == from_account_filter.lower()]

    return jsonify({
        'emails': filtered_emails,
        'status': connection_status,
        'count': len(filtered_emails),
        'total_count': len(sent_emails_list),
        'filter': from_account_filter
    })

@app.route('/api/all-emails')
def api_all_emails():
    """Obtener correos recibidos (bandeja principal) con filtros opcionales"""
    account_filter = request.args.get('account', None)

    # Solo correos recibidos (no enviados)
    filtered_emails = emails_list

    if account_filter:
        filtered_emails = [email for email in emails_list if email.get('account') == account_filter]

    # Ordenar por timestamp (más recientes primero)
    filtered_emails = sorted(filtered_emails, key=lambda x: x.get('timestamp', 0), reverse=True)

    return jsonify({
        'emails': filtered_emails,
        'status': connection_status,
        'count': len(filtered_emails),
        'total_count': len(emails_list),
        'filter': account_filter
    })

@app.route('/api/send-email', methods=['POST'])
def api_send_email():
    try:
        data = request.get_json()
        to_email = data.get('to')
        subject = data.get('subject')
        body = data.get('body')
        attachments = data.get('attachments', None)
        cc_email = data.get('cc', None)

        if not all([to_email, subject, body]):
            return jsonify({
                'success': False,
                'error': 'Todos los campos son requeridos'
            }), 400

        result = send_email(to_email, subject, body, attachments, cc_email)
        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/attachment/<int:email_id>/<filename>')
def download_attachment(email_id, filename):
    """Descargar un adjunto específico de un correo"""
    try:
        print(f"🔽 Descargando adjunto: {filename} del correo {email_id}")

        # Reconectar y obtener el correo completo
        mail = connect_imap()
        if not mail:
            print("❌ Error: No se pudo conectar a IMAP")
            return jsonify({'error': 'Error de conexión'}), 500

        mail.select('INBOX')

        # Buscar el correo por UID (email_id)
        status, data = mail.uid('fetch', str(email_id), '(RFC822)')

        if status != 'OK' or not data or not data[0]:
            print(f"❌ Error: No se pudo obtener el correo {email_id}")
            return jsonify({'error': 'Error al obtener correo'}), 500

        raw_email = data[0][1]
        msg = email.message_from_bytes(raw_email)

        print(f"📧 Procesando correo: {msg.get('Subject', 'Sin asunto')}")

        # Buscar el adjunto específico
        for part in msg.walk():
            if part.get_filename():
                part_filename = decode_mime_header(part.get_filename())
                print(f"📎 Adjunto encontrado: {part_filename}")

                if part_filename == filename:
                    print(f"✅ Adjunto coincide: {filename}")

                    # Obtener el contenido del adjunto
                    attachment_data = part.get_payload(decode=True)
                    content_type = part.get_content_type()

                    if not attachment_data:
                        print("❌ Error: Datos del adjunto vacíos")
                        return jsonify({'error': 'Datos del adjunto vacíos'}), 500

                    print(f"📦 Enviando adjunto: {len(attachment_data)} bytes, tipo: {content_type}")

                    # Crear respuesta con el archivo
                    from flask import Response
                    response = Response(
                        attachment_data,
                        mimetype=content_type,
                        headers={
                            'Content-Disposition': f'attachment; filename="{filename}"',
                            'Content-Length': str(len(attachment_data))
                        }
                    )
                    return response

        print(f"❌ Adjunto '{filename}' no encontrado en el correo {email_id}")
        return jsonify({'error': 'Adjunto no encontrado'}), 404

    except Exception as e:
        print(f"❌ Error descargando adjunto: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Iniciando cliente de correo Patricia Stocker...")
    print(f"📧 Usuario: {EMAIL_USER}")
    print(f"📥 Servidor IMAP: {IMAP_SERVER}:{IMAP_PORT}")
    print(f"📤 Servidor SMTP: {SMTP_SERVER}:{SMTP_PORT}")
    print("🏢 Proveedor: Hostinger")

    # Iniciar hilo para verificar correos
    email_thread = threading.Thread(target=check_emails, daemon=True)
    email_thread.start()

    print("🌐 Servidor web iniciando en http://localhost:8080")
    print("📱 Abre tu navegador y ve a http://localhost:8080")

    # Iniciar servidor web
    app.run(host='0.0.0.0', port=8080, debug=False)
