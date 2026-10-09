# Tu primer sistema

Un sistema pequeño para un juego en el que el grupo lleva antorchas, se puede perder en el bosque y tiene que descansar cuando está cansado. Cada paso se hace en los formularios (o lo mismo en YAML), y su pestaña **Pruébalo** lo juega al momento: tus cambios cuentan desde el siguiente paso.

## Paso a paso

1. **Créalo**: escribe _Bosques Oscuros_ bajo la lista de sistemas y pulsa **+**. Empieza con las reglas Genéricas: 30 km al día a pie y 1 de comida al acabar cada día.
2. **Una provisión**: en **Reglas → Provisiones**, añade `torches` con **Mín** `0`. El panel del viaje muestra ahora las antorchas, y el jugador puede cambiarlas a mano.
3. **Gastarla**: abre la acción **eat** (la hace el propio sistema en `day-end`) y añade un paso `effects: { party.resources.torches: -1 }`. Cada día quema también una antorcha.
4. **Perderse**: en **Valores del día**, añade `lost` y, en **Bloquea**, `travel`. Una tabla que ponga `lost: true` detendrá al grupo el resto del día.
5. **Una comprobación**: en **Comprobaciones**, **Añadir una comprobación**: evento `LOST_CHECK`, **Cuándo** `day-start`, **Solo si** `terrain: forest`. En **Se tira en**, elige una tabla tuya cuyo mal resultado tenga **Fija** `lost: true` (hazla en la aplicación Oracle: _1d6_, del 1 al 2 fija `lost: true`).
6. **La fatiga**: en **Comprobaciones → Características del grupo**, añade `fatigue`, que empieza en `0` (su mínimo, `min: 0`, se escribe en YAML). Luego una comprobación **Cuándo** `day-end`, **Solo si** `below: torches`, **Cambios** `party.stats.fatigue: 1`: un día sin antorchas cansa al grupo.
7. **Descansar solo si hay cansancio**: abre **rest**: **Solo si** `party.stats.fatigue: { gte: 1 }`; pasos `time: 120` y `effects: { party.stats.fatigue: -1 }`. El botón queda desactivado mientras el grupo está fresco, y dice por qué.
8. **Pruébalo**: abre la pestaña **Pruébalo** y monta un camino de tres hexes, el del medio `forest`; viaja y lee el diario: la comprobación de perderse al alba en el bosque, las antorchas bajando cada noche, el botón de descansar activándose al cansarse.

## Lo mismo en YAML

La pestaña **YAML** lo muestra así:

```yaml
kind: travel-rules
id: default
day: { start: '06:00', nightfall: '20:00' }
travel: { hoursPerDay: 8 }
terrains: { plains: { multiplier: 1 }, forest: { multiplier: 0.5 } }
modes: { foot: { kmPerDay: 30 } }
resources:
  food: { min: 0 }
  torches: { min: 0 } # paso 2
values:
  lost: { blocks: [travel] } # paso 4
actions:
  camp: { do: [{ time: dawn }] }
  rest: # paso 7
    when: { party.stats.fatigue: { gte: 1 } }
    do: [{ time: 120 }, { effects: { party.stats.fatigue: -1 } }]
  eat:
    on: day-end
    do:
      - { effects: { party.resources.food: -1 } }
      - { effects: { party.resources.torches: -1 } } # paso 3
checks:
  - { event: LOST_CHECK, at: day-start, when: { terrain: forest } } # paso 5
  - {
      event: NO_TORCHES,
      at: day-end,
      when: { below: torches },
      effects: { party.stats.fatigue: 1 },
    } # paso 6
---
kind: bindings
id: default
stats:
  fatigue: { name: Fatigue, default: 0, min: 0 } # paso 6
on:
  LOST_CHECK: { resolve: dark-lost }
---
kind: table # paso 5, hecha en la aplicación Oracle
id: dark-lost
roll: 1d6
entries:
  - { range: 1-2, result: Perdidos entre los árboles, set: { lost: true } }
  - { range: 3-6, result: El sendero sigue }
```

Las Marcas Grises hacen todo esto y mucho más; su [página](../packs/02-grey-marches.md) dice dónde está cada parte. La página de cada pestaña cuenta qué más puede hacer, empezando por el [Resumen](04-overview.md).
