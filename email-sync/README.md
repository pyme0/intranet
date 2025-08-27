# 📧 Sincronización de Correos - marcas@patriciastocker.com

Este directorio contiene los scripts para sincronizar todos los correos de `marcas@patriciastocker.com` desde el servidor origen (`mail.patriciastocker.com`) hacia el servidor destino (`imap.hostinger.com` en la cuenta `tomas@patriciastocker.com`).

## 🚀 Scripts Disponibles

### 1. `test-connection.sh`
Prueba las conexiones IMAP antes de ejecutar la sincronización completa.

```bash
./test-connection.sh
```

### 2. `sync-marcas.sh`
Script principal que ejecuta la sincronización completa. Se ejecuta en background y se detiene automáticamente cuando termina.

```bash
./sync-marcas.sh &
```

### 3. `monitor-sync.sh`
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
