# Sheet

The **Sheet** tab edits the system's two sheets, both optional (`kind: sheet`): **its characters'** (`sheet`), what each character has, and **the party's own** (`partySheet`), what belongs to the whole party (morale, fatigue, hirelings…) in every trip, whoever travels. This page explains how sheets work, then each part of the tab, builds a company of three from nothing step by step and lists the usual mistakes. Help next to each field explains it, with examples.

## How sheets work

A sheet is a blank form: it says what a character has (Survival, Health, Rations…), with the bounds the system gives each number, and the conditions a character may have (wounded, lame). A **character** is that form filled in: Kael, with Survival 3 and Health 2, lame since this morning. The sheet is the only place this is declared: characters have no values of their own beside it.

- **Without a characters' sheet**, the party is played as a whole: its stats and supplies are numbers of the party ([Checks](06-checks.md)).
- **With one**, a trip's **Party** tab has a **Characters** section where you add them ([Playing a trip](../travel/02-playing.md#characters)), and **the party is its members**, as the [Checks](06-checks.md) tab says: a party stat can be made of their values (the best Survival among them, how many they are), a supply can be carried by them (the food is everyone's rations together, and what the trip eats is taken from them, evenly or in order), and a condition one of them has can **block** something for the whole party (a lame companion: nobody marches).
- **Values keep within their bounds.** Effects never take a value past its **Min** and **Max**; a bound can be another value of the same sheet (Health up to Toughness), and when that one falls, the first falls with it. A value without bounds can go anywhere, below 0 too.
- **Some parts hold by themselves.** A value can be **made of others** (**Made of**: Wounds is Max health minus Health; Capacity is twice Might plus 4): nobody sets it, it follows them at once. A condition can **hold while** something is true (**Holds while**: Terrified while Dread is full; Seasick while the party travels by boat): nobody sets or clears it, it comes and goes by itself, and blocks what it lists while it holds. Both are worked out after every change (an effect, a result, a hand edit on the card, a step of the trip, a world turn), so a state is never late. On a character's card they're shown, not edited: the value's box and the condition's tick are greyed out, the condition in italics. **A state is a condition that holds by itself; something that happens once (a line, an effect, a pause) is an action**: don't write a state as an action at every moment.
- **The party's own sheet** is one more character, the party itself, in every trip whoever travels: its values (morale) stay while characters join and leave. A party stat can be one of its values (`party: morale`): the stat and the value are the same number.
- **Who an effect reaches** is written in its name: `party.members.values.health: -1` (everyone), `acting.values.health: -1` (whoever acts now, chosen in the trip), `roles.guide.…` (whoever holds a [journey role](06-checks.md#journey-roles)), `characters.kael.…` (one by id), `party.values.morale: -1` (the party's sheet). Conditions read them the same way (`characters.kael.conditions: lame`, `acting.values.survival: { gte: 2 }`).

![A characters' sheet and the characters made with it (Kael, Mara, Tobin), each with their own values and conditions; the party made of them: Survival is the best of those not wounded, the food is the sum of their rations and what the trip eats is shared out among them, and a condition that blocks (Lame: travel.move) stops the whole party. Beside them, the party's own sheet: Morale, which the stat Morale is.](sheet-party.svg)

## The tab

With both sheets, a tab above the form chooses which. When the system has [factions](08-factions.md), their sheet is edited here too, in a tab of its own (_faction · the factions_), unless it's one of these two. **New characters sheet** and **New party sheet** make a small one and name it in the system (`sheet:`, `partySheet:` in its **Overview**). Wherever a sheet is played (the trip's **Party** tab, a token's sheet in the Hexmapper), it says which it is and whose system, with **Edit in Systems ↗** to come here. The YAML of a sheet: [Sheets](../technical/07-kinds.md#sheets).

- Its **Name** and **Description** (what the sheet is for).
- Its **Values**, each with an id, a name, the value it **Starts at** (a new character's), **Min** and **Max** (a number, or another value in braces, `'{{self.values.toughness}}'`: as high as the character's Toughness; empty: no bound), how it's **Shown as** (with its **Levels** and **Tones**: [below](#how-values-are-shown)) and **Group**. A value **Made of** others has its formula there instead of **Starts at**: the sheet's values in braces, with `+ - * /`, brackets and `floor`, `ceil`, `round`, `min`, `max`, `abs` (`'{{self.values.might * 2 + 4}}'`; a minus between names takes spaces, `self.values.maxHealth - self.values.health`). Bounds take the same arithmetic (`'{{self.values.might * 2}}'`).
- The **Groups** values are shown in, in order, with their names: each group is a card of its own, as many side by side as fit.
- Its **Conditions**, each with what it **Blocks** for the whole party while someone has it: `travel.move` (moving on), one of the system's actions (`actions.forced-march`), a way of travelling (`modes.horse`) (the box suggests them). With **Holds while**, a [condition](../technical/08-conditions.md) as rows, it holds by itself while that does: it reads the character as `self.*` (`self.values.dread: { gte: 6 }`) and, on a trip, the world as tables see it (`trip.mode: boat`, `time.season: winter`). One that reads the world follows it on a trip; in the Characters app, away from any trip, it stays as it was last seen.
- Its **Kinds of relation**, with the bounds of the number one carries (a bond from 0 to 3) and how it's **Shown as**: what a character may be tied to (another character, a place, a region), read where the party is (`hex.related`).

Under the values, the **Preview** is a character made with the sheet as it is now, drawn as everywhere characters are shown: change a column and it changes; click its boxes, bars and dots to try them (nothing you do there is kept).

Values and conditions have a **Used by** column: the stats made of each value, the bounds that read it (Health's `{{self.values.toughness}}`), and the tables, actions and checks that read or change it on a character, on whoever holds a role or on the party ([Used by](04-overview.md#used-by)). So do the kinds of relation: where they're read, by their holders (`characters.mara.relations.home`) or towards a place (`hex.relations.home`, who holds it to the hex entered).

Values, groups, conditions and kinds of relation each have a **Description (its help)**: what it is, in a sentence or two. Wherever the sheet is shown (a character's card, the party's, a faction's), its name is underlined and clicking it shows that description first in the help column, before what the apps add (how tables read it, its bounds, what it blocks). Like names, it's written in the current language: the pack's own, or its translation file. The Grey Marches describe every part of theirs.

What the party takes from its characters is said in [Checks](06-checks.md): **From the sheets** on a party stat, and **Supplies the members carry**.

## How values are shown

Each value says how it's drawn wherever a character is shown (a trip's **Party** tab, a token's sheet, a faction on the World panel, the Characters app), in its **Shown as** column. It changes nothing of how the value plays: tables and effects read and change the same number.

| Shown as | Looks like                                       | For                                                                             |
| -------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| (empty)  | a box with the number                            | anything; values without a max                                                  |
| `of`     | the number beside its max: **2 / 6**             | what's carried, what's left                                                     |
| `bar`    | a bar filled up to its max, with **−** and **+** | health, hit points, a pool that empties                                         |
| `boxes`  | boxes to tick, as many as its max                | stress, xp, a vow's progress; one box is a yes or no                            |
| `pips`   | round dots, as many as its max                   | ratings from 1 to 5, a bond from 0 to 3                                         |
| `dial`   | a round clock with as many segments as its max   | a faction's strength, a countdown                                               |
| `levels` | a list of names to choose from                   | harm (_Unhurt_ … _Dying_), a die size (`d4` … `d12`), how a faction regards you |

- **All but the empty one and `levels` need a Max**, a number or another value (a bar up to the character's Toughness grows and shrinks with it). Clicking a box, dot or segment sets the value to it; clicking the last filled one empties it; never below the **Min**.
- **Levels** are names in order, each one a pill (Enter or a comma adds it): the first stands for the value's **Min** (0 without one), the next for one more, and so on. With Min `-3`, `hated, cold, wary, neutral, liked, trusted, beloved` makes −3 _Hated_ and 3 _Beloved_. Beyond the last one, the number is shown. Their names (and a description, shown in the value's help) are translated like the rest of the sheet, by id; a level without a name shows its id (`d8`).
- **Tones** colour the value from a number up, with the theme's colours: `good` (green), `warning` (amber), `danger` (red) and `accent` (the usual). `0: danger, 2: warning, 4: good` is red at 0 and 1, amber at 2 and 3, green from 4; `5: danger` only turns red at 5. A threshold can be a **share of the Max** instead, which follows a Max that changes: `0: danger, 50%: warning, 75%: good` is red under half, amber from half, green from three quarters (with Max 3: red at 0 and 1, amber at 2, green at 3; with Max 6: green from 5). Bars, boxes, dots, dials and numbers all take it; an empty bar keeps its tone on its frame.
- **A kind of relation** with a number has its own **Shown as** (not `levels`): a bond from 0 to 3 as `pips`.

The Grey Marches use each one: skills as dots, health as a bar whose tone falls with it, rations as `2 / 6`, dread as boxes that turn red, nerve as a die that steps from d4 to d12, a bond as dots, and their factions' strength as a dial and reputation as named levels with tones, from _Hostile_ to _Sworn friends_ ([their page](../packs/02-grey-marches.md)).

## Step by step: a company of three

A company that crosses hills on foot: each companion has a Survival, a Toughness, a Health that can't go above it and the rations they carry; the party finds its way as well as its best companion who isn't wounded; scree on the hills may hurt and lame whoever leads, and nobody marches while someone is lame; nights without food hurt everyone and wear the company's morale down. Start from a new system: it begins as a copy of the Generic rules, without sheets (their day, the march and the food eaten each night: see [Rules](05-rules.md)).

1. **Create it**: type _The Company_ under the system list and press **+**.
2. **The characters' sheet**: in **Sheet**, **New characters sheet**, and name it _Companion_. Under **Groups**, `skills` named _Skills_ and `body` named _Body_. Under **Values**, change its first value into `survival`, _Survival_, **Starts at** `1`, **Min** `0`, **Max** `5`, **Group** `skills`, and add `toughness` (_Toughness_, `3`, `1`, `6`, `body`), `health` (_Health_, `3`, `0`, **Max** `'{{self.values.toughness}}'`, **Shown as** `bar`, `body`) and `rations` (_Rations_, `2`, `0`, `4`, no group).
3. **Its conditions**: change its first condition into `wounded`, _Wounded_, blocking nothing, and add `lame`, _Lame_, **Blocks** `travel.move`.
4. **The party's sheet**: **New party sheet**, named _The Company_; change its first value into `morale`, _Morale_, **Starts at** `3`, **Min** `0`, **Max** `5`, **Shown as** `boxes`, and remove its condition.
5. **What the party takes from them**: in **Checks**, under **Party stats**, **Add a stat** _Survival_ with **From the sheets** `max: survival, unless: { conditions: wounded }, none: 0` (the best of those not wounded; nobody left: 0), and a stat _Morale_ with `party: morale`. Under **Supplies the members carry**, `food` **Carried in** `rations`, **Shared out** evenly.
6. **Scree**: **Add a check**, with **Check** `SCREE`, named _Scree_. **When** `trip.hex-enter`; **Only if** the rows `hex.terrain` · **is** · `hills` and `party.stats.survival` · **is under** · `{{1d6}}` (a d6 above the party's Survival); no table; **Changes** the rows `acting.values.health` · `-1` and `acting.conditions.lame` · `true`.
7. **Hunger**: **Add a check**, with **Check** `HUNGER`, named _Hunger_. **When** `time.day-end`; **Only if** `trip.below` · **is** · `food`; **Changes** the rows `party.members.values.health` · `-1` and `party.values.morale` · `-1`.
8. **Try it**: in **Try it**, make a way of six hexes: `plains`, `hills`, `hills`, `hills`, `plains`, `plains`. In the trip's **Party** tab, **Add a character** three times: _Kael_ with Survival `3`, _Mara_, and _Tobin_ with Toughness `4` and Health `4`. Set Kael's Rations to `1` and the others' to `0`, choose Kael under **Acting**, and march day after day, waiting for the next morning each time the march stops.

**What you'll see.** Above the characters, **The Company**'s card with Morale as five boxes, three filled; each companion's Health is a bar, full. The party's Survival shows greyed out, `3`, Kael's; its Food `1`, greyed out too, the sum of the rations. Tick Kael's **Wounded**: Survival falls to `1` (Mara's and Tobin's), and comes back when you untick it. Lower Tobin's Toughness to `2`: Tobin's Health falls to `2` with it. On the hills, each hex entered rolls a d6 against Survival (**Everything** shows it: _Scree doesn't come up_ with the roll, when it isn't above 3); when it comes up, the journal says what it did to whoever acts (_Kael: Health: 3 → 2_, _Kael: Lame: now holds_), and the march stops: _Kael: Lame: the party can’t travel while it lasts_; **March** is greyed out, with Kael's Lame as the reason. Untick Kael's **Lame** and march on. The first night the party eats Kael's last ration (Food `0`, Kael's Rations `0`); the second, there's nothing to eat: _Food can't go lower than 0_, _There is nothing left to eat._, everyone's Health one less (_Everyone: Health_) and the Company's Morale one less (two boxes left).

## The same in YAML

The two sheets, as the **YAML** tab shows them:

```yaml
# sheet.yaml
kind: sheet
id: sheet # step 2
name: Companion
values:
  survival: { name: Survival, default: 1, min: 0, max: 5, group: skills }
  toughness: { name: Toughness, default: 3, min: 1, max: 6, group: body }
  health:
    {
      name: Health,
      default: 3,
      min: 0,
      max: '{{self.values.toughness}}',
      display: bar,
      group: body,
    }
  rations: { name: Rations, default: 2, min: 0, max: 4 }
groups:
  skills: { name: Skills }
  body: { name: Body }
conditions: # step 3
  wounded: { name: Wounded }
  lame: { name: Lame, blocks: [travel.move] }
---
kind: sheet
id: party # step 4
name: The Company
values:
  morale: { name: Morale, default: 3, min: 0, max: 5, display: boxes }
```

What the other steps add to the system, the Generic rules and their bindings (an excerpt: the rest stays as it was):

```yaml
# system.yaml (kind: system), named by steps 2 and 4
sheet: sheet.sheet
partySheet: sheet.party
---
# travel.yaml: the rules (kind: travel-rules)
checks:
  - event: SCREE # step 6
    name: Scree
    at: trip.hex-enter
    when: { hex.terrain: hills, party.stats.survival: { lt: '{{1d6}}' } }
    effects: { acting.values.health: -1, acting.conditions.lame: true }
  - event: HUNGER # step 7
    name: Hunger
    at: time.day-end
    when: { trip.below: food }
    effects: { party.members.values.health: -1, party.values.morale: -1 }
# … the Generic rules' day, terrains, ways, food and actions
---
# travel.yaml: the bindings (kind: bindings), step 5
stats:
  survival:
    name: Survival
    from: { max: survival, unless: { conditions: wounded }, none: 0 }
  morale: { name: Morale, from: { party: morale } }
resources:
  food: { carried: rations }
```

The Grey Marches play with all of this and more (a Company sheet with morale, fatigue and hirelings; companions with skills, health under their max as a bar, dread as boxes, wounds, a sprained ankle and being saddle-sore; Survival, Stealth and Mouths made of them; rations shared out; a guide and a lookout; homes that lift morale): their [page](../packs/02-grey-marches.md) says where.

## Common mistakes

- **Effects that change nobody.** `acting.…` reaches only whoever is chosen under **Acting**; with **Nobody**, the journal says _Nobody is acting, so … changed nothing_. Choose who acts, or write `party.members.…` for everyone.
- **A party stat you can't change.** A stat made of the characters (**From the sheets**) follows them and shows greyed out: change their values instead. Effects on it are overwritten as soon as the characters change; to lower the party's spirits, give the party a sheet and write `party.values.morale`.
- **Food that won't go up.** A supply the characters carry has the sum of their bounds: with Rations up to 4, three companions carry 12 at most. Raise **Max**, or add characters.
- **A condition that blocks nothing.** **Blocks** is written by full name: `travel.move`, `actions.forced-march`, `modes.horse`; a bare `march` or `horse` blocks nothing. The box suggests what the system has.
- **A bound written as a name.** `max: toughness` isn't another value: write `'{{self.values.toughness}}'`, in quotes (the system's problems say so).
- **Writing to what holds by itself.** An effect on a value **Made of** others, or on a condition with **Holds while**, changes nothing: the journal says _“Kael: Wounds” holds by itself…_. Change what it's made of (Health), or what the condition reads (Dread).
- **A minus without spaces.** `self.values.maxHealth-self.values.health` reads as one name (ids may hold a hyphen) and gives nothing: write `self.values.maxHealth - self.values.health`.
- **A state written as an action.** An action `on: trip.hex-enter` that sets _Encumbered_ when the load is too high only looks at the next hex: between hexes, and after a change by hand, the sheet is out of step. Give the condition a **Holds while** instead.
- **Boxes, a bar or a dial with no Max.** They're drawn up to the **Max**, so the sheet's problems say so until it has one. With **Shown as** `levels`, it needs its **Levels**.
- **Levels one off.** The first level is the **Min**: with Min `1`, `d4, d6, d8` makes 1 a d4. Without a Min, it's 0.
- **The wounded still counted.** `max: survival` counts everyone; to leave some out, add `unless: { conditions: wounded }`, and `none` for when nobody is left (otherwise 0).
- **A value that goes negative.** Without **Min**, effects take a value below 0. Give it the bounds your game has, or none when it really has none.
- **Characters from another system.** A trip takes characters made with its system's sheet: **From the roster** lists only those; a character of another sheet stays in the roster.
