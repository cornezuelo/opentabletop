# Hoja

La pestaña **Hoja** edita lo que tiene cada personaje del grupo (`kind: sheet`, una por sistema). **Nueva hoja** hace una pequeña y la nombra en el sistema. Sin hoja, el grupo se juega como un todo; con ella, los viajes tienen una sección **Personajes** ([Jugar un viaje](../travel/02-playing.md#personajes)), y la pestaña [Comprobaciones](06-checks.md) dice qué características del grupo salen de ellos y qué provisiones llevan. El YAML de una hoja: [Hojas](../technical/07-kinds.md#hojas).

## Qué tiene una hoja

- Su **Nombre**.
- Sus **Valores**, cada uno con un nombre, el valor en que **Empieza**, **Mín.** y **Máx.** (un número, u otro valor entre llaves, `'{{maxHealth}}'`: tan alto como el maxHealth del personaje), **Contador** (se muestra como casillas, tantas como su máximo) y **Grupo**.
- Los **Grupos** bajo los que se muestran los valores, en orden, con sus nombres.
- Sus **Estados**, cada uno con lo que **Bloquea** a todo el grupo mientras alguien lo tenga: `travel`, una de las acciones del sistema, `mode.horse` (la casilla los sugiere).
- Sus **Tipos de relación**, con los límites del número que lleva una (un vínculo de 0 a 3).
