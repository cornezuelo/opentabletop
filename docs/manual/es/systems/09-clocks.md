# Relojes

La pestaña **Relojes** edita los relojes de progreso con los que empieza el mundo del sistema (`kind: clocks`, una por sistema). **Nuevos relojes** hace uno que, al llenarse, tira los giros de Core y vuelve a empezar, y lo nombra en el sistema. En el Hexmapper llegan con el reloj del mundo al ponerlo en marcha ([Relojes de progreso](../hexmapper/12-world.md#relojes-de-progreso)). El YAML: [Relojes de progreso](../technical/07-kinds.md#relojes-de-progreso).

## Qué tiene

- Su **Nombre**.
- Cada reloj, por su id (cómo lo leen las reglas: `world.clocks.<id>`), con su **Nombre**, su **Descripción (su ayuda**, en la ayuda de su id en el panel Mundo), sus **Segmentos** (cualquier número desde 1) y en qué **Empieza**.
- Lo que pasa cuando se llena: **Al llenarse** (qué pasa, en palabras: una línea en la cronología y un aviso), **Tira** (una tabla, oráculo, generador o mazo), **Cambia** (otros relojes y las facciones: `world.clocks.the-siege: 2`, `factions.the-crown.values.strength: -1`) y **Después**: `keep` lo deja lleno (por defecto), `reset` lo hace volver a empezar, `remove` lo quita.

El **Usado en** de cada reloj lista lo que lo llena y lo que lo lee: tablas, acciones, comprobaciones, otro reloj ([Usado en](04-overview.md#usado-en)).

Lo llenan los efectos, allí donde van efectos: un encuentro de un viaje, la tabla de turno de una facción, otro reloj lleno (`world.clocks.the-siege: 1`). Un reloj que nada llena se llena a mano en el mapa.

En las Marcas Grises, la Sierpe del Bosque Gris despierta cuando las luces embrujadas llenan su reloj (y tira lo primero que hace); la marcha de los Clanes de Hierro, que llenan sus turnos, acerca el motín de Fort Keld y vuelve a empezar; el motín, una vez lleno, pierde el fuerte y desaparece ([Las Marcas Grises](../packs/02-grey-marches.md)).
