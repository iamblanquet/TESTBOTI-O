---
type: propuesta
status: idea
created: 2026-08-28
entity: AGROK
author:
audiencia: Karen García (llena), Julio Silva (carga)
---

# 5 — Catálogo de obras y predios

Entregable de la fase 0. Karen llena las celdas vacías; Julio lo carga como semilla de `obra` y `predio`. Lo prellenado viene de los grupos y del SharePoint; corrígelo si está mal.

## Predios

| Nombre canónico | Alias que aparecen | Superficie legal ha | Superficie útil ha | Régimen | Geometría disponible | Restricciones |
|---|---|---|---|---|---|---|
| San Alberto | Predio San Alberto, Cabaña-Cultivo (?) | 11.04 (polígono) | | | ✔ polígono, 10 vértices | |
| San Luis | Predio San Luis, San luis | 16.03 | | | ✔ 8 vértices, orden dudoso | 5 postes CFE, demanda en curso |
| Los Mangos | Los mangos, Predio los Mangos, Hacienda Nueva | 12.47 | | | ✔ 13 vértices, 4 fuentes sin canónica | tubería CAPAE, triángulo de 2 ha |
| Guayeme | Predio Guayeme, GUAYEME | 37.67 (KMZ) | | | ✔ KMZ 12 vértices; el CSV da 52.8, descartado | |
| Rach | Predio R (?) | 1.83 (p2) | | | p2 ✔ · p1 solo 2 vértices | |
| Cristina | Predio C (?), Crisitna | 5.51 | | | ✔ 4 vértices | |
| La Asunción | Asunción | 146.48 | | | ✔ 6 vértices | |
| San Pedro | | 180.41 (sur 108.9 + norte 71.5) | | en trámite (pago pendiente RPP, jul) | ✔ dron, 165 vértices | |
| Santa Teresita | Rancho Teresita, La Magdalena, MAGDALENA, Rancho Santa Teresa (?) | **518 / 521 / 558** según archivo | | | ✔ tres versiones; elegir una | basurero de terceros, apiarios y corral invadidos, brecha de tránsito |
| Arceo | | 332 + 196 | | | ✔ dos polígonos en un KMZ: ¿uno o dos predios? | |
| Xpicob | Ixpicob | 5.37 | | | ✔ validado contra anteproyecto | acuícola |
| Zavala | | 49.37 (KMZ) | | | ✔ KMZ; CSV da 31.4 | |
| Trece | | 24.86 | | | ✔ CSV = KMZ | |
| María | | 0.32 | | | ✔ dos fracciones | |
| Vivero Sembrando Vida | | 0.16 | | | ✔ | |
| Parque Jabin | Parque El Jabín | | | patrimonial | | 9 postes CFE sin registro; queja Rancho La Camila |
| Potrero Yeguas | Potrero, WY (?) | | | patrimonial | | |
| Polígono ASPROMEX | | | | | ✖ la carpeta contiene una copia de San Alberto | |
| Elías, Isidro, María 2 | | micro | | | ✔ | ¿son de AGROK? |

## Obras

Una obra = un trabajo en marcha con cuadrilla y fase. Puede cubrir varios predios.

| Nombre canónico | Predios | Proyecto | Entidad | Fase hoy | Estado | Responsable de reporte | Tema Telegram |
|---|---|---|---|---|---|---|---|
| Maíz Guayeme | Guayeme | Maíz 2026 | Agrokool | monitoreo y control de plaga | operación | Karen / Abner | `#Guayeme · Maíz` |
| Desmonte Santa Teresita | Santa Teresita | Maíz 2026 (?) | Agrokool | despalme con retro | operación | Beche / Dorantes | `#Sta Teresita · Desmonte` |
| Siembra clúster Mangos | Los Mangos, Rach, Cristina | Maíz 2026 | Agrokool | siembra y fumigación | operación | Abner | `#Clúster Mangos · Siembra` |
| Maíz San Alberto | San Alberto | Maíz 2026 | Agrokool | post-siembra | operación | Karen / Abner | `#San Alberto · Maíz` |
| San Luis | San Luis | Maíz 2026 | Agrokool | siembra pospuesta por lluvia (ago) | standby (?) | | |
| Reforestación Jabin | Parque Jabin | Reforestación | ¿Agrokool o patrimonial? | mantenimiento | | Karen | si entra al alcance |
| Cercado Potrero Yeguas | Potrero Yeguas | Infraestructura ganadera | ¿? | cercado y corral | operación | Karen | si entra al alcance |
| Obra Waya / WY | ¿? | | | | | | |
| Obra Ximbal | ¿? | | | | | | |
| Oficinas Aquario · Perú · San Román · Cabaña Uaya · La Paz · San Francisco 2 | de la lista de Itzayana del 2 de marzo | | otras entidades | | | | fuera de AGROK salvo decisión |

## Ambigüedades que solo tú puedes cerrar

| Nombre | Pregunta |
|---|---|
| Obra Waya / WY | ¿Obra propia, patio de maquinaria en Uayamón, o alias? |
| Obra Ximbal | ¿Obra activa? Aparece una vez, 7 de agosto |
| Rancho Santa Teresa | ¿Es Santa Teresita? Dos encabezados en el grupo de San Luis |
| Perrera | ¿Sub-instalación de Potrero Yeguas o aparte? |
| Cabaña-Cultivo | ¿Subzona de San Alberto? Cinco encabezados |
| Predio R / Predio C | ¿Rach y Cristina? Así están en los `.mpp` de abril |
| La Magdalena / Rancho Teresita | ¿Mismo predio, renombrado el 15 de mayo? Explicaría los tres polígonos |
| Santa Teresita, proyecto | ¿Es maíz lo que va ahí, u otra cosa? |
| Elías, Isidro, María 2 | ¿Son de AGROK? |

## Cobertura por predio

Para que el sistema sepa qué esperar de cada obra. Marca con lo que sabes; no hace falta medir.

| Predio | Señal en el predio | Desde dónde se manda el reporte hoy | Hora habitual |
|---|---|---|---|
| Guayeme | ninguna / intermitente / buena | | |
| Santa Teresita | | | |
| San Alberto | | | |
| Los Mangos, Rach, Cristina | | | |
| San Luis | | | |
| Parque Jabin | | | |
| Base Uayamón (bodega, perrera) | | ¿Wi-Fi? | |

## Máquinas

| Nombre | Tipo | Propietaria | Horómetro actual | Umbral de servicio | Operador habitual |
|---|---|---|---|---|---|
| Puma (CASE IH 155) | tractor | Aspromex | sacó testigo de 300 h el 19/07 | 300 h | Armando |
| Bulldozer D6 | bulldozer | | | | |
| Retroexcavadora New Holland | retro | | 286.5 h el 14/04 (San Luis) | | Alfredo |
| Dron DJI Agras T70P | dron | Aspromex | | | Abner |
| Sembradora Case PRO 6 | sembradora | Madisa, crédito | | | |
| Rastra agrícola · semipesada | rastra | | | | |

## Activos fijos

| Activo | Predio | Última lectura conocida |
|---|---|---|
| Veleta | Parque Jabin | 01/04/2026, "funciona correctamente" |
| Bomba de pozo (Rodase) | San Alberto | 17/03/2026, instalada y probada |
| Cisterna (ex pileta) | San Alberto | abr-2026, con filtraciones |
| Cabaña / bodega | San Alberto | 30/06/2026, láminas dañadas |
| Cerco perimetral | San Alberto | 30/06/2026, limpieza |

## Relacionado
[[0 — Léeme]] · [[1 — Modelo de datos]] · [[4 — Plan y responsables]] · Detalle de geometría: [[00 — Núcleo del sistema]] v1
