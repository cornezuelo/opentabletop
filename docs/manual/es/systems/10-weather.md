# Clima

La pestaña **Clima** edita los modelos de clima que nombra el sistema: clima con inercia, en el que el de hoy depende del de ayer. **Nuevo modelo de clima** añade uno y lo nombra. Lo tira una comprobación (**Se tira en**, en _Clima con inercia_, en [Comprobaciones](06-checks.md)), y las [Reglas](05-rules.md#clima) dicen cuánto frena al grupo cada clima. El YAML: [Modelos de clima](../technical/07-kinds.md#modelos-de-clima).

## Tipos de clima

Cada uno con un nombre y lo que **fija para el día** (`snowbound: true`).

## Estaciones

Para cada estación: cómo **empieza** el clima, y una cuadrícula de pesos, el clima de ayer en filas y el de hoy en columnas. El verano de las Marcas Grises: desde **Despejado**, `clear 5`, `grey 1`, `storm 1`: las rachas de buen tiempo duran.

**En muchos días**, debajo de cada cuadrícula, dice con qué frecuencia sale cada clima en esa estación, para comprobar que se siente bien. **Añadir una estación** para cada estación que use su calendario.

## Flores hexagonales

**Convertir en flor hexagonal** cambia una estación por una flor de 19 casillas (**Usar pesos** la devuelve): un tipo de clima por casilla, en qué **Empieza** el primer día y qué pasa **En el borde**, con lo a menudo que sale cada tipo. El invierno de las Marcas Grises es una.
