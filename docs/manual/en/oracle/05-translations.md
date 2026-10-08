# Translations

Every pack is written in one **base language**. Translations are optional files that replace only the texts; anything missing falls back to the base language.

## Translating in the form

1. In the pack page, **Add language** (e.g. `es`).
2. In a definition's **Edit** tab, choose the language: the fields show the base text in grey; type the translation.

Entries need ids to be translated. Names, descriptions, results, generator templates and fixed field texts, deck cards and oracle input labels can all be translated.

## The files

Translations live in `locales/<language>/` next to the file they translate, keyed by definition and entry id. The pack's page lists them under **Translations**, one group per language (its own files are under **Files**):

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

A generator's fields with a fixed text (`value: ' A trap guards the way in.'`) are translated under `fields`, by the field's name; numbers and other values aren't texts and stay as they are. While translating, the Oracle's generator form shows those fields' boxes for the translation:

```yaml
# locales/es/treasure.yaml (the Grey Marches)
ruin-delve:
  template: 'Las ruinas de {{site}} ({{rating}}, …'
  fields:
    trap: ' Una trampa guarda la entrada.'
    rating: 'peligro {{danger}} de 6'
```

The app shows pack texts in your interface language when the pack has it.

## Rules, calendars, weather and roll modes

Definitions that aren't tables are translated the same way, in the same files, keyed by **kind and id** (`travel-rules/default`, `calendar/marcher-reckoning`), since several of them are called `default`. The translation mirrors the definition, with only its texts (`name`, `description`, and an action's `nothing`): maps by their keys, lists by their items' `id` (a check by its `event`). A text written alone is the item's name. From the Grey Marches:

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

The Travel app's forms write them for you: with the interface in a language that isn't the pack's, a check's or a stat's name and description go to that language's file (the pack's text shows in grey as a hint). Older packs that write a text in several languages at once (`name: { en: Thaw, es: Deshielo }`) still work.
