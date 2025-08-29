# Problema: Correos Muestran "Sin contenido" en Bandeja

## 🔍 **Descripción del Problema**
- **Ubicación**: Bandeja de correos (lista de correos)
- **Síntoma**: Los correos muestran "Sin contenido" en lugar del preview del cuerpo
- **Contexto**: NO es el div que muestra el correo completo al abrirse, sino la vista previa en la lista

## 📊 **Estado Actual**
- **Fecha**: 2025-08-29
- **Severidad**: Media-Alta (afecta UX)
- **Impacto**: Los usuarios no pueden ver preview del contenido de correos

## 🔍 **Investigación Necesaria**

### **1. Componentes a Revisar**
- [ ] Componente de lista de correos (bandeja)
- [ ] API que obtiene los correos
- [ ] Estructura de datos de correos
- [ ] Lógica de extracción de preview/snippet

### **2. Puntos Críticos a Verificar**
- [ ] ¿Se está obteniendo el campo `body` o `content` del correo?
- [ ] ¿Existe lógica para generar preview/snippet del contenido?
- [ ] ¿El backend está enviando el contenido correctamente?
- [ ] ¿El frontend está procesando el contenido correctamente?

### **3. Archivos Sospechosos**
- [ ] Componente de bandeja de correos
- [ ] API de obtención de correos
- [ ] Modelos/tipos de datos de correos
- [ ] Funciones de procesamiento de contenido

## 🎯 **Plan de Resolución**

### **Fase 1: Diagnóstico**
1. Identificar componente exacto de la bandeja
2. Revisar estructura de datos de correos
3. Verificar API response
4. Identificar dónde se pierde el contenido

### **Fase 2: Implementación**
1. Corregir obtención de contenido
2. Implementar lógica de preview
3. Asegurar sanitización de HTML
4. Limitar longitud de preview

### **Fase 3: Testing**
1. Verificar preview en bandeja
2. Confirmar que correo completo sigue funcionando
3. Probar con diferentes tipos de correos

## 📝 **Notas de Investigación**
- Usuario reporta que el problema es específicamente en la bandeja (lista)
- El div de correo completo (al hacer clic) funciona correctamente
- Necesita mostrar preview del cuerpo del correo en la lista

## 🎯 **PROBLEMA IDENTIFICADO**

### **Ubicación Exacta:**
- **Archivo**: `email-client/src/components/email-list.tsx`
- **Línea**: 379
- **Código problemático**:
```tsx
{cleanBody(email.body) || 'Sin contenido'}
```

### **Causa Raíz:**
1. **Campo `body` vacío**: Los correos llegan sin el campo `body` poblado
2. **Función `cleanBody()`**: Está procesando un campo vacío/undefined
3. **API endpoint**: Usando `/api/emails` en lugar de `/api/emails/with-preview`

### **Evidencia:**
- Existe endpoint `/api/emails/with-preview` que debería cargar preview
- La función `loadEmailContent()` solo se ejecuta al hacer clic en el correo
- Los correos en la lista no tienen `body` cargado inicialmente

## ✅ **SOLUCIÓN IMPLEMENTADA**

### **Cambios Realizados:**

1. **Endpoint corregido** (`email-client/src/components/email-client.tsx:127`):
   ```tsx
   // ANTES:
   let endpoint = '/api/emails/paginated'

   // DESPUÉS:
   let endpoint = '/api/emails/with-preview'
   ```

2. **Función cleanBody mejorada** (`email-client/src/components/email-list.tsx:207-221`):
   ```tsx
   const cleanBody = (body: string) => {
     if (!body) return ''

     // Remover HTML tags si existen
     const withoutHtml = body.replace(/<[^>]*>/g, '')

     // Remover saltos de línea múltiples y espacios extra
     const cleaned = withoutHtml
       .replace(/\n+/g, ' ')
       .replace(/\s+/g, ' ')
       .trim()

     // Limitar longitud para preview
     return cleaned.length > 150 ? cleaned.substring(0, 150) + '...' : cleaned
   }
   ```

### **Mejoras Implementadas:**
- ✅ Usa endpoint que incluye preview del body
- ✅ Maneja contenido HTML correctamente
- ✅ Limita longitud del preview (150 caracteres)
- ✅ Valida que el body exista antes de procesarlo
- ✅ Limpia espacios y saltos de línea extra

## 🚨 **Estado**
- **Estado**: ✅ RESUELTO
- **Fecha resolución**: 2025-08-29
- **Cambios**: 2 archivos modificados
- **Testing**: Pendiente verificación
