# Trabajar sin la interfaz

Las aplicaciones son una forma de editar; los ficheros son lo que manda. Algunas cosas son más rápidas a mano.

## Editar packs como ficheros

1. **Exporta .zip** un pack desde la aplicación Oracle y descomprímelo, o empieza con una carpeta vacía y un `pack.yaml`.
2. Edita su YAML con cualquier editor de texto. Los editores que entienden YAML ayudan con la sangría.
3. **Importa .zip** de nuevo (comprime la carpeta) y la aplicación lo comprueba y lista sus problemas con su línea.

Escribir muchas entradas parecidas suele ser más rápido en YAML que en los formularios; los comentarios (`# …`) se conservan cuando los formularios editan después el fichero.

## Packs incluidos en una build

Si compilas tú las aplicaciones (`make site`), cada carpeta de `packs/` se incluye como pack de solo lectura, y también cada carpeta de `packs-private/` en ese ordenador (contenido de uso personal; nunca publiques esa build). `make test` carga todos los packs abiertos de `packs/` y tira cada definición en cada idioma, así que una tabla rota se detecta antes de jugar.

## La línea de comandos

`opentabletop` comprueba y tira packs desde un terminal, sin abrir ninguna aplicación: útil mientras escribes un pack en un editor de texto, o en scripts. En este repositorio, `make cli ARGS="…"` lo construye y lo ejecuta (necesita Node.js):

```sh
make cli ARGS="validate"                          # todos los packs de packs/ y packs-private/
make cli ARGS="validate --packs ~/mis-packs"      # una carpeta tuya
make cli ARGS="list --kind oracle"                # lo que se puede tirar
make cli ARGS="roll grey-marches/encounter terrain=forest danger=2 --times 3"
make cli ARGS="roll core/yes-no likelihood=likely --seed mi-partida --locale es --json"
```

- **validate** muestra cada problema (los mismos que las aplicaciones) y termina con un resumen; falla (código de salida 1) cuando hay errores, así que sirve en scripts y comprobaciones antes de un commit.
- **list** muestra cada tabla, oráculo, generador y mazo: su id, tipo y nombre (`--kind`, `--pack` para acotar).
- **roll** tira uno por su id (`pack/id`, o solo el id si es único); un mazo saca una carta. Los pares `clave=valor` son el contexto que leen las tablas (los números y `true`/`false` se leen como tales; los nombres con puntos anidan: `party.stats.morale=2`). `--seed` da los mismos resultados cada vez, `--times` vuelve a tirar conservando las entradas de una vez y las cartas sacadas, `--locale` elige el idioma, `--json` muestra el resultado completo.

El script construido, `apps/cli/dist/opentabletop.mjs`, funciona donde haya Node.js: `node opentabletop.mjs roll …`.

## Mapas a mano

Un mapa `.otd.json` se puede editar con un editor de texto: renombrar hexes en bloque, pasar datos entre mapas o escribir un script que genere un mapa. Mantén la estructura válida: el Hexmapper rechaza los ficheros que no encajan con el esquema y dice por qué. Otras herramientas pueden leer los mismos ficheros y añadir sus propios datos en `ext.<herramienta>`.

## Comandos útiles

Desde la carpeta del proyecto: `make` los lista todos. Los principales: `make dev` (Hexmapper con recarga en vivo), `make dev-oracle`, `make dev-manual`, `make serve` (todas las aplicaciones en un sitio), `make verify` (formato, tipos y tests).
