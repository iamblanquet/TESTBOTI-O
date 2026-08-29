# 📱 Sistema de Reportes de Campo Offline-First con Bot de Telegram

Sistema **100% funcional y real** diseñado para la captura de avances en campo sin necesidad de conexión a internet (Offline-First), sincronización automática al recuperar señal y despacho instantáneo de notificaciones hacia un **Bot de Telegram Real** para 3 roles clave:

1. **Operador (App Móvil Offline-First):** Descarga proyectos y registra avances en campo sin señal. Captura la fecha y hora exacta inmutable del momento del reporte (`offline_created_at`). Sincroniza al restablecerse la red.
2. **Supervisor:** Recibe alertas instantáneas en Telegram con detalle comparativo (*Hora de captura en campo vs Hora de sincronización*), y puede crear proyectos y tareas directamente desde Telegram o desde la Web.
3. **Líder:** Monitorea el progreso acumulado y consulta el estado de los proyectos en tiempo real mediante comandos interactivos de Telegram (`/proyectos`, `/avance [CODIGO]`).

---

## ☁️ Despliegue en Render.com (Producción en la Nube)

Este repositorio está 100% preparado para desplegarse como un **Web Service gratuito en Render**:

### Paso a Paso para Render:
1. Crea una cuenta en [Render.com](https://render.com).
2. Haz clic en **"New +"** -> **"Web Service"**.
3. Conecta tu repositorio de GitHub: `https://github.com/iamblanquet/TESTBOTI-O`.
4. Render detectará automáticamente `render.yaml` o puedes configurar manualmente:
   - **Runtime:** `Node`
   - **Build Command:** `npm run render-build`
   - **Start Command:** `npm run render-start`
5. En la sección **Environment Variables** añade:
   - `TELEGRAM_BOT_TOKEN`: *Tu token obtenido de @BotFather*
   - `NODE_ENV`: `production`
6. Haz clic en **"Deploy Web Service"**.
7. ¡Listo! Render te dará una URL HTTPS pública (ej: `https://offline-reports-xxxx.onrender.com`) accesible desde cualquier teléfono en cualquier lugar del mundo.

---

## 🚀 Inicio Rápido Local
Haz doble clic en el archivo:
```bash
start.bat
```

### Opción 2: Ejecutar manualmente desde la terminal

**Terminal 1 (Backend):**
```bash
cd backend
npm start
```
*Servidor corriendo en: `http://localhost:3001`*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev -- --host
```
*Aplicación corriendo en: `http://localhost:5173`*

---

## 🤖 Configuración del Bot de Telegram

1. Abre **Telegram** y busca a **`@BotFather`**.
2. Envía el comando `/newbot` y sigue las instrucciones para crear tu bot (ej: `MiReporteBot`).
3. Copia el **Token HTTP API** que te entrega BotFather (ej: `7123456789:AAHKl9-...`).
4. Puedes agregarlo de dos formas:
   - **Forma Visual:** En la aplicación web/móvil, haz clic en el botón superior **"Configurar Bot"** y pega el token.
   - **Forma Archivo:** Pégalo en el archivo `backend/.env` en la variable `TELEGRAM_BOT_TOKEN=tu_token`.

---

## 👥 Guía de Roles y Comandos del Bot

### 1. Rol Operador (Aplicación Móvil)
- Abre la app en `http://localhost:5173` (o desde tu celular usando la IP local `http://TU_IP_LOCAL:5173`).
- Al abrir con conexión, descarga los proyectos asignados.
- Puedes probar el funcionamiento desconectando tu WiFi o presionando el botón **"🔴 Forzado Offline"**.
- Registra reportes con porcentaje de avance y notas. Observa cómo se registra la **Hora de captura offline inmutable**.
- Al recuperar conexión (o desactivar el modo offline), la app sincroniza la cola en lote automáticamente hacia la base de datos central y dispara las alertas a Telegram.

### 2. Rol Supervisor (Telegram y Web)
- En Telegram, abre el chat con tu bot y envía:
  ```text
  /start
  /rol supervisor
  ```
- Recibirás una confirmación. A partir de ese momento, cada vez que un operador sincronice un reporte, recibirás una notificación como esta:
  ```text
  🚨 NUEVO REPORTE DE CAMPO (SINCRONIZADO)
  📁 Proyecto: [PRJ-001] Instalación de Fibra Óptica
  📌 Tarea: Excavación y ductería tramo A
  👷 Operador: Juan Pérez
  📈 Avance Reportado: +15% (Total: 50%)

  ⏱️ Hora de captura en campo (OFFLINE):
     👉 2026-08-29 08:30:00 (Hora real)

  🔄 Hora de sincronización (ONLINE):
     👉 2026-08-29 08:45:12

  💬 Observaciones:
  Zanja de 150 metros concluida con tubería de 4 pulgadas.
  ```
- Puedes crear nuevos proyectos directamente desde Telegram:
  ```text
  /nuevo_proyecto PRJ-004 | Red Eléctrica Subestación | Tendido de media tensión | Zona Industrial
  ```

### 3. Rol Líder (Telegram y Dashboard)
- En Telegram, abre el chat con tu bot y envía:
  ```text
  /start
  /rol lider
  ```
- Comandos para consulta ejecutiva:
  - `/proyectos` : Lista todos los proyectos con barras de porcentaje y reportes recibidos.
  - `/avance PRJ-001` : Muestra el desglose detallado, porcentaje consolidado y los últimos reportes ingresados por operadores.

---

## 📲 Cómo probarlo desde un Celular Real en la misma red WiFi

1. Ejecuta el frontend con el flag `--host` (ya incluido en `npm run dev -- --host`).
2. Obtén la IP local de tu computadora ejecutando `ipconfig` en la terminal (ej: `192.168.1.50`).
3. En el navegador de tu celular, ingresa a:
   ```text
   http://192.168.1.50:5173
   ```
4. En Chrome / Safari puedes presionar **"Añadir a la pantalla de inicio"** para instalarla como una App nativa (PWA).
5. Activa el **Modo Avión** en tu celular, crea varios reportes, desactiva el modo avión y mira cómo se sincronizan automáticamente y llegan los mensajes a Telegram.
