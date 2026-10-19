# Hoja

La pestaña **Hoja** edita las dos hojas del sistema, las dos opcionales (`kind: sheet`): **la de sus personajes** (`sheet`), lo que tiene cada personaje, y **la del propio grupo** (`partySheet`), lo que es de todo el grupo (moral, fatiga, mercenarios…) en cada viaje, viaje quien viaje. Con las dos, una pestaña encima del formulario elige cuál. **Nueva hoja de personajes** y **Nueva hoja de grupo** hacen una pequeña y la nombran en el sistema. La hoja del grupo sale como **El grupo** en cada viaje, encima de los personajes; las tablas la leen como `party.values.morale`, y una característica del grupo puede ser uno de sus valores (**De las hojas** en [Comprobaciones](06-checks.md): `party: morale`). Sin hoja de personajes, el grupo se juega como un todo; con ella, los viajes tienen una sección **Personajes** ([Jugar un viaje](../travel/02-playing.md#personajes)), y la pestaña [Comprobaciones](06-checks.md) dice qué características del grupo salen de ellos y qué provisiones llevan. El YAML de una hoja: [Hojas](../technical/07-kinds.md#hojas).

## Qué tiene una hoja

- Su **Nombre** y su **Descripción** (para qué es la hoja).
- Sus **Valores**, cada uno con un nombre, el valor en que **Empieza**, **Mín.** y **Máx.** (un número, u otro valor entre llaves, `'{{maxHealth}}'`: tan alto como el maxHealth del personaje), **Contador** (se muestra como casillas, tantas como su máximo) y **Grupo**.
- Los **Grupos** bajo los que se muestran los valores, en orden, con sus nombres.
- Sus **Estados**, cada uno con lo que **Bloquea** a todo el grupo mientras alguien lo tenga: `travel`, una de las acciones del sistema, `mode.horse` (la casilla los sugiere).
- Sus **Tipos de relación**, con los límites del número que lleva una (un vínculo de 0 a 3).

Los valores, grupos, estados y tipos de relación tienen cada uno una **Descripción (su ayuda)**: qué es, en una o dos frases. Donde se enseñe la hoja (la ficha de un personaje, la del grupo, la de una facción), su nombre aparece subrayado y al hacer clic la columna de ayuda enseña primero esa descripción, antes de lo que añaden las aplicaciones (cómo lo leen las tablas, sus límites, lo que bloquea). Como los nombres, se escribe en el idioma actual: el del pack o su fichero de traducción. Las Marcas Grises describen cada parte de las suyas.
