# 🌾 AGROK · Guía Maestra y Detallada para Replicar el Proyecto

Esta guía contiene todos los pasos, especificaciones técnicas, comandos y configuraciones necesarias para clonar, configurar, ejecutar y desplegar desde cero el ecosistema completo de **AGROK**: **Telegram Mini App (TMA)**, **PWA Offline-First**, **Tablero Operativo de Supervisión**, **Dashboard Ejecutivo** y **Bot de Telegram con Webhook**.

---

## 📑 Tabla de Contenidos
1. [Arquitectura del Sistema](#1-arquitectura-del-sistema)
2. [Requisitos Previos](#2-requisitos-previos)
3. [Estructura del Proyecto](#3-estructura-del-proyecto)
4. [Instalación y Ejecución Local](#4-instalación-y-ejecución-local)
5. [Configuración del Bot de Telegram en @BotFather](#5-configuración-del-bot-de-telegram-en-botfather)
6. [Despliegue en Producción en Render](#6-despliegue-en-producción-en-render)
7. [Aislamiento Estricto de Roles y Accesos](#7-aislamiento-estricto-de-roles-y-accesos)
8. [Lógica de Negocio Canónica (docs/)](#8-lógica-de-negocio-canónica-docs)
9. [Solución de Problemas Comunes (Troubleshooting)](#9-solución-de-problemas-comunes-troubleshooting)

---

## 1. Arquitectura del Sistema

El proyecto está diseñado bajo el patrón **TESA (Telegram Entry, Standalone API, Offline Storage)**:

```
                  ┌────────────────────────────────────────┐
                  │          USUARIO EN CAMPO / MÓVIL      │
                  └───────────────────┬────────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
┌──────────────────────────┐                    ┌──────────────────────────┐
│   TELEGRAM MINI APP      │                    │     BOT DE TELEGRAM      │
│  • React 18 + Vite       │                    │  • node-telegram-bot-api │
│  • Tailwind CSS          │                    │  • Webhooks HTTPS        │
│  • Lucide Icons          │                    │  • Parser de Reportes    │
│  • Service Worker (PWA)  │                    │  • Menú Persistente      │
└─────────────┬────────────┘                    └─────────────┬────────────┘
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │       BACKEND / SERVIDOR EXPRESS       │
                  │  • Node.js + Express                   │
                  │  • CSP Frame-Ancestors para Telegram   │
                  │  • REST API + Webhooks                 │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │         BASE DE DATOS CENTRAL          │
                  │  • SQLite3 (database.sqlite)           │
                  │  • Tablas canónicas de docs/           │
                  │  • Hitos, Tareas, Obras, 17 Predios    │
                  └────────────────────────────────────────┘
```

---

## 2. Requisitos Previos

Asegúrate de tener instalado en tu equipo:
- **Node.js**: Versión 18.x o 20.x LTS ([Descargar](https://nodejs.org/))
- **Git**: Para control de versiones ([Descargar](https://git-scm.com/))
- **Cuenta de Telegram** y acceso a [@BotFather](https://t.me/BotFather).
- **Cuenta en Render** (o cualquier proveedor VPS / Cloud con soporte Node.js y HTTPS).

---

## 3. Estructura del Proyecto

```
/
├── backend/
│   ├── database.js          # Esquema SQLite, migraciones automáticas y catálogos semilla
│   ├── database.sqlite      # Archivo de base de datos local
│   ├── parser.js            # Parser de lenguaje natural para reportes de Telegram (docs/2 §2)
│   ├── server.js            # Servidor Express, API REST, Webhook de Telegram y archivos estáticos
│   ├── telegramService.js   # Lógica del Bot, Comandos (/start, /tablero, etc.) y Webhook
│   ├── package.json         # Dependencias del backend (express, sqlite3, node-telegram-bot-api, cors)
│   └── .env                 # Variables de entorno locales
├── frontend/
│   ├── public/
│   │   ├── manifest.json    # Configuración PWA (standalone, iconos, tema)
│   │   └── sw.js            # Service Worker para funcionamiento 100% Offline
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminWebConsole.jsx    # Consola Web de Administración (Usuarios, Roles, Bot)
│   │   │   ├── LeaderView.jsx         # Dashboard Ejecutivo de Dirección (KPIs, Avance Dron vs Campo)
│   │   │   ├── LoginScreen.jsx        # Login aislado con acceso táctil de 1 toque
│   │   │   ├── OfflineQueueModal.jsx  # Bandeja y gestión de cola de reportes offline
│   │   │   ├── OperatorView.jsx       # Interfaz limpia de Operador (Proyecto -> Hito -> Tarea)
│   │   │   ├── SupervisorView.jsx     # Tablero Operativo (4 widgets), Hitos, Incidencias y Materiales
│   │   │   └── TelegramConfigModal.jsx# Modal de conexión y estado del bot
│   │   ├── services/
│   │   │   ├── api.js                 # Cliente HTTP fetch para conectar con el backend
│   │   │   └── storage.js             # Gestor de LocalStorage/IndexedDB para soporte Offline-First
│   │   ├── App.jsx                    # Enrutador principal con barrera estricta por rol
│   │   ├── main.jsx                   # Punto de entrada de React
│   │   └── index.css                  # Estilos globales y Tailwind CSS
│   ├── index.html                     # HTML con SDK de Telegram (telegram-web-app.js)
│   ├── vite.config.js                 # Configuración de compilación de Vite
│   └── package.json                   # Dependencias frontend (React, Tailwind, Lucide)
├── docs/                              # Especificaciones canónicas del negocio AGROK (v2)
│   ├── 0 — Léeme.md
│   ├── 1 — Modelo de datos.md
│   ├── 2 — Telegram.md
│   ├── 3 — Backend y escritorio.md
│   ├── 4 — Plan y responsables.md
│   └── 5 — Catálogo de obras y predios.md
└── package.json                       # Scripts globales de compilación y orquestación
```

---

## 4. Instalación y Ejecución Local

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/iamblanquet/TESTBOTI-O.git agrok-system
cd agrok-system
```

### Paso 2: Instalar Dependencias
Puedes instalar todas las dependencias con el script orquestador:
```bash
npm run render-build
```
*O manualmente en cada carpeta:*
```bash
# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### Paso 3: Configurar Variables de Entorno
Crea un archivo `.env` dentro de la carpeta `backend/`:
```env
PORT=3001
NODE_ENV=development
TELEGRAM_BOT_TOKEN=TU_TOKEN_DE_BOTFATHER
WEBAPP_URL=http://localhost:5173
```

### Paso 4: Ejecutar en Desarrollo
Abre dos terminales:

**Terminal 1 (Backend API):**
```bash
cd backend
npm start
# Se iniciará en http://localhost:3001
```

**Terminal 2 (Frontend Mini App):**
```bash
cd frontend
npm run dev -- --host
# Se iniciará en http://localhost:5173
```

---

## 5. Configuración del Bot de Telegram en @BotFather

Para que Telegram reconozca la **Mini App** con el botón oficial y permita abrirla en pantalla completa:

1. Abre Telegram y busca **[@BotFather](https://t.me/BotFather)**.
2. Crea tu bot con el comando `/newbot`, asígnale un nombre (ej: `AGROK Sistema de Campo`) y un username (ej: `AgrokCampoBot`).
3. Guarda el **Token HTTP API** entregado por BotFather.
4. **Configurar el Botón de Menú Oficial de la Mini App:**
   - Envía a BotFather: `/setmenubutton`
   - Selecciona tu bot.
   - Ingresa la URL HTTPS de tu app (ej: `https://tu-app.onrender.com`).
   - Asigna el texto del botón: `🌾 AGROK Mini App`.
5. **Configurar como Web App (/newapp):**
   - Envía a BotFather: `/newapp`
   - Selecciona tu bot.
   - Título: `AGROK Sistema de Campo`.
   - Descripción: `Reportes de campo offline-first, tableros y control de maquinaria`.
   - Envía una imagen de 640x360 px para la portada de la Mini App.
   - URL de la Web App: `https://tu-app.onrender.com`.
   - Short Name: `app` (te dará el link directo `t.me/TuBot/app`).
6. **Desactivar Modo Privacidad para Grupos:**
   - Envía a BotFather: `/setprivacy` -> Selecciona tu bot -> Elige **`Disable`**.
   *(Esto permite que el bot lea los reportes diarios pegados en los temas del supergrupo).*
7. **Registrar Comandos Rápidos:**
   - Envía a BotFather: `/setcommands` y pega el siguiente bloque:
```text
start - Iniciar y abrir la Mini App
reporte - Enviar reporte diario de obra
sin_actividad - Registrar día de lluvia o descanso
incidencia - Registrar problema o falla mecánica
cerrar - Cerrar incidencia con causa raíz obligatoria
horometro - Registrar horómetro y combustible de máquina
tablero - Ver los 4 widgets del día
avance - Consultar avance de hectáreas por obra
hoy - Obras que reportaron hoy y pendientes
ayuda - Guía de comandos
```

---

## 6. Despliegue en Producción en Render

El proyecto está preparado para desplegarse con 1 solo clic en [Render.com](https://render.com/):

### Paso 1: Crear el Servicio Web en Render
1. Inicia sesión en **Render Dashboard** y haz clic en **New +** ➔ **Web Service**.
2. Conecta tu repositorio de GitHub (`TESTBOTI-O` o tu fork).
3. Configura los siguientes parámetros exactos:
   - **Name:** `agrok-campo` (o el nombre que elijas)
   - **Region:** `Oregon (US West)` o la más cercana a tus usuarios
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm run render-build`
   - **Start Command:** `npm run render-start`
   - **Plan:** `Free` (o Starter)

### Paso 2: Variables de Entorno en Render
En la pestaña **Environment** del servicio en Render, agrega:

| Variable | Valor de Ejemplo | Descripción |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Activa compresión y modo Webhook |
| `PORT` | `10000` | Puerto asignado por Render (o 3001) |
| `TELEGRAM_BOT_TOKEN` | `789123456:AAFlk...` | Tu token de @BotFather |
| `RENDER_EXTERNAL_URL`| `https://tu-servicio.onrender.com` | URL pública HTTPS de tu servicio en Render |
| `WEBAPP_URL` | `https://tu-servicio.onrender.com` | URL que abrirá la Mini App |

### Paso 3: Despliegue Automático
Haz clic en **Create Web Service**. Render ejecutará:
1. `npm install` de frontend y backend.
2. `vite build` para empaquetar el frontend optimizado en `frontend/dist/`.
3. Iniciar `backend/server.js`, el cual conectará automáticamente el **Webhook de Telegram** con la URL HTTPS generada.

---

## 7. Aislamiento Estricto de Roles y Accesos

El sistema implementa una barrera estricta por rol en el frontend (`frontend/src/App.jsx`): **un usuario nunca ve pestañas, enlaces ni herramientas de otros roles**.

### Perfiles y Credenciales Semilla:

| Rol | Usuario | Contraseña | Pantalla Única Visible |
| :--- | :--- | :--- | :--- |
| 🛠️ **Campo (Operador)** | `operador` | `campo123` | **Exclusivamente Captura Offline-First:** Selección de Proyecto -> Hito -> Tarea, fuerza de trabajo, avance en hectáreas o día sin actividad, horómetro y sincronización de cola local. |
| 👷 **Supervisor (Gerente)** | `supervisor` | `super123` | **Exclusivamente Tablero Operativo:** Los 4 widgets canónicos, gestor de hitos y tareas, resolución de incidencias con Causa Raíz obligatoria, maquinaria y materiales. |
| 📊 **Dirección (Líder)** | `direccion` | `lider123` | **Exclusivamente Dashboard Ejecutivo:** KPIs globales del ciclo agrícola (`Maíz 2026`), avance acumulado contra metas y comparativa oficial de vuelos de dron. |
| 💻 **Admin (IT / Sistema)**| `admin` | `admin123` | **Exclusivamente Consola de Administración:** Gestión de usuarios (roles, permisos, reset de contraseñas), monitoreo del Bot y auditoría de la base de datos. |

---

## 8. Lógica de Negocio Canónica (docs/)

El sistema sigue al 100% las reglas de negocio descritas en los documentos técnicos:

1. **Los 4 Widgets Canónicos del Tablero (`docs/3 §5`):**
   - **Obras sin reporte hoy:** Lista de obras en estado `operacion` que no han enviado reporte hoy, ordenadas por días transcurridos.
   - **Avance contra meta:** Comparativa de hectáreas reportadas por campo (`fuente = campo`) vs última medición oficial de dron (`medicion.hectareas`) vs meta fijada por Dirección (`proyecto.superficie_meta_ha`).
   - **Incidencias abiertas:** Folios secuenciales (`F-14`, `F-15`) con días abiertas. **Regla de oro: Ninguna incidencia pasa a `cerrada` sin capturar el texto de la Causa Raíz.**
   - **Bloqueado por material:** Insumos donde `requerido - en_sitio > 0`, mostrando cantidad pedida y fecha estimada de llegada (ETA).
2. **Catálogo de los 17 Predios Canónicos (`docs/5`):**
   - `San Alberto` (11.04 ha), `San Luis` (16.03 ha), `Los Mangos` (12.47 ha), `Guayeme` (37.67 ha), `Rach` (1.83 ha), `Cristina` (5.51 ha), `La Asunción` (146.48 ha), `San Pedro` (180.41 ha), `Santa Teresita` (518 ha), `Arceo` (528 ha), `Xpicob` (5.37 ha), `Zavala` (49.37 ha), `Trece` (24.86 ha), `María` (0.32 ha), `Vivero Sembrando Vida` (0.16 ha), `Parque Jabin`, `Potrero Yeguas`.
3. **Maquinaria y Mantenimiento Preventivo:**
   - Control de horómetros con cálculo automático de horas trabajadas y consumo de diésel.
   - Alerta preventiva cuando el horómetro está a `≤ 20 horas` de alcanzar el umbral de servicio (300 horas para el tractor CASE Puma).
4. **Soporte Offline-First:**
   - Si no hay señal en el predio, el reporte se guarda en la memoria local del teléfono (`LocalStorage` / `IndexedDB`) con un UUID único y fecha inmutable.
   - Al reconectarse a Internet o abrir la Mini App con datos, el sistema sincroniza automáticamente la cola en lotes mediante `POST /api/reports/sync`.

---

## 9. Solución de Problemas Comunes (Troubleshooting)

### Error 409 Conflict: terminated by other getUpdates request
- **Causa:** Hay dos procesos intentando hacer *long-polling* con el mismo token a la vez (por ejemplo, tu terminal local y Render simultáneamente).
- **Solución:** En producción (Render), el código ya activa automáticamente el modo **Webhook** (`bot.setWebHook`), eliminando este problema. Si estás desarrollando en local, asegúrate de no tener dos terminales ejecutando `node server.js` al mismo tiempo.

### La Mini App no carga o se ve en blanco dentro de Telegram
1. **Verificar Cabeceras CSP:** Express debe incluir `frame-ancestors 'self' https://web.telegram.org https://*.telegram.org telegram:;` (ya configurado en `server.js`).
2. **Suspención por inactividad en Render Free:** Si usas el plan gratuito de Render, el servidor se "duerme" tras 15 minutos sin peticiones. La primera carga puede demorar ~45 segundos en encender el contenedor.

### Probar el Modo Offline sin estar en el campo
- Dentro de la Mini App en el rol **Campo**, presiona el botón **`Simular Sin Señal`** en la esquina superior. La app entrará en modo desconectado, guardará los reportes en la cola local y te permitirá ver cómo se sincronizan automáticamente al desactivar la simulación.

---

## 📦 Enlaces del Proyecto
- **Repositorio Oficial en GitHub:** [https://github.com/iamblanquet/TESTBOTI-O](https://github.com/iamblanquet/TESTBOTI-O)
- **Despliegue en Render:** `https://testboti-o.onrender.com`
