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

- Terreno: paleta, pincel con radio, relleno por zonas, borrar (clic derecho), cuentagotas (Alt + clic).
- Rejilla: orientación flat/pointy, coordenadas CCRR o axiales (legibles sobre hexes vacíos y pintados), zoom y desplazamiento.
- Metadatos de hex: nombre, notas Markdown (marked + DOMPurify), PDIs, etiquetas y campos con autocompletado, nota enlazada (`note-refs`), marcador dorado en el mapa.
- Tamaño: por hexes o por papel (A5–A1, Carta, Legal, Tabloide, personalizado; orientación y margen), tamaño del hex en mm con atajos (¾", 25 mm, 1", 30 mm, 1½"), tamaño impreso y papel mínimo en el que cabe.
- Deshacer/rehacer, guardar/abrir `<id>.hexmap.json`, autoguardado en IndexedDB, atajos de teclado, UI es/en.

Pendiente: ver la hoja de ruta.

## Integración con apps de notas

- **Del mapa a las notas (hecho):** el hex guarda una ruta genérica y el proveedor elegido en Preferencias (SilverBullet u Obsidian) la convierte en URL. Ver `@open-tabletop/note-refs`.
- **De las notas al mapa (pendiente):** el ID único del mapa (`meta.id`) ya existe y da nombre al fichero. Falta una **biblioteca local de mapas** en IndexedDB indexada por ID y **deep links** `#/<id>/<hex>` que abran el mapa y centren el hex. Solo funcionan con mapas que este navegador conoce; si falta, se pide abrir `<id>.hexmap.json`. Compartir entre dispositivos requeriría servidor y queda fuera de alcance.

## Hoja de ruta

### Hecho

- [x] Fases 0–1: esqueleto, rejilla, terreno, deshacer/rehacer, guardar/cargar, autoguardado.
- [x] Metadatos de hex, notas enlazadas por proveedor, tamaño físico e impresión, ID único de mapa.

### Contenido del mapa

- [ ] Caminos y ríos: trazado de centro a centro con curvas suavizadas. **Requisito del Travel Engine** (las carreteras cambian el movimiento y, en Kal-Arath, impiden perderse).
- [ ] Set de iconos FOSS (game-icons.net, CC BY 3.0, con atribución en `CREDITS.md`) e importación de SVG/PNG propios embebidos en el fichero.
- [ ] Escala del mundo (`hexKm`) y campos de hex que usa el viaje (bioma, elevación, peligro, región).
- [ ] Biblioteca local de mapas y deep links.

### Presentación

- [ ] Capas fijas (terreno → caminos/ríos → iconos → texto → coordenadas → grupo), cada una con opción de ocultar y bloquear.
- [ ] Herramienta de texto: fuente (OFL), tamaño, color, rotación, contorno.
- [ ] Exportar PNG (con selección de capas y escala) y **PDF a escala real** respetando `print.hexMm`; más adelante, repartido en varios folios.

### Juego (con los motores)

- [ ] Migración al formato OTD.
- [ ] Modo Travel/Play: token del grupo (imagen personalizable), ruta sobre el mapa y panel del Travel Engine.
- [ ] Panel del Oracle incrustado, con historial.

### Más adelante

- Generación procedural, submapas, texto curvo, exportar SVG, empaquetado de escritorio con Tauri.

### Descartado

- Rejilla cuadrada: para eso ya existen editores FOSS mejores (Tiled, etc.).
- Niebla de guerra, vista de jugadores en segunda pantalla y funciones de VTT.
