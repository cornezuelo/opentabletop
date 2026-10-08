# Core

**Core** es el pack genérico que traen todas las aplicaciones: herramientas para cualquier partida, sin ambientación ni reglas de viaje. Tiene licencia MIT y está escrito en inglés, con traducción al español.

| Definición                                     | Para qué sirve                                                                                                                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **¿Sí o no?** (oráculo)                        | Haz una pregunta de sí o no y elige lo probable que es. El oráculo clásico del juego en solitario.                                                                         |
| **¿Cómo se lo toman?** (oráculo)               | Cómo responde alguien a una petición: cuanto más pides, más difícil es el sí. Cada respuesta trae un **Motivo**.                                                           |
| **Inspiración** (generador)                    | Una acción y un asunto (`{{action.text}} {{subject.text}}`) para sacar una idea cuando te atascas.                                                                         |
| **Giro de escena** (tabla)                     | Al empezar una escena: con un 1 no sale como esperabas. Ofrece ventaja cuando todo está tranquilo y desventaja cuando hay tensión.                                         |
| **Ventaja** y **Desventaja** (modos de tirada) | Tirar dos veces y quedarse con el total más alto o el más bajo. Las ofrecen las tablas de Core, y cualquier pack que dependa de Core (`modes: [advantage, disadvantage]`). |
| **Giros** y **Complicaciones**                 | Qué cambia, y un mazo de complicaciones del que robar (una carta no vuelve hasta que barajas).                                                                             |

Core no tiene sistema de viaje a propósito: los viajes sin pack usan las reglas **Genéricas** integradas en las aplicaciones (el ejemplo más pequeño de sistema: acampar duerme hasta el alba, descansar es una hora y **Comer** es una acción que el sistema hace por sí solo al acabar cada día, `on: day-end`, gastando 1 de comida, que nunca baja de 0, `min: 0`; un lago se cruza sobre el hielo en invierno, `passable: { when: { season: winter } }`), y un sistema de viaje completo vive en su propio pack. Para uno que lo usa todo, mira [Las Marcas Grises](02-grey-marches.md).

Para cambiar Core, haz una copia (**Editar una copia** en la aplicación Oracle): tu copia sustituye a la incluida en tu navegador. Cuando una versión nueva cambia Core, tu copia se marca como **actualización** y te deja aceptar o conservar cada cambio (mira [Actualizaciones de los packs incluidos](../oracle/03-packs.md#de-donde-vienen-los-packs)).
