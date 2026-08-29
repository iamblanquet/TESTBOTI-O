---
type: propuesta
status: idea
created: 2026-08-28
entity: AGROK
author:
audiencia: Julio Silva (IT), Karen García
---

# 2 — Telegram

Telegram es la entrada del sistema. Todo dato operativo nace aquí; nada se captura en otro lado.

## 1. Estructura

| Objeto | Nombre | Quién escribe | Permisos del bot |
|---|---|---|---|
| Supergrupo en modo foro | `AGROK · Operación` | Todo el equipo de campo, gerencia, Dirección | Admin: gestionar temas, fijar mensajes, leer todos los mensajes (privacy mode off) |
| Tema por obra activa | `#Guayeme · Maíz`, `#Sta Teresita · Desmonte`, `#Clúster Mangos · Siembra`, `#San Alberto · Maíz`, … | La cuadrilla de esa obra | El bot deduce `obra_id` de `message_thread_id` |
| Tema `#Maquinaria` | | Operadores, Beche | `/horometro`, avisos de servicio |
| Tema `#Incidencias` | | Solo el bot escribe; los demás responden | Una copia de cada incidencia con folio |
| Tema `#Compras y material` | | Karen, Itzayana, Dirección | `/material`, y lo que el bot lee de aprobaciones |
| Tema `#General` | | Todos | Sin comandos |
| Canal | `AGROK · Tablero` | Solo el bot | Publicar y editar mensajes propios, fijar |

Alta de obra: `/obra_nueva` (solo `gerencia`, `it`) crea el tema, el registro en `obra` con `tg_thread_id`, y pide proyecto y predios por teclado. Cierre: `/obra_cerrar` archiva el tema y pone `estado = cerrada`.

Jabin y Potrero Yeguas se crean como temas solo si Dirección los mete al alcance.

## 2. El reporte diario

El campo pega el mismo bloque que usa desde el 11 de mayo. El bot lo acepta con o sin `/reporte` delante si viene en un tema de obra y contiene al menos una cabecera reconocida.

```
*Obra:* Cristina, Rach, los mangos        ← se ignora si estás en un tema; si no, se busca por alias
*Fecha:* 20/08/2026                       ← pista de fecha operativa; manda message.date salvo ±1 día (§6)

*Fuerza de trabajo :*
- Operador de tractor
- Técnico
- 2 auxiliares

*Operacion actual:*
- Carga de fertilizante de la bodega San Alberto hacia el predio.
- Siembra del predio
- Limpieza de discos del tractor

Se han sembrado un aproximado de 6.5 ha del predio cristina,
7 ha del predio rach y 8 ha del predio los mangos.
```

### Parser

| Bloque | Cabeceras aceptadas (sin distinguir mayúsculas, tildes ni asteriscos) | Regla |
|---|---|---|
| Obra | `Obra` | Solo se usa fuera de tema. Match contra `obra.nombre` y `obra.alias`; si hay varias o ninguna, teclado |
| Fecha | `Fecha`, `Hora` | No se usa como fecha del registro. Se usa como pista de `fecha_operativa`: si está a ±1 día de `message.date`, manda la escrita (cubre el reporte escrito sin señal y enviado después de medianoche); si difiere más, se ignora y se marca para revisión (cubre las fechas mal escritas del corpus) |
| Cuadrilla | `Fuerza de trabajo`, `Cuadrilla`, `Cuadrilla posteo`, `Cuadrilla retro` | Cada viñeta: `^[-•*]?\s*(\d+)?\s*(.+?)\s*(?:[x×]\s*(\d+))?$`. Número al inicio o al final = headcount; sin número = 1. El rol se busca en `rol` por alias (`auxiliares generales` → `auxiliar`) |
| Actividades | `Operación actual`, `Operacion actual`, `Actividades`, `Actividades realizadas`, `Operación anterior` (se guarda con marca `anterior`) | Cada viñeta es una `reporte_linea`. `actividad_id` por diccionario de palabras clave (`rastre` → rastreo, `siembr`/`sembr` → siembra, `fumig` → fumigacion, `despalm` → despalme, …). Sin match → `otro` y se marca para revisión |
| Avance | `Avance`, `Avance diario`, `Avance aprox`, `Área ejecutada`, `Área semanal acumulada`, y también prosa libre al final | Regex por ocurrencia: `(\d+[.,]?\d*)\s*(ha|hectáreas?|has|m2|m²|ml|metros lineales|%)`. Predio: el nombre más cercano antes de la cifra, por alias; si la obra tiene un solo predio, ese. Si no se resuelve, teclado por línea |
| Horómetro | `Horometro anterior`, `Horometro actual`, `Diesel`, `Litros` | Si aparecen, además del reporte se crea `lectura_maquina`; máquina por teclado si no se infiere |
| Nota | `Nota`, `NOTA`, y todo lo que no cayó en otra cabecera | Se guarda íntegro en `reporte.nota` |
| Equipo fijo | `Reporte de la veleta`, `Bomba`, `Estado de la bomba` | `lectura_activo` con estado por palabras clave (`funciona`, `correcta` → ok; `alerta` → alerta; `falla`, `no funciona` → falla) |

Adjuntos: fotos y videos del mismo `from.id` en el mismo tema dentro de los 10 minutos siguientes al reporte, o enviados como reply al mensaje del bot, se ligan al reporte por `file_id`. No se descargan al recibirlos; se descargan al consultarlos.

### Confirmación

El bot responde en el tema, como reply al mensaje del reporte:

```
✅ Reporte · Clúster Mangos · 20/08 20:52 · Abner
Cuadrilla: operador de tractor 1 · técnico 1 · auxiliar 2
Actividades: acarreo · siembra · siembra · mantenimiento de maquinaria
Avance: Cristina 6.5 ha · Rach 7 ha · Los Mangos 8 ha (siembra)
Adjuntos: 9
Sin clasificar: —
[ Confirmar ]  [ Corregir ]
```

`Confirmar` → `estado = confirmado`. `Corregir` → el bot pide qué línea; o el usuario responde al mensaje del bot con el texto corregido y el bot reprocesa **el mismo reporte** (`estado = corregido`), nunca crea otro. Segundo reporte de la misma obra el mismo día: el bot pregunta `[ Agregar ] [ Reemplazar ]`.

Sin confirmación en 30 minutos → se confirma solo con marca `auto`.

## 3. Comandos

### Captura

| Comando | Quién | Entrada | Salida | Escribe |
|---|---|---|---|---|
| `/reporte` | campo | El bloque pegado en el siguiente mensaje o en el mismo | Confirmación de arriba | `reporte`, `reporte_linea`, `reporte_cuadrilla`, y `lectura_*` si aplica |
| `/sin_actividad` | campo | Teclado de motivo | "Sin actividad · Guayeme · 03/07 · lluvia" | `reporte` con `estado=confirmado`, sin líneas, `nota = motivo` |
| `/incidencia` | campo | Teclado de tipo → texto libre → foto opcional | "F-14 abierta · Falla mecánica · Bulldozer D6 · Desmonte Sta Teresita", copiada a `#Incidencias` | `incidencia`, `incidencia_evento` |
| reply a un mensaje de incidencia | campo | Texto y foto | Evento agregado a la misma incidencia | `incidencia_evento` |
| `/cerrar F-14` | supervisor, gerencia | Texto de causa raíz (obligatorio) | "F-14 cerrada · 43 días · causa: …" | `incidencia.estado=cerrada` |
| `/verificar F-14` | supervisor, gerencia | nada | Pasa a `verificacion`; el bot vuelve a preguntar a los 7 días | `incidencia.estado` |
| `/horometro` | campo | Teclado de máquina → inicio → fin → litros → foto | "Puma · 1,280.5 → 1,288.2 · 7.7 h · 60 L · faltan 12 h para servicio" | `lectura_maquina` |
| `/material` | gerencia, campo | Insumo → requerido → en sitio → pedido → fecha (o "sin fecha") | "Varengas · 90 req · 40 en sitio · 50 pedidas · sin fecha", y publica en Tablero si `requerido - en_sitio > 0` | `material` |
| `/medicion` | gerencia, supervisor con permiso | Predio (teclado) → hectáreas → archivo | "Medición dron · Sta Teresita · 12.3 ha · 14/07 · cifra oficial" | `medicion` |

**Forma corta, para escribir sin señal.** Cada comando de captura acepta todos sus campos en una línea; el bot solo abre teclado para lo que falte, y solo cuando el mensaje llega.

```
/sin_actividad lluvia
/incidencia falla_mecanica Bulldozer se sobrecalienta, mecánicos revisaron sin éxito
/cerrar F-14 manguera hidráulica de mala calidad, se cambió por una con malla de acero
/horometro Puma 1280.5 1288.2 60
/material varengas 90 40 50 sin_fecha
/medicion Teresita 12.3
```

### Consulta

| Comando | Devuelve |
|---|---|
| `/avance` en tema, `/avance <obra>` fuera | Por predio: ha acumuladas (campo) · última medición (oficial) · meta · falta |
| `/pendientes` en tema o global | Incidencias abiertas: folio, tipo, días, estado |
| `/maquina <nombre>` | Última lectura, horas al servicio, litros últimos 7 días |
| `/material` sin argumentos | Lo que falta por obra |
| `/hoy` | Obras que reportaron, obras sin reporte, sin actividad con motivo |

### Administración

| Comando | Quién |
|---|---|
| `/obra_nueva`, `/obra_cerrar`, `/obra_predios` | gerencia, it |
| `/catalogo actividad|rol|incidencia` | it |
| `/usuarios` | it |

## 4. Avisos del bot

| Cuándo | Dónde | Texto | Condición |
|---|---|---|---|
| 21:00 diario | tema de la obra | "Hoy no hay reporte de esta obra. `/reporte` o `/sin_actividad`." | Obra `estado=operacion` sin `reporte` de hoy |
| 21:30 diario | canal Tablero | Estado del día (sección 5) | Siempre; edita el mensaje fijado |
| Al registrar horómetro | `#Maquinaria` | "Puma a 12 h del servicio" | `umbral - acumulado ≤ 20` |
| Diario 08:00 | `#Incidencias` | "F-14 lleva 7 días en verificación" | `estado=verificacion` y 7 días |
| Diario 08:00 | tema del predio | "La veleta de Jabin no se revisa desde el 01/04" | `activo` sin `lectura_activo` en `umbral_dias` |
| Al registrar material | canal Tablero | "Cercado Potrero: faltan 50 varengas, sin fecha" | `requerido - en_sitio > 0` |

## 5. El mensaje fijado del Tablero

Un solo mensaje, editado cada día a las 21:30 y cada vez que cambia una incidencia o un material bloqueante:

```
AGROK · 28/08 · 21:30

SIN REPORTE HOY
  Sta Teresita · Desmonte   3 días
  San Alberto · Maíz        7 días

AVANCE
  Guayeme · Maíz        40.0 ha sembradas · 15 ha fumigadas
  Clúster Mangos        Cristina 6.5 · Rach 7 · Los Mangos 8
  Sta Teresita          12.3 ha desmontadas (dron 14/07) · campo dice 16

INCIDENCIAS ABIERTAS
  F-14  Bulldozer D6 sobrecalienta     43 días  verificación
  F-21  Cogollero L1 Guayeme            3 días  tratada

BLOQUEADO POR MATERIAL
  Cercado Potrero   varengas 50 · postes 20 · sin fecha
```

## 6. Sin señal

Hecho de partida: los reportes del corpus llegan entre 19:00 y 23:00, no desde el surco. El campo ya escribe sin señal y manda cuando la tiene. El sistema respeta eso; no exige conectividad en el momento de capturar.

| Situación | Qué pasa | Regla del sistema |
|---|---|---|
| Se escribe el reporte sin señal | Telegram lo guarda en cola en el teléfono y lo envía solo al reconectar, fotos incluidas. Funciona en 2G | Ninguna acción del usuario |
| Llega a las 23:40 o después de medianoche | `message.date` es la hora de llegada, no la de escritura | `fecha_operativa` se calcula: si el bloque trae `Fecha:` y está a ±1 día de `message.date`, se usa la escrita; si no, el día de `message.date`. Si llega entre 00:00 y 06:00 sin `Fecha:`, el bot pregunta `[ Es de hoy ] [ Es de ayer ]` |
| La confirmación del bot llega horas después | El bot responde cuando recibe; el usuario ve la confirmación al conectarse | El plazo de 30 minutos para autoconfirmar corre desde la recepción, no desde la escritura |
| Comando con teclado sin señal | Los teclados inline no funcionan offline | **Todo comando acepta forma corta en una línea** (sección 3). El teclado es comodidad con señal, nunca requisito |
| Fotos y videos pesados | Telegram comprime fotos por defecto y las manda en cola | Enviar como foto, no como archivo. Los videos se mandan cuando haya Wi-Fi; el reporte no los espera |
| Aviso de "sin reporte" antes de que la cuadrilla vuelva | Falso positivo si el aviso es temprano | El corte es a las **21:00**, no a las 21:00. El día operativo cierra a las 06:00 del siguiente. Ajustable por obra |
| Predio sin cobertura ni de noche | El reporte sale desde la base de Uayamón o desde casa | Se registra en el catálogo (archivo 5, cobertura por predio). Si una obra reporta siempre con retraso de horas, es esperado, no una falla |

Lo que no se resuelve con software: si un predio no tiene cobertura y la cuadrilla no pasa por un punto con señal en todo el día, el dato llega al día siguiente. Una antena o un enlace satelital en la base de Uayamón, donde se resguarda la maquinaria, cubriría la ventana de envío de la noche para todas las obras. Es decisión de Dirección, no del sistema.

## 7. Fuera de alcance

- Conversación libre del tema: acuses, coordinación, fotos sueltas. El bot no la toca.
- Aprobaciones de compra: el bot las lee (archivo 3) y las publica; nunca las crea ni las cambia.
- Mini App de Telegram para `/material` y `/avance` con formulario: fase 3.

## Relacionado
[[0 — Léeme]] · [[1 — Modelo de datos]] · [[3 — Backend y escritorio]] · [[4 — Plan y responsables]]
