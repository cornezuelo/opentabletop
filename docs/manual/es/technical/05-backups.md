# Copias de seguridad de todo

Todas las aplicaciones de OpenTabletop guardan tu trabajo en este navegador: sin cuenta ni servidor. Una **copia de seguridad** lo reúne todo en un fichero, para llevar tus partidas a otro ordenador o tener una copia por si se pierden los datos del navegador (borrar los datos del sitio, un perfil nuevo, un disco roto).

## Hacer una copia

Abre el selector de aplicaciones (los nueve puntos, en cualquier aplicación) y pulsa **Guardar una copia**. Se descarga el fichero `opentabletop-backup-<fecha>.json`. Guárdalo en un lugar seguro, como cualquier otro documento. Antes se guarda el mapa abierto, así que la copia lo tiene tal y como lo ves.

Contiene todo lo que las aplicaciones guardan en este navegador:

- **Mapas**: todos los de la biblioteca del Hexmapper, con su estado de juego (grupo, rastro, viaje, diario) y su Oracle (historial, mazos, resultados que solo salen una vez).
- **Tus packs**: los que has creado o editado, y las copias editadas de packs incluidos.
- **El viaje de la aplicación Travel**, el historial y los mazos de la **aplicación Oracle**, y los **favoritos**.
- **Preferencias**: idioma, aplicación de notas, disposición de paneles y similares.

Los packs incluidos no van en ella: vienen con las aplicaciones.

## Restaurar una copia

En el selector de aplicaciones, pulsa **Restaurar una copia…** y elige el fichero. OpenTabletop dice cuándo se hizo la copia y qué tiene, y pregunta cómo restaurarla:

- **Añadir a lo mío**: la copia se suma a lo que ya tiene este navegador. Si ambos tienen un mapa, se queda la versión más reciente; los packs con la misma carpeta y los favoritos se juntan (gana la copia del pack que viene en la copia de seguridad); lo demás (el viaje, los historiales, las preferencias) se toma de la copia.
- **Sustituirlo todo**: este navegador queda exactamente como la copia. Se borran los mapas y datos que no estén en ella.

Después la página se recarga. Cierra antes otras pestañas de OpenTabletop: una pestaña abierta aún tiene los datos antiguos y podría volver a guardarlos.

Restaurar una copia no se deshace con Ctrl+Z. Si dudas, haz antes una copia de este navegador.

## Pasar a otro ordenador

1. En el ordenador antiguo: **Guardar una copia**.
2. Lleva el fichero al nuevo (un USB, tu carpeta en la nube, un correo a ti mismo).
3. En el ordenador nuevo, abre cualquier aplicación de OpenTabletop desde el sitio que vayas a usar a partir de ahora y pulsa **Restaurar una copia…** → **Sustituirlo todo** (o **Añadir a lo mío** si ya tiene trabajo propio).

Las aplicaciones comparten sus datos solo cuando se sirven desde el mismo sitio (por ejemplo, todas bajo `http://localhost:8080/`). Una copia hecha en un sitio y restaurada en otro lo traslada todo.

## El fichero

Un fichero JSON:

```json
{
  "format": "opentabletop-backup",
  "version": 1,
  "created": "2026-10-07T21:30:00.000Z",
  "storage": { "opentabletop.userPacks": "[…]", "opentabletop.locale": "\"es\"", "…": "…" },
  "maps": [{ "id": "greymarches1", "name": "The Grey Marches", "modified": "…", "json": "{…}" }]
}
```

- `storage` copia como texto las entradas del almacenamiento del navegador cuyas claves empiezan por `opentabletop.` o `hexmapper.`. Queda fuera la copia de emergencia del mapa abierto del Hexmapper (`hexmapper.pending`).
- `maps` copia la biblioteca del Hexmapper tal cual: cada `json` es un mapa en el formato propio del Hexmapper, que lleva su versión y se migra al abrirlo. Para compartir un solo mapa con otras herramientas, usa **Guardar** en el Hexmapper (un paquete OTD, ver [Formatos de fichero](02-file-formats.md)).
- `version` es la versión de este envoltorio. Las copias más recientes de lo que entiende la aplicación se rechazan en lugar de leerse mal.
