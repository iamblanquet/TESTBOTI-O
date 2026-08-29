---
type: propuesta
status: idea
created: 2026-08-28
entity: AGROK
author:
audiencia: Julio Silva (IT), Karen García, Luis, Dirección
---

# 4 — Plan y responsables

Una sincronización de 20 minutos por semana entre Julio, Karen y Luis durante F0 y F1. Nada más.

## F0 · Catálogo (2 semanas, sin código)

- [ ] **Karen** — Llenar [[5 — Catálogo de obras y predios]]: nombre canónico, alias, tipo, entidad, superficie, régimen
- [ ] **Karen** — Resolver las ambigüedades listadas en el archivo 5 (Waya, Ximbal, Rancho Santa Teresa, Perrera, Cabaña-Cultivo, Predio R y C, La Magdalena = Teresita)
- [ ] **Karen** — Confirmar con Beche y Abner los catálogos de actividad y rol del archivo 1
- [ ] **Karen** — Marcar la cobertura de señal por predio y desde dónde se manda hoy el reporte (archivo 5)
- [ ] **Dirección** — Decidir si se pone Wi-Fi o enlace satelital en la base de Uayamón para la ventana de envío de la noche
- [ ] **Luis** — Recalcular el avance histórico de Santa Teresita corrigiendo los reportes etiquetados como San Alberto
- [ ] **Dirección** — Fijar `superficie_meta_ha` por proyecto (hoy hay tres cifras: 80, 120 y 230)
- [ ] **Dirección** — Decidir si Jabin y Potrero Yeguas entran al alcance
- [ ] **Julio** — Elegir almacén (A o B del archivo 3) y crear cuenta técnica de lectura en Odoo
- [ ] **Julio** — Crear supergrupo, canal y bot; cargar el catálogo de Karen; dar de alta usuarios con `tg_user_id`

Criterio de salida: catálogo cargado, cero obras con nombre ambiguo, usuarios mapeados.

## F1 · Bot y piloto (4 semanas)

- [ ] **Julio** — Parser del reporte (archivo 2 §2) y los cuatro comandos: `/reporte`, `/sin_actividad`, `/incidencia`, `/cerrar`
- [ ] **Julio** — Aviso de las 21:00 y mensaje fijado del Tablero
- [ ] **Julio** — `GET /tablero/hoy` y `GET /obras/{id}/avance`
- [ ] **Karen** — Piloto en Guayeme: tema `#Guayeme · Maíz`, dos semanas, grupo de WhatsApp abierto de respaldo
- [ ] **Luis** — Revisar a diario las líneas `otro` y los avances sin predio; ajustar catálogo con Karen

Criterio de paso: diez días hábiles con reporte vía bot sin que nadie lo pida; menos del 10% de líneas en `otro`.

## F2 · Extender (4 semanas)

- [ ] **Karen** — Migrar clúster Mangos (prueba de varios predios por reporte) y Santa Teresita (prueba de incidencias mecánicas)
- [ ] **Julio** — `/horometro`, `/material`, `/medicion`, `/verificar`, y los comandos de consulta
- [ ] **Julio** — Panel de escritorio v1 con los cuatro widgets
- [ ] **Julio** — Conector de lectura a Odoo: `res.company`, y `purchase.order` solo si Finanzas mete a Aspromex y Agrokool al flujo
- [ ] **Dirección** — Nombrar quién decide el canal de aprobación de compras y para cuándo

## F3 · Maquinaria, mapa, Mini App

- [ ] **Julio** — `fleet` como maestro de máquinas si se aprueba; si no, `maquina` propio
- [ ] **Julio** — Mapa con la geometría curada; `/predios/{id}/geometria`
- [ ] **Karen** — Levantar con el T70P: Rach p1, confirmar Arceo, polígono definitivo de Teresita
- [ ] **Julio** — Mini App para `/material` y `/avance`

## Decisiones abiertas y quién las cierra

| Decisión | Dueño | Bloquea |
|---|---|---|
| Almacén A o B | Julio | F1 |
| Obra piloto (propuesta Guayeme) | Karen y Luis | F1 |
| Meta de superficie por proyecto | Dirección | widget de avance |
| Jabin y Potrero en alcance | Dirección | temas y catálogo |
| Canal de aprobación de compras para AGROK | Dirección con Finanzas | conector de compras |
| Bot compartido con Aquario o despliegue aparte | Julio | F1 |

## Relacionado
[[0 — Léeme]] · [[2 — Telegram]] · [[3 — Backend y escritorio]] · [[5 — Catálogo de obras y predios]]
