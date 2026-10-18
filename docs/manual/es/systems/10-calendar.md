# Calendario

La pestaña **Calendario** edita el calendario que nombra el sistema (uno). **Nuevo calendario** hace uno a partir de una plantilla pequeña y lo nombra. El YAML: [Calendarios](../technical/07-kinds.md#calendarios).

## Qué tiene

- Su nombre, el año y el día del día 1, las horas de un día y de una guardia (la forma antigua de una división `watch`). El reloj del mundo avanza el tiempo por sus divisiones del día (abajo).
- Sus **divisiones del día**, tantas como quiera el sistema (comidas, guardias, campanadas…): cada una con su id (cómo la leerán las condiciones, `time.<id>`), su nombre, y o bien **Sus propias partes** (filas con un id, un nombre, **Desde**, **Hasta** si acaba antes de la siguiente parte, y **Etiquetas**, palabras separadas por comas) o bien **Cada N horas** (partes numeradas de la misma duración desde la medianoche). **Añadir una división** añade una; × la quita. El panel Mundo del Hexmapper avanza el tiempo hasta sus partes. El YAML: [Divisiones del día](../technical/07-kinds.md#calendarios).
- Sus **meses** en orden, cada uno con sus días y su estación (cualquier nombre: `spring`, o la `wet` de tu mundo), con la longitud del año debajo. Renombrar un mes arrastra sus fiestas, sus traducciones y el día 1.
- Los **días de la semana**.
- Las **lunas**, con su ciclo y su desfase.
- Las **fiestas**, en un mes y un día.

Las flechas reordenan una lista.
