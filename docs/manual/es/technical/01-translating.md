# Traducir

OpenTabletop está pensado para traducirse a tres niveles, del más fácil al más difícil. El inglés es siempre la base: lo que no esté traducido se muestra en inglés.

## El contenido de los packs (sin código)

Las tablas, oráculos, generadores y mazos se traducen dentro de su pack, con ficheros que solo sustituyen los textos. Hazlo desde la aplicación Oracle (**Añadir idioma** en la página del pack y después elige el idioma en la pestaña **Editar** de una definición) o a mano: consulta [Traducciones](../oracle/05-translations.md). Cualquiera puede traducir sus propios packs, o enviar traducciones de los packs abiertos.

## El manual (Markdown)

El manual es Markdown normal en `docs/manual/<idioma>/<aplicación>/`. Para añadir un idioma, copia `docs/manual/en/` en `docs/manual/<código>/` (p. ej. `fr`) y traduce los ficheros sin cambiar sus nombres (los enlaces apuntan a ellos). Las páginas que aún no hayas traducido se muestran en inglés. Después añade el código a la lista de idiomas de la aplicación Manual (`apps/manual/src/App.svelte`) y las pocas etiquetas propias del manual (`packages/manual-ui/src/i18n.ts`).

## La interfaz de las aplicaciones (código)

Cada texto visible de las aplicaciones sale de un diccionario; no hay texto escrito en los componentes. El inglés (`en.ts`) es la referencia y cualquier otro idioma tiene las mismas claves: la comprobación de tipos rechaza un diccionario con claves de más o de menos, y los tests también lo comprueban.

| Parte                            | Diccionarios                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| Hexmapper                        | `apps/hexmapper/src/lib/i18n/` (`en.ts`, `es.ts`; los idiomas se listan en `index.svelte.ts`) |
| Aplicación Oracle                | `apps/oracle/src/lib/i18n/` (idiomas en `index.ts`)                                           |
| Aplicación Travel                | `apps/travel/src/lib/i18n/` (idiomas en `index.ts`)                                           |
| Panel de tirada, historial       | `packages/oracle-ui/src/i18n/`                                                                |
| Biblioteca de packs, editor YAML | `packages/pack-ui/src/i18n/`                                                                  |
| Panel del viaje                  | `packages/travel-ui/src/i18n/`                                                                |
| Manual, selector de aplicaciones | `packages/manual-ui/src/i18n.ts`, `packages/ui-kit/src/AppSwitcher.svelte`                    |

Para añadir un idioma: copia cada `en.ts` en `<código>.ts`, traduce los valores (nunca las claves) y añade el código a las listas de idiomas. Compruébalo con `make verify` y compila con `make site`. Las contribuciones son bienvenidas como pull requests.

Los textos con `{nombre}` los completa la aplicación (`'En {hex}'` → «En 0203»): conserva las llaves y el nombre de dentro.
