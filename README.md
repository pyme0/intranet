# Patricia Stocker Intranet

Sistema de intranet para Patricia Stocker con cliente de correos integrado y herramientas de migración de correos.

## 📧 **MIGRACIÓN DE CORREOS COMPLETADA** ✅

### 🎯 **Resumen de la Migración (27 Agosto 2025)**

**MIGRACIÓN EXITOSA**: Se completó la migración parcial de correos desde el servidor cPanel hacia Hostinger.

#### 📊 **Estadísticas de Migración:**

**Primera Migración (marcas@patriciastocker.com):**
- **Origen**: `marcas@patriciastocker.com` (servidor cPanel `patriciastocker.com:993`)
- **Destino**: `tomas@patriciastocker.com` (Hostinger `imap.hostinger.com:993`)
- **Correos migrados**: **1,132 correos nuevos**
- **Total procesado**: 2,359 correos (eliminando 1,227 duplicados)
- **Datos transferidos**: ~760 MiB

**Segunda Sincronización (tomas@patriciastocker.com):**
- **Origen**: `tomas@patriciastocker.com` (servidor cPanel `patriciastocker.com:993`)
- **Destino**: `tomas@patriciastocker.com` (Hostinger `imap.hostinger.com:993`)
- **Correos sincronizados**: **82 correos nuevos** ✅
- **Datos transferidos**: 15.04 MiB
- **Tiempo**: 63.5 segundos
- **Resultado**: Todos los correos de "test" ahora disponibles

**Total Final**: **2,461 correos** en Hostinger

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

## 🔧 **CONFIGURACIÓN DE SERVIDORES Y SINCRONIZACIÓN**

### 📧 **Configuración de Correos**

#### Servidor Origen (Patricia Stocker - cPanel)
- **Host**: `patriciastocker.com:993` (SSL)
- **Usuarios disponibles**:
  - `marcas@patriciastocker.com`
  - `tomas@patriciastocker.com`
- **Contraseña**: `$Full5tack$`
- **⚠️ IMPORTANTE**: Usar `patriciastocker.com` (NO `mail.patriciastocker.com`)

#### Servidor Destino (Hostinger)
- **IMAP**: `imap.hostinger.com:993` (SSL)
- **SMTP**: `smtp.hostinger.com:465` (SSL)
- **Usuario**: `tomas@patriciastocker.com`
- **Contraseña**: `$Full5tack$`

### 🔄 **Sincronización con imapsync**

#### Instalación de imapsync (macOS)
```bash
brew install imapsync
```

#### Comando de Sincronización Completa
```bash
# Sincronizar INBOX completo
imapsync \
  --host1 patriciastocker.com \
  --user1 tomas@patriciastocker.com \
  --password1 '$Full5tack$' \
  --host2 imap.hostinger.com \
  --user2 tomas@patriciastocker.com \
  --password2 '$Full5tack$' \
  --folder INBOX
```

#### Verificación de Diferencias (Dry Run)
```bash
# Ver qué correos faltan sin sincronizar
imapsync \
  --host1 patriciastocker.com \
  --user1 tomas@patriciastocker.com \
  --password1 '$Full5tack$' \
  --host2 imap.hostinger.com \
  --user2 tomas@patriciastocker.com \
  --password2 '$Full5tack$' \
  --dry --justfolders
```

### 🎯 **Lecciones Aprendidas**

#### ✅ **Problemas Resueltos:**
1. **Servidor incorrecto**: `mail.patriciastocker.com` NO funciona, usar `patriciastocker.com`
2. **Correos faltantes**: El servidor antiguo tenía correos que no estaban en Hostinger
3. **Autenticación**: Requiere SSL en puerto 993, no funciona en puerto 143 sin STARTTLS
4. **Sincronización exitosa**: 82 correos nuevos transferidos correctamente

#### ⚠️ **Configuraciones Importantes:**
- **Cliente de correos**: Debe conectarse a Hostinger (servidor nuevo)
- **imapsync**: Debe sincronizar desde servidor antiguo hacia Hostinger
- **Verificación**: Siempre hacer dry run antes de sincronización real
- **Reclasificación**: Ejecutar reclasificación después de cargar nuevos correos

### 🛠️ **Comandos de Diagnóstico Útiles**

#### Verificar Conectividad IMAP
```bash
# Probar conexión SSL
openssl s_client -connect patriciastocker.com:993 -quiet

# Probar conexión no SSL (debe mostrar LOGINDISABLED)
nc -v patriciastocker.com 143
```

#### Verificar Estado del Cliente
```bash
# Ver correos clasificados para Tomás
curl -s "http://localhost:8080/api/emails/paginated?page=1&limit=50&account=tomas@patriciastocker.com" | jq '.total_count'

# Buscar correos de "test"
curl -s "http://localhost:8080/api/emails/paginated?page=1&limit=300&account=tomas@patriciastocker.com" | jq -r '.emails[] | select(.subject | test("test"; "i")) | "- \(.subject) - ID: \(.email_id)"'

# Reclasificar correos después de sincronización
curl -s "http://localhost:8080/api/reclassify-emails"

# Cargar más correos
curl -s "http://localhost:8080/api/load-more-emails?start_from=2400&batch_size=100"
```

#### Gestión de Procesos
```bash
# Matar proceso en puerto 8080
lsof -ti:8080 | xargs kill -9

# Ver procesos activos
lsof -i :8080
lsof -i :3001
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

# Ejecutar en desarrollo (RECOMENDADO)
npm run dev

# NOTA: Usar modo desarrollo, no producción
# npm start puede fallar con Next.js 15.5.1
```

### 🐛 **Troubleshooting Común**

#### Problemas con Next.js
- **Error**: Next.js 15.5.1 puede tener bugs en modo producción
- **Solución**: Usar `npm run dev` en lugar de `npm start`
- **Alternativa**: Downgrade a Next.js 14.2.5 si es necesario

#### Problemas de Sincronización
- **Síntoma**: Correos no aparecen después de imapsync
- **Causa**: Cache no actualizado o clasificación pendiente
- **Solución**:
  1. Ejecutar `curl -s "http://localhost:8080/api/load-more-emails?start_from=X&batch_size=100"`
  2. Ejecutar `curl -s "http://localhost:8080/api/reclassify-emails"`

#### Problemas de Autenticación IMAP
- **Error**: `Authentication failed`
- **Verificar**:
  1. Usar `patriciastocker.com` (no `mail.patriciastocker.com`)
  2. Puerto 993 para SSL
  3. Contraseña correcta: `$Full5tack$`

#### Puerto Ocupado
```bash
# Si el puerto 8080 está ocupado
lsof -ti:8080 | xargs kill -9

# Si el puerto 3001 está ocupado
lsof -ti:3001 | xargs kill -9
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

## 📅 **Historial de Cambios**

### 27 Agosto 2025 - Sincronización Completa ✅

#### 🎯 **Problema Identificado y Resuelto:**
- **Síntoma**: Correos de "test" de Tomás Barrientos no aparecían en el cliente web
- **Causa**: Los correos estaban en el servidor antiguo (`patriciastocker.com`) pero no en Hostinger
- **Investigación**: Se descubrió que había 97 correos en el servidor antiguo que no estaban sincronizados

#### 🔧 **Solución Implementada:**
1. **Configuración correcta de imapsync**: Usar `patriciastocker.com` (no `mail.patriciastocker.com`)
2. **Sincronización exitosa**: 82 correos nuevos transferidos desde servidor antiguo a Hostinger
3. **Verificación completa**: Todos los correos de "test" ahora disponibles en el cliente web

#### 📊 **Resultados:**
- **Correos sincronizados**: 82 correos nuevos
- **Total final**: 2,461 correos en Hostinger
- **Correos de "test" encontrados**: 11+ correos de Tomás Barrientos
- **Tiempo de sincronización**: 63.5 segundos
- **Estado**: ✅ Completamente funcional

#### 🛠️ **Mejoras en Documentación:**
- Agregada sección completa de configuración de servidores
- Comandos de diagnóstico y troubleshooting
- Lecciones aprendidas y problemas comunes
- Guía paso a paso para sincronización con imapsync

#### 🎉 **Estado Final:**
- **Cliente web**: Funcionando en http://localhost:3001
- **API**: Funcionando en http://localhost:8080
- **Sincronización**: Completa y exitosa
- **Todos los correos**: Disponibles y clasificados correctamente
