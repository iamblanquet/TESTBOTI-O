# 🌾 AGROK · Sistema de Campo (Spec v2)

Sistema integral desarrollado e implementado a partir de la especificación técnica en `docs/`:

## 📋 Tabla de Contenidos

- [Características Principales](#características-principales)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Instalación y Desarrollo](#instalación-y-desarrollo)
- [Despliegue en Producción](#despliegue-en-producción)
- [Configuración](#configuración)
- [Scripts Disponibles](#scripts-disponibles)
- [Seguridad](#seguridad)
- [Mantenimiento](#mantenimiento)

## ✨ Características Principales

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

### Requisitos Previos
- Node.js (v16 o superior)
- npm o yarn
- Git

### Instalación Rápida
Haz doble clic en el archivo:
```bash
start.bat
```

### Opción 2: Ejecutar manualmente desde la terminal

**Terminal 1 (Backend):**
```bash
cd backend
npm install
cp .env.example .env  # Copia el archivo de configuración
# Edita .env y agrega tu TELEGRAM_BOT_TOKEN si lo tienes
npm start
```
*Servidor corriendo en: `http://localhost:3001`*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev -- --host
```
*Aplicación corriendo en: `http://localhost:5173`*

## ⚙️ Configuración

### Variables de Entorno (Backend)

Crea un archivo `.env` en la carpeta `backend/` basándote en `.env.example`:

```env
# Servidor
NODE_ENV=development
PORT=3001

# Bot de Telegram (opcional)
TELEGRAM_BOT_TOKEN=tu_token_aqui

# URL de la webapp para Telegram Mini App
WEBAPP_URL=http://localhost:5173
```

### Configuración de Desarrollo

1. **Base de Datos**: Se crea automáticamente en `backend/database.sqlite`
2. **Usuario por defecto**: 
   - Usuario: `admin`
   - Contraseña: `admin123`
   - Rol: IT (acceso completo)

## 📦 Scripts Disponibles

### Backend

```bash
npm start              # Iniciar servidor en producción
npm run dev            # Modo desarrollo con hot-reload
npm run backup         # Crear backup de la base de datos
npm run backup:list    # Listar backups disponibles
npm run backup:restore # Restaurar un backup
npm test               # Ejecutar todos los tests
npm run test:parser    # Ejecutar solo tests del parser
npm run test:validators # Ejecutar solo tests de validadores
```

### Frontend

```bash
npm run dev            # Servidor de desarrollo
npm run build          # Compilar para producción
npm run preview        # Preview del build de producción
```

## 🧪 Testing

El proyecto incluye tests unitarios para las funciones críticas:

### Ejecutar Tests

```bash
cd backend
npm test
```

### Cobertura de Tests

- **Parser de Reportes**: Valida parseo de texto, detección de obras, predios, cuadrilla, avances
- **Validadores**: Valida entrada de usuarios, sanitización, validación de datos

### Estructura de Tests

```
backend/tests/
├── parser.test.js       # Tests del parser de reportes
├── validators.test.js   # Tests de validadores de entrada
└── run-all-tests.js     # Runner principal
```

Los tests verifican:
- ✅ Parseo correcto de reportes en diferentes formatos
- ✅ Manejo de casos edge (texto vacío, muy largo, inválido)
- ✅ Validación de entrada de usuarios
- ✅ Sanitización contra XSS y SQL injection
- ✅ Cálculo correcto de fechas operativas
- ✅ Detección de predios por alias
- ✅ Parseo de diferentes unidades (ha, m2, ml)


## 🔒 Seguridad

### Mejoras Implementadas

1. **Validación de Entrada**: Todos los inputs del usuario son sanitizados
2. **Prevención de SQL Injection**: Uso de prepared statements
3. **Hashing de Contraseñas**: SHA-256 para almacenamiento seguro
4. **Límites de Tamaño**: Protección contra payloads grandes
5. **Error Handling**: No se exponen detalles internos en producción

### Recomendaciones para Producción

1. Cambiar todas las contraseñas por defecto
2. Configurar variables de entorno seguras
3. Usar HTTPS en producción
4. Implementar rate limiting en la API
5. Configurar backups automáticos
6. Implementar JWT real para autenticación

## 🛠️ Mantenimiento

### Backups de Base de Datos

```bash
# Crear backup manual
cd backend
npm run backup

# Listar backups
npm run backup:list

# Restaurar backup
npm run backup:restore nombre-del-backup.sqlite
```

Los backups se guardan en `backend/backups/` y automáticamente se mantienen solo los últimos 10.

### Logs y Monitoreo

- Los logs del servidor se muestran en la consola
- Errores críticos se registran en la consola con stack trace (desarrollo)
- En producción, considera usar un servicio de logging como Winston o Pino

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
