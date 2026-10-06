# Las Marcas Grises

> El viejo reino acaba donde se acaba el camino. Pasado Vado Ceniza, el Camino de Keld cruza el río por un puente de peaje y sube hasta Fuerte Keld, cuya guarnición lleva un año sin cobrar. Al norte, el Bosque Gris guarda sus secretos: luces entre los árboles por la noche y algo grande dormido bajo las raíces. Al sur, las Colinas Huecas están llenas de bandidos, y el Lago Salado se extiende llano y gris; solo lo cruza la barca de Brenna. Al este de las colinas, nadie ha dibujado el mapa.

**Las Marcas Grises** es una pequeña frontera para jugar y para aprender. Es un pack incluido (MIT) con su propio **sistema de viaje** y un **mapa de ejemplo**, y entre los dos usan todo lo que sabe hacer OpenTabletop. Lee sus ficheros en la aplicación Oracle como ejemplos resueltos: cada uno tiene comentarios que dicen qué enseña.

Los nombres del mapa y del pack están en inglés, que es la lengua base del pack (Ashford es Vado Ceniza, el Saltmere es el Lago Salado…); los textos de las tablas tienen traducción al español.

## Jugarlo

1. En el Hexmapper, **Mapas → Mapas de ejemplo → The Grey Marches**. Se abre como uno de tus mapas; vuelve a abrirlo más tarde para seguir, o empiézalo de cero.
2. **Jugar** (<kbd>P</kbd>) → **Con reglas** → **The Grey Marches**, elige la estación y haz clic en un destino. El grupo empieza en Ashford.
3. Prueba el camino a Fuerte Keld (el peaje), la senda al santuario (el vado), el sendero a las Piedras Grises (un lugar señalado que te espera), una noche en el Bosque Gris o la barca por el lago: en la orilla de Brenna, cambia el modo de viaje a **En barca**; solo va por agua y costa, así que vuelve a **A pie** para desembarcar.
4. Marca **Descubrir el mapa al viajar** y ve hacia el este, a los hexes en blanco.

El mismo sistema se juega sin mapa en la aplicación Travel.

## Los lugares

| Lugar                                                | En el mapa                                | Qué pasa                                                                           |
| ---------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| **Ashford** (Vado Ceniza), en el Valle               | El pueblo del oeste                       | Seguro: sin peligro. Pregunta en las puertas con el oráculo _¿Nos dejarán entrar?_ |
| **Keld Bridge** (el puente)                          | Donde el camino cruza el río              | Etiqueta `toll`: por el camino, el guarda se cobra un día de comida                |
| **El vado**                                          | Donde la senda del santuario cruza el río | Etiqueta `ford`: se tira en el oráculo _Cruzar el vado_ (no en barca)              |
| **El santuario**                                     | En el borde del Bosque Gris               | Etiqueta `shrine`: descansar quita fatiga; una plegaria se responde, una vez       |
| **The Grey Stones** (las Piedras Grises)             | Al norte de Ashford                       | Etiqueta `landmark`: el viaje te espera hasta que pulses **Continuar**             |
| **The Greywood** (el Bosque Gris)                    | El bosque del norte                       | Peligro 1–4, hexes `haunted`; la Sierpe, una sola vez                              |
| **The Saltmere** (el Lago Salado) y la barca         | El lago; Brenna en la orilla              | Agua: solo la barca lo cruza                                                       |
| **The Hollow Hills**, **Fort Keld**, **Hollow Gate** | El sureste                                | Bandidos; cumbres que nadie cruza                                                  |
| **Unknown lands** (tierras desconocidas)             | El este en blanco                         | Se descubren al viajar                                                             |

## Dónde está cada cosa

| Qué                                                                                         | Fichero                                                                |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Reglas de viaje: terrenos, agua, una barca, caballos que comen forraje, clima, descanso     | `travel.yaml` (travel-rules)                                           |
| Comprobaciones con `edges`, `tags`, `mode`, comparaciones, `any` / `all` / `not`, listas    | `travel.yaml` (checks)                                                 |
| Una comprobación que espera a **Continuar**                                                 | `travel.yaml`: `LANDMARK_CHECK_REQUIRED`                               |
| Una comprobación resuelta por un **oráculo**, con su entrada desde los bindings             | `travel.yaml`: `FORD_CHECK_REQUIRED`; `travel-tables.yaml`: `ford`     |
| Características del grupo en las tiradas (`{{charisma}}`, `{{survival}}`, `{{navigation}}`) | `travel.yaml` (bindings); `reaction`, `forage`, `ford`, `getting-lost` |
| Una tabla por estación (una referencia hecha con el contexto)                               | `weather.yaml`: `weather` → `weather-{{season}}`                       |
| Pesos, 2d6, dados Fate (4dF)                                                                | `weather.yaml`                                                         |
| Resultados que entiende el viaje: `lost`, `weather`, `fatigue`, `resources`                 | `travel-tables.yaml`, `weather.yaml`                                   |
| Valores del día para comprobaciones posteriores (`fordModifier`)                            | `weather.yaml` → `ford`                                                |
| Tablas por terreno, región, campo del hex (`danger`), hora del día                          | `encounters.yaml`: `encounter`                                         |
| Luego tira, `{{result}}`, dados en los textos (`{{1d4+2}}`), `once`                         | `encounters.yaml`, `treasure.yaml`                                     |
| Generadores, y un generador que lee otro (`{{npc.role}}`)                                   | `encounters.yaml`: `npc`, `rumour`                                     |
| Quedarse con los mejores (`4d6kh3`), d66, d100                                              | `encounters.yaml`, `treasure.yaml`                                     |
| Oráculo con opciones con nombre, una variante con sus propios dados                         | `oracles.yaml`: `gates`                                                |
| Un mazo con copias, cartas que tiran tablas o dan comida                                    | `decks.yaml`: `omens`                                                  |
| `maxOccurrences`                                                                            | `treasure.yaml`: `prize`                                               |
| Descubrir el mapa                                                                           | `discovery.yaml`                                                       |
| Traducciones                                                                                | `locales/es/`                                                          |
