# Tu primer sistema

Un sistema pequeño para un juego en el que el grupo lleva antorchas, se puede perder en el bosque y tiene que descansar cuando está cansado. Cada paso se hace en los formularios (o lo mismo en YAML), y su pestaña **Pruébalo** lo juega al momento: tus cambios cuentan desde el siguiente paso.

## Paso a paso

1. **Créalo**: escribe _Bosques Oscuros_ bajo la lista de sistemas y pulsa **+**. Empieza con una copia de las reglas genéricas (las de Core) y el calendario de Core, cuyas partes del día nombran: una acción **march** que anda 30 km al día a pie mientras no es de noche (hasta el destino o un hex, que se elige junto a su botón), acampada desde la noche (20:00) hasta la mañana (06:00), 1 de comida al acabar cada día (un valor de la propia hoja del grupo, que viene copiada con ellas) y una comprobación **Clima** que tira _El cielo sencillo_ de Core cada mañana (la lluvia, una tormenta o la nieve frenan la marcha).
2. **Lo que lleva el grupo**: en **Hoja**, la hoja del grupo (_el grupo_: Moral y Comida, como la traen las reglas genéricas), añade un valor `torches`, llamado _Antorchas_, **Empieza en** `3` y **Mín.** `0`. No hay un tipo de número para las provisiones: lo que lleva el grupo es un valor de su hoja (u objetos que llevan sus personajes, [Objetos](08-items.md)). La pestaña **Grupo** del viaje muestra ahora las antorchas en la ficha del grupo, y el jugador puede cambiarlas a mano.
3. **Gastarla**: abre la acción **eat** (la hace el propio sistema en `time.day-end`), **Añadir un paso**, elige **Cambiar valores** en su **Qué hace** y escribe la fila `party.values.torches` · `-1` (en YAML, `effects: { party.values.torches: -1 }`). Cada día quema también una antorcha.
4. **Perderse**: en **Valores del día**, añade `lost` y, en **Bloquea**, `travel.move`. Una tabla que ponga `lost: true` detendrá al grupo el resto del día.
5. **Una comprobación**: en **Comprobaciones**, **Añadir una comprobación**: evento `LOST_CHECK`, **Cuándo** `06:00`, **Solo si** la fila `hex.terrain` · **es** · `forest`. En **Se tira en**, elige una tabla tuya cuyo mal resultado tenga **Fija** `lost: true` (hazla en la aplicación Oracle: _1d6_, del 1 al 2 fija `lost: true`).
6. **La fatiga**: en **Comprobaciones → Características del grupo**, añade `fatigue`, que empieza en `0` (su mínimo, `min: 0`, se escribe en YAML). Luego una comprobación **Cuándo** `time.day-end`, **Solo si** `trip.below` · **es** · `party.values.torches` (las antorchas llegaron hoy a su mínimo: no había ninguna que quemar), **Cambios** `party.stats.fatigue` · `1`: un día sin antorchas cansa al grupo.
7. **Descansar solo si hay cansancio**: abre **rest**: en **Solo si**, **+ Añadir una condición** y la fila `party.stats.fatigue` · **es al menos** · `1`; luego sus pasos: **Pasar el tiempo** `120` y **Cambiar valores** `party.stats.fatigue` · `-1` (en YAML, `time: 120` y `effects: { party.stats.fatigue: -1 }`). El botón queda desactivado mientras el grupo está fresco, y dice por qué.
8. **Pruébalo**: abre la pestaña **Pruébalo** y monta un camino de tres hexes, el del medio `forest`; marcha y lee el diario: la comprobación de perderse cada mañana en el bosque, las antorchas bajando cada noche, el botón de descansar activándose al cansarse.

## Lo mismo en YAML

La pestaña **YAML** lo muestra así:

```yaml
kind: system
id: default
travel: travel-rules.default
bindings: bindings.default
partySheet: sheet.party
# (el calendario y el clima que nombra, los de Core, no se muestran aquí)
---
kind: sheet # la del propio grupo, como vienen las reglas genéricas
id: party
values:
  morale: { default: 3, min: 0, max: 5 }
  food: { default: 6, min: 0 }
  torches: { name: Antorchas, default: 3, min: 0 } # paso 2
---
kind: travel-rules
id: default
travel:
  hoursPerDay: 8
  start: '06:00'
  onward: { do: actions.march, with: { until: destination } }
  halt: { at: '20:00', do: actions.camp }
terrains: { plains: { multiplier: 1 }, forest: { multiplier: 0.5 } }
modes: { foot: { kmPerDay: 30 } }
values:
  lost: { blocks: [travel.move] } # paso 4
actions:
  march:
    params: { until: { choices: [destination, hex] } }
    when: { time.hour: { gte: 6, lt: 20 }, trip.marched: { lt: '{{system.hoursPerDay}}' } }
    do: [{ travel.move: '{{params.until}}' }]
  camp: { do: [{ time: '06:00' }] }
  rest: # paso 7
    when: { party.stats.fatigue: { gte: 1 } }
    do: [{ time: 120 }, { effects: { party.stats.fatigue: -1 } }]
  eat:
    on: time.day-end
    do:
      - { effects: { party.values.food: -1 } }
      - { effects: { party.values.torches: -1 } } # paso 3
checks:
  # (la comprobación de clima de las Reglas genéricas y su binding, como venían, no se muestran aquí)
  - { event: LOST_CHECK, at: '06:00', when: { hex.terrain: forest } } # paso 5
  - {
      event: NO_TORCHES,
      at: time.day-end,
      when: { trip.below: party.values.torches },
      effects: { party.stats.fatigue: 1 },
    } # paso 6
---
kind: bindings
id: default
stats:
  fatigue: { name: Fatigue, default: 0, min: 0 } # paso 6
on:
  LOST_CHECK: { resolve: table.dark-lost }
---
kind: table # paso 5, hecha en la aplicación Oracle
id: dark-lost
roll: 1d6
entries:
  - { range: 1-2, result: Perdidos entre los árboles, set: { lost: true } }
  - { range: 3-6, result: El sendero sigue }
```

Las Marcas Grises hacen todo esto y mucho más; su [página](../packs/02-grey-marches.md) dice dónde está cada parte. La página de cada pestaña cuenta qué más puede hacer, empezando por el [Resumen](04-overview.md).
