# El Oráculo en el mapa

El botón del Oráculo (el hexágono dorado bajo Jugar, o <kbd>O</kbd>) abre un panel para tirar cualquier tabla, oráculo, generador o mazo de tus packs sin salir del mapa.

## Contexto del mapa

Las tiradas reciben lo que sabe el mapa, así que las tablas pueden depender de dónde estás:

- Del **hex seleccionado** (o el del grupo, si no hay ninguno): `terrain` (su id: `forest`, `hills`…), `tags`, sus campos por clave, `region` (por nombre) y `hex`.
- Durante un **viaje con reglas**: `season`, `weather`, `mode`, `day`, las estadísticas del grupo y los valores del día.

Aparecen en gris en el **Contexto** del panel de tirada; escribe encima para probar otros valores.

## Pruébalo

Crea esta tabla en la aplicación Oracle (en un pack tuyo, ver [Packs](../oracle/packs.md)):

```yaml
kind: table
id: what-do-we-find
name: ¿Qué encontramos aquí?
roll: 1d6
entries:
  - { id: forest, range: 1-6, when: { terrain: forest }, result: 'Troncos caídos y setas' }
  - {
      id: rocks,
      range: 1-6,
      when: { terrain: [hills, mountains] },
      result: 'La boca de una cueva en la roca',
    }
  - { id: nothing, range: 1-6, result: 'Nada especial' }
```

Más ejemplos, hasta un sistema de viaje completo: [Conectar tablas con mapas y viajes](../oracle/connecting.md).

Después selecciona un hex de bosque, pulsa <kbd>O</kbd>, busca «Qué encontramos» y tira. Gana la primera entrada cuya condición se cumple.

## Diario y tus packs

Durante un viaje con reglas, las tiradas a mano también se apuntan en el diario.

El panel usa los packs incluidos y los que creas en la aplicación Oracle. Tus packs viven en el navegador, así que las dos aplicaciones los ven cuando se sirven desde el mismo sitio (p. ej. `make serve`: `…/hexmapper/` y `…/oracle/`).
