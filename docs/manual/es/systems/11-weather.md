# Clima

La pestaña **Clima** edita los modelos de clima que nombra el sistema: clima con inercia, en el que el de hoy depende del de ayer. **Nuevo modelo de clima** añade uno y lo nombra. Lo tira una comprobación (**Se tira en**, en _Clima con inercia_, en [Comprobaciones](06-checks.md)), y las [Reglas](05-rules.md#clima) dicen cuánto frena al grupo cada clima. El YAML: [Modelos de clima](../technical/07-kinds.md#modelos-de-clima).

## Tipos de clima

Cada uno con un nombre y lo que **fija para el día** (`snowbound: true`).

## Estaciones

Para cada estación: cómo **empieza** el clima, y una cuadrícula de pesos, el clima de ayer en filas y el de hoy en columnas. El verano de las Marcas Grises: desde **Despejado**, `clear 5`, `grey 1`, `storm 1`: las rachas de buen tiempo duran.

**En muchos días**, debajo de cada cuadrícula, dice con qué frecuencia sale cada clima en esa estación, para comprobar que se siente bien. **Añadir una estación** para cada estación que use su calendario.

## Flores hexagonales

**Convertir en flor hexagonal** cambia una estación por una flor de 19 casillas (**Usar pesos** la devuelve): un tipo de clima por casilla, en qué **Empieza** el primer día y qué pasa **En el borde**, con lo a menudo que sale cada tipo. El invierno de las Marcas Grises es una.

La flor se dibuja con sus 19 hexes, cada uno del color de su tipo de clima (la leyenda de al lado dice cuál es cuál). Para cambiar casillas, elige un tipo en **Pintar con** y haz clic en las casillas para dárselo.

**Cómo camina el clima.** El clima del día es el de la casilla en que está el día. Cada día 2d6 lo mueve a una casilla vecina, en la dirección que da la tirada (**Adónde va cada 2d6**, la brújula junto a la flor: 2–3 al noreste, 4–5 al este, 6–7 al sureste, 8–9 al suroeste, 10–11 al oeste, 12 al noroeste, salvo que el pack los cambie con `moves`). Así que mañana siempre está al lado de hoy: el clima deriva en vez de saltar. Si el día está en **Lluvia**, en el centro, y 2d6 saca 7, mañana es la casilla de abajo a la derecha. Una tirada que saldría de la flor vuelve por el lado opuesto o se queda donde está (**En el borde**).

Dos cosas le dan forma: **dónde** está cada tipo (6–7, las tiradas más comunes, van al sureste, así que el buen tiempo abajo a la derecha es adonde tienden los días) y **cuántas** casillas tiene cada tipo (tres casillas de cielo despejado salen más que una de tormenta). **En muchos días**, debajo, comprueba el resultado.
