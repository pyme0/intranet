# 📧 Sincronización de Correos - marcas@patriciastocker.com

Este directorio contiene los scripts para sincronizar todos los correos de `marcas@patriciastocker.com` desde el servidor cPanel hacia Hostinger.

## 🎉 **MIGRACIÓN EXITOSA COMPLETADA** ✅

### 📊 **Resumen de la Migración (27 Agosto 2025)**
- **Origen**: `marcas@patriciastocker.com` (cPanel `patriciastocker.com:993`)
- **Destino**: `tomas@patriciastocker.com` (Hostinger `imap.hostinger.com:993`)
- **Correos migrados**: **1,132 correos nuevos**
- **Total procesado**: 2,359 correos (eliminando 1,227 duplicados)
- **Datos transferidos**: ~760 MiB
- **Límite diario respetado**: 1,132 < 2,700 correos

### 🔐 **Credenciales Confirmadas y Funcionando:**
- **Servidor**: `patriciastocker.com:993` (SSL)
- **Usuario**: `marcas@patriciastocker.com`
- **Contraseña**: `$Full5tack$`

### 📋 **Próximos Pasos:**
- **Correos restantes**: 12,647 correos por migrar
- **Cuota disponible mañana**: 2,700 correos
- **Días estimados**: ~5 días para completar

## 🛠️ **Scripts Disponibles**

### 1. `sync-marcas.sh` ⭐ **PRINCIPAL**
Script principal de sincronización configurado y probado.
```bash
./sync-marcas.sh &
```

### 2. `test-cpanel-connection.sh` 🔍 **DIAGNÓSTICO**
Prueba las credenciales y conectividad con el servidor cPanel.
```bash
./test-cpanel-connection.sh
```

### 3. `monitor-sync.sh` 📊 **MONITOREO**
Monitorea el progreso de la sincronización en tiempo real.

```bash
./monitor-sync.sh
```

## 📋 Configuración

- **Origen**: `marcas@patriciastocker.com` en `mail.patriciastocker.com:993` (SSL)
- **Destino**: `tomas@patriciastocker.com` en `imap.hostinger.com:993` (SSL)
- **Contraseña**: `$Full5tack$` para ambas cuentas

## 🔧 Características de la Sincronización

- ✅ **Sincronización completa** de todos los correos
- ✅ **Preserva fechas internas** de los mensajes
- ✅ **Mapeo automático** de carpetas
- ✅ **Elimina duplicados** en destino
- ✅ **Logs detallados** con timestamps
- ✅ **Control de procesos** con PID
- ✅ **Se detiene automáticamente** al finalizar

## 📊 Monitoreo

Los logs se guardan en `/home/linuxuser/email-sync/logs/` con formato:
```
sync-marcas-YYYYMMDD-HHMMSS.log
```

## ⚠️ Importante

- El proceso se ejecuta **una sola vez** y se detiene automáticamente
- **No consume recursos** innecesarios después de terminar
- El **cliente de correos sigue funcionando** independientemente
- Los logs permiten **auditar** todo el proceso de sincronización

## 🎛️ Comandos Útiles

```bash
# Probar conexiones
./test-connection.sh

# Iniciar sincronización en background
./sync-marcas.sh &

# Monitorear progreso
./monitor-sync.sh

# Ver log en tiempo real
tail -f /home/linuxuser/email-sync/logs/sync-marcas-*.log

# Detener proceso (si es necesario)
kill $(cat /home/linuxuser/email-sync/sync-marcas.pid)
```
