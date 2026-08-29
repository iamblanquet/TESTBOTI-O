# 📋 Prompt Maestro para Crear un Sistema de Campo, Telegram Mini App y Tableros

Usa el siguiente prompt completo como instrucción inicial para cualquier agente de IA (como Antigravity, Claude, ChatGPT o Cursor) para construir este ecosistema desde cero:

```markdown
Actúa como un Arquitecto de Software Full-Stack y Desarrollador Senior especializado en aplicaciones móviles Offline-First, Telegram Mini Apps (TMA) y sistemas de gestión de operaciones de campo (ERP/Agrotech).

Tu objetivo es construir desde cero un sistema completo e integral llamado **"Sistema de Operación de Campo y Tablero de Control"** bajo el patrón TESA (Telegram Entry, Standalone API, Offline Storage).

---

### 1. STACK TECNOLÓGICO OBLIGATORIO
- **Frontend / Mini App / PWA:**
  - React 18 con Vite.
  - Tailwind CSS para diseño moderno, mobile-first y ergonómico.
  - Lucide React para iconografía.
  - SDK de Telegram (`https://telegram.org/js/telegram-web-app.js`) integrado.
  - Service Worker (`sw.js`) y `manifest.json` para funcionamiento 100% PWA Offline-First.
- **Backend / API / Bot:**
  - Node.js con Express.
  - Base de datos relacional SQLite (usando `sqlite3` con promesas async/await).
  - Bot de Telegram usando `node-telegram-bot-api` configurado en modo **WEBHOOK HTTPS en producción** (para evitar colisiones `409 Conflict`) y polling automático en desarrollo local.
  - Cabeceras de seguridad CSP: `Content-Security-Policy: frame-ancestors 'self' https://web.telegram.org https://*.telegram.org telegram:;` y eliminación de `X-Frame-Options` para permitir la incrustación oficial en Telegram Web y Desktop.
- **Despliegue:**
  - Scripts en `package.json` raíz (`render-build` y `render-start`) preparados para despliegue en Render, Railway o VPS con un solo clic.

---

### 2. ARQUITECTURA DE DATOS Y JERARQUÍA OPERATIVA
Implementa una base de datos SQLite con las siguientes entidades canónicas y relaciones:
1. `usuario`: `id`, `username`, `password_hash`, `nombre`, `rol` ('campo', 'supervisor', 'direccion', 'it'), `tg_user_id`, `tg_chat_id`, permisos booleanos, `activo`.
2. `proyecto`: `id`, `nombre`, `tipo` (maiz, papaya, etc.), `ciclo`, `superficie_meta_ha`, `fase_catalogo`, `gerente_id`, fechas.
3. `hito`: `id`, `proyecto_id`, `nombre`, `descripcion`, `orden`, `fecha_meta`, `superficie_meta_ha`, `estado`.
4. `tarea`: `id`, `hito_id`, `proyecto_id`, `predio_id`, `nombre`, `actividad_id`, `unidad`, `cantidad_meta`, `cantidad_acumulada`, `estado`, `responsable`.
5. `predio`: Catálogo de predios con `id`, `nombre`, `superficie_legal_ha`, `superficie_util_ha`, `regimen`, `poligono_geojson`.
6. `obra`: `id`, `nombre`, `proyecto_id`, `fase_actual`, `estado` ('prospeccion', 'habilitacion', 'operacion', 'mantenimiento', 'standby', 'cerrada'), `tg_thread_id`.
7. `obra_predio`: Relación muchos a muchos entre obras y predios.
8. `reporte`: `id`, `client_uuid`, `proyecto_id`, `hito_id`, `tarea_id`, `obra_id`, `recibido_en`, `fecha_operativa`, `autor_nombre`, `texto_original`, `nota`, `estado` ('borrador', 'confirmado', 'corregido'), `es_sin_actividad`, `motivo_sin_actividad`.
9. `reporte_linea`: Líneas de trabajo con `predio_id`, `actividad_id`, `cantidad`, `unidad`, `cantidad_ha` (normalizada a hectáreas), `fuente` ('campo', 'dron', 'topografia').
10. `reporte_cuadrilla`: Fuerza de trabajo con `rol_id` (operador_tractor, lider, tecnico, auxiliar) y `headcount`.
11. `maquina` y `lectura_maquina`: Control de horómetros con `horometro_inicio`, `horometro_fin`, `horas_trabajadas`, `litros` de combustible, y alerta de mantenimiento cada 300 horas.
12. `incidencia` y `incidencia_evento`: Folio secuencial (`F-14`), `tipo`, `obra_id`, `estado` ('abierta', 'diagnostico', 'reparacion', 'verificacion', 'cerrada'), `abierta_en`, `cerrada_en`, y **campo obligatorio `causa_raiz` para poder pasar a cerrada**.
13. `material`: Insumos por obra con `requerido`, `en_sitio`, `pedido`, `unidad`, `eta` (fecha estimada).
14. `medicion`: Mediciones oficiales de dron o topografía (`hectareas`, `fecha`, `archivo_file_id`) para comparar contra lo reportado por campo.
15. `telegram_subscribers` y `system_settings`: Registro de usuarios del bot y configuración de tokens.

---

### 3. AISLAMIENTO ESTRICTO DE ROLES POR LOGIN (ZERO UI LEAKAGE)
La aplicación debe tener una pantalla de Login inicial con acceso directo de 1 solo toque para pruebas/móvil y formulario de credenciales. **Al autenticarse, cada rol entra a una pantalla exclusiva SIN pestañas ni herramientas de otros roles**:

1. 🛠️ **Rol Campo (Operador):**
   - Interfaz mobile-first de captura de reporte diario.
   - Selector en cascada: **Proyecto ➔ Hito ➔ Tarea**. Muestra meta vs acumulado.
   - Contador dinámico de fuerza de trabajo (headcount de operadores y auxiliares).
   - Captura de avance en hectáreas o selector de **Día Sin Actividad** (`lluvia`, `sin_material`, `sin_cuadrilla`, `sin_maquina`, `descanso`).
   - Captura de horómetro de maquinaria y consumo de diésel.
   - Soporte **100% Offline-First**: si no hay señal, guarda el reporte en `LocalStorage` con UUID único. Al volver la señal, sincroniza automáticamente mediante `POST /api/reports/sync`.
   - Botón interactivo para "Simular Modo Sin Señal".
   - **PROHIBIDO:** No debe ver tableros de gerencia, dirección ni administración.

2. 👷 **Rol Supervisor (Gerente de Obra):**
   - **Tablero Operativo de los 4 Widgets Canónicos:**
     1. *Obras sin reporte hoy:* Obras en operación que no han reportado hoy, con cálculo de días de atraso.
     2. *Avance contra meta:* Comparativa de hectáreas de campo vs medición oficial dron vs meta del proyecto.
     3. *Incidencias abiertas:* Lista de folios con días transcurridos y modal de resolución (**Regla no negociable: Exige captura obligatoria de Causa Raíz para cerrar**).
     4. *Bloqueado por material:* Insumos donde `requerido - en_sitio > 0` con cantidad pedida y fecha ETA.
   - **Gestor de Hitos y Tareas:** Crear hitos del proyecto, desglosar tareas, asignar metas en hectáreas y operadores responsables con barras de progreso en tiempo real.
   - **Maquinaria y Horómetros:** Monitor de horómetros con alerta visual cuando falten `≤ 20 horas` para el servicio preventivo de 300 hrs.

3. 📊 **Rol Dirección (Líder / Ejecutivo):**
   - Dashboard Ejecutivo con KPIs globales del ciclo agrícola.
   - Avance consolidado de hectáreas por proyecto y comparativa entre avance de campo y vuelos de dron.
   - Resumen ejecutivo del tablero.

4. 💻 **Rol Admin (IT / Sistema):**
   - Consola Web de Administración: Gestión de usuarios (alta, cambio de roles, reseteo de contraseñas y permisos de proyectos).
   - Catálogo maestro de obras y predios.
   - Auditoría de reportes en vivo.
   - Configuración y estado del Bot de Telegram.

---

### 4. TELEGRAM BOT & MINI APP INTEGRATION
1. **Configuración de Mini App:**
   - La aplicación web debe incluir el SDK de Telegram y ejecutar `Telegram.WebApp.ready()` y `Telegram.WebApp.expand()` al iniciar.
   - Ajustar el color de barra de Telegram al tema verde corporativo (`#064e3b`).
   - Detección automática del usuario de Telegram (`initDataUnsafe.user`) con respuesta háptica (`HapticFeedback`).
2. **Menú de Chat y Lanzadores:**
   - Al ejecutar `/start` o `/menu`, el bot debe configurar el botón de menú oficial (`setChatMenuButton`) con la URL de la Mini App.
   - Enviar un botón inline destacado: `[ 🌾 ABRIR MINI APP ]`.
   - Desplegar un teclado persistente en el chat (`ReplyKeyboardMarkup`) con:
     `[ 🌾 ABRIR MINI APP ]`  
     `[ 📊 Tablero Hoy ]  [ ⚠️ Incidencias ]`  
     `[ 🚜 Horómetro ]    [ 🌧️ Sin Actividad ]`
3. **Parser de Lenguaje Natural para Reportes:**
   - Si un usuario pega en el chat un reporte diario en texto (formato: `*Obra:* ... *Fecha:* ... *Fuerza de trabajo:* ... *Operacion actual:* ... Se han sembrado 6.5 ha...`), el backend debe parsear automáticamente cuadrilla, actividades y hectáreas, guardarlo en la base de datos y responder con un mensaje de confirmación formateado.
4. **Comandos Rápidos:**
   - `/sin_actividad [motivo]`
   - `/incidencia [tipo] [descripcion]`
   - `/cerrar [folio] [causa_raiz]`
   - `/horometro [maquina] [inicio] [fin] [litros]`
   - `/tablero`, `/avance`, `/hoy`.

---

### 5. PREPARACIÓN PARA DESPLIEGUE EN PRODUCCIÓN
- Estructurar el proyecto con un `package.json` raíz que contenga:
  - `"render-build": "npm install --prefix frontend --include=dev && npm run build --prefix frontend && npm install --prefix backend"`
  - `"render-start": "npm start --prefix backend"`
- El backend en `server.js` debe servir los archivos estáticos de `frontend/dist/` en producción.
- Incluir un endpoint `/health` y `/api/health` para verificaciones de estado activo.
- Generar un archivo `.env.example` con las variables requeridas: `PORT`, `NODE_ENV`, `TELEGRAM_BOT_TOKEN`, `RENDER_EXTERNAL_URL`, `WEBAPP_URL`.
- Incluir una guía completa de replicación en `GUIA_REPLICACION.md`.

Construye todo el código de manera modular, limpia, funcional (sin datos mock hardcodeados que bloqueen el flujo) y listo para producción.
```
