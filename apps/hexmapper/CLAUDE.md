# Hexmapper

Editor de mapas hexagonales para hexcrawl, inspirado en [Hexfriend](https://hexfriend.net/). Es una app del ecosistema OpenTabletop: lee primero el `CLAUDE.md` de la raíz.

**Responsabilidad:** geografía. El hexmapper dibuja el mapa y guarda sus datos persistentes (terreno, caminos, ríos, POIs, metadatos), y aloja la UI de los motores cuando se incrustan (modo Travel/Play). No resuelve tablas ni calcula viajes: eso lo hacen `oracle-engine` y `travel-engine`, conectados a través de `session`.

**Keep it simple:** no es una VTT ni un gestor de campaña.

## Arquitectura

```
src/
  lib/
    model/        # tipos del mapa, normalización de hexes, serialización y migraciones (pasará a @open-tabletop/schema)
    commands/     # comandos reversibles (pintar, editar hex, ajustes) + History
    store/        # estado de la app con runes: editor, preferencias, toasts, vista
    render/       # MapRenderer (PixiJS): capas, pan/zoom, entrada de puntero → herramientas
    tools/        # herramientas de edición (seleccionar, terreno…)
    print/        # papel, tamaño físico del hex, ajuste de rejilla al papel
    io/           # ficheros, autoguardado en IndexedDB
    i18n/         # diccionarios es/en tipados (pasará a @open-tabletop/ui-kit)
  components/     # UI Svelte (paneles, toolbar…); components/hex/ = editor de metadatos del hex
```

Usa `@open-tabletop/hex` (matemática de rejilla) y `@open-tabletop/note-refs` (enlaces a notas).

Principios:

- **Toda mutación del mapa pasa por un comando**, para que deshacer/rehacer funcione siempre. Un trazo de pincel completo es una sola entrada del historial; `editor.editHex()` es un paso por edición.
- **El render se deriva del modelo.** Pixi no guarda estado que haya que serializar. El render es incremental: los hexes comparten un `GraphicsContext` por terreno y al pintar solo se cambia el contexto.
- **El mapa no es reactivo en profundidad**: es un objeto plano, y lo que muestra la UI se copia a snapshots reactivos (`editor.grid`, `editor.print`…) en cada cambio.
- Al hacer clic en el lienzo se quita el foco del campo activo del panel antes de que una herramienta cambie la selección, para no perder ediciones a medias.

## Modelo de datos actual

Ver `src/lib/model/types.ts`. Se migrará a las entidades OTD (`docs/otd.md`): `HexMap` → `Map`, `HexData` → `Hex`, los PDIs pasan a ser entidades `POI` con `location`, `fields` → `stats`, `note` → `noteRef`, y lo de render e impresión → `ext.hexmapper`.

**Los hexes se guardan por coordenadas offset (`col,row`), no axiales.** Offset "odd-q" en flat-top y "odd-r" en pointy-top. Así, al cambiar la orientación cada celda conserva su contenido y su etiqueta CCRR. La matemática se hace en axial (`@open-tabletop/hex`). Al reducir el mapa, los datos de las celdas que quedan fuera se conservan, así que deshacer no pierde nada.

**Dos escalas distintas, que no hay que confundir:**

- **Impresión:** `print.hexMm`, tamaño físico del hex en papel (entre lados planos, como las peanas).
- **Mundo:** km por hex, para el viaje. Por ejemplo, Kal-Arath usa 30 km. Pendiente de añadir al modelo (`Map.scale.hexKm`).

## Funcionalidades

Hecho:

- **Terreno:** paleta editable (nombre, color, agua, añadir y borrar), pincel con radio, relleno por zonas, borrar (clic derecho), cuentagotas (Ctrl + clic).
- **Rejilla:** orientación flat/pointy, coordenadas CCRR o axiales, zoom y desplazamiento, cursor en cruz propio con el punto activo centrado.
- **Caminos, senderos y ríos:**
  - _Nodos_ (puntos colocados por el usuario, los que se dibujan) frente a _hexes atravesados_ (solo para el viaje).
  - Curvas suaves o tramos rectos; desplazamiento dentro del hex con ajuste magnético (Mayús + clic al dibujar; Ctrl para colocar libre).
  - Arrastrar nodos, incluso a otros hexes, con reenrutado; clic en un nodo para seguir dibujando (alarga desde un extremo, rama desde el medio).
  - Se detienen en la orilla de los hexes de agua.
- **Iconos:** 72 de game-icons.net y propios (SVG/PNG/JPEG/WebP); color, tamaño, rotación, volteo, halo (color y tamaño) y contorno (color y grosor), con vista previa en vivo.
- **Texto:** etiquetas con fuente (IM Fell English, Cinzel, sans), tamaño, color, rotación, cursiva y halo (color y grosor); también fuera de la rejilla.
- **Metadatos de hex:** nombre, notas Markdown (marked + DOMPurify), PDIs (con nota enlazada), etiquetas y campos con autocompletado, nota enlazada (`note-refs`), marcador dorado en el mapa, enlace copiable al hex.
- **Capas fijas:** terreno, rejilla, caminos, iconos, coordenadas, texto y marcadores, cada una con opción de ocultar y bloquear.
- **Tamaño:** por hexes o por papel (A5–A1, Carta, Legal, Tabloide, personalizado), tamaño del hex en mm con atajos, tamaño impreso y papel mínimo.
- **Exportar:** PNG por píxeles por hex (pensado para VTTs, con fondo transparente opcional) y **PDF a escala real** (150/300 dpi).
- **Biblioteca local de mapas** en IndexedDB, con migración del autoguardado antiguo; **deep links** `#/<id>/<hex>`; diálogo al crear un mapa nuevo (guardar en fichero / crear / cancelar).
- **General:** deshacer/rehacer, autoguardado robusto (copia síncrona al cerrar la pestaña), atajos de teclado, UI en/es (inglés por defecto), Configuración/Exportar/Mapas como vistas del panel lateral.

**Etiquetas de hex: usos previstos.** Filtrar o resaltar hexes por etiqueta en el mapa, pasarlas como contexto a las tablas del Oracle (`when: { tags: … }`) y usarlas en reglas de viaje (por ejemplo, `landmark` facilita orientarse).

## Integración con apps de notas

- **Del mapa a las notas (hecho):** el hex guarda una ruta genérica y el proveedor elegido en Preferencias (SilverBullet u Obsidian) la convierte en URL. Ver `@open-tabletop/note-refs`.
- **De las notas al mapa (pendiente):** el ID único del mapa (`meta.id`) ya existe y da nombre al fichero. Falta una **biblioteca local de mapas** en IndexedDB indexada por ID y **deep links** `#/<id>/<hex>` que abran el mapa y centren el hex. Solo funcionan con mapas que este navegador conoce; si falta, se pide abrir `<id>.hexmap.json`. Compartir entre dispositivos requeriría servidor y queda fuera de alcance.

## Hoja de ruta

### Hecho

- [x] Fases 0–1: esqueleto, rejilla, terreno, deshacer/rehacer, guardar/cargar, autoguardado.
- [x] Metadatos de hex, notas enlazadas por proveedor, tamaño físico e impresión, ID único de mapa.
- [x] Caminos y ríos (nodos, orillas, desplazamientos, ramas), iconos con estilos, texto, capas, paleta editable.
- [x] Exportar PNG y PDF a escala real.
- [x] Biblioteca local de mapas y deep links.

### Pendiente

- [ ] Escala del mundo (`hexKm`) y campos de hex que usa el viaje (bioma, elevación, peligro, región). Va con la migración a OTD.
- [ ] Resaltar o filtrar hexes por etiqueta.
- [ ] PDF repartido en varios folios para mapas grandes, y opción de imprimir los hexes vacíos en blanco.
- [ ] Traducir los nombres de los iconos (ahora en inglés, que es como vienen de game-icons).

### Juego (con los motores)

- [ ] Migración al formato OTD.
- [ ] Modo Travel/Play: token del grupo (imagen personalizable), ruta sobre el mapa y panel del Travel Engine.
- [ ] Panel del Oracle incrustado, con historial.

### Más adelante

- Generación procedural, submapas, texto curvo, exportar SVG, empaquetado de escritorio con Tauri.

### Descartado

- Rejilla cuadrada: para eso ya existen editores FOSS mejores (Tiled, etc.).
- Niebla de guerra, vista de jugadores en segunda pantalla y funciones de VTT.
