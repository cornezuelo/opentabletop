# Oracle en el mapa

El botón de Oracle (el hexágono dorado bajo Jugar y el Mundo, o <kbd>O</kbd>) abre un panel para tirar cualquier tabla, oráculo, generador o mazo de tus packs sin salir del mapa.

## Los packs de un mapa

Un mapa puede trabajar solo con algunos packs: **Ajustes → Mapa → Packs** (por defecto, todos los cargados). El panel Oracle muestra entonces solo los suyos, y **Jugar** solo ofrece sus sistemas de viaje (además del genérico). Una tabla puede seguir tirando tablas de otros packs a las que se refiera. El mapa de ejemplo de las Marcas Grises trabaja con Core y las Marcas Grises.

## Contexto del mapa

Las tiradas reciben lo que sabe el mapa, así que las tablas pueden depender de dónde estás:

- Del **hex seleccionado** (o el del grupo, si no hay ninguno): `terrain` (su id: `forest`, `hills`…), `water`, `tags`, `name`, `region` (por nombre), los campos de la región y del hex por clave (ganan los del hex), el icono como `icon.*` y `hex`.
- Del **token seleccionado**: `token.name`, `token.kind` y sus campos como `token.*`.
- Durante un **viaje con reglas**: `season`, `weather`, `mode`, `day`, las estadísticas del grupo y los valores del día.

Aparecen en gris en el **Contexto** del panel de tirada; escribe encima para probar otros valores. La lista completa, y qué valor gana, está en [Lo que ven las tablas](../technical/04-what-tables-see.md). Arriba del panel se indica qué hex leen las tiradas. **Tirar aquí** (junto a las coordenadas en el panel del hex) abre Oracle con el hex seleccionado.

## Guardar un resultado en el mapa

Bajo cada resultado, **Añadir a … como punto de interés** lo añade a los puntos de interés del hex: un resultado corto pasa a ser su nombre; uno largo se queda con el nombre de la tabla como nombre y el texto como descripción. Edítalo en el panel del hex como cualquier otro punto de interés; <kbd>Ctrl</kbd>+<kbd>Z</kbd> lo deshace.

Durante un viaje con reglas, un resultado que cambia provisiones, fatiga o características del grupo (`set: { resources: { food: -2 }, stats: { morale: 2 } }`) muestra además **Aplicar al viaje: food -2, morale +2**: púlsalo para aplicar esos cambios como se aplicaría el de una comprobación (una vez por resultado). Las comprobaciones del viaje aplican los suyos solas; las tiradas a mano, solo cuando tú lo dices. Pruébalo en Ashford con _En El Hurón Mojado_ de las Marcas Grises.

## Pruébalo

Crea esta tabla en la aplicación Oracle (en un pack tuyo, ver [Packs](../oracle/03-packs.md)):

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

Más ejemplos, hasta un sistema de viaje completo: [Conectar tablas con mapas y viajes](../oracle/07-connecting.md).

Después selecciona un hex de bosque, pulsa <kbd>O</kbd>, busca «Qué encontramos» y tira. Gana la primera entrada cuya condición se cumple.

## Diario, historial y tus packs

Cada mapa tiene su propio Oracle: su historial de tiradas, las cartas robadas de cada mazo y los resultados de una sola vez que ya salieron. Se guardan con el mapa (y en su `.otd.json`), así que abrir otro mapa empieza de cero y al volver los encuentras. Las tiradas a mano y las comprobaciones de un viaje los comparten: una carta robada a mano tampoco sale en el viaje.

Durante un viaje con reglas, las tiradas a mano también se apuntan en el diario.

El panel usa los packs incluidos y los que creas en la aplicación Oracle. Tus packs viven en el navegador, así que las dos aplicaciones los ven cuando se sirven desde el mismo sitio (p. ej. `make serve`: `…/hexmapper/` y `…/oracle/`).
