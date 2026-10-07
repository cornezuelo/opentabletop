# Las Marcas Grises

> El viejo reino acaba donde se acaba el camino. Pasado Vado Ceniza, el Camino de Keld cruza el río por un puente de peaje y sube hasta Fuerte Keld, cuya guarnición lleva un año sin cobrar. Al norte, el Bosque Gris guarda sus secretos: luces entre los árboles por la noche y algo grande dormido bajo las raíces. Al sur, las Colinas Huecas están llenas de bandidos, y el Lago Salado se extiende llano y gris; solo lo cruza la barca de Brenna. Al este de las colinas, nadie ha dibujado el mapa.

**Las Marcas Grises** es una pequeña frontera para jugar y para aprender. Es un pack incluido (MIT) con su propio **sistema de viaje** y un **mapa de ejemplo**, y entre los dos usan todo lo que sabe hacer OpenTabletop. Lee sus ficheros en la aplicación Oracle como ejemplos resueltos: cada uno tiene comentarios que dicen qué enseña.

Los nombres del mapa y del pack están en inglés, que es la lengua base del pack (Ashford es Vado Ceniza, el Saltmere es el Lago Salado…); los textos de las tablas tienen traducción al español.

## Jugarlo

1. En el Hexmapper, **Mapas → Mapas de ejemplo → The Grey Marches**. Se abre como uno de tus mapas; vuelve a abrirlo más tarde para seguir, o empiézalo de cero.
2. **Jugar** (<kbd>P</kbd>): el mapa se abre listo, **Con reglas** y **The Grey Marches**, con el descubrimiento activado. Elige la estación si quieres (**Nuevo viaje**) y haz clic en un destino: el grupo empieza en Ashford.
3. Prueba el camino a Fuerte Keld (el peaje), la senda al santuario (el vado), el sendero a las Piedras Grises (un lugar señalado que te espera), una noche en el Bosque Gris o la barca por el lago: en la orilla de Brenna, cambia el modo de viaje a **En barca**; solo va por agua y costa, así que vuelve a **A pie** para desembarcar.
4. Ve hacia el este, a los hexes en blanco: se descubren según avanzas (desmarca **Descubrir el mapa al viajar** para dejarlos en blanco).

El mismo sistema se juega sin mapa en la aplicación Travel.

## Los lugares

Los hexes se dan por sus coordenadas (columna y fila, como las muestra el mapa: `0503` es la columna 5, fila 3).

| Hex            | Lugar                                                               | Qué pasa                                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0608           | **Ashford** (Vado Ceniza), en el Valle (el pueblo, oeste)           | Donde empieza el grupo. Seguro: sin peligro. Pregunta en las puertas con el oráculo _¿Nos dejarán entrar?_; pasa la noche en la posada con _En El Hurón Mojado_ (y luego **Aplicar al viaje**). |
| 0503           | **The Grey Stones** (las Piedras Grises, al norte de Ashford)       | Etiqueta `landmark`: el viaje **se detiene** y te espera a que describas el lugar y pulses **Continuar**.                                                                                       |
| 0909           | **Keld Bridge** (el camino cruza el río)                            | Etiqueta `toll`: llegando por el camino, el guarda se cobra un día de comida.                                                                                                                   |
| 0907           | **El vado** (la senda del santuario cruza el río)                   | Etiqueta `ford`: se tira en el oráculo _Cruzar el vado_ (no en barca).                                                                                                                          |
| 1104           | **El santuario** (borde del Bosque Gris)                            | Etiqueta `shrine`: descansar quita fatiga; una plegaria se responde, una vez.                                                                                                                   |
| 1302–1706      | **The Greywood** (el Bosque Gris, al norte)                         | Peligro 2 (3–4 en su corazón), hexes `haunted` en 1404, 1505 y 1603; la Sierpe (1504), una sola vez.                                                                                            |
| 1011           | **La barca**, Brenna en la orilla del **Saltmere** (el Lago Salado) | Agua: solo la barca cruza el lago.                                                                                                                                                              |
| 1610, 1815     | **Fort Keld**, **Hollow Gate** en **las Hollow Hills**              | Peligro 2: bandidos; cumbres que nadie cruza.                                                                                                                                                   |
| columnas 20–24 | **Unknown lands** (el este en blanco)                               | Se descubren al viajar.                                                                                                                                                                         |

## Qué se tira y cuándo

Todas las comprobaciones están en `travel.yaml`; el diario dice cada una cuando sale.

| Comprobación       | Cuándo                                                                                                                                                 | Tabla                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| Clima              | Cada amanecer                                                                                                                                          | `weather` (por estación)         |
| Perderse           | Cada amanecer, salvo si sales por un camino o río, o en barca                                                                                          | `getting-lost` (+ Orientación)   |
| Encuentro          | Al entrar en un hex con peligro (el Bosque Gris, las Hollow Hills), salvo si llegas por camino                                                         | `encounter` (de día)             |
| Peaje              | Al entrar en Keld Bridge (0909) por el camino                                                                                                          | `toll`                           |
| Vado               | Al entrar en el vado (0907), salvo en barca                                                                                                            | oráculo `ford`                   |
| Santuario          | Al entrar en el santuario (1104)                                                                                                                       | `shrine`                         |
| **Lugar señalado** | Al entrar en las Piedras Grises (0503), o en un lugar señalado descubierto: **sin tabla, pulsa Continuar**                                             | —                                |
| Encuentro nocturno | Al acampar con peligro 2 o más                                                                                                                         | `encounter` (de noche)           |
| Forrajear          | Al pulsar **Forrajear** (una vez al día; 3 horas, la marcha del resto del día a la mitad) en bosque, bosque denso, llanura, cultivos, brezal o marisma | `forage` (+ Supervivencia)       |
| Hambre             | Al acampar sin comida (`party.resources.food` menor que 1); la moral decide cómo va, hasta la deserción                                                | `hunger` (+ Moral) → `desertion` |

**Para ver Continuar**: desde Ashford haz clic en las Piedras Grises (0503) y **Viajar**. El viaje se detiene al llegar con _Lugar señalado: esperando_ y un botón **Continuar** en el panel del viaje; el diario dice lo mismo.

## Dónde está cada cosa

| Qué                                                                                                                               | Fichero                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Reglas de viaje: terrenos, agua, una barca, caballos que comen forraje, clima, descanso                                           | `travel.yaml` (travel-rules)                                                                       |
| Comprobaciones con `edges`, `tags`, `mode`, comparaciones, `any` / `all` / `not`, listas                                          | `travel.yaml` (checks)                                                                             |
| Una comprobación que espera a **Continuar**                                                                                       | `travel.yaml`: `LANDMARK_CHECK_REQUIRED`                                                           |
| Una comprobación resuelta por un **oráculo**, con su entrada desde los bindings                                                   | `travel.yaml`: `FORD_CHECK_REQUIRED`; `travel-tables.yaml`: `ford`                                 |
| Características del grupo en las tiradas (`{{charisma}}`, `{{survival}}`, `{{navigation}}`)                                       | `travel.yaml` (bindings); `reaction`, `forage`, `ford`, `getting-lost`                             |
| Una tabla por estación (una referencia hecha con el contexto)                                                                     | `weather.yaml`: `weather` → `weather-{{season}}`                                                   |
| Pesos, 2d6, dados Fate (4dF)                                                                                                      | `weather.yaml`                                                                                     |
| Resultados que entiende el viaje: `lost`, `weather`, `fatigue`, `resources`                                                       | `travel-tables.yaml`, `weather.yaml`                                                               |
| Valores del día para comprobaciones posteriores (`fordModifier`)                                                                  | `weather.yaml` → `ford`                                                                            |
| Tablas por terreno, región, campo del hex (`danger`), hora del día                                                                | `encounters.yaml`: `encounter`                                                                     |
| Luego tira, `{{result}}`, dados en los textos (`{{1d4+2}}`), `once`                                                               | `encounters.yaml`, `treasure.yaml`                                                                 |
| Generadores, y un generador que lee otro (`{{npc.role}}`)                                                                         | `encounters.yaml`: `npc`, `rumour`                                                                 |
| Quedarse con los mejores (`4d6kh3`), d66, d100                                                                                    | `encounters.yaml`, `treasure.yaml`                                                                 |
| Oráculo con opciones con nombre, una variante con sus propios dados                                                               | `oracles.yaml`: `gates`                                                                            |
| Un mazo con copias, cartas que tiran tablas o dan comida                                                                          | `decks.yaml`: `omens`                                                                              |
| `maxOccurrences`                                                                                                                  | `treasure.yaml`: `prize`                                                                           |
| Descubrir el mapa                                                                                                                 | `discovery.yaml`                                                                                   |
| Valores de regiones (`danger` para todo un bosque), hexes que los cambian, iconos (`{{icon.guards}}`) y tokens (`{{token.fare}}`) | el mapa de ejemplo; `oracles.yaml`: `gates`, `ferry`; `encounters.yaml`                            |
| Comparaciones `gt`, `lt`, `lte`, `eq`, `in`, `not` con un valor, `exists: false`                                                  | `encounters.yaml`, `travel-tables.yaml`: `getting-lost`, `treasure.yaml`: `ruin-delve`             |
| `water` en una condición                                                                                                          | `discovery.yaml`: `hex-contents`                                                                   |
| El valor del día `*Impossible` (`fordImpossible`, lo fijan las tormentas)                                                         | `weather.yaml` → `travel-tables.yaml`: `ford`                                                      |
| Campos de generador con `when`, `value` con plantilla, `context`; `2d6kl1`, `d%`                                                  | `treasure.yaml`: `ruin-delve`                                                                      |
| Tablas de otro pack: `dependencies` y `aliases`                                                                                   | `pack.yaml`; `decks.yaml`: la carta `twist`                                                        |
| Comprobaciones con **nombre** y **descripción** para los jugadores                                                                | `travel.yaml` (checks)                                                                             |
| Una **acción propia del sistema** (Forrajear: tiempo, velocidad del día, una vez al día) y una comprobación en ella               | `travel.yaml`: `actions.forage`, `FORAGE_CHECK_REQUIRED`                                           |
| Tablas que **leen el grupo** (`party.stats.morale`, `party.resources.food`) en dados y condiciones; `exists: false` sin viaje     | `travel-tables.yaml`: `hunger`; `oracles.yaml`: `inn`                                              |
| Una comprobación cuya condición lee el grupo (`when: { party.resources.food: { lt: 1 } }`)                                        | `travel.yaml`: `HUNGER_CHECK_REQUIRED`                                                             |
| Tablas que **cambian el grupo**: `stats` (moral; `hirelings`, una característica que nadie declara), `resources`, `fatigue`       | `encounters.yaml`, `travel-tables.yaml`: `getting-lost`, `shrine`, `hunger`; `oracles.yaml`: `inn` |
| Un valor tirado dentro de un valor y leído por el texto (`food: '{{1d3+1}}'`, `{{resources.food}}`)                               | `travel-tables.yaml`: `forage`                                                                     |
| `maxOccurrences` con `onExhausted: next`, y después una cascada a otra tabla                                                      | `travel-tables.yaml`: `hunger` → `desertion`                                                       |
| Un oráculo cuyas variantes mezclan condiciones, límites, cascadas a una tabla y a un generador, y cambios en el grupo             | `oracles.yaml`: `inn` (El Hurón Mojado)                                                            |
| Estilos de región: el del mapa y regiones con el suyo (un relleno más intenso; un borde discontinuo sin relleno)                  | el mapa de ejemplo: el Bosque Gris, las Hollow Hills                                               |
| Traducciones                                                                                                                      | `locales/es/`                                                                                      |
