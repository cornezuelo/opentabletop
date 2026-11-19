# Splitting the Company

Proposal (2026-11-19), **to review with the author**. Backlog: _Splitting the Company, each part its own token_ (user, 2026-11-16: "tendríamos que poder asignarle los que queramos como el resto de tokens, y poder partir el grupo etc.").

## 1. What there is

- A trip is one party in one place: the session's `travel` (travel-engine's `TravelState`: location, route, time, the day's march) and `members`, with the party's own sheet (`party`: morale, supplies…) beside them.
- A trip's time **is** its campaign's clock, and a campaign has **one trip going on at a time** ([campaigns.md](campaigns.md) §9.1).
- Those present are kept with the place they're at (`present[].at`); a fight is those present at the party's place against the members.
- Every character already has a token of its own (**Token** on its card); Map draws one party token per campaign.

So the only thing missing is several places at once inside one trip, and the time each part has spent.

## 2. The proposal: parts of one trip

A trip may be split into **parts**: each one some of the members, in a place of its own, with its own route and its own time. It stays **one trip** (one journal, one campaign, one clock), so §9.1 holds and nothing outside the session learns a new idea.

- **Engines unchanged.** Each part is a `TravelState` of its own, its members and what it carries. The session plays **the part in hand** exactly as it plays a whole trip today: it swaps that part into `travel` / `members` and back. travel-engine, character-engine and the fight never know a party was split.
- **Splitting**: **Split the party** (the Party tab, and the party token's menu on the map) asks who goes (the members as checkboxes) and, for each of the party sheet's values that counts things (supplies, rations: those the system marks `shared: split`, §4), how much each part takes. The new part starts where the party stands, at the same time.
- **Time**: each part keeps its own time. The **world clock is the earliest part's time**: the world (weather, events, factions' turns, progress clocks) moves on only once every part has lived through that moment. The trip offers next **the part furthest behind** ("Meanwhile, Mara's part…"), but any part can be taken in hand; one that runs ahead simply waits for the world to catch up with it (its own checks still roll at its time).
- **On the map**: each part is a token, its first member's (or the token chosen for that part); clicking a part's token takes it in hand. The party's single token becomes one per part; `partyElsewhere` stays per campaign.
- **Fights and those present**: as today, by place. A fight at a part's place is fought by that part's members only; another part reaching that place during the fight joins it from the next round (the fight's sides are read each round already).
- **Joining**: two parts in the same place can **Join**. The one behind waits (its time moves to the other's), what they carry is added up, and the trip is whole again when one part is left.
- **The journal**: one journal, each moment marked with its part (_Mara's part_), and a filter by part; when parts' times interleave, moments are kept in the order played, each with its own time.
- **Tables and conditions** read the part in hand as "the party" (`party.members`, `trip.*`, `place.*`), plus `party.parts.count` and `party.split` (yes/no) so a system can say something about being apart (a morale check when the Company splits, a rule that one part alone can't camp).

## 3. What a system declares

Nothing, for splitting to work: any system can split. A system may add:

- `party.split: false` in its rules, to forbid it (a game where the party never splits);
- how its party values go when split, value by value (§4);
- moments `party.split` and `party.joined`, for reactions (a morale check, a ration shared).

## 4. The party's own sheet when split

The hard part. A party value is one of three kinds, declared on the party sheet (`split:` on a value), with a default:

| `split:`          | What happens                                            | Example                            |
| ----------------- | ------------------------------------------------------- | ---------------------------------- |
| `share` (default) | each part reads and changes the same value              | the Company's renown, a reputation |
| `split`           | divided when splitting (asked how much), added on joins | rations, fodder, coins in common   |
| `each`            | each part gets a copy, joined by a rule (`min`, `max`)  | morale (`min`), fatigue (`max`)    |

## 5. Phases

1. **Headless**: parts in the session (split, take in hand, join), the clock as the earliest part, `split:` on party values, `party.parts.count`; tests with Core and the Grey Marches (two parts walking apart and meeting again, a fight with only one part there).
2. **Map and Travel**: Split the party / Join, a token per part, the part in hand marked, the journal's part filter; manual en/es.
3. **Bundled packs**: the Grey Marches (scouts going ahead, morale `each` with `min`, rations `split`, a reaction when the Company splits); Core, the smallest: splitting allowed, its food `split`.

## 6. To decide

1. Parts inside one trip (this proposal) or each part a trip of its own (more apart, but two trips going on in one campaign breaks §9.1 and the clock).
2. The world clock as the earliest part's time, the part furthest behind offered next (proposed), or a strict turn order.
3. The party sheet's values: `share` / `split` / `each` (proposed), or simply everything shared.
4. Whether a part can be a single character on its own (proposed: yes, any size above zero).
