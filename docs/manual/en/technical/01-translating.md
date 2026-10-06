# Translating

OpenTabletop is built to be translated at three levels, from easiest to hardest. English is always the base: anything not translated falls back to it.

## Pack content (no code)

Tables, oracles, generators and decks are translated inside their pack, with files that replace only the texts. Do it from the Oracle app (**Add language** in the pack page, then choose the language in a definition's **Edit** tab) or by hand: see [Translations](../oracle/05-translations.md). Anyone can translate their own packs, or send translations for open packs.

## The manual (Markdown)

The manual is plain Markdown in `docs/manual/<language>/<app>/`. To add a language, copy `docs/manual/en/` to `docs/manual/<code>/` (e.g. `fr`) and translate the files, keeping their names (links point at them). Pages you haven't translated yet show in English. Then add the code to the language list of the Manual app (`apps/manual/src/App.svelte`) and the manual's own few labels (`packages/manual-ui/src/i18n.ts`).

## The apps' interface (code)

Every visible text of the apps comes from a dictionary; there is no text written in the components. English (`en.ts`) is the reference and every other language has the same keys — the type checker refuses a dictionary with missing or extra keys, and tests check it too.

| Part                 | Dictionaries                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Hexmapper            | `apps/hexmapper/src/lib/i18n/` (`en.ts`, `es.ts`; languages listed in `index.svelte.ts`) |
| Oracle app           | `apps/oracle/src/lib/i18n/` (languages in `index.ts`)                                    |
| Roll panel, history  | `packages/oracle-ui/src/i18n/`                                                           |
| Trip panel           | `packages/travel-ui/src/i18n/`                                                           |
| Manual, app switcher | `packages/manual-ui/src/i18n.ts`, `packages/ui-kit/src/AppSwitcher.svelte`               |

To add a language: copy each `en.ts` to `<code>.ts`, translate the values (never the keys), and add the code to the language lists. Check it with `make verify` and build with `make site`. Contributions are welcome as pull requests.

Texts with `{name}` are filled in by the app (`'At {hex}'` → "At 0203"): keep the braces and the name inside them.
