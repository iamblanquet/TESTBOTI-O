# 🚀 Guía de Despliegue en Render.com y Configuración de Mini App

## Paso 1: Desplegar en Render

### 1.1 Crear el Web Service

1. Ve a [render.com](https://render.com) e inicia sesión
2. Haz clic en **"New +"** → **"Web Service"**
3. Conecta tu cuenta de GitHub si aún no lo has hecho
4. Busca y selecciona el repositorio: `iamblanquet/TESTBOTI-O`
5. Render detectará automáticamente la configuración de `render.yaml`

### 1.2 Configurar Variables de Entorno

**IMPORTANTE**: Antes de hacer deploy, configura estas variables:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `TELEGRAM_BOT_TOKEN` | Tu token de @BotFather | Token del bot (obligatorio para bot) |
| `NODE_ENV` | `production` | Modo de producción |

Para obtener tu token de Telegram:
1. Abre Telegram
2. Busca **@BotFather**
3. Si no tienes un bot, envía `/newbot` y sigue las instrucciones
4. Si ya tienes uno, envía `/mybots` → Selecciona tu bot → "API Token"
5. Copia el token (formato: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 1.3 Iniciar Deploy

1. Haz clic en **"Create Web Service"**
2. Espera 3-5 minutos mientras Render:
   - Instala dependencias del backend
   - Compila el frontend
   - Inicia el servidor
3. Una vez completado, verás tu URL pública:
   ```
   https://tu-app.onrender.com
   ```

**⚠️ Nota sobre el plan Free de Render:**
- El servicio se "duerme" después de 15 minutos de inactividad
- La primera petición después de dormir tarda ~30 segundos
- Es normal y esperado en el plan gratuito

---

## Paso 2: Configurar Mini App en Telegram

Una vez que tu app esté desplegada y funcionando:

### 2.1 Método 1: Menu Button (Más Visible - RECOMENDADO)

Este método agrega un botón persistente en el menú del chat con tu bot:

1. Abre Telegram
2. Busca **@BotFather**
3. Envía el comando:
   ```
   /setmenubutton
   ```
4. Selecciona tu bot de la lista
5. BotFather te pedirá:
   - **URL**: Pega tu URL de Render (ej: `https://testboti-o.onrender.com`)
   - **Texto del botón**: `🌾 Abrir AGROK`

6. ¡Listo! Ahora cuando los usuarios abran chat con tu bot verán el botón en la esquina inferior.

### 2.2 Método 2: Web App Command (Alternativo)

Este método crea un comando que abre la Mini App:

1. En @BotFather, envía:
   ```
   /newapp
   ```
2. Selecciona tu bot
3. Proporciona la información:
   - **Título corto**: `AGROK Campo`
   - **Descripción**: `Sistema de reportes de campo offline-first`
   - **Foto/GIF**: Sube un ícono o screenshot (512x512 px recomendado)
   - **Web App URL**: Tu URL de Render
   - **¿Enviar desde el teclado de adjuntos?**: No

4. BotFather te dará un enlace directo a tu Mini App

---

## Paso 3: Probar la Mini App

### 3.1 Probar desde Telegram

1. Abre el chat con tu bot en Telegram
2. Si configuraste el Menu Button, verás el botón **"🌾 Abrir AGROK"** en la parte inferior
3. Haz clic en el botón
4. La Mini App debe abrirse dentro de Telegram

### 3.2 Verificar el Backend

Abre en tu navegador:
```
https://tu-app.onrender.com/health
```

Deberías ver:
```json
{
  "status": "ok",
  "time": "2026-08-29T...",
  "service": "AGROK Backend & Telegram TMA"
}
```

### 3.3 Verificar el Frontend

Abre en tu navegador:
```
https://tu-app.onrender.com
```

Deberías ver la pantalla de login de AGROK.

---

## 🔧 Troubleshooting

### Problema: "Application Error" en Render

**Solución:**
1. Ve a tu servicio en Render
2. Haz clic en "Logs"
3. Busca errores en rojo
4. Verifica que `TELEGRAM_BOT_TOKEN` esté configurado

### Problema: Mini App no se abre en Telegram

**Posibles causas:**

1. **URL incorrecta en BotFather**
   - Verifica que la URL sea exactamente la de Render (con https://)
   - No incluyas `/api` ni ninguna ruta adicional

2. **Servicio dormido (plan Free)**
   - Abre la URL en el navegador primero para "despertar" el servicio
   - Espera 30 segundos y vuelve a intentar

3. **Error en el deploy**
   - Ve a Render → Logs
   - Verifica que no haya errores

### Problema: Bot no responde a comandos

**Solución:**
1. Verifica que `TELEGRAM_BOT_TOKEN` esté correcto
2. En Render → Logs, busca:
   ```
   ✅ [Telegram Bot AGROK] Conectado como @tu_bot_username
   ```
3. Si no aparece, el token es incorrecto o hay un error de red

### Problema: "Mixed Content" o "Insecure Connection"

**Solución:**
- Render automáticamente provee HTTPS
- Si ves este error, verifica que la URL en BotFather empiece con `https://` (no `http://`)

---

## 📱 Usuarios de Ejemplo

Una vez desplegado, estos usuarios están pre-cargados en la base de datos:

| Usuario | Contraseña | Rol | Acceso |
|---------|-----------|-----|--------|
| `admin` | `admin123` | IT | Configuración completa |
| `supervisor` | `super123` | Supervisor | Tablero y gestión |
| `direccion` | `lider123` | Dirección | Vista ejecutiva |
| `operador` | `campo123` | Campo | Reportes y capturas |

**⚠️ IMPORTANTE**: Cambia estas contraseñas en producción.

---

## 🔄 Actualizar el Deploy

Cuando hagas cambios en el código:

1. Commit y push a GitHub:
   ```bash
   git add .
   git commit -m "tu mensaje"
   git push origin main
   ```

2. Render detectará automáticamente el cambio y re-desplegará

3. Espera 3-5 minutos para que el nuevo deploy termine

---

## 📊 Monitoreo

### Ver Logs en Tiempo Real

1. Ve a tu servicio en Render
2. Haz clic en "Logs"
3. Verás todos los eventos del servidor en tiempo real

### Health Check

Render automáticamente verifica:
```
GET /health
```

Si esta ruta no responde, Render reiniciará el servicio.

---

## 💾 Base de Datos

La base de datos SQLite se guarda en el sistema de archivos de Render.

**⚠️ IMPORTANTE**: 
- En el plan Free, Render puede reiniciar el contenedor
- Los datos se pueden perder al reiniciar
- Para producción seria, considera:
  - Plan de pago de Render (con disco persistente)
  - O migrar a PostgreSQL usando Render PostgreSQL

### Backup de Producción

Para hacer backup de la base de datos en producción:

1. Usa el comando desde Render Shell:
   ```bash
   cd backend
   node backup.js
   ```

2. O descarga el archivo directamente vía API si lo implementas

---

## 🎯 Checklist de Deploy

- [ ] Repositorio en GitHub actualizado
- [ ] Web Service creado en Render
- [ ] Variable `TELEGRAM_BOT_TOKEN` configurada
- [ ] Deploy completado sin errores
- [ ] Health check responde OK: `/health`
- [ ] Frontend carga correctamente en navegador
- [ ] Menu Button configurado en @BotFather
- [ ] Mini App se abre desde Telegram
- [ ] Puedes hacer login con usuario de prueba
- [ ] Bot responde a comandos básicos (`/start`)

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs en Render
2. Verifica el CHANGELOG.md para ver las últimas mejoras
3. Consulta el README.md principal
4. Verifica que el token de Telegram sea correcto

---

## 🎉 ¡Listo!

Tu Mini App de Telegram ahora está desplegada y lista para usar en producción. Los usuarios pueden acceder desde cualquier parte del mundo usando Telegram.
