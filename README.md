# 🌾 AGROK · Sistema de Campo (Spec v2)

Sistema integral desarrollado e implementado a partir de la especificación técnica en `docs/`:

1. **📱 Cuadrilla / Campo (Telegram Mini App Offline-First):**
   - Captura de reportes diarios de campo con soporte **100% Offline-First** (marca de tiempo inmutable).
   - Catálogo cargado: Obras (`Guayeme`, `Desmonte Sta Teresita`, `Siembra Clúster Mangos`, `San Alberto`, etc.) y sus Predios asociados.
   - Captura de Cuadrilla (Operador tractor, retro, bulldozer, técnicos, auxiliares).
   - Captura de Avance en Hectáreas normalizadas por predio y actividad.
   - Soporte para **Día Sin Actividad** (`lluvia`, `sin_material`, `sin_cuadrilla`, `sin_maquina`, `descanso`).
   - Pestaña de **Parser Inteligente**: Permite pegar el bloque de texto diario del 11 de mayo y clasificarlo automáticamente.
   - Registro de Horómetros y combustible para maquinaria (Puma, Bulldozer D6, Retro New Holland).

2. **📋 Tablero Operativo (Los 4 Widgets Canónicos según docs/3):**
   - 🔴 **1. Obras sin reporte hoy**: Obras activas sin reporte del día ordenadas por días hábiles.
   - 📈 **2. Avance contra meta**: Desglose por obra y predio comparando avance de campo (ha) vs medición oficial de dron (ha) vs meta del proyecto.
   - ⚠️ **3. Incidencias abiertas**: Control por Folio (`F-14`), días abierta y **cierre con Causa Raíz obligatoria**.
   - 📦 **4. Bloqueado por material**: Control de insumos faltantes, en sitio y fechas ETA.
   - 🚜 **Maquinaria y Horómetros**: Alertas de proximidad a umbral de servicio preventivo (<20 hrs).

3. **🤖 Bot de Telegram & Supergrupo AGROK:**
   - Comandos operativos: `/reporte`, `/sin_actividad`, `/incidencia`, `/cerrar`, `/verificar`, `/horometro`, `/material`, `/medicion`, `/tablero`, `/avance`, `/pendientes`, `/hoy`.
   - Generación automática del mensaje fijado del canal `#Tablero`.

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

## 🤖 Configuración como Telegram Mini App (TMA)

Esta aplicación está completamente preparada para funcionar como una **Telegram Mini App Oficial (TMA)** con soporte **Offline-First**:

### 1. Vincular la Mini App en @BotFather (Opcional pero Recomendado):
1. En Telegram, abre el chat con **`@BotFather`**.
2. Envía el comando `/newapp` o `/setmenubutton`.
3. Selecciona tu bot.
4. Cuando te pida la URL, ingresa tu URL de Render: `https://testboti-o.onrender.com` (o tu URL asignada).
5. Asigna el título corto: `Reportes de Campo`.
6. ¡Listo! Ahora todos los usuarios verán el botón **"📱 Mini App"** en la esquina inferior de Telegram.

---

## 👥 Guía de Uso para los 3 Roles

### 1. Rol Operador (Dos formas de reportar):
- **Forma A (Telegram Mini App Offline-First):**
  - Toca el botón **"📱 ABRIR MINI APP"** dentro de Telegram.
  - La app reconoce automáticamente tu nombre y usuario de Telegram (@usuario).
  - Si estás en campo **sin señal o en modo avión**, puedes llenar tus reportes con tranquilidad.
  - Se guarda localmente con fecha y hora inmutable.
  - Al recuperar señal, se sincroniza automáticamente.
- **Forma B (Directo en el chat de Telegram):**
  - Envía el comando:
    ```text
    /reportar PRJ-001 | 15 | Concluida excavación del tramo norte
    ```

### 2. Rol Supervisor (Alertas y Creación):
- En Telegram, envía `/rol supervisor`.
- Recibirás alertas instantáneas cuando cualquier operador reporte, comparando la **hora real en campo** vs la **hora de sincronización**.
- Crea proyectos con `/nuevo_proyecto PRJ-004 | Línea Eléctrica Sur | Tendido de 33kV | Subestación`.

### 3. Rol Líder (Consultas y Métricas):
- En Telegram, envía `/rol lider`.
- Consulta avances con `/proyectos` y `/avance [CODIGO]`.
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
