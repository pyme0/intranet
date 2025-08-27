# Patricia Stocker Intranet

Sistema de intranet para Patricia Stocker con cliente de correos integrado y herramientas de migración de correos.

## 📧 **MIGRACIÓN DE CORREOS COMPLETADA** ✅

### 🎯 **Resumen de la Migración (27 Agosto 2025)**

**MIGRACIÓN EXITOSA**: Se completó la migración parcial de correos desde el servidor cPanel hacia Hostinger.

#### 📊 **Estadísticas de Migración:**
- **Origen**: `marcas@patriciastocker.com` (servidor cPanel `patriciastocker.com:993`)
- **Destino**: `tomas@patriciastocker.com` (Hostinger `imap.hostinger.com:993`)
- **Correos migrados**: **1,132 correos nuevos**
- **Total procesado**: 2,359 correos (eliminando 1,227 duplicados)
- **Datos transferidos**: ~760 MiB
- **Límite diario respetado**: 1,132 < 2,700 correos

#### 🔐 **Credenciales Confirmadas:**
- **Servidor origen**: `patriciastocker.com:993` (SSL)
- **Usuario**: `marcas@patriciastocker.com`
- **Contraseña**: `$Full5tack$`
- **Estado**: ✅ Funcionando correctamente

#### 📋 **Próximos Pasos:**
- **Correos restantes**: 12,647 correos por migrar
- **Cuota disponible mañana**: 2,700 correos
- **Días estimados**: ~5 días para completar la migración
- **Recomendación**: Continuar mañana con lotes de 2,700 correos diarios

### 🛠️ **Scripts de Migración Disponibles:**

#### `email-sync/sync-marcas.sh` ⭐ **PRINCIPAL**
Script principal de sincronización configurado y probado.
```bash
cd email-sync
./sync-marcas.sh &
```

#### `email-sync/test-cpanel-connection.sh` 🔍 **DIAGNÓSTICO**
Prueba las credenciales y conectividad con el servidor cPanel.
```bash
cd email-sync
./test-cpanel-connection.sh
```

#### `email-sync/monitor-sync.sh` 📊 **MONITOREO**
Monitorea el progreso de la sincronización en tiempo real.
```bash
cd email-sync
./monitor-sync.sh
```

## 🚀 Características

### Sistema de Intranet (Deno)
- **API REST** para gestionar deudas
- **Cliente web** responsive que consume la API
- **Base de datos SQLite** para persistencia
- **Deploy simple** con Deno
- **CORS habilitado** para integración

### Cliente de Correos (Python + Next.js)
- **Backend Python** con IMAP/SMTP conectado a Hostinger
- **Interfaz moderna** con Shadcn/ui y Next.js
- **Envío y recepción** de correos en tiempo real
- **Actualización automática** cada 2 segundos
- **Tema oscuro/claro** con toggle automático
- **Diseño responsive** y animaciones suaves
- **Migración de correos** con imapsync

## 📋 Requisitos

- [Deno](https://deno.land/) instalado en tu sistema
- [Python 3.8+](https://python.org/) con Flask
- Cuenta de correo en Hostinger configurada

## 🛠️ Instalación y Uso

### Sistema de Intranet (Puerto 8000)

```bash
# Clonar o descargar el proyecto
cd patricia-stocker-intranet

# Ejecutar en modo desarrollo (con auto-reload)
deno task dev

# O ejecutar directamente
deno run --allow-net --allow-read --allow-write --watch server.ts
```

### Cliente de Correos

**Backend Python (Puerto 8080):**
```bash
# Instalar dependencias Python
pip install flask imaplib-ssl

# Ejecutar servidor backend
python3 simple-mail-client.py
```

**Frontend Next.js (Puerto 3001):**
```bash
# Navegar al directorio del cliente
cd email-client

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

## 🌐 Acceso

### En Producción (VPS Vultr):
- **Cliente de correos:** http://64.176.6.196:3001 ✅
- **API del servidor:** http://64.176.6.196:8080 ✅

### En Desarrollo Local:
- **Cliente de correos:** http://localhost:3001
- **API del servidor:** http://localhost:8080
- **Intranet:** http://localhost:8000

## 📧 Configuración de Correos

### Servidor Destino (Hostinger) ✅
- **IMAP:** imap.hostinger.com:993 (SSL)
- **SMTP:** smtp.hostinger.com:465 (SSL)
- **Cuenta:** tomas@patriciastocker.com
- **Estado:** Funcionando correctamente

### Servidor Origen (cPanel) ✅
- **IMAP:** patriciastocker.com:993 (SSL)
- **Cuenta:** marcas@patriciastocker.com
- **Estado:** Credenciales confirmadas y funcionando

## ⚠️ **LÍMITES IMPORTANTES**

### Límites de Hostinger:
- **3,000 emails/día por buzón** (límite oficial)
- **2,700 emails/día** (límite seguro recomendado)
- **Sin límite de buzones por dominio**
- **Protección avanzada contra spam, malware y phishing**

### Recomendaciones:
- Ejecutar migraciones en lotes diarios de 2,700 correos
- Monitorear el progreso con `monitor-sync.sh`
- Verificar logs en `email-sync/logs/`

### Características del Cliente de Correos

- ✨ **Interfaz moderna** con Shadcn/ui
- 🌓 **Tema oscuro/claro** automático
- 📱 **Diseño responsive** para móviles
- ⚡ **Actualización en tiempo real** (2 segundos)
- 📝 **Composer avanzado** con respuestas
- 🎨 **Animaciones suaves** y transiciones
- 🔒 **Conexión segura** SSL/TLS con Hostinger

## 📡 API Endpoints

### Deudas
- `GET /api/deudas` - Obtener todas las deudas
- `POST /api/deudas` - Crear nueva deuda
- `PUT /api/deudas/:id` - Actualizar deuda
- `DELETE /api/deudas/:id` - Eliminar deuda

### Resumen
- `GET /api/resumen` - Obtener resumen financiero

### Empresas
- `GET /api/empresas` - Obtener información bancaria de empresas

## 📊 Estructura de Datos

### Deuda
```json
{
  "id": "string",
  "empresaAcreedora": "string",
  "numeroFactura": "string",
  "fechaEmision": "YYYY-MM-DD",
  "fechaVencimiento": "YYYY-MM-DD",
  "montoPendiente": number,
  "estado": "VIGENTE" | "VENCIDO",
  "diasRetraso": number
}
```

### Empresa
```json
{
  "nombre": "string",
  "rut": "string",
  "banco": "string",
  "cuenta": "string",
  "email": "string"
}
```

## 🌐 Deploy

### Deno Deploy (Recomendado)

1. Crear cuenta en [Deno Deploy](https://deno.com/deploy)
2. Conectar tu repositorio GitHub
3. Configurar el proyecto:
   - **Entry Point**: `server.ts`
   - **Environment**: Production

### Otras opciones
- **Railway**: Soporta Deno nativamente
- **Fly.io**: Con Dockerfile simple
- **Heroku**: Con buildpack de Deno

## 🔧 Personalización

### Agregar nueva deuda via API

```bash
curl -X POST http://localhost:8000/api/deudas \
  -H "Content-Type: application/json" \
  -d '{
    "empresaAcreedora": "Nueva Empresa",
    "numeroFactura": "12345",
    "fechaEmision": "2025-08-01",
    "fechaVencimiento": "2025-09-01",
    "montoPendiente": 500000,
    "estado": "VIGENTE",
    "diasRetraso": 0
  }'
```

### Integración con Claude Desktop

La API tiene CORS habilitado, por lo que puedes hacer peticiones desde Claude Desktop:

```javascript
// Ejemplo para obtener deudas
fetch('http://localhost:8000/api/deudas')
  .then(response => response.json())
  .then(data => console.log(data));
```

## 🗄️ Base de Datos

El sistema utiliza **SQLite** como base de datos, lo que proporciona:

- ✅ **Persistencia**: Los datos se mantienen entre reinicios
- ✅ **Simplicidad**: Un solo archivo de base de datos
- ✅ **Rendimiento**: Excelente para aplicaciones pequeñas/medianas
- ✅ **Backup fácil**: Solo copiar el archivo `intranet.db`

### Configurar Base de Datos

```bash
# Primera vez - crear y poblar la base de datos
deno task setup-db
```

## 🚀 Deploy en Servidor Vultr

### Deploy Automático Completo

```bash
# 1. Hacer build del cliente de correos
./build-client.sh

# 2. Desplegar todo al servidor Vultr
./deploy-to-vultr.sh TU_IP_SERVIDOR

# Ejemplo:
./deploy-to-vultr.sh 164.90.123.456
```

### Migración de Correos en el Servidor

Una vez desplegado, conéctate al servidor para migrar los correos:

```bash
# Conectarse al servidor
ssh root@TU_IP_SERVIDOR

# Ir al directorio de la aplicación
cd /opt/patricia-stocker

# Ejecutar migración completa (esto puede tomar 4-6 horas)
./migrate-emails.sh
```

### Servicios Desplegados

El script automático configura:
- **Intranet (Deno)**: Puerto 8000 - Sistema de gestión de deudas
- **Cliente Correos (Next.js)**: Puerto 3001 - Interfaz moderna de correos
- **API Correos (Python)**: Puerto 8080 - Backend IMAP/SMTP
- **Servicios systemd**: Auto-inicio y reinicio automático
- **Firewall**: Configurado para los puertos necesarios

### Verificar Estado de Servicios

```bash
# En el servidor
systemctl status patricia-intranet
systemctl status patricia-email-api
systemctl status patricia-email-client

# Ver logs
journalctl -u patricia-intranet -f
journalctl -u patricia-email-api -f
journalctl -u patricia-email-client -f
```

## 🤖 Integración con Claude Desktop

El sistema está diseñado para integrarse perfectamente con Claude Desktop:

```javascript
// Obtener deudas
const response = await fetch('http://localhost:8000/api/deudas');
const data = await response.json();
console.log(data.deudas);
```

Ver ejemplos completos en [`claude-desktop-integration.md`](claude-desktop-integration.md)

## 📁 Estructura del Proyecto

```
patricia-stocker-intranet/
├── server.ts              # Servidor principal
├── database.ts            # Gestión de base de datos
├── setup-database.ts      # Configuración inicial de DB
├── public/
│   └── index.html         # Cliente web
├── deploy.sh              # Script de deploy automático
├── deploy-guide.md        # Guía de deploy manual
├── claude-desktop-integration.md  # Ejemplos para Claude Desktop
├── deno.json              # Configuración de Deno
├── intranet.db            # Base de datos SQLite (se crea automáticamente)
└── README.md              # Este archivo
```

## 📧 Migración de Correos

### Estado Actual
- ✅ **tomas@patriciastocker.com**: Migración completada (1,026 correos)
- ⚠️ **marcas@patriciastocker.com**: Migración pendiente (~19,500 correos, 8.6 GB)

### Proceso de Migración
El script `migrate-emails.sh` transfiere todos los correos de `marcas@patriciastocker.com` hacia `tomas@patriciastocker.com` usando imapsync:

- **Origen**: patriciastocker.com (servidor anterior)
- **Destino**: imap.hostinger.com (nuevo servidor)
- **Método**: imapsync con SSL/TLS
- **Tiempo estimado**: 4-6 horas para ~19,500 mensajes
- **Auto-detención**: El script se detiene automáticamente al completarse

### Carpetas Migradas
- INBOX (14,992 mensajes)
- Sent (4,268 mensajes enviados)
- Drafts (69 borradores)
- Trash (187 mensajes)
- spam (8 mensajes)

## 🔄 Próximos Pasos

1. **Completar migración**: Ejecutar `migrate-emails.sh` en el servidor
2. **Autenticación**: Agregar login y permisos
3. **Notificaciones**: Alertas por vencimientos
4. **Reportes**: Exportar a PDF/Excel
5. **Dashboard**: Gráficos y métricas avanzadas
6. **Integración contable**: Conectar con sistemas ERP

## 📝 Notas

- ✅ **Base de datos persistente**: SQLite configurado
- ✅ **Deploy automatizado**: Script incluido
- ✅ **Integración Claude Desktop**: API con CORS habilitado
- ✅ **Cliente web responsive**: Funcional y profesional
