# Iconos y texto

## Iconos

La herramienta **Iconos** (<kbd>I</kbd>) coloca un icono por hex: castillos, aldeas, ruinas, cuevas…

- Elige un icono (búscalo o filtra por categoría) y haz clic en los hexes para colocarlo.
- Haz clic en un icono colocado para editarlo; arrástralo a otro hex (queda centrado; <kbd>Mayús</kbd> mantiene una posición libre dentro del hex). Clic derecho o <kbd>Supr</kbd> lo quita y <kbd>Ctrl</kbd>+clic copia un icono y su estilo.
- **Estilo**: color, tamaño, rotación, volteo, un halo detrás y un contorno. Los iconos nuevos usan el último estilo. El color **Auto** usa tinta oscura en los hexes pintados y clara en los vacíos, para que los iconos siempre se vean.
- **Importa** tus propias imágenes (SVG, PNG, JPEG, WebP); se guardan dentro del mapa.

Los iconos son de [game-icons.net](https://game-icons.net) (CC BY 3.0).

### Valores de un icono

Selecciona un icono colocado (haz clic en él con la herramienta Iconos) para darle **campos**: un pueblo con `guards: 0`, un fuerte con `guards: 2`. Las tablas que se tiran en su hex los leen como `{{icon.guards}}` (y `{{icon.id}}` es el propio icono). El oráculo _¿Nos dejarán entrar?_ de las Marcas Grises suma los guardias de la puerta a la que preguntas.

## Texto

La herramienta **Texto** (<kbd>T</kbd>) escribe rótulos libres en cualquier sitio, incluso fuera de la rejilla: nombres de mares, cordilleras, caminos… Haz clic en un espacio vacío para añadir uno, haz clic en un rótulo para editarlo y arrástralo para moverlo. Fuente (IM Fell English, Cinzel o sans), tamaño, color, rotación, cursiva y halo.

## Nombres de hex

El nombre de un hex (se pone en el panel del hex) se dibuja debajo de él. Los nombres se configuran en dos sitios:

- **Ajustes → Textos del mapa**: si se muestran los nombres de hex, de región y de token, y el estilo de cada tipo (fuente, tamaño, color, cursiva y halo).
- **El panel de cada elemento** (el hex, la región, el token): **Mostrar el nombre en el mapa** para ese en concreto, y **Estilo**: el del mapa o uno propio.
