# Caminos, ríos, muros y fronteras

La herramienta **Caminos y ríos** (<kbd>R</kbd>) dibuja líneas de hex a hex.

## Tipos

| Tipo     | Aspecto                                 | Viaje                                                |
| -------- | --------------------------------------- | ---------------------------------------------------- |
| Camino   | marrón continuo                         | se viaja más rápido por él                           |
| Sendero  | marrón discontinuo                      | algo más rápido                                      |
| Río      | azul                                    | se puede seguir (en algunos sistemas, no te pierdes) |
| Muro     | grueso, con piedras                     | solo se dibuja                                       |
| Frontera | rojo discontinuo, también sobre el agua | solo se dibuja                                       |

## Dibujar

- Haz clic en hexes uno tras otro; los intermedios se rellenan en línea recta. Arrastrar dibuja a mano alzada.
- <kbd>Mayús</kbd>+clic coloca el punto donde haces clic dentro del hex (ajustado al centro, los lados o las esquinas); añade <kbd>Ctrl</kbd> para colocarlo libre.
- Vuelve a hacer clic en el último hex, haz clic derecho o pulsa <kbd>Intro</kbd> para terminar. <kbd>Retroceso</kbd> quita el último punto y <kbd>Esc</kbd> cancela.
- **Tramos rectos** dibuja líneas rectas en lugar de curvas; **Cerrado** une el final con el principio (útil para fronteras).

Los caminos, senderos y ríos se detienen en la orilla de lagos y mares; las fronteras los cruzan.

## Editar

Sin ninguna línea en curso, los tiradores blancos son los puntos que colocaste:

- Arrastra un tirador para moverlo, incluso a otro hex (la línea se recalcula).
- Haz clic en un tirador para seguir dibujando desde él: desde un extremo alarga la línea, desde el medio empieza un ramal.
- Clic derecho en un tirador lo centra en su hex.

El panel del hex lista las líneas que cruzan el hex seleccionado: cámbialas entre curvas y rectas o entre abiertas y cerradas, o bórralas.
