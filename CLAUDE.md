# Hexmapper

Editor de mapas hexagonales para hexcrawl, pensado para jugar a **Kal-Arath**. Inspirado en [Hexfriend](https://hexfriend.net/).

**Filosofía: keep it simple.** Es un editor de mapas con una vista de juego mínima, no una VTT. Ante la duda, no se añade.

## Stack

| Pieza               | Elección                                                  |
| ------------------- | --------------------------------------------------------- |
| Lenguaje            | TypeScript (modo `strict`)                                |
| Build               | Vite                                                      |
| UI                  | Svelte 5 (runes: `$state`, `$derived`, `$effect`)         |
| Render              | PixiJS v8 (WebGL)                                         |
| Matemática hex      | Propia, coordenadas axiales/cúbicas (ref: Red Blob Games) |
| Persistencia        | JSON versionado + autoguardado en IndexedDB               |
| Tests               | Vitest                                                    |
| Calidad             | ESLint + Prettier + `svelte-check`                        |
| Escritorio (futuro) | Tauri                                                     |

Solo dependencias FOSS. Fuentes e iconos con licencias libres (OFL, CC BY, CC0) y atribución en `CREDITS.md`.

## Arquitectura

```
src/
  lib/
    hex/          # Matemática pura: axial<->pixel, vecinos, offset<->axial, redondeo, líneas
    model/        # Tipos del mapa, valores por defecto, migraciones de versión
    store/        # Estado de la app (Svelte runes) + historial undo/redo
    commands/     # Comandos que mutan el mapa (pintar, poner icono, trazar camino...)
    render/       # Escena PixiJS: una capa (Container) por cada capa del modelo
    tools/        # Herramientas de edición (pincel, relleno, icono, camino, texto, jugador, selección)
    io/           # Guardar/cargar JSON, IndexedDB, exportar PNG
    encounters/   # Motor de tablas (dados, d66, procedimientos) + procedimiento de viaje Kal-Arath
    i18n/         # Diccionarios es/en tipados y store del idioma activo
  components/     # UI Svelte: toolbar, paletas, panel de hex, panel de capas, diálogos
  assets/
    icons/        # Set FOSS por defecto
    fonts/
  presets/
    private/      # Tablas con copyright, ignoradas por git
```

Principios:

- **`hex/` y `model/` son TS puro**, sin Pixi ni Svelte, y con tests.
- **Toda mutación del mapa pasa por un comando** para que undo/redo funcione siempre. Un trazo de pincel completo es una sola entrada del historial.
- **El render se deriva del modelo**, no al revés. Pixi no guarda estado propio que haya que serializar.
- Render incremental: se redibujan solo los hexes y capas que cambian.

## Modelo de datos (borrador)

```ts
type HexKey = `${number},${number}` // axial "q,r"

interface HexMap {
  version: number // para migraciones
  meta: { name: string; author?: string; created: string; modified: string }
  grid: {
    orientation: 'flat' | 'pointy'
    hexSize: number
    width: number
    height: number // mapa rectangular, redimensionable
    coordFormat: 'CCRR' | 'axial' // CCRR = 0101, 0102... estilo OSR
  }
  terrains: TerrainType[] // paleta: id, nombre, color, textura/patrón opcional
  hexes: Record<HexKey, HexData>
  paths: Path[] // caminos y ríos
  labels: Label[] // texto libre
  layers: LayerState[] // visibilidad / bloqueo por capa
  assets: Asset[] // iconos importados y token del jugador (data URL embebida)
  encounterTables: EncounterTable[]
  player?: { hex: HexKey; assetId?: string }
}

interface HexData {
  terrain?: string
  icons: { assetId: string; scale?: number; offset?: [number, number] }[]
  name?: string
  notes?: string // Markdown
  pois: { name: string; description?: string }[]
  tags: string[]
  fields: Record<string, string> // stats personalizadas clave-valor
  encounterTable?: string // sobrescribe la tabla del terreno
}

interface Path {
  id: string
  kind: 'road' | 'river' | 'custom'
  hexes: HexKey[] // de centro a centro, con curvas suavizadas
  style: { color: string; width: number; dash?: number[] }
}

interface Label {
  id: string
  text: string
  position: [number, number] // coordenadas de mundo, independientes de la rejilla
  font: string
  size: number
  color: string
  rotation: number
  outline?: { color: string; width: number }
}

interface EncounterTable {
  id: string
  name: string
  dice: string // "1d6", "2d6", "1d20+1"...
  entries: { range: [number, number]; result: string; subtable?: string }[]
  terrains?: string[] // terrenos que la usan por defecto
  builtin?: 'kal-arath' // preset de solo lectura (se puede duplicar)
}
```

Capas fijas, en orden de dibujo: **terreno → caminos/ríos → iconos → texto → coordenadas → jugador**. Cada una se puede ocultar y bloquear. No hay capas creadas por el usuario.

## Funcionalidades

- **Terreno**: paleta editable, pincel de tamaño variable y relleno por zonas.
- **Iconos**: set FOSS por defecto (game-icons.net, CC BY 3.0) e importación de SVG/PNG propios, que se embeben en el fichero del mapa.
- **Caminos y ríos**: trazado de centro a centro entre hexes, curvas suavizadas, estilos configurables, edición y borrado.
- **Metadatos de hex**: panel lateral con nombre, notas en Markdown, POIs, etiquetas y campos personalizados.
- **Coordenadas**: visibles y configurables (CCRR o axial).
- **Orientación**: flat-top o pointy-top, configurable por mapa.
- **Texto**: etiquetas libres con fuente, tamaño, color, rotación y contorno. Mover, editar y borrar. Fuentes OFL incluidas.
- **Capas**: mostrar, ocultar y bloquear.
- **Undo/redo**: Ctrl+Z / Ctrl+Shift+Z, para todas las operaciones.
- **Guardar/cargar**: fichero `.hexmap.json` y autoguardado en IndexedDB.
- **Exportar PNG**: con selección de capas y escala (×1, ×2, ×4).
- **Tablas aleatorias**: tablas propias (crear, editar, importar y exportar) y presets de Kal-Arath. Se tira desde la app y hay un log de tiradas.
- **Jugador**: un token que se mueve de hex en hex, con imagen cargable por el usuario. Nada más: sin niebla de guerra ni segunda pantalla.
- **Idiomas**: interfaz en inglés y castellano desde el principio (ver Convenciones).

## Kal-Arath (soporte nativo)

Según el manual, las tiradas de viaje van **por día de viaje, no por hex** (1 hex = 1 día a pie, unos 30 km; a caballo, el doble). El procedimiento diario es:

1. **Clima**: 1d6 en la tabla de la estación (primavera/verano/otoño/invierno). Cada resultado puede traer modificadores a Perderse y Forrajear, velocidad ×½, sin viaje o una ración extra.
2. **Perderse**: 1d6, con 1–2 te pierdes (te quedas en el hex). **No se tira si vas por un camino, un río u otra referencia**, así que la app lo sabe mirando si el hex del jugador está en un `Path`. Encontrar el camino se tira con desventaja.
3. **Forrajear** (opcional): 1d6 en la tabla de forrajeo, con el modificador del clima. Movimiento ×½. Con un 6 se tira en la tabla de hierbas.
4. **PDI**: 1d6, con 5–6 se tira d66 en la tabla de Puntos de Interés. Algunas entradas enlazan a los generadores de Asentamiento o Mazmorra.
5. **Encuentros**: 1d6, con 5–6 se tira d66 en la tabla de la región y luego una **reacción** de 2d6 + PRE (±ventaja).
6. **Acampar**: 1 ración. Encuentro nocturno con 1–2 en 1d6, y entonces se tira 2d6 en su tabla.
7. **Fin del día**: entrada en el diario.

Lo que hace la app (sin convertirse en una VTT):

- Panel **"Día de viaje"**: estación, opción de forrajear, PRE del grupo y botón **Tirar día**, que ejecuta los pasos en orden y aplica los modificadores entre ellos. Los resultados van al log.
- Desde el log, un clic convierte un PDI o un asentamiento en POI o icono del hex actual.
- **Generadores** de varios pasos: Asentamiento (tamaño, facción, PNJ con rol, motivación y rasgo, recursos, rumores, conflictos y eventos), Mazmorra y Tesoro.
- Contador de días.

Requisitos que esto impone al motor de tablas (`encounters/`): dados `NdM±K`, **d66**, rangos, ventaja/desventaja (dos tiradas, quedarse con la mejor o la peor), modificadores que pasan de un paso a otro, subtablas o enlaces entre tablas, entradas con dados embebidos ("2d6 Bandidos", que se resuelven al tirar) y **procedimientos** (secuencias de tablas con condiciones de activación del tipo "5–6 en 1d6").

> **Copyright**: el contenido de las tablas sale del manual (`~/Descargas/Rol y Wargames/Rol/Solitario/Kal-Arath/`) y **no se sube al repo**. Va en `src/presets/private/` (ignorado por git), que se carga con `import.meta.glob` y funciona igual si está vacío. En el repo solo va el motor, los esquemas y una plantilla vacía. Los presets son por idioma (`kal-arath.es.json`, `kal-arath.en.json`).

## Hoja de ruta

### Fase 0: Esqueleto

- [x] Proyecto Vite + Svelte 5 + TS + PixiJS
- [x] ESLint, Prettier, Vitest, `svelte-check`
- [x] Layout base: lienzo, toolbar, panel lateral
- [x] i18n (es/en) con selector de idioma

### Fase 1: MVP

- [ ] Matemática hex (`hex/`) con tests
- [ ] Rejilla renderizada, zoom y desplazamiento
- [ ] Orientación configurable
- [ ] Paleta de terrenos, pincel y relleno
- [ ] Coordenadas
- [ ] Undo/redo (sistema de comandos)
- [ ] Guardar/cargar JSON y autoguardado IndexedDB

### Fase 2: Contenido del mapa

- [ ] Set de iconos FOSS y colocación sobre hexes
- [ ] Importar iconos propios
- [ ] Caminos y ríos
- [ ] Panel de metadatos de hex

### Fase 3: Presentación

- [ ] Sistema de capas (visibilidad y bloqueo)
- [ ] Herramienta de texto
- [ ] Exportar PNG

### Fase 4: Juego

- [ ] Motor de tablas (dados, d66, ventaja, rangos, subtablas, procedimientos)
- [ ] Editor de tablas propias e importación/exportación
- [ ] Token del jugador con imagen personalizada
- [ ] Kal-Arath: panel "Día de viaje" y contador de días
- [ ] Kal-Arath: generadores de Asentamiento, Mazmorra y Tesoro
- [ ] Kal-Arath: presets locales (es) a partir del manual

### Más adelante (fuera de alcance por ahora)

- Generación procedural de terreno y ríos
- Hexes hijos / submapas
- Texto curvo siguiendo un trazado
- Exportar SVG
- Empaquetado de escritorio con Tauri

### Descartado

- Niebla de guerra, vista de jugadores en segunda pantalla y funciones de VTT (ya hay herramientas para eso)

## Convenciones

- Código, identificadores y comentarios en inglés.
- **UI bilingüe (es/en)**: ningún texto visible va escrito a mano en los componentes; siempre se usa `t('clave')` desde `lib/i18n`. `es.ts` es la referencia y `en.ts` debe tener las mismas claves (el tipado lo comprueba). Cada vez que se añade una clave, se añade en los dos idiomas.
- El idioma se detecta del navegador, se puede cambiar en la UI y se recuerda en `localStorage`. Es una preferencia del usuario, **no** se guarda en el mapa.
- El contenido del usuario (nombres de terrenos, notas, tablas propias) no se traduce. Los valores por defecto (paleta de terrenos, nombres de capas) sí, a través de claves.
- Cada cambio en el formato del mapa sube `version` y añade una migración en `model/migrations.ts`.
- Tests obligatorios para `hex/`, `model/` (serialización y migraciones), `commands/` (do/undo) y `encounters/`.
- Comandos: `npm run dev`, `npm run build`, `npm test`, `npm run check`, `npm run lint`.
