#!/usr/bin/env python3

"""
Servidor de webhook simple para actualización automática
Escucha en puerto 9000 y ejecuta actualización cuando recibe POST
"""

from flask import Flask, request, jsonify
import subprocess
import os
import logging
from datetime import datetime

app = Flask(__name__)

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/patricia-webhook.log'),
        logging.StreamHandler()
    ]
)

# Directorio de la aplicación
APP_DIR = '/opt/patricia-stocker'

@app.route('/webhook', methods=['POST'])
def webhook():
    """Endpoint para recibir webhooks de GitHub/GitLab"""
    try:
        # Log del webhook recibido
        logging.info(f"Webhook recibido desde {request.remote_addr}")
        
        # Cambiar al directorio de la aplicación
        os.chdir(APP_DIR)
        
        # Ejecutar script de actualización
        logging.info("Iniciando actualización...")
        result = subprocess.run(
            ['./update-local.sh'],
            capture_output=True,
            text=True,
            timeout=300  # 5 minutos timeout
        )
        
        if result.returncode == 0:
            logging.info("Actualización completada exitosamente")
            return jsonify({
                'status': 'success',
                'message': 'Actualización completada',
                'timestamp': datetime.now().isoformat()
            }), 200
        else:
            logging.error(f"Error en actualización: {result.stderr}")
            return jsonify({
                'status': 'error',
                'message': 'Error en actualización',
                'error': result.stderr,
                'timestamp': datetime.now().isoformat()
            }), 500
            
    except subprocess.TimeoutExpired:
        logging.error("Timeout en actualización")
        return jsonify({
            'status': 'error',
            'message': 'Timeout en actualización',
            'timestamp': datetime.now().isoformat()
        }), 500
        
    except Exception as e:
        logging.error(f"Error inesperado: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Error inesperado',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/status', methods=['GET'])
def status():
    """Endpoint para verificar estado del servidor"""
    try:
        # Verificar estado de servicios
        services = ['patricia-intranet', 'patricia-email-api', 'patricia-email-client']
        service_status = {}
        
        for service in services:
            result = subprocess.run(
                ['systemctl', 'is-active', service],
                capture_output=True,
                text=True
            )
            service_status[service] = result.stdout.strip()
        
        return jsonify({
            'status': 'ok',
            'services': service_status,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Endpoint de health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    }), 200

if __name__ == '__main__':
    logging.info("Iniciando servidor de webhook en puerto 9000...")
    app.run(host='0.0.0.0', port=9000, debug=False)
