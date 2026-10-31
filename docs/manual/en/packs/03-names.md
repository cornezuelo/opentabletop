# Names

**Names** is a bundled pack of name generators for any game: people of several folks, villages, inns, landmarks, starships and worlds. It holds only tables, generators and oracles (no rules), so it works with any system, and a pack of yours can roll its tables (`names/generator.inn`). It's MIT-licensed, written in English with a Spanish translation.

## What's in it

| Definition                         | What it names                                                                                                                                                                                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Someone's name** (oracle)        | Someone, of the folk you choose: **Northern**, **Southern**, **Fair folk**, **Invented**, **Modern**, or **Any** (one of the first four at random).                                                                                                 |
| **What's it called?** (oracle)     | A place, of the kind you choose: **A village or town**, **An inn or tavern**, **A landmark**, **A starship**, **A world**.                                                                                                                          |
| **A northern name** (generator)    | A given name and their father's, with _-sson_ for a son and _-sdottir_ for a daughter (_Sigrun Haldorsdottir_); one in six with a byname (_the Grey_).                                                                                              |
| **A southern name** (generator)    | A given name and a family name (_Aurelia Valcampo_), sometimes with a byname.                                                                                                                                                                       |
| **A fair folk's name** (generator) | A name and its house (_Ilyanwë of House Silverleaf_).                                                                                                                                                                                               |
| **An invented name** (generator)   | Syllables joined: a start, sometimes a middle, an end (_Veymira_, _Oranthel_). For people, beasts, gods or lost cities.                                                                                                                             |
| **A modern name** (generator)      | A given name and a surname for today's world (_Nadia Brennan_).                                                                                                                                                                                     |
| **A village or town** (generator)  | Two old words joined (_Ashford_, _Wolfstead_).                                                                                                                                                                                                      |
| **An inn or tavern** (generator)   | A sign and, half the time, a second one (_The Drowned Rat_, _The Golden Goose and Lantern_).                                                                                                                                                        |
| **A landmark** (generator)         | What it is and what it's known for (_The Barrow of the Crows_). Rolled on a cell, what it is fits the terrain: woods and holts in a forest, tors in the hills, fens in a swamp, coves on the coast (when the system calls them `forest`, `hills`…). |
| **A starship** (generator)         | Its registry and name (_the free trader Second Chance_).                                                                                                                                                                                            |
| **A world** (generator)            | An invented name and its place around its star (_Kessaron IV_).                                                                                                                                                                                     |

Every generator's parts are tables of their own (_Northern given names_, _Inn signs_, _Syllables to start_…), to roll alone or to use in your packs.

## Finding them

Every definition is **tagged** `names`, with what it names (`people`, `settlements`, `inns`, `landmarks`, `ships`, `worlds`) and its setting (`fantasy`, `modern`, `sci-fi`). In the Oracle app's (or Map's) **Filter**, the `names` chip shows only the names of every pack (the Grey Marches' _Names of the Marches_ too); `inns` only what names inns; `−sci-fi` hides the starships and worlds. See the Oracle's [Getting started](../oracle/01-getting-started.md).

## On the map

In Map's Oracle panel, roll **What's it called?** on a cell and keep the result with **Add to … as a point of interest**: a village, an inn or a landmark gets its name there (see [The Oracle in the map](../map/09-oracle.md)). _A landmark_ reads the cell's terrain. A map whose campaign uses only some packs lists Names when you tick it in **Map settings → Campaign → Packs**.

## How it's made

The pack shows a few things worth copying in your own name tables:

- **An oracle as a menu**: _Someone's name_ has an input (**Folk**) whose every option is a variant with one entry that rolls a generator (`generator: generator.person-north`); **Any** has several, picked at random.
- **Parts that agree**: each northern given name sets whether it's a man's or a woman's (`set: { gender: f }`), and the generator adds _-sson_ or _-sdottir_ by it, with fields rolled only then (`son: { value: sson, when: { given.gender: m } }`).
- **Something now and then**: a field rolled only when a die allows it (`odds: { roll: 1d6 }`, then `byname: { table: table.byname, when: { odds: 6 } }`); the byname starts with a space, so nothing shows when it isn't rolled.
- **Names that fit the place**: _Landmarks_ has entries that only come up on their terrain (`when: { place.terrain: forest }`), weighted to come up often there; rolled by hand, only the ones for anywhere.
- **Translations that read well**: made-up names (people, villages, syllables, worlds) aren't translated; words are, whole, with their article (_The Drowned Rat_ → _La Rata Ahogada_, _ and Lantern_ → _ y el Farol_), so the Spanish words agree. See [Translations](../oracle/05-translations.md).
