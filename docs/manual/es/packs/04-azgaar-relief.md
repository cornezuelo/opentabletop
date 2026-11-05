# Iconos de relieve de Azgaar

**Iconos de relieve de Azgaar** es un pack incluido que solo tiene imágenes, sin definiciones: los iconos de relieve del [Fantasy Map Generator de Azgaar](https://github.com/Azgaar/Fantasy-Map-Generator), de Max Haniyeu, para que los [estilos de mapa](../systems/20-map-styles.md) dibujen terrenos con ellos. Tiene licencia MIT, que permite también los mapas e imágenes que se hagan con ellos. El estilo **Relieve** de Core y el **Atlas grabado** de las Marcas Grises dibujan con él, y los dos packs dependen de él.

## Qué tiene

Dos de los conjuntos del generador, cada uno en su carpeta, con los mismos 34 dibujos:

- `colored/`: colores planos, montañas grises, árboles verdes (el **Relieve** de Core);
- `illustrated/`: dibujados en tonos tierra con líneas oscuras, como un atlas antiguo (el **Atlas grabado** de las Marcas Grises). Las líneas toman su color de los estilos del propio generador, que una imagen no tiene, así que aquí lo dice cada fichero (un marrón oscuro); por lo demás están como los tiene el generador.

Los dibujos: `mount-1` a `mount-6`, `mountSnow-1` a `mountSnow-6`, `hill-1` a `hill-4`, `conifer-1`, `coniferSnow-1`, `deciduous-1`, `deciduous-2`, `acacia-1`, `palm-1`, `deadTree-1`, `deadTree-2`, `cactus-1` a `cactus-3`, `dune-1`, `grass-1`, `swamp-1`, `swamp-2`, `vulcan-1` a `vulcan-3`. Míralos en la Oráculo: abre el pack en su columna izquierda y se listan sus ficheros, cada uno en pequeño.

## Usarlos en un estilo tuyo

Un estilo nombra una imagen por el id del pack y su ruta: `azgaar-relief/illustrated/hill-2.svg`. Haz una copia de un estilo (los **Estilos de mapa** de Sistemas, o **Ajustes del mapa → Estilo → Hacer una copia**) y, en su ficha **Arte**, pon el pintor de un terreno en **imágenes (debajo)** y añade las que quieras (se sugieren mientras escribes); varias para un terreno dan a cada casilla una de ellas. **Cuántas** muestra una casilla y **Tamaño** dicen cómo la llenan; **Color** las tiñe. En YAML:

```yaml
kind: style
id: my-relief
art:
  terrains:
    hills: { images: [azgaar-relief/colored/hill-1.svg, azgaar-relief/colored/hill-3.svg] }
    forest: { images: azgaar-relief/illustrated/conifer-1.svg, count: 3 }
```

Tus propios dibujos van en un pack tuyo con el **+ Imagen** de la Oráculo ([Packs](../oracle/03-packs.md)).
