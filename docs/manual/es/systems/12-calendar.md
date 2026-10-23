# Calendario

La pestaña **Calendario** edita el calendario que nombra el sistema (uno). **Nuevo calendario** hace uno a partir de una plantilla pequeña y lo nombra. El YAML: [Calendarios](../technical/07-kinds.md#calendarios).

## Qué tiene

- Su nombre, el año y el día del día 1, las horas de un día. El reloj del mundo avanza el tiempo por sus divisiones del día (abajo).
- Sus **divisiones del día**, tantas como quiera el sistema (comidas, guardias, campanadas…): cada una con su id (cómo la leerán las condiciones, `time.<id>`), su nombre, sus partes (filas con un id, un nombre, **Desde**, **Hasta** si acaba antes de la siguiente parte, y **Etiquetas**, palabras separadas por comas) y una **franja del día** de medianoche a medianoche, cada parte un tramo en su color y los huecos en blanco, para ver de un vistazo lo que hacen las filas (al pasar por encima de un tramo dice sus horas). **Añadir una división** añade una; × la quita.

  Dos maneras de hacer las partes. **Tramos propios**, cada uno desde su hora (la mañana desde las 06:00, la noche desde las 20:00 con la etiqueta `dark`, las comidas): escribe las filas, que se leen como `time.part: night`. **Turnos numerados de la misma duración** (guardias, campanadas): **Dividir en partes iguales…** pregunta cuántas horas cada uno y escribe las filas, numeradas desde la medianoche (4 horas: **1** desde las 00:00 … **6** desde las 20:00, así que `time.watch: 2` es de 04:00 a 08:00), para renombrarlas o ajustarlas; las partes que se llaman todas con números enteros se leen como números. Una división que el YAML escribe con `every` enseña sus partes en la franja, y **Escribirlas como filas** la convierte en filas. El panel Mundo del Hexmapper avanza el tiempo hasta sus partes. El YAML: [Divisiones del día](../technical/07-kinds.md#calendarios).

- Sus **meses** en orden, cada uno con sus días y su estación (cualquier nombre: `spring`, o la `wet` de tu mundo), con la longitud del año debajo. Renombrar un mes arrastra sus fiestas, sus traducciones y el día 1.
- Los **días de la semana**.
- Las **lunas**, con su ciclo y su desfase.
- Las **fiestas**, en un mes y un día.

Las flechas reordenan una lista.
