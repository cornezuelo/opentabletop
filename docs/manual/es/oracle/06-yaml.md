# Referencia YAML

Haz clic en el fichero de una definición (o en un fichero de la página del pack) para abrir el editor YAML. Los problemas se subrayan en su línea y se listan debajo; haz clic en uno para ir a él. Los cambios se guardan mientras escribes.

Mientras escribes, el editor sugiere lo que encaja (<kbd>Ctrl</kbd>+<kbd>Espacio</kbd> muestra las sugerencias en cualquier punto): claves al principio de una línea, `kind` y otros valores fijos, tablas y generadores tras `table:`, `generator:` o `resolve:` (primero los de este pack), y dentro de los `when`, `unless`, `set` y `context` de una línea los nombres que leen o fijan las tablas, con sus valores conocidos (`terrain: forest`, `season: winter`, `resources: { food }`…). Las mismas sugerencias aparecen en las cajas de condiciones y valores de los formularios.

## Una tabla

```yaml
kind: table
id: weather
name: Clima
roll: 1d6
modes: [advantage, disadvantage]
entries:
  - { id: clear, range: 1-3, result: Cielo despejado, set: { weather: clear } }
  - { id: rain, range: 4-5, result: Lluvia, set: { weather: rain } }
  - { id: storm, range: 6, result: Tormenta, table: storm-damage }
```

- `range` (`3`, `2-5`) o `weight` (sin `roll`).
- `table` / `generator`: se tira después de la entrada; `'weather-{{season}}'` elige una según el contexto.
- `set`: valores que añade la entrada (los leen otras tablas y las reglas de viaje).
- `once: true` o `maxOccurrences: 3`, con `onExhausted: reroll | next | none`.

## Dados

La lista completa, con las plantillas y de dónde salen los valores del contexto: [Dados, plantillas y contexto](08-dice-and-templates.md).

`2d6+1`, `d100`, `d%`, `d66`, `4dF`, `4d6kh3` (quedarse los 3 más altos), `2d20kl1` (quedarse el más bajo). Los valores del contexto van entre llaves: `1d6 + {{lostModifier}}`. Los resultados también pueden tirar: `'{{1d6}} lobos'`.

## Condiciones

`when` mantiene una entrada solo si el contexto coincide:

```yaml
when: { terrain: forest } # igual a
when: { terrain: [hills, mountains] } # uno de
when: { danger: { gte: 4 }, season: { not: winter } }
when: { any: [{ weather: storm }, { lost: true }] } # all / any / not
```

Comparaciones: `eq`, `not`, `in`, `gt`, `gte`, `lt`, `lte`, `exists`. Los valores de lista del contexto (como las etiquetas de un hex) coinciden cuando contienen el valor. Gana la primera entrada que cumple y encaja con la tirada.

## Oráculos, generadores y mazos

```yaml
kind: oracle
id: yes-no
inputs:
  odds: { label: Probabilidad, options: [unlikely, even, likely], default: even }
roll: 1d6
variants:
  unlikely:
    { entries: [{ id: yes, range: 1-2, result: 'Sí' }, { id: no, range: 3-6, result: 'No' }] }
  even: { entries: […] }
  likely: { entries: […] }
---
kind: generator
id: npc
fields:
  role: { table: npc-role }
  age: { roll: 2d20+10 }
template: '{{role}}, {{age}} años'
---
kind: deck
id: omens
reshuffle: when-empty
cards:
  - { id: crow, result: Un cuervo, count: 2 }
  - { id: storm, result: Una tormenta }
```

Varias definiciones van en un fichero separadas por `---`, o como lista.
