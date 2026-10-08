# Traducciones

Cada pack está escrito en un **idioma base**. Las traducciones son ficheros opcionales que solo sustituyen los textos; lo que falte se muestra en el idioma base.

## Traducir en el formulario

1. En la página del pack, **Añadir idioma** (p. ej. `en`).
2. En la pestaña **Editar** de una definición, elige el idioma: los campos muestran el texto base en gris; escribe la traducción.

Las entradas necesitan id para traducirse. Se pueden traducir nombres, descripciones, resultados, plantillas y textos fijos de los campos de generador, cartas de mazo y etiquetas de entrada de los oráculos.

## Los ficheros

Las traducciones están en `locales/<idioma>/` junto al fichero que traducen, por id de definición y de entrada. La página del pack las muestra en **Traducciones**, agrupadas por idioma (sus propios ficheros están en **Ficheros**):

```yaml
# locales/es/oracles.yaml
yes-no:
  name: ¿Sí o no?
  entries:
    yes: Sí
    no: 'No'
  inputs:
    odds:
      label: Probabilidad
      labels: { even: Igualada }
```

Los campos de un generador con un texto fijo (`value: ' A trap guards the way in.'`) se traducen en `fields`, por el nombre del campo; los números y otros valores no son textos y se quedan como están. Al traducir, el formulario del generador en la Oracle muestra las casillas de esos campos para la traducción:

```yaml
# locales/es/treasure.yaml (las Marcas Grises)
ruin-delve:
  template: 'Las ruinas de {{site}} ({{rating}}, …'
  fields:
    trap: ' Una trampa guarda la entrada.'
    rating: 'peligro {{danger}} de 6'
```

La aplicación muestra los textos de los packs en el idioma de la interfaz cuando el pack lo tiene.

## Reglas, calendarios, clima y modos de tirada

Las definiciones que no son tablas se traducen igual, en los mismos ficheros, por **tipo e id** (`travel-rules/default`, `calendar/marcher-reckoning`), porque varias se llaman `default`. La traducción imita la definición, solo con sus textos (`name`, `description`, y el `nothing` de una acción): los mapas por sus claves, las listas por el `id` de sus elementos (una comprobación por su `event`). Un texto escrito solo es el nombre del elemento. De las Marcas Grises:

```yaml
# locales/es/travel.yaml
travel-rules/default:
  actions:
    forage: { name: Buscar comida, nothing: 'no hay nada que buscar en {terrain}…' }
  checks:
    FORAGE_CHECK_REQUIRED: { name: Buscar comida }
bindings/default:
  stats:
    survival: { name: Supervivencia, description: Se suma a buscar comida y a los vados. }
# locales/es/calendar.yaml
calendar/marcher-reckoning:
  name: El cómputo de las Marcas
  months: { thaw: Deshielo, sowing: Siembra }
```

Los formularios de la aplicación Systems las escriben por ti: con la interfaz en un idioma que no es el del pack, el nombre y la descripción de una comprobación o de una característica van al fichero de ese idioma (el texto del pack se ve en gris como pista). Los packs antiguos que escriben un texto en varios idiomas a la vez (`name: { en: Thaw, es: Deshielo }`) siguen funcionando.
