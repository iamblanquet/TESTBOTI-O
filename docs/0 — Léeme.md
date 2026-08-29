---
type: propuesta
status: idea
created: 2026-08-28
entity: AGROK
author:
audiencia: Julio Silva (IT), Karen García
---

# Sistema de campo AGROK · spec v2

Especificación de trabajo. El porqué de cada decisión está en la v1 (`dashboard propuesta/`); aquí solo qué se construye, quién lo hace y en qué orden. La propuesta sigue siendo plástica salvo lo marcado como decidido.

## Qué lee cada quien

| Archivo | Julio | Karen | Luis |
|---|---|---|---|
| [[1 — Modelo de datos]] | ✔ | | ✔ |
| [[2 — Telegram]] | ✔ | §2 y §3 | ✔ |
| [[3 — Backend y escritorio]] | ✔ | | ✔ |
| [[4 — Plan y responsables]] | ✔ | ✔ | ✔ |
| [[5 — Catálogo de obras y predios]] | lee | **llena** | valida |

## Decidido contra plástico

| Decidido | Plástico |
|---|---|
| Telegram es el canal de entrada. Supergrupo con un tema por obra + canal de tablero + bot de comandos (no LLM) | Dónde vive el dato: base propia o modelos en el Odoo del grupo |
| La obra es la unidad; un reporte puede tocar varios predios | Qué comandos entran en la v1 más allá de los cuatro mínimos |
| Fecha, autor y obra los sella el bot; nadie los escribe | Panel de escritorio: web propio o dashboard Odoo |
| Aprobaciones, cotizaciones y expedientes se leen, no se reconstruyen | Cuál es el canal de aprobación para AGROK: Teams u Odoo |
| Fase 0 sin código: catálogo primero | Si Jabin y Potrero Yeguas entran al alcance |
| Piloto en una obra, dos semanas, WhatsApp de respaldo | Cuál obra: propuesta Guayeme |

## Lo que ya existe y se reutiliza

- Bot y app intermedia de Aquario, patrón TESA (Julio).
- Odoo del grupo `crm.itzamna.mx` / `itz_erp1`, Odoo 18, siete compañías; Agrokool es la 7. Lectura por API verificada. Ver [[7.0 — Estado de la instancia leído por API 2026-08-28]].
- Geometría de 13 de 17 predios en `Analisis de proyectos Agrok/data/predios_coordenadas.csv` y precedente de mapa SVG en `analisis/2026-07-13_clima_predios/dashboard_clima.html`.
- Fases fenológicas del maíz en los `.mpp` de `08.Documental/01.Estudios técnicos/01.Estudio de maíz/Planeación/`.
- Plantilla de reporte que el campo ya usa desde el 11 de mayo (sección 2 del archivo 2).

## Relacionado

- v1 con el diagnóstico y los argumentos: [[00 — Núcleo del sistema]] · [[00.1 — Ejemplo aplicado — una semana de campo en el sistema]] · [[01 — Arquitectura — dentro o fuera de Odoo]] · [[02 — Contrato de captura]] · [[03 — Agenda de la junta]]
- Decisión de Telegram y bot: [[CRM Aquario (Odoo + Telegram)]]
