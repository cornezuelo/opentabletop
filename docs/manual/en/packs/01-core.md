# Core

**Core** is the generic pack every app ships with: tools for any game, with no setting and no travel rules. It's MIT-licensed, written in English with a Spanish translation.

| Definition                                      | What it's for                                                                                                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Yes or no?** (oracle)                         | Ask a yes/no question and choose how likely it is. The classic solo-play oracle.                                                                                 |
| **How do they take it?** (oracle)               | How someone answers a request: the bigger the ask, the harder the yes. Every answer comes with a **Motive**.                                                     |
| **Prompt** (generator)                          | An action and a subject (`{{action.text}} {{subject.text}}`) to spark an idea when you're stuck.                                                                 |
| **Scene twist** (table)                         | At the start of a scene: on a 1 it doesn't go as expected. Offers advantage when things are calm, disadvantage when tension is high.                             |
| **Advantage** and **Disadvantage** (roll modes) | Roll twice and keep the higher or the lower total. Core's tables offer them, and so can any pack that depends on Core (`modes: [advantage, disadvantage]`).      |
| **Twists** and **Complications**                | What changes, and a deck of complications to draw from (a card stays out until you reshuffle).                                                                   |
| **A faction's turn** (table)                    | What a faction does on a world turn, for any game: expands (+1 hex), holds, schemes or loses ground. A system's factions roll it with `turn: core/faction-turn`. |

Core has no travel system on purpose: trips without a pack use the **Generic** rules built into the apps, and a full travel system lives in its own pack. The Generic rules are the smallest example of one: camp sleeps until dawn, a rest is an hour, only by day (`when: { daylight: true }`), and **Eat** is an action the system takes by itself as each day ends (`on: day-end`), using 1 food, which never goes below 0 (`min: 0`); a lake is crossed on the ice in winter, `passable: { when: { season: winter } }`; it's played at 10 km a hex (`travel: { hexKm: 10 }`); its characters have the smallest sheet: **Health** (3, never below 0 nor above 3) and **Wounded**, for you to track by hand. For one that uses everything, see [The Grey Marches](02-grey-marches.md).

Other packs depend on Core (the Grey Marches use its tables), so it isn't copied in place: **Duplicate as a new pack** in the Oracle app makes a pack of yours from it (`core-mine`), to change as you like, while the bundled Core stays for the packs that need it and keeps its updates. A copy of Core made by an older version still replaces it; the Systems app says when a system uses one older than the bundled Core and lets you take its changes.
