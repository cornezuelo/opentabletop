# OpenTabletop

Ecosistema FOSS de herramientas para **rol en solitario, hexcrawl y campañas sandbox**. Empezó como un editor de mapas hexagonales para jugar a **Kal-Arath** y crece como un conjunto de librerías reutilizables más varias apps que las usan.

La gracia es que sea **agnóstico del sistema de juego**. Kal-Arath es el primer sistema soportado y sirve para validar el diseño, pero nada de sus reglas va en el núcleo: vive en un _pack_ de datos.

## Principios

1. **Separar responsabilidades siempre que tenga sentido.** Paquetes pequeños con interfaces claras, y composición en lugar de "managers" gigantes.
2. **Núcleos headless.** Los motores (`*-engine`) y los paquetes de dominio son TypeScript puro: sin Svelte, sin DOM, sin `localStorage`, sin red. La persistencia, la UI y el sistema de ficheros van en adaptadores.
3. **Datos, no código.** Las reglas de cada sistema se declaran en packs (YAML/JSON) que se validan al cargar. Nada de `eval`, `Function()` ni scripts embebidos: los packs pueden venir de terceros.
4. **Definiciones ≠ estado.** Lo estático (tablas, reglas, mapa) se separa del estado de partida (cartas robadas, posición del grupo, hora). Guardar una partida no modifica los ficheros de definición.
5. **Motores desacoplados entre sí.** Se comunican con eventos y puertos, nunca llamándose directamente. Por ejemplo, el Travel Engine emite `ENCOUNTER_CHECK_REQUIRED` y una capa de integración decide qué tabla del Oracle resolver.
6. **Estado inmutable y funciones puras** en los motores: `(estado, acción) → { estado, eventos }`. Es fácil de testear, de deshacer y de reproducir.
7. **Aleatoriedad inyectable.** Ningún motor llama a `Math.random()`: todos reciben un `RandomSource`, que puede ser con semilla para tests y repeticiones.
8. **El lore vive fuera.** Notas, PNJs y facciones en detalle viven en la app de notas del usuario (SilverBullet, Obsidian…). OpenTabletop guarda estado mecánico y **referencias** (`noteRef`), sin duplicar contenido.
9. **Keep it simple.** Las apps no son VTTs ni gestores de campaña. Ante la duda, no se añade.

## Estructura del monorepo

npm workspaces. Los paquetes se consumen como fuente TS (`exports` → `src/index.ts`) y Vite los transpila. Para publicarlos en npm se añadirá un paso de build por paquete.

```
packages/                   # librerías, scope @open-tabletop/*
  hex/                      # ✅ matemática de rejilla hexagonal (axial/offset, píxel, vecinos, líneas, relleno)
  note-refs/                # ✅ enlaces a apps de notas externas (SilverBullet, Obsidian…) por proveedores
  random/                   # ⏳ RandomSource, PRNG con semilla
  dice/                     # ⏳ expresiones de dados con desglose (NdM±K, d66, dF, ventaja…)
  conditions/               # ⏳ evaluador seguro de condiciones (sin eval), compartido por oracle y travel
  time/                     # ⏳ GameTime (minutos absolutos), calendarios, estaciones, guardias
  schema/                   # ⏳ esquema OTD (OpenTabletop Data) con Zod → tipos TS + JSON Schema
  oracle-engine/            # ⏳ tablas, oráculos, generadores, mazos; packs; historial
  travel-engine/            # ⏳ viaje: reloj, rutas A*, movimiento, recursos, fatiga, navegación
  weather-engine/           # ⏳ clima con inercia (Markov / hex flower), desacoplado del viaje
  session/                  # ⏳ capa de integración: orquesta motores, journal, puertos de persistencia
  ui-kit/                   # ⏳ Svelte compartido: tema, i18n, componentes base
  oracle-ui/  travel-ui/    # ⏳ componentes Svelte de cada motor, incrustables
apps/
  hexmapper/                # ✅ editor de mapas (ver apps/hexmapper/CLAUDE.md)
  oracle/                   # ⏳ app standalone del oráculo
  travel/                   # ⏳ app standalone de viaje
packs/                      # packs de datos (tablas, reglas de viaje, clima…)
  core/                     # ⏳ contenido genérico FOSS (oráculo sí/no, etc.)
  kal-arath/                # ⏳ manifiesto y README; las tablas (uso personal) van en el repo privado de packs
packs-private/              # ⏳ (ignorado) checkout del repo privado de packs de uso personal
docs/
  otd.md                    # esquema común OpenTabletop Data
  oracle-engine.md          # diseño del Oracle Engine
  travel-engine.md          # diseño del Travel Engine
```

✅ hecho · ⏳ diseñado o pendiente

**Dependencias permitidas** (de arriba abajo, nunca al revés):

```
apps  →  *-ui, ui-kit  →  session  →  *-engine  →  dice, conditions, time, hex  →  random
                                         ↘ schema (solo tipos/validación de datos persistidos)
```

- Un motor **no importa otro motor**. Lo que necesitan compartir (dados, tiempo, condiciones) se extrae a un paquete inferior.
- `note-refs` no depende de nada. Ningún motor depende de `note-refs`: las referencias externas son strings opacos para ellos.

## Esquema común: OpenTabletop Data (OTD)

Detalle en [`docs/otd.md`](docs/otd.md). En resumen:

- **Entidades de campaña:** Campaign, Map (con Hex), POI, Party, Character, Faction, Clock y LogEntry (el "Event" persistido). Todas comparten una base `{ id, type, name, tags, noteRef, refs, ext }`.
- **Definiciones de packs:** Table, Generator, Oracle y Deck (del Oracle Engine), además de reglas de viaje y modelos de clima. Viven en packs versionados con namespaces (`kal-arath/reaction`).
- **`ext.<namespace>`** guarda lo propio de cada app o sistema sin ensuciar el núcleo. Por ejemplo, `ext.hexmapper` (render, impresión) o `ext.kal-arath`.
- **Referencias** por string `tipo:id`, nunca anidando objetos.
- **Eventos en tiempo de ejecución** (`HEX_ENTERED`, `TABLE_RESOLVED`…): son mensajes entre motores y no se persisten. Lo que importa para la partida se guarda como `LogEntry`.

## Packs, fuentes y licencias

Un pack es una carpeta con `pack.yaml` (id, versión, idioma, licencia, dependencias) y definiciones en YAML/JSON. Se valida al cargar: referencias rotas, rangos solapados, ciclos, dependencias que faltan.

**Objetivo: que las apps vengan precargadas con oráculos de muchos juegos.** Cada pack se distribuye por el canal que permita su licencia, y el motor carga todos los packs que encuentre en sus **fuentes**:

| Fuente                    | Qué contiene                                                                                                                          | Dónde                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Packs abiertos**        | Contenido propio FOSS (`core`) y de juegos con licencia abierta que permita redistribuir (CC BY, CC BY-SA, ORC, OGL…), con atribución | `packs/` en este repo; se incluyen en el build                                                                                        |
| **Packs de uso personal** | Juegos cuya licencia solo permite uso personal                                                                                        | **Repo privado aparte** (p. ej. `opentabletop-packs-private`), clonado o enlazado en `packs-private/` (ignorado por git en este repo) |
| **Packs del usuario**     | Tablas propias creadas o importadas en la app                                                                                         | Biblioteca local del navegador o carpeta elegida, exportables como pack                                                               |

- **Kal-Arath es de uso personal**: "Derechos de autor 2023 Castle Grief, permiso de copia concedido para uso personal" (manual en `~/Descargas/Rol y Wargames/Rol/Solitario/Kal-Arath/`). Por eso sus tablas no van en este repo público, sino en el repo privado de packs. Sí van aquí el `pack.yaml`, el README y todo lo que es diseño propio (reglas de viaje genéricas, bindings sin texto del manual).
- Antes de añadir un juego a `packs/`, se comprueba su licencia y se pone en `pack.yaml` (`license`, `attribution`). Si hay dudas, va al repo privado.
- Para redistribuir un juego con licencia personal habría que pedir permiso al autor. Si se consigue, el pack puede pasar a `packs/`.
- Los packs son por idioma (`locale` en `pack.yaml`). El contenido de las tablas no se traduce en la UI.

## Stack y herramientas

| Pieza           | Elección                                          |
| --------------- | ------------------------------------------------- |
| Lenguaje        | TypeScript `strict`                               |
| Monorepo        | npm workspaces                                    |
| UI              | Svelte 5 (runes) en apps y paquetes `*-ui`        |
| Render del mapa | PixiJS v8 (solo hexmapper)                        |
| Validación      | Zod 4 (esquema OTD y packs) → también JSON Schema |
| Packs           | YAML (`yaml`, ISC) y JSON                         |
| Tests           | Vitest (config única en la raíz)                  |
| Calidad         | ESLint + Prettier + `svelte-check` / `tsc`        |

Solo dependencias FOSS, sin dependencias de runtime innecesarias en los núcleos.

Comandos (desde la raíz): `npm run dev` (hexmapper), `npm test`, `npm run check`, `npm run lint`, `npm run format`, `npm run build`.

## Convenciones

- Código, identificadores y comentarios en inglés. Documentación de diseño en castellano por ahora; los README públicos de los paquetes irán en inglés.
- **UI bilingüe (en/es), inglés por defecto** en todas las apps y paquetes `*-ui`: ningún texto visible a mano, siempre `t('clave')`. `en.ts` es el diccionario de referencia y `es.ts` debe tener las mismas claves (el tipado lo comprueba). Cada clave nueva se añade en los dos idiomas.
- **Los núcleos no traducen.** Emiten códigos y parámetros (`{ code: 'NAVIGATION_LOST', hex }`) y la UI los traduce.
- El idioma y los ajustes personales (proveedor de notas, etc.) son **preferencias del usuario** en `localStorage`, nunca datos de la partida.
- Tests obligatorios en todos los paquetes headless, con RNG determinista. No se usan snapshots como sustituto de asserts.
- Cada cambio de formato persistido sube la versión y añade una migración.
- Commits por fase o funcionalidad, con mensaje descriptivo en inglés.

## Hoja de ruta del ecosistema

1. [x] Monorepo, paquetes `hex` y `note-refs`.
2. [ ] **Revisión de diseño** de `docs/otd.md`, `docs/oracle-engine.md` y `docs/travel-engine.md` con el usuario. _(En curso.)_
3. [ ] `random`, `dice`, `conditions`.
4. [ ] `oracle-engine` MVP y pack local de Kal-Arath (es).
5. [ ] `time`, pathfinding A\* en `hex`, `travel-engine` MVP.
6. [ ] `schema` OTD consolidado y migración del hexmapper al formato OTD.
7. [ ] `session` (integración travel ↔ oracle, journal) y UIs incrustables en el hexmapper (modo Travel/Play).
8. [ ] Apps standalone `oracle` y `travel`.
9. [ ] Más adelante: `weather-engine` (Markov / hex flower), CLI (`oracle roll …`, `oracle validate …`), editor de tablas, Web Components para hosts que no usen Svelte.

La hoja de ruta propia del hexmapper (iconos, caminos y ríos, capas, texto, exportar PNG/PDF…) está en `apps/hexmapper/CLAUDE.md`. Los caminos y ríos son requisito para que el Travel Engine use carreteras.
