# Nombres

**Nombres** es un pack incluido de generadores de nombres para cualquier partida: gente de varios pueblos, pueblos y villas, posadas, parajes, naves estelares y mundos. Solo tiene tablas, generadores y oráculos (ninguna regla), así que sirve con cualquier sistema, y un pack tuyo puede tirar sus tablas (`names/generator.inn`). Tiene licencia MIT y está escrito en inglés, con traducción al español.

## Qué tiene

| Definición                                   | Qué nombra                                                                                                                                                                                                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **¿Cómo se llama?** (oráculo)                | A alguien, del pueblo que elijas: **Del norte**, **Del sur**, **Pueblo hermoso**, **Inventado**, **Moderno** o **Cualquiera** (uno de los cuatro primeros al azar).                                                                                             |
| **¿Cómo se llama el sitio?** (oráculo)       | Un lugar, del tipo que elijas: **Un pueblo o una villa**, **Una posada o taberna**, **Un paraje**, **Una nave estelar**, **Un mundo**.                                                                                                                          |
| **Un nombre del norte** (generador)          | Un nombre y el de su padre, con _-sson_ para un hijo y _-sdottir_ para una hija (_Sigrun Haldorsdottir_); uno de cada seis con apodo (_Manto Gris_).                                                                                                            |
| **Un nombre del sur** (generador)            | Un nombre y un apellido (_Aurelia Valcampo_), a veces con apodo.                                                                                                                                                                                                |
| **Un nombre del pueblo hermoso** (generador) | Un nombre y su casa (_Ilyanwë de la Casa Hoja de Plata_).                                                                                                                                                                                                       |
| **Un nombre inventado** (generador)          | Sílabas unidas: un comienzo, a veces una en medio, un final (_Veymira_, _Oranthel_). Para personas, bestias, dioses o ciudades perdidas.                                                                                                                        |
| **Un nombre moderno** (generador)            | Un nombre y un apellido para el mundo de hoy (_Nadia Brennan_).                                                                                                                                                                                                 |
| **Un pueblo o una villa** (generador)        | Dos palabras antiguas unidas (_Ashford_, _Wolfstead_).                                                                                                                                                                                                          |
| **Una posada o taberna** (generador)         | Un letrero y, la mitad de las veces, un segundo (_La Rata Ahogada_, _La Oca de Oro y el Farol_).                                                                                                                                                                |
| **Un paraje** (generador)                    | Qué es y por qué se le conoce (_El Túmulo de los Cuervos_). Tirado sobre un hex, qué es encaja con el terreno: bosques y sotos en un bosque, riscos en las colinas, ciénagas en un pantano, calas en la costa (cuando el sistema los llama `forest`, `hills`…). |
| **Una nave estelar** (generador)             | Su registro y su nombre (_el mercante libre Segunda Oportunidad_).                                                                                                                                                                                              |
| **Un mundo** (generador)                     | Un nombre inventado y su lugar alrededor de su estrella (_Kessaron IV_).                                                                                                                                                                                        |

Las partes de cada generador son tablas propias (_Nombres del norte_, _Letreros de posada_, _Sílabas para empezar_…), para tirarlas solas o usarlas en tus packs.

## Encontrarlos

Cada definición lleva la **etiqueta** `names`, la de lo que nombra (`people`, `settlements`, `inns`, `landmarks`, `ships`, `worlds`) y la de su ambientación (`fantasy`, `modern`, `sci-fi`). En **Filtrar**, en la aplicación Oráculo (o en Mapa), la etiqueta `names` muestra solo los nombres de todos los packs (también los _Nombres de las Marcas_ de las Marcas Grises); `inns`, solo lo que nombra posadas; `−sci-fi` oculta las naves y los mundos. Mira los [Primeros pasos](../oracle/01-getting-started.md) de Oráculo.

## En el mapa

En el panel de Oráculo de Mapa, tira **¿Cómo se llama el sitio?** sobre un hex y guarda el resultado con **Añadir a … como punto de interés**: un pueblo, una posada o un paraje recibe ahí su nombre (mira [Oráculo en el mapa](../map/09-oracle.md)). _Un paraje_ lee el terreno del hex. Un mapa cuya campaña usa solo algunos packs lista Nombres cuando lo marcas en **Ajustes del mapa → Campaña → Packs**.

## Cómo está hecho

El pack enseña algunas cosas que vale la pena copiar en tus propias tablas de nombres:

- **Un oráculo como menú**: _¿Cómo se llama?_ tiene una entrada (**Pueblo**) cuyas opciones son variantes con una sola entrada que tira un generador (`generator: generator.person-north`); **Cualquiera** tiene varias, elegidas al azar.
- **Partes que concuerdan**: cada nombre de pila del norte dice si es de hombre o de mujer (`set: { gender: f }`), y el generador añade _-sson_ o _-sdottir_ según eso, con campos que solo se tiran entonces (`son: { value: sson, when: { given.gender: m } }`).
- **Algo de vez en cuando**: un campo que solo se tira cuando un dado lo permite (`odds: { roll: 1d6 }` y después `byname: { table: table.byname, when: { odds: 6 } }`); el apodo empieza con un espacio, así que no se ve nada cuando no sale.
- **Nombres que encajan con el lugar**: _Parajes_ tiene entradas que solo salen en su terreno (`when: { hex.terrain: forest }`), con más peso para que salgan a menudo allí; tirada a mano, solo las de cualquier sitio.
- **Traducciones que se leen bien**: los nombres inventados (personas, pueblos, sílabas, mundos) no se traducen; las palabras sí, enteras y con su artículo (_The Drowned Rat_ → _La Rata Ahogada_, _ and Lantern_ → _ y el Farol_), para que concuerden en español. Mira [Traducciones](../oracle/05-translations.md).
