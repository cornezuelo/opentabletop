# Facciones

La pestaña **Facciones** edita los poderes del mundo del sistema (`kind: factions`, una por sistema): reinos, clanes, gremios, una banda de forajidos. **Nuevas facciones** hace dos sobre la tabla de turno de Core, con una hoja propia, y las nombra en el sistema. En el Hexmapper se traen a un mapa desde la vista Mundo ([Facciones](../hexmapper/12-world.md#facciones)), y a una campaña desde la pestaña [Facciones](../campaign/02-factions.md) del app Campaign. Esta página explica cómo funcionan las facciones, luego cada parte de la pestaña, monta una enemistad de frontera desde cero paso a paso y repasa los errores habituales. La ayuda junto a cada campo lo explica, con ejemplos. El YAML: [Facciones](../technical/07-kinds.md#facciones).

## Cómo funcionan las facciones

Una facción son dos cosas: **una hoja**, como la de un personaje (su Fuerza, su Riqueza, si está en guerra), y **tierra**, los hexes que tiene en un mapa. El sistema solo dice cómo **empiezan**; en cuanto una campaña las trae, ella guarda sus hojas, y cada mapa la tierra que tienen en él. Cambiar el sistema después no mueve lo que una campaña ya tiene.

- **Un turno del mundo** es cada facción jugando su turno, **una a una, en el orden de la lista**. En su turno una facción tira su **tabla de turno** (la suya propia, o la que comparten): la tabla la ve como `faction.*` (`faction.values.strength`, `faction.territory`: cuántos hexes tiene), a cada facción como `factions.<id>.*` y el reloj del mundo (la fecha, la estación, los relojes de progreso). Lo que sale va a la línea temporal (_Los Saqueadores: Arde una granja (tierras +1)_), y los **efectos** del resultado cambian el mundo: a la propia facción (`faction.values.strength: -1`, `faction.conditions.at-war: true`), a otra (`factions.the-wardens.values.strength: -1`), la tierra y los relojes de progreso (`world.clocks.the-siege: 1`). Cada facción ve lo que hicieron las anteriores.
- **Cuándo.** **Turno del mundo**, en el panel Mundo del Hexmapper o en el app Campaign, juega uno ahora. Con **Cada (días)**, los turnos llegan también por sí solos según avanza el reloj del mundo (a mano, o con un viaje): el primero, esos días después de que llegaran las facciones, y luego cada esos días.
- **La tierra crece y mengua hex a hex.** `faction.territory: 1` coge un hex junto a su tierra: primero uno de nadie y, cuando no queda ninguno, uno de un vecino (que se lo quita). `-1` cede uno de sus hexes del borde, que pasa a ser de nadie. El agua y los hexes fuera del mapa nunca tienen dueño, y una facción sin ninguna tierra no puede crecer (no tiene desde dónde). La tierra solo cambia en el mapa que se juega: sin mapa (un viaje del app Travel), los turnos cambian las hojas y los relojes, nunca la tierra.
- **Los valores se quedan dentro de sus límites**, como los de un personaje: una Fuerza de 0 a 6 nunca se sale de ahí.
- **El resto del mundo las lee, y las cambia.** Donde se escriben condiciones y tablas (las comprobaciones de un viaje, una tirada a mano, el descubrimiento), `factions.<id>.values.strength`, `factions.<id>.conditions: at-war` y `hex.faction` (quién tiene el hex en que está el grupo) las leen; los resultados de un viaje, los **Cambios** de una comprobación o los efectos de un reloj lleno las cambian por su nombre: `factions.the-reavers.values.strength: 1`. Solo una tabla de turno conoce `faction.*`: en cualquier otro sitio una facción se nombra por su id.

![Un turno del mundo en una franja del mapa: la tierra de los Guardianes, dos hexes de nadie, la tierra de los Saqueadores. Los Guardianes van primero y tiran la tabla de turno de Core: Extiende su alcance, faction.territory: 1, así que cogen un hex de nadie junto a su tierra. Luego los Saqueadores tiran su propia tabla, 1d6 + su Fuerza: Arde una granja, faction.territory: 1 y la Fuerza de los Guardianes −1; cogen el último hex de nadie entre ellos. En el siguiente turno que crezcan, ya no queda tierra de nadie a su lado, así que el hex se le quita a un vecino. Debajo, las dos líneas que recibe la línea temporal.](world-turn.svg)

## La pestaña

- Su **Nombre**: cómo se llaman estas facciones en conjunto.
- **Su hoja**: la hoja con la que se hace cada facción, sus valores, estados y tipos de relación. Se edita en la pestaña **Hoja**, que la enseña junto a la del grupo y la de sus personajes (también puede ser la de los personajes).
- **Su turno**: lo que tira cada una en un turno del mundo, una tabla, oráculo, generador o mazo.
- **Cada (días)**: cada cuánto llega un turno del mundo por sí solo; vacío, solo a mano.
- Cada facción, por su id (`the-wardens`: como la nombran las tablas, `factions.the-wardens.…`), con su **Nombre**, **Descripción (su ayuda**, que se ve al abrirla en la vista Mundo), **Color**, con qué **Empieza** (valores de su hoja, `strength: 4`; el resto, los de la hoja), dónde empieza (abajo) y su tabla de **Turno propio**, que tira en vez de la común.

**Dónde empiezan.** Aquí dices dónde **empieza** cada una: las **Regiones** (por los nombres que les da el mapa), en cualquier mapa que las tenga, y los **Hexes** que tiene cuando un mapa trae las facciones. Los hexes son coordenadas, y las mismas coordenadas son otro sitio en otro mapa, así que solo se dan **En el mapa** que elijas: uno de los mapas de ejemplo del pack (`maps:` en su sistema), el mapa que tienes al abrirlo desde los **Mapas de ejemplo** del Hexmapper; `territory: { map: maps/frontier.otd.json, hexes: ['15,9'] }`. Desde entonces la tierra es del mapa: se pinta a mano en la vista Mundo del Hexmapper y se gana o se pierde hex a hex en los turnos del mundo. Cambiar dónde empiezan no mueve la tierra de un mapa que ya las tiene.

## Paso a paso: una enemistad de frontera

Dos poderes en una frontera: los Guardianes tienen los cerros bajos y los Saqueadores el páramo alto. En cada turno del mundo los Guardianes pueden crecer, aguantar o perder terreno (la tabla de Core); los Saqueadores salen a cabalgar con una tabla propia, tirada con su Fuerza, y cuando arde una granja ganan tierra y dejan a los Guardianes más débiles y en guerra. A quien viaja por la tierra de los Saqueadores le pueden robar, y cada robo los envalentona. Parte de un sistema nuevo: empieza como copia de las Reglas genéricas, sin facciones.

1. **Créalo**: escribe _La Frontera_ bajo la lista de sistemas y pulsa **+**.
2. **Sus facciones**: en **Facciones**, **Nuevas facciones**. Llámalas _Los poderes de la Frontera_; **Su turno** se queda en la de Core, `core/table.faction-turn` (_El turno de una facción_), y **Cada (días)** en `7`. Cambia la facción `the-crown` a `the-wardens`, con el nombre _Los Guardianes_, **Color** `#3a6ea5`, **Empieza con** `strength: 4`, **Regiones** `Los Cerros Bajos`; y `the-rebels` a `the-reavers`, _Los Saqueadores_, `#8b1e1e`, `strength: 3`, **Regiones** `El Páramo Alto`.
3. **Su hoja**: en **Hoja**, la pestaña _faction · las facciones_ tiene lo que hizo **Nuevas facciones**: **Fuerza** (**Empieza en** `3`, **Mín.** `0`, **Máx.** `6`) y el estado **En guerra**. Déjala como está (sus nombres salen en inglés, _Strength_ y _At war_, hasta que los cambies).
4. **La tabla de los Saqueadores**: en la aplicación Oracle, **Nueva definición**, una tabla en tu pack _La Frontera_ con el id `reaver-raid`, el nombre _Cabalgan los Saqueadores_ y la tirada `1d6 + {{faction.values.strength}}`: con `1-4` _Rechazan la incursión_, con **Cambios** `faction.values.strength: -1`; con `5-7` _Se llevan el ganado de noche_; con `8-12` _Arde una granja_, con **Cambios** `faction.territory: 1, factions.the-wardens.values.strength: -1, factions.the-wardens.conditions.at-war: true`.
5. **Su propio turno**: de vuelta en **Facciones**, el **Turno propio** de los Saqueadores, `table.reaver-raid`.
6. **Ladrones en el páramo**: en **Comprobaciones**, **Añadir una comprobación**, con **Comprobación** `REAVERS` y el nombre _Saqueadores_. **Cuándo** `trip.hex-enter`; **Solo si** `hex.faction: the-reavers, factions.the-reavers.values.strength: { gte: '{{1d6}}' }` (en su tierra, tanto más a menudo cuanto más fuertes sean); sin tabla; **Cambios** `party.resources.food: -1, factions.the-reavers.values.strength: 1`.
7. **Un mapa**: en el Hexmapper, **Nuevo mapa**; en **Ajustes del mapa → Campaña → Sistema**, _La Frontera_. Con **Regiones** (<kbd>N</kbd>), **Nueva región** con el nombre _Los Cerros Bajos_ y pinta un trozo de hexes al oeste; otra, _El Páramo Alto_, un trozo al este, dejando un par de hexes de nadie entre las dos.
8. **Tráelas**: abre el panel **Mundo** (☾), **Poner en marcha el reloj del mundo**, y en su pestaña **Facciones**, **Traer sus facciones**. Pulsa **Turno del mundo** unas cuantas veces; luego **Día siguiente** ocho veces.
9. **Viaja por el páramo**: en **Jugar**, pon al grupo en los cerros, elige un destino al otro lado del páramo y viaja.

**Lo que verás.** Tras **Traer sus facciones**, los Guardianes tienen todos los hexes de Los Cerros Bajos, con rayas azules, y los Saqueadores El Páramo Alto, en rojo; cada línea dice cuántos hexes. Cada **Turno del mundo** añade dos líneas a la línea temporal, primero la de los Guardianes: _Los Guardianes: Extiende su alcance (tierras +1)_, _Aguanta lo que tiene_, _Conspira en secreto: algo se avecina_ o _Pierde terreno (tierras −1)_; luego la de los Saqueadores: _Los Saqueadores: Se llevan el ganado de noche_, o _Arde una granja (tierras +1)_, y la hoja de los Guardianes enseña la Fuerza uno menos y **En guerra** marcado. La tierra crece primero por los hexes de nadie que hay entre ellos; cuando ya no queda ninguno a su lado, una granja que arde se lleva un hex de los Guardianes. Una incursión rechazada deja más débiles a los Saqueadores, y con menos Fuerza su tirada quema menos: con Fuerza 1 o menos, nunca. En el octavo **Día siguiente**, el primero pasada una semana desde que llegaron (a las 06:00 del primer día), llega un turno por sí solo, con sus dos líneas. En el viaje, cada hex de la tierra de los Saqueadores en que se entra tira un d6 contra su Fuerza (**Todo** lo enseña cuando no sale); cuando sale, el diario dice _Saqueadores_ con Comida −1, y la hoja de los Saqueadores en el panel Mundo enseña la Fuerza uno más. En la tierra de los Guardianes, y en la de nadie, no hay ladrones.

## Lo mismo en YAML

Las facciones y su hoja, como las enseña la pestaña **YAML**:

```yaml
# factions.yaml
kind: factions
id: default # paso 2
name: Los poderes de la Frontera
sheet: sheet.faction
turn: core/table.faction-turn
every: 7
factions:
  the-wardens:
    name: Los Guardianes
    color: '#3a6ea5'
    values: { strength: 4 }
    territory: { regions: [Los Cerros Bajos] }
  the-reavers:
    name: Los Saqueadores
    color: '#8b1e1e'
    values: { strength: 3 }
    territory: { regions: [El Páramo Alto] }
    turn: table.reaver-raid # paso 5
---
kind: sheet
id: faction # paso 3
name: Faction
values:
  strength: { name: Strength, default: 3, min: 0, max: 6 }
conditions:
  at-war: { name: At war }
```

La tabla de los Saqueadores, como la enseña el editor YAML del Oracle:

```yaml
kind: table
id: reaver-raid
name: Cabalgan los Saqueadores
roll: '1d6 + {{faction.values.strength}}'
entries:
  - { range: 1-4, result: Rechazan la incursión, effects: { faction.values.strength: -1 } }
  - { range: 5-7, result: Se llevan el ganado de noche }
  - range: 8-12
    result: Arde una granja
    effects:
      faction.territory: 1
      factions.the-wardens.values.strength: -1
      factions.the-wardens.conditions.at-war: true
```

Lo que los otros pasos añaden al sistema y a las Reglas genéricas (un extracto: el resto se queda como estaba):

```yaml
# system.yaml (kind: system), nombrado en el paso 2
factions: factions.default
---
# travel.yaml: las reglas (kind: travel-rules)
checks:
  - event: REAVERS # paso 6
    name: Saqueadores
    at: trip.hex-enter
    when: { hex.faction: the-reavers, factions.the-reavers.values.strength: { gte: '{{1d6}}' } }
    effects: { party.resources.food: -1, factions.the-reavers.values.strength: 1 }
# … el día, los terrenos, las formas de viajar, la comida y las acciones de las Reglas genéricas
```

Las Marcas Grises juegan con todo esto y más (los Clanes de Hierro, el Valle de Ashford y la guarnición de Fuerte Keld, con fuerza, riqueza y la reputación del grupo; cada una con su propia tabla de turno; tierra por regiones y por hexes en sus dos mapas de ejemplo; un reloj que llenan los turnos de los Clanes; una patrulla que cabalga allí donde el Valle tiene la tierra; un peaje que hace que la guarnición piense mejor de ti): su [página](../packs/02-grey-marches.md) dice dónde.

## Errores habituales

- **Nada que tirar.** Una facción necesita una tabla de turno: **Su turno**, o su **Turno propio**. Sin ninguna, los problemas del sistema dicen _nothing to roll on its turn_.
- **Una facción que nunca crece.** Su tierra empieza por las **Regiones** escritas exactamente como las llama el mapa (_El Páramo Alto_, no _páramo alto_); una facción traída sin tierra no tiene desde dónde crecer, y `faction.territory: 1` no hace nada. Píntale un hex a mano (**✎** en el panel Mundo) y crecerá desde ahí.
- **Hexes que no llegan.** Los **Hexes** solo se dan **En el mapa** elegido, uno de los mapas de ejemplo del pack; en cualquier otro mapa solo se dan las regiones. Sin **En el mapa**, los problemas del sistema lo dicen.
- **Cambias dónde empiezan y el mapa no cambia.** Dónde empiezan se lee una vez, cuando un mapa las trae. Para ver un cambio, pinta la tierra a mano, o quita las facciones del mapa y tráelas otra vez.
- **`faction.` fuera de una tabla de turno.** Solo una tabla de turno sabe de quién es el turno. En la comprobación de un viaje, una tirada a mano o los efectos de un reloj lleno, nombra la facción: `factions.the-reavers.values.strength: 1`.
- **Efectos que un turno no hace.** Un turno solo cambia facciones y relojes de progreso: `party.…` o `trip.…` en una tabla de turno no cambian nada (en un turno del mundo no hay viaje).
- **Turnos que no llegan solos.** Necesitan **Cada (días)**, el reloj del mundo en marcha y **Turnos por sí solos** marcado en el panel Mundo; el primero llega esos días después de que llegaran las facciones, no enseguida.
- **Tierra que no cambia.** La tierra cambia en el mapa que se juega: un turno del mundo en el app Campaign cambia el mapa elegido allí, y un viaje del app Travel, sin mapa, no cambia ninguno. Ahí `hex.faction` tampoco lee nada.
- **Un id cambiado.** Las tablas leen una facción por su id, no por su nombre: cambiar `the-reavers` deja `factions.the-reavers.…` sin nombrar a nadie. **Usado en**, en **Hoja**, enseña lo que lee sus valores; un mapa que ya las tiene se queda con el id viejo.
- **El orden de los turnos.** Las facciones juegan su turno en el orden de la lista, y cada una ve las anteriores: una facción cuya tabla lee la Fuerza de otra la ve después del turno de esa.
