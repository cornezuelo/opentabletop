# Copias de seguridad y exportaciones

Todas las aplicaciones de OpenTabletop guardan tu trabajo en este navegador: sin cuenta ni servidor. Una **copia de seguridad** lo reúne todo en un fichero, para llevar tus partidas a otro ordenador o tener una copia por si se pierden los datos del navegador (borrar los datos del sitio, un perfil nuevo, un disco roto).

## Hacer una copia

Abre el selector de aplicaciones (los nueve puntos, en cualquier aplicación) y pulsa **Guardar una copia**. Se descarga el fichero `opentabletop-backup-<fecha>.json`. Guárdalo en un lugar seguro, como cualquier otro documento. Antes se guardan el mapa abierto y su campaña, así que la copia los tiene tal y como los ves.

Contiene todo lo que las aplicaciones guardan en este navegador:

- **Mapas**: todos los de la biblioteca del Hexmapper, con su estado de juego (grupo, rastro, viaje, diario) y la tierra que tiene en él cada facción.
- **Campañas**: el mundo en el que se juega cada mapa: su reloj del mundo y su clima, sus facciones y su Oráculo (historial, mazos, resultados que solo salen una vez).
- **Tus packs**: los que has creado o editado, y las copias editadas de packs incluidos.
- **El plantel de la aplicación Characters**: cada personaje y grupo que guarda, con sus notas, dónde juega y los miembros de un grupo.
- **Los viajes de la aplicación Travel**, el historial, los mazos y la semilla de la **aplicación Oracle**, y los **favoritos**.
- **Preferencias**: idioma, aplicación de notas, los packs ocultos en el Oracle, el último sistema elegido, la campaña en la que juegas, disposición de paneles y similares.

Los packs incluidos no van en ella: vienen con las aplicaciones.

## Restaurar una copia

En el selector de aplicaciones, pulsa **Restaurar una copia…** y elige el fichero. OpenTabletop dice cuándo se hizo la copia y qué tiene, y pregunta cómo restaurarla:

- **Añadir a lo mío**: la copia se suma a lo que ya tiene este navegador. Si ambos tienen un mapa (o una campaña), se queda la versión más reciente; los packs con la misma carpeta y los favoritos se juntan (gana la copia del pack que viene en la copia de seguridad); también se juntan los personajes del plantel, y de un personaje que tengan los dos se queda la copia cambiada más tarde; lo demás (el viaje, los historiales, las preferencias) se toma de la copia.
- **Sustituirlo todo**: este navegador queda exactamente como la copia. Se borran los mapas, campañas y datos que no estén en ella.

Después la página se recarga. Cierra antes otras pestañas de OpenTabletop: una pestaña abierta aún tiene los datos antiguos y podría volver a guardarlos.

Restaurar una copia no se deshace con Ctrl+Z. Si dudas, haz antes una copia de este navegador.

## Pasar a otro ordenador

1. En el ordenador antiguo: **Guardar una copia**.
2. Lleva el fichero al nuevo (un USB, tu carpeta en la nube, un correo a ti mismo).
3. En el ordenador nuevo, abre cualquier aplicación de OpenTabletop desde el sitio que vayas a usar a partir de ahora y pulsa **Restaurar una copia…** → **Sustituirlo todo** (o **Añadir a lo mío** si ya tiene trabajo propio).

Las aplicaciones comparten sus datos solo cuando se sirven desde el mismo sitio (por ejemplo, todas bajo `http://localhost:8080/`). Una copia hecha en un sitio y restaurada en otro lo traslada todo.

## Exportar e importar parte

Una copia de seguridad se lo lleva todo. Para elegir qué va (una campaña para un amigo, tus packs caseros a otro ordenador, unos cuantos personajes), usa **Exportar…** en el selector de aplicaciones, debajo de los botones de las copias.

Muestra lo que has hecho como un árbol con casillas, todas marcadas al principio:

- **Tus packs**: los packs que has hecho o editado, y tus copias de packs incluidos. Una copia de un pack cuya licencia solo permite el uso personal va marcada **Uso personal**, y marcarla avisa de que el fichero no se puede compartir.
- **Campañas**, cada una con sus **mapas** (los del Hexmapper) y **viajes** (los de Travel) debajo. Marcar una campaña marca también sus mapas y viajes; desmarca cualquiera para dejarlo fuera.
- **Mapas y viajes** cuya campaña no se guarda aquí, si los hay.
- **Personajes**: los del plantel.

**Todo** y **Nada** lo marcan o desmarcan todo. Pulsa **Exportar** y se descarga `opentabletop-export-<fecha>.zip`.

Cuando algo marcado necesita algo que no lo está, **Se queda fuera** dice qué y por qué, por ejemplo:

- `Pack «Casero» depende de Pack «Saber».`: las `dependencies` de un pack (ver [Formatos de fichero](02-file-formats.md)).
- `Viaje «A la costa» se juega en Campaña «El Norte».`: un mapa o viaje sin su campaña no tiene reloj del mundo, facciones ni Oracle en otro sitio.
- `Campaña «El Norte» se juega con Pack «Casero».`: el pack del sistema con el que se juega una campaña, un viaje o la hoja de un personaje, y los packs que una campaña añade a los de su sistema.
- `Brenna juega en Viaje «A la costa».`: un personaje del plantel y el mapa o viaje en el que juega, en los dos sentidos.
- `Brenna está en el grupo La Compañía.`: un grupo del plantel y sus miembros.

**Añadir lo que falta** lo marca todo, y lo que eso necesite a su vez. Puedes exportar igualmente sin ello. Los packs que traen las aplicaciones (Core, las Marcas Grises…) nunca van en el fichero ni se piden: toda copia de OpenTabletop los tiene. Las preferencias, el historial de la aplicación Oracle y los viajes de prueba de Systems solo van en las copias de seguridad.

Para traer una exportación, pulsa **Importar…** en el selector de aplicaciones y elige el fichero. El mismo árbol muestra lo que trae, cada cosa marcada así:

- **Nuevo**: no está aquí; va marcado.
- **Ya está**: está aquí y es igual; no hay nada que hacer, así que no se puede marcar.
- **Sustituye lo tuyo**: está aquí con el mismo id, pero distinto (seguiste jugando un viaje en los dos sitios, por ejemplo); no va marcado. Márcalo para sustituir lo tuyo por lo del fichero: OpenTabletop pregunta antes, porque no se puede deshacer.

**Se queda fuera** funciona igual, contando lo que ya tiene este navegador: un viaje cuya campaña está aquí no necesita nada más. Importar añade lo que marcaste junto a todo lo demás que hay aquí (no se quita nada) y recarga la página; cierra antes otras pestañas de OpenTabletop.

El **Importar .zip** de la Oracle también lee una exportación, y toma solo sus packs.

## El fichero

Un fichero JSON:

```json
{
  "format": "opentabletop-backup",
  "version": 2,
  "created": "2026-10-07T21:30:00.000Z",
  "storage": { "opentabletop.userPacks": "[…]", "opentabletop.locale": "\"es\"", "…": "…" },
  "maps": [{ "id": "greymarches1", "name": "The Grey Marches", "modified": "…", "json": "{…}" }],
  "campaigns": [
    { "id": "greymarches1", "name": "The Grey Marches", "modified": "…", "json": "{…}" }
  ]
}
```

- `storage` copia como texto las entradas del almacenamiento del navegador cuyas claves empiezan por `opentabletop.` o `hexmapper.`. Quedan fuera las copias de emergencia del mapa abierto del Hexmapper y de su campaña (`hexmapper.pending`, `hexmapper.pendingCampaign`).
- `maps` copia la biblioteca del Hexmapper tal cual: cada `json` es un mapa en el formato propio del Hexmapper, que lleva su versión y se migra al abrirlo. Para compartir un solo mapa con otras herramientas, usa **Guardar** en el Hexmapper (un paquete OTD, ver [Formatos de fichero](02-file-formats.md)).
- `campaigns` copia las campañas igual, cada `json` en su propio formato con versión. Las copias hechas antes de las campañas (`version` 1) no tienen: cada uno de sus mapas crea la suya al abrirse.
- `version` es la versión de este envoltorio. Las copias más recientes de lo que entiende la aplicación se rechazan en lugar de leerse mal.

## El fichero de una exportación

Un .zip:

```
opentabletop-export.json        lo que trae: { "format": "opentabletop-export", "version": 1, "created", "packs", "maps", "campaigns" }
packs/<id>/pack.yaml, …         cada pack como carpeta de pack
maps/<id>.json                  cada mapa tal y como lo guarda la biblioteca del Hexmapper
campaigns/<id>.json             cada campaña en su propio formato
trips/<id>.json                 cada viaje de Travel tal y como lo guarda Travel
characters/<id>.json            cada personaje del plantel con sus notas y dónde juega (un grupo, con sus miembros)
```

- `opentabletop-export.json` lista los packs (con aquello en lo que se basaba una copia de un pack incluido) y los nombres y fechas de mapas y campañas; viajes y personajes llevan los suyos. Una exportación de una `version` más reciente de lo que entiende la aplicación se rechaza.
- Cada mapa, campaña, viaje y personaje conserva la versión de su propio formato y se migra cuando lo lee su aplicación, como en una copia de seguridad.
- Los ids con caracteres que un nombre de fichero no admite se escriben escapados (`%2F` por `/`).
