# Translations

Every pack is written in one **base language**. Translations are optional files that replace only the texts; anything missing falls back to the base language.

## Translating in the form

1. In the pack page, **Add language** (e.g. `es`).
2. In a definition's **Edit** tab, choose the language: the fields show the base text in grey; type the translation.

Entries need ids to be translated. Names, descriptions, results, generator templates, deck cards and oracle input labels can all be translated.

## The files

Translations live in `locales/<language>/` next to the file they translate, keyed by definition and entry id:

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

The app shows pack texts in your interface language when the pack has it.
