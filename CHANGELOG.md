# Changelog

What changes in each release of OpenTabletop, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/) for the whole repository (see [docs/RELEASING.md](docs/RELEASING.md)). Work not yet released goes under **Unreleased**.

## [Unreleased]

### Apps

- Oracle, Hexmapper: **Filter** the list of what you roll by kind and by the tags packs give their definitions: a click on a tag shows only what has it, a second only what hasn't it (`−rules` leaves what you'd roll by hand), a third forgets it; this browser remembers it, in both apps. The Oracle's editor has **Tags**.

### Packs

- Core and the Grey Marches: every table, oracle, generator and deck is tagged with what it's about, and `rules` where the system rolls it itself.

## [0.15.0] - 2026-10-23

### Apps

- Characters, Travel, Hexmapper, Systems: **items move by dragging** their handle (⠿) onto another place of the card (with Shift held, only one of a stack); places an item doesn't fit, or hasn't room in, are dimmed while dragging.
- Characters, Travel, Hexmapper, Systems: **a place may refuse what doesn't fit**: a sheet's `items.over: refuse` (or a place's, or a container's `holds.over`) takes nothing that hasn't room left; the card offers no full place, and what an effect gives with no room left goes to a container with room or stays in no place, said in the journal. `allow`, the default, keeps the room only shown. Systems' **Sheet → Items** and **Items** tab have **Over its room**.
- Characters, Systems: **a value shown against another** (`of: '{{self.values.capacity}}'`, **Shown against**): `display: of` and `bar` draw it as `9 / 8` without bounding it, and `%` tones are shares of it; a tone's threshold may be the sheet's values (`'{{self.values.capacity}}': danger`).

### Packs

- The Grey Marches: a companion's **Load** is shown against their **Capacity** (amber at it, red over it); hands, body, belt and back take no more than their room (the body now holds 2, a mail shirt), and the backpack may be crammed.

## [0.14.0] - 2026-10-23

### Apps

- Travel, Hexmapper, Systems, Characters: **what the party carries is its sheet's or its characters'**, never a list of supplies of the rules. Food, water or torches are values of the party's sheet (`party.values.food`, starting at their **Starts at**) or items (`party.items.ration`: the party's own and its characters' together, taken from the party's own first, then from whoever carries most, or in order, as the sheet's **Shared out** says; a gain goes to the characters). A sheet says what a new character carries (**Starts with**, from the catalogues; on the party's sheet, what a new trip starts with). An action's later steps see what earlier ones changed of them, and what hit a bound is named in full (`trip.below: party.values.food`); **So far** counts what the party's values and items spent and gained. The trip's **Supplies** section, Systems' **Rules → Supplies** and **Checks → Supplies the members carry** are gone; a new system comes with a copy of the Generic rules' party sheet (Morale and Food).

### Packs

- Core: the Generic rules' food is a value of the party's sheet (`party.values.food`, 6 for a new trip).
- The Grey Marches: rations are items: the Company's stores (six) and each companion's (two for a new one, the example maps' as they had them), eaten from the stores first, then from whoever carries most; fodder is a value of the Company's sheet (`6 / 12`).
- Kal-Arath: its rations are a value of a party sheet of its own.

### Formats

- **Pack format 8**: the travel rules' `resources` and the bindings' `resources` (`carried`, `share`) are gone; a sheet's `items` take `share` and `start`; `trip.below` / `trip.above` and `trip.spent` / `trip.gained` name things in full (`party.values.food`, `party.items.ration`). Core, the Grey Marches and Kal-Arath moved to it.
- Maps (version 27) and Travel's trips (version 10): a trip's old supplies move to the party sheet's values of the same id (a supply its characters carried is lost).

## [0.13.0] - 2026-10-23

### Apps

- Travel, Hexmapper: **Skip pauses**, a choice under the trip's buttons to play everything by itself: whatever would stop the trip (a check or a result that pauses, an action's `pause:` step) is written in the journal and the trip goes on; questions still wait.

- Characters, Travel, Hexmapper, Systems: **parts of a sheet that hold by themselves**. A value can be **made of others** (`from: '{{self.values.maxHealth - self.values.health}}'`) and a condition can **hold while** something is true (`when: { self.values.dread: { gte: 6 } }`, or the world on a trip: `trip.mode: boat`); nobody sets them, they follow at once after every change (an effect, a hand edit, a trip's step, a world turn), are shown but not edited on the card, and an effect on them changes nothing (the journal says so). Systems' **Sheet** tab has **Made of** and **Holds while**. The Grey Marches' Wounds, _Terrified_, _Seasick_ and a faction _Broken_ at strength 0; Core's Harm and _Down_.
- Travel, Hexmapper, Systems: **moments written as conditions** (reactions): an action's `on:` or a check's `at:` may be `{ when: … }`, which comes once as the condition turns true, whatever changed it (a table, an action, a hand edit), and again only after it stopped holding; `for: party.members` looks at each member, who acts in it; reactions that keep setting each other off stop after 10. Systems' **As this turns true**. The Grey Marches' hirelings desert as morale reaches 0, a companion falls as their health does, an omen comes as the Wyrm's clock reaches 4; Core's _Despair_.
- Characters, Travel, Hexmapper, Systems: **items**. A character carries items, each with how many and the numbers its system gives every item (slots, weight, uses that run out…), in the places its sheet declares for any body (hands, body, a pack; items fit them by tags) or inside a container; picked from the system's catalogues or written by hand, moved, changed and dropped on the card, which groups them by place with the room each one has. A value can be made of them (`from: { sum: items.slots }`, `{ max: items.armour, where: { place.tags: worn } }`); effects give, spend and take them (`acting.items.torch: -1`, `party.members.items.torch.uses: -1`), tables and conditions read them (`acting.items.tags: light`, `characters.kael.places.pack.used`), and the journal says when one is used up. Systems: a new **Items** tab for the catalogues, and the **Sheet** tab's **Items** (fields, places, what fills a place). The Grey Marches' companions carry gear (a rope that helps at the ford, torches that burn on night marches, a backpack, a mail shirt; a load against a capacity, _Burdened_ while over it; the Sword of Keld from a hoard); Core has a small catalogue.
- **Arithmetic in `{{…}}`**, wherever variables are read: `+ - * /`, brackets and `floor`, `ceil`, `round`, `min`, `max`, `abs` (`'{{self.values.might * 2 + 4}}'`, `'-{{1d6 + hex.danger}}'`); a minus between names takes spaces, as ids may hold a hyphen.

### Formats

- **New kind `items`** (item catalogues, named by a system's `items:`), a sheet's `items:` (fields, places, `size`) and a value `from:` written as a map over the items. Characters keep their items (and places of their own) in OTD's `ext.character`. Nothing old changes meaning.
- Systems' manual pages after **Sheet** moved one number on (a new **Items** page is 08).
- **Pack format 7**: an action's `roll:` step now holds the rest of the action until it's resolved (and for **Continue**, if it pauses), so the steps after it see what it rolled; before, it was resolved once the action ended. Core, the Grey Marches and Kal-Arath moved to it (they had no step after a roll).
- **Only the values a system declares last the day** (with the day's weather): a result's names ending in `Modifier` or `Impossible` no longer do by their name alone; declare them in the rules' `values`. The Grey Marches and Kal-Arath declare theirs and read them by their full names (`today.fordModifier`).
- **New moments** for a check's `at:` or an action's `on:`: `actions.<id>.done`, once an action's steps are done, and `checks.<event>`, right after a check is resolved (before the next checks of its moment, which see what its actions changed). Actions the system takes entering a hex now see what that moment's checks see: the hex left (`from.*`) and the stretch walked. Loops through checks and actions are refused when the pack loads.

### Fixes

- Travel, Hexmapper, Oracle: **fatigue is no longer named by the apps**: a value is named by the system that declares it (or by its id), as any other; the roll panel no longer names values that no longer exist (`party.fatigue`, `short`, `camping`).
- Travel, Hexmapper: **what comes up while time passes stops the trip where it comes**, in camp or waiting as on the march: a night encounter at 23:00 is played at 23:00, and the night passes after it, so the rest of the night sees what it did; before, the camp went on till dawn and the encounter was seen then. An action the system takes by itself waits for its rolls like any other, and the checks of its moment come once it's done.
- Travel, Hexmapper: **what a generator's tables set, change and pause now reaches the trip**, as a table's does (the Grey Marches' _Delve the ruin_: a guardian like the Ember Hunt now stops the trip and costs morale); before, a generator's fields kept it to themselves.
- Manual: the technical pages reviewed for consistency: every example by its full name (`hex.danger`, `trip.moment`, roll modes as `roll-modes.advantage`, which the short form no longer reads), the lists of kinds, dictionaries, installable apps and moments complete, world values said to come from the campaign (Travel's trips too), and `travel.speed` said to multiply the weather's speed, not add to it.

## [0.12.0] - 2026-10-23

### Apps

- Systems: **an action's parameters as rows**: each one's id, name, choices as pills you drag into order (the first is the default) and default, with **YAML** for the rest; pills of any list can be made draggable (ui-kit's `TagInput reorder`).
- Systems: **Used by** for a sheet's kinds of relation too: where each is read, by whoever holds it or towards a place (`hex.relations.home`).
- Hexmapper, Travel, Campaign: **a trip's highlights in the timeline**: arrivals (_The party reaches 0707_), places found, checks that stopped the trip (an encounter) and characters who left the party (said in the journal too) reach the campaign's timeline too, a short line each, so the campaign keeps a story of its trips; the journal keeps the full detail.
- Systems: **cards in order where order decides something**: checks, ways of travelling, factions and actions show their place (_1._, _2._…) and move with a handle (⠿, dragged onto another card) or ↑ ↓, as steps do; each list's help says what its order decides.
- Systems: **an action's reading, shorter**: an unfolded action starts with a line of who takes it and how (_With its button · once a day · choosing How far_), then its **Only when** and **Not when** each on a line (a condition with groups said short), leaving the steps to their cards; folded, its line says who and its first steps (_…and 3 more_); steps say changes by name (_Change: Fatigue −1_, _Everyone: Health +1_) instead of paths.
- Systems: **lists as pills**: a check's **When**, an action's **By itself at** and every list of the forms (what a value of the day or a condition **Blocks**, a value's levels, a faction's regions and hexes, a roll mode's cancels, a part of the day's tags) show each item as a pill with its × to take it out; typing adds one (Enter or a comma; a space for a faction's hexes, `15,9`), Backspace in the empty box takes the last one, and the suggestions come grouped by what they start with (`time`, `trip`, `actions`…).
- Oracle: **Rolled by** under each definition: the actions, checks, clocks, tables and generators that roll it, in every system that brings its pack, each a link to where it's edited.
- Systems: **Used by** for ways of travelling, terrains, roads and rivers, kinds of weather, actions, factions, roll modes, months and parts of the day: what reads them, and what **names** them (another action's step, a value that blocks a way, a table another rolls).
- Hexmapper, Campaign: the **Timeline** says what it keeps: the world's story (events come due wherever the party is), while the trip's doings go to its journal.
- Characters, Travel, Hexmapper: **tags as pills** everywhere: a character's tags, a way's hexes in Travel and a hex's tags in the Hexmapper use the same pills as Systems (Enter or a comma adds one, × takes it out, suggestions grouped).
- Oracle: **conditions and values as rows**: a deck's cards get **⋯** too (what they set, change and whether they pause); a table entry's **Only if** / **Unless**, a roll mode's **by itself when** / **unless** and a generator field's conditions are built as rows (what it reads · comparison · value), like Systems'; an entry's **Sets** and **Changes** and a field's **Context** are rows of a name and a value. **YAML** is one click away for what rows can't say. The help texts use the full names (`hex.danger`, `time.part`).
- Systems: **steps dragged into place**: each step's card has a handle (⠿); drag it onto another step to move it there (↑ and ↓ still move it one place).
- Systems: **an action read as a whole**: an unfolded action's card starts with the whole action in words, who takes it, when it can be taken and each step with its condition (_With its button, only when time.tags is not dark, once a day: pass 3 h; then speed ×0.5 the rest of the day._).
- Systems: **fields that go together share a line** in the folded cards: a terrain's **Open when** and **Closed when** side by side with **Passable** after them; a way of travelling's **Only when** and **Not when**; a sheet value's and a kind of relation's **Min** and **Max**; a clock's segments and filled first; a faction's **Map** and **Hexes**.

### Packs

- The Grey Marches: _A stormy dawn_ is an action right after the weather's check, and _Out of the Greywood_ an action entering a hex; getting lost isn't rolled on a stormy dawn; foraging is rolled once its three hours are done, and fishing by a step after its two hours, which says so when nothing bit.
- The Grey Marches: **an omen at each dawn on the road**: a new check, _Omens_, draws a card of _Omens of the road_ every morning until the party reaches its destination; drawn cards stay out until the deck runs out, kept in the campaign's Oracle with the draws made by hand.
- Core: **weather for the Generic rules**: _The plain sky_, a weather model for any setting (clear, cloudy, rain, storm, and snow in winter, today's following yesterday's), rolled by a **Weather** check each morning; rain slows the march to ×0.75, a storm or snow to ×0.5. Campaigns with the Generic rules roll it day by day on their world clock, and a new system in Systems starts with the check bound to it.

### Fixes

- Spanish texts: a map's tokens are called **token** everywhere (the Hexmapper's sheet help, the manual), no longer _ficha_, which is a card; the Systems app keeps its name (**Editar en Systems ↗**).
- Travel, Hexmapper: a check of an action's own moment that pauses (a night encounter as the camp begins) now **holds the rest of the action**: the encounter is played at nightfall and the night passes after **Continue**, instead of the camp going on to dawn first.
- Travel, Hexmapper: a check waiting for you that came up on an earlier day (a night encounter as the camp began, the camp gone on till dawn) didn't say so, and its line wasn't in the day the trip was on; the box now says the day and time it came up.
- The Grey Marches: discovering the land ahead from hills or mountains could make a **canyon**, a terrain their rules don't know; it's heath now.

## [0.11.0] - 2026-10-22

### Apps

- Hexmapper, Campaign: **Stop the world clock** is now **Remove the world clock**: it never paused the clock, it forgets it (its date, events, clocks and timeline).
- Systems: **every long list as folded cards**: ways of travelling, terrains, a sheet's values and relations, factions, clocks and weather kinds come as cards like actions and checks (name, id and what they say in one line; fields in two columns when unfolded; a search when there are many). Their conditions (**Only through**, **Only when**, **Open when**, **Closed when**) are built as rows, and their maps (a clock's **Changes**, a faction's starting values, what a weather sets, a value's tones) are rows of a name and a value. Short lists (roads and rivers, supplies, values of the day, a sheet's conditions) stay a table.
- Systems: **actions and checks as folded cards, with a search**: Rules → Actions and Checks list their cards folded, each with its name, id and what it does in one line; a click unfolds one, **Unfold all** / **Fold all** do every card, and a search box finds the cards holding every word typed (in names, ids, moments, steps, tables, conditions). Both cards now lay their fields out in the same two columns.
- Systems: **Checks built as rows**: a check's **Only if** / **Skip if** are conditions as rows (what it reads · comparison · value), like actions'; its **Changes** and **Extra context** are rows of a name and a value, suggested from the system, with **YAML** one click away for what rows can't say. A step's changes and values of the day use the same rows. Each check's fields line up in two columns.
- Manual: **Systems → Clocks explained from nothing**: how progress clocks work (they come with the world clock; anything with effects fills them, and a click; what happens when one fills, in a chain; the trip hears it; conditions read it) with a picture of a clock filling, a spreading fever built step by step (a swamp check fills it, it rolls a twist and fills the roads' clock, word of it reaches the trip, a barrier when the roads close) with what you'll see, the YAML and the usual mistakes. And Hexmapper → World: **Without the world clock**, what a trip keeps without it and what only the world clock brings (removing it forgets it).

### Fixes

- Hexmapper: **travelling to a hex with a token on it** (the Grey Marches' dragon): in Play, a click anywhere on that hex grabbed the token and never set the destination; now a click on a token (without dragging it) selects it and is a click on its hex too. Dragging still moves it.
- Hexmapper, Campaign: the World panel's **Events** form read _actions.at_ (_actions.a las_ in Spanish) instead of _at_, and its rows didn't wrap, so a narrow side panel scrolled sideways.

## [0.10.0] - 2026-10-22

### Packs

- The Grey Marches: **a die that steps**: each companion's **Nerve** is a die from d4 to d12 (`display: levels`); the rite at a shrine steps it up, the Wyrm waking down.

### Fixes

- Systems: **opening Rules (or any tab with many texts) took seconds** with the UI in another language than the pack's (Spanish on the Grey Marches: over 2 s): each text box read the whole translation file again; now it's read once (about 0.1 s now: the pack's language was also read again for each box).
- Sheets: **a number typed past its max stayed in its box** (Rations `9 / 6` though the value was 6): the box now shows the value as it is; and number boxes' arrows stop at its bounds.
- Sheets: **tones as a share of the max**: `tones: { 0: danger, 50%: warning, 75%: good }` follows a max that changes, and an empty bar keeps its tone on its frame; the Grey Marches' health uses it (it only turned red at 0, when the bar was empty).

## [0.9.0] - 2026-10-22

### Apps

- Systems, Characters, Hexmapper, Travel, Campaign: **nicer sheets: each value says how it's shown**: a sheet's value (and a kind of relation's number) is drawn as its sheet says, `display:` `number`, `of` (**2 / 6**), `bar`, `boxes`, `pips` (round dots), `dial` (a round clock) or `levels` (a name from a list: _Unhurt … Dying_, `d4 … d12`), with `tones` that colour it from a value up (`{ 0: danger, 2: warning, 4: good }`); each group of a sheet is a card of its own. Systems' **Sheet** tab chooses them (**Shown as**, **Levels**, **Tones**) with a **Preview** to try. The Grey Marches show every one (skills as dots, health as a bar, a faction's strength as a dial and its reputation from _Hostile_ to _Sworn friends_); Core's health is a bar. `track: true` still reads, as `display: boxes`.

- Hexmapper, Travel, Campaign: **Play, redesigned**: **New trip** is one line (System · season · New trip) instead of a framed box; the trip's tabs have plain headings inside, no folds; **Rolls with** moved into the Party tab, under **Acting**; **Export** at the top of the Journal tab; tabs never wrap onto a second row: when they don't fit (the World panel in the Hexmapper's side panel), they become a choice of the same tabs.

- Hexmapper, Travel, Systems' Try it: **a journal that keeps everything, with a filter**: the journal now also keeps what happens behind (each roll's dice and the row or card it chose, the weather's roll, every check that didn't come up and why, the moments of the day some check or action names, each value before and after, the routes planned). The Journal tab's **Show** chooses **The story**, **And the rules** (as before) or **Everything**; it can leave out kinds of lines (trip, Oracle, world, characters, notes) and search them, remembered per browser; **Export** writes what the filter shows. **What just happened** never shows the detail.

- Hexmapper, Travel, Campaign: **campaigns easier to tell apart**: opening an example map whose campaign this browser doesn't have, while it has campaigns of the same name or system, asks whether to join one of them or start its own; a new campaign never takes a name another has (it gets a number, _The Grey Marches (2)_); opening a map says which campaign it's in and which maps and trips are in it too. The Campaign app's manual explains how campaigns come to be and how to merge two.

- Campaign: **factions striped on the minimap too**: Factions' small map draws each faction's land as the Hexmapper does, diagonal stripes of its colour and a dashed frontier over the terrain's colour, instead of painting the hexes in the faction's colour (which mixed with the terrain's); the legend's swatches are striped to match.

- Systems: **actions edited visually**: in **Rules → Actions** each step is a card, folded to what it does in words (_Pass 3 h_, _Take March (until: hex)_) with its condition beside it; open, a choice of what it does and that kind's own fields (a time, a way of travelling, an action and its parameters, a check, rows of changes…). **Only when** / **Not when** (the action's and each step's) and a step's wait are built as rows of _what it reads · comparison · value_, joined by **All of these** or **Any of these**, with facts suggested by full name and values from the system; **YAML** on each card and each condition shows the text as before, and conditions rows can't show stay YAML, unchanged.

- Packs, Systems, Hexmapper, Travel: **a step rolls a table, and trips hear the world's clocks**: an action's step can roll something of the Oracle directly (`roll: table.ruins`, a generator, an oracle or a deck), with no check or binding around it: its result goes to the journal by its name, its values and changes reach the trip, and a pause in its entry stops it. A system's progress clock filling is a moment its trips hear (`world.clocks.<id>.full`), for an action's **By itself at** or a check's **When**: when what the trip did fills it, those actions and checks happen. Systems suggests both. The Grey Marches: **Delve the ruin** (rolls _Delving a ruin_) and **The Wyrm wakes** (when the haunted lights fill its clock); Core's Generic rules: **Explore** (rolls the Prompt).

- Hexmapper, Travel, Campaign, Systems: **trips hear every clock that fills, by hand too**: a progress clock filling by any means (a click on the World panel, a table rolled by hand, a world turn, the Campaign app) is heard by the trip going on in the campaign: at once in the same app, or on its next step in another, its journal saying **In the world: … filled** before what the system does then. Clocks made by hand can be named too, by their name in lowercase with dashes (`world.clocks.the-wyrm-wakes.full`); the Systems app warns, instead of refusing, that the system declares no such clock. Campaigns keep the moments waiting for their trip (format v4).

- Packs, Hexmapper, Travel, Systems: **the checks of one moment come one by one (pack format 6)**: in the order the rules list them, each one's **Only if** / **Skip if** is read just before it's rolled, so it sees what the checks before it set (the weather just rolled, a value of the day, their changes): at dawn, a check after the weather's that reads `trip.weather` sees today's weather, not yesterday's. A check that pauses holds the rest of its moment until **Continue**. Packs of format 5 aren't read; Core, the Grey Marches and Kal-Arath are moved. The Grey Marches: **A stormy dawn** (fatigue +1 when the dawn's weather is a storm).

- Manual: **Systems → Rules explained from nothing**: how a trip moves (its moments, the march, how long a hex takes) with a picture of a day of the Generic rules, a desert caravan built step by step (camels, water with a Max, a value of the day that leaves the camels behind, a salt flat closed in spring, an oasis) with what you'll see in the trip, and the usual mistakes.

- Hexmapper, Travel, Systems' Try it: **a new trip's supplies respect their bounds**: a trip used to start with 6 of each supply even past its **Max** (water with Max 3 started at 6); now 6, or as many as its **Min** and **Max** allow.

- Hexmapper, Travel, Systems' Try it: **clearer stops**: a value of the day that leaves the way of travelling behind (deep snow and the horses) says so and to choose another way, instead of _no more travel today_; a march with nowhere it can go says there's no route, instead of _No destination set_.

- Manual: **Systems → Checks explained from nothing**: how a check works (its moment, its conditions read just before it, its changes, its table and context, what stops the trip) with a picture of one moment's checks, a stretch of wolf country built step by step (hunger at the day's end, wolves by day and at night on one table with a different context, old stones that pause) with what you'll see in the trip, and the usual mistakes.

- Manual: **Systems → Sheet explained from nothing**: how sheets work (a character is the sheet filled in; the party made of its members: stats from their values, supplies they carry, conditions that block everyone; bounds, also another value; the party's own sheet; whom an effect reaches) with a picture of a sheet, its characters and the party, a company of three built step by step (Survival from the best not wounded, rations shared out, scree that lames whoever leads, hunger that hurts everyone and wears morale down) with what you'll see in the trip, the YAML and the usual mistakes. Kinds no longer shows an old way of writing a bound (`'{{name}}'`; it is `'{{self.values.<id>}}'`).

- Manual: **Systems → Factions explained from nothing**: how factions work (a sheet and land; the system says how they start, the campaign and its maps keep them; a world turn, faction by faction in order, each rolling its turn table and changing itself, the others, land and clocks; turns by hand or every so many days; land grown and lost hex by hex, nobody's first; what the rest of the world reads and changes) with a picture of one world turn, a border feud built step by step (the Wardens on Core's table, the Reavers on their own rolled with their Strength, robbers on their land who grow bolder with every traveller robbed) with what you'll see on the map and in the trip, the YAML and the usual mistakes.

- Systems: **the factions' sheet is edited in the Sheet tab**, in a tab of its own beside the party's and the characters' (before, only in the YAML).

- Hexmapper, Travel, Campaign: **a trip or a full clock can set a faction's condition** (`factions.the-crown.conditions.at-war: true`); before, only their values changed.

- Hexmapper, Travel, Systems' Try it: **an action's journal line says what it did**: an action no check is rolled at now tells its changes (_Eat (Food −1)_, before only _Eat_); an action whose checks all stayed away says the system's **When nothing applies** again (the Grey Marches' _nothing to forage on Hills_), which never showed; and **Everything** rounds the hours it reads (_8.01_, not _8.01111111111095_).

## [0.8.0] - 2026-10-20

### Apps

- Manual: **Systems → Weather explained from nothing**: how weather with memory works, chance tables and hex flowers read in plain words, a valley's weather built step by step with what you'll see in the trip, the usual mistakes, and a picture of a hex flower and how the day walks on it. The manual can show pictures now.

## [0.7.0] - 2026-10-20

### Apps

- All apps: **links in the theme's colour**, visited or not, with hover and focus (no more browser blue and purple).

- Hexmapper, Travel: **the Party tab, polished**: **Acting** folds with the characters; **Roles**, **Stats** and a sheet's groups are headings of their own; the Grey Marches' Company (morale, fatigue, hirelings, endurance) and companions, and the Generic rules' sheets, say what each value means in their system.

- Travel, Hexmapper: **why a march stopped, in the journal**: when a march (or any action, the halt, a way of travelling) stops or can't be taken because its rule doesn't hold, the journal line and the button's tooltip say which part failed and what it read (_“March” stops here: the day’s march (hours) is 8: it needs under 8; By torchlight doesn’t hold_).

- Packs: **the Grey Marches' encounters stop the trip, and come less often**: every encounter with someone to deal with (a patrol, wolves, bandits, a traveller, the Ember Hunt) pauses the trip; _Who goes there?_ first rolls whether anybody is about (a d6 over the hex's danger), so nobody comes two times in three in the Hollow Hills and the Greywood's edge.

- Hexmapper, Travel: **a check that waits says where**: its journal line and the waiting box name the hex it came up in (_Landmark at The Grey Stones: waiting for you_).

- Hexmapper, Travel: **What just happened, newest first**, as the Journal: what stopped the trip is right under the buttons.

- Campaign, Hexmapper: **notes on each faction**: its page in your notes app (↗ opens it) and a short note of yours, kept by the campaign, edited in the Campaign app's **Factions** and the Hexmapper's World → **Factions**, and carried by a map's file.

- Hexmapper: **regions and factions told apart on the map**: factions are drawn as a political map does, diagonal stripes of their colour and a dashed frontier, over the regions' flat tint and solid border; the layer being worked on comes forward (with the Regions tool, factions fade; with the World panel open, regions fade); the region the Regions tool paints, or the faction whose brush is on, is outlined (light, with a dark halo) and the rest of the map dimmed; hovering a hex says under the map what holds it (_Region: … · Faction: …_).

- Packs, Systems: **pack format 5: every reference names what it is** (`subsystem.id`): moments (`at: trip.hex-enter`, `on: time.day-end`, a part of the day `time.part.morning`, an action `actions.camp`), what values and conditions block (`blocks: [travel.move, actions.forage, modes.horse]`), the actions taken (`do: actions.march`, the halt and the way on too), checks rolled (`roll: checks.ENCOUNTER`), parameters asked (`ask: params.how`), ways of travelling changed to (`travel.mode: modes.boat`), and `time:` / `limit:` / `travel.start` up to a part (`time.part.morning`); conditions see `moment` by the full name too. A sheet's bound that is another of its values is `{{self.values.<id>}}` (`max: '{{self.values.maxHealth}}'`). The bundled packs, the manual and the apps' help now write every fact by its full name (`hex.terrain`, `trip.weather`, `time.season`, `party.stats.survival`); short names are still read. Values compared in conditions stay short (`trip.edges: road`). **References to a pack's definitions say their kind**, the pack first when it's another's: `table: table.ruins`, `table: generator.npc`, `resolve: oracle.ford`, `modes: [roll-modes.advantage]`, a system's `travel: travel-rules.default`, `sheet: sheet.companion`, `weather: [weather.sky]`, a faction's `turn: core/table.faction-turn`, `aliases: { table.twist: core/table.twists }`; the Oracle's and Systems' editors, pickers and YAML suggestions write them so. A short name in a format-5 pack says which one it meant (`write table.ruins`), or what the definition is when the kind is wrong. Packs of format 4 aren't read (File formats says what changed); Core, the Grey Marches and Kal-Arath are moved, and saved trips waiting on a check keep their moment.

- Packs, Hexmapper, Travel, Systems: **more steps for actions**: `say` (a line of the system's own in the journal, its `{{…}}` read then), `pause` (the trip waits, saying why, until **Continue**; then the rest of the action, and a march it stopped, go on), `ask` (the trip asks the player to choose one of the action's parameters, a button per answer; later steps branch on it, and its button no longer offers it), `travel.mode` (travel another way, if it can be chosen; the route is planned again) and `wait` (time passes until a condition holds, at most until its `limit`). Steps can have an `id`, so what they say is translated. The Grey Marches' **Take the ferry** at Brenna's ferry uses them all (and **Go ashore**); Core's Eat says when the food ran out. A new manual page, **Actions and steps**, gathers every step with examples and a whole system that plays.

- Systems: **where a name is used**: the rows of what a system declares (party stats and journey roles, supplies, values of the day, each sheet's values and conditions, clocks) have a **Used by** column: how many places in the system's packs read, change, set or are made of it, and, pressed, which, each linking to its tab or to the Oracle for tables, oracles, generators and decks. **Find a name**, on the Overview, finds any name as written or by its full name, and says when nothing declares it, with the names it looks like (a typo). The guide's Pathfinding, read by _Do we get lost?_, now shows up under the Sheet's Pathfinding. In Travel and the Hexmapper's Play, the help of a party stat, a supply or a journey role says what reads and what changes it (_Read by: Do we get lost?_).

- Hexmapper, Travel: **the party in one place**: Play's **Party** tab shows **The party** first, its sheet with the party stats under it, each saying where it comes from (_Kael’s Pathfinding, the highest_; _Brenna’s Charisma (Rolls with)_; _how many: Kael, Brenna_), then its characters, then its supplies; the loose **Stats** section is gone. Every sheet (the party's, the characters', a token's) says which it is and whose system, with **Edit in Systems ↗**. The party token keeps no fields of its own (nothing read them; maps saved with some lose them): its panel in Tokens opens Play → Party.

- Campaign: **a campaign that can't be deleted says why**: the maps and trips still in it, by name.

- Packs: **the Grey Marches' second example map, the Hollow Hills**: the hills around Hollow Gate up close (3 km a hex), in the same campaign as the Marches' map: one world clock, the factions shared, the Iron Clans holding land on both maps (the Hills by region, their watch-cairn by `map:`); a trail past a landmark, a ford and a shrine to the Barrow-halls. Core's page says what a campaign gets with the Generic rules.

- Hexmapper: **example maps of one campaign open in it**: an example whose file names a campaign this browser keeps (another example map of it) joins it without asking, its world kept; **Start fresh** restarts the campaign's world only when nothing else is in it.

- Hexmapper: **the World panel in tabs**, as Play's: **Now** (the date, moving time on), **Events**, **Clocks**, **Timeline** and **Factions**, the one chosen remembered in this browser; each faction is a line with its colour, its land and its brush (**✎**), its sheet folded under it. **Open in Campaign ↗** above the tabs, and in Travel's trip room, the Oracle's **Campaign** and a roster character's **Where it plays** in Characters (which now names the campaign of that map or trip).

- **Campaign**, a new app: the campaigns this browser keeps, the worlds your maps and trips share. Make one (a name and a system), rename it and link its page in your notes app; its **World** tab plays its world clock without a map (the date, moving time on, events, progress clocks, the world's weather: the same clock as the Hexmapper's World panel, and every map and trip of the campaign sees it move at once); **Timeline** shows what happened, newest first; **Maps and trips** lists the Hexmapper maps and Travel trips in it, with links to open them and the trip going on. A campaign is deleted only when nothing is in it. Links: `#/campaign/<id>`, `#/campaign/<id>/<tab>`.

- Campaign: **Factions**, a tab of their own: each faction's card and sheet, their land as a small map of one of the campaign's maps (chosen when there are several; by default the one a trip plays on), **Paint in the Hexmapper ↗**, **World turn** and **Turns by themselves**, their land changing on that map (the Hexmapper takes it at once if it's open). **Bring in its factions** works with no map too (only their sheets), and **Give them their starting land here** gives a map that joined the campaign after them the land its system starts them with. Moving time on in **World** plays the turns that come due on that map. `#/campaign/<id>/factions/<faction>` opens one.

- Hexmapper: **maps share campaigns**: **Map settings → Campaign** says which campaign the map is in (**Its own**, or another kept in this browser, a map's or a Travel trip's), names its other maps and trips, and renames it. Moving a map to another campaign asks which world stays when both have one (a world clock, factions, Oracle rolls): the campaign's (the map keeps the land of its factions) or the map's, which takes its place; the campaign it leaves is deleted if nothing else is in it. Travel's trips join campaigns the same way. **The system and packs are the campaign's**, shared by its maps and trips: changing them in Map settings or with a new trip asks first when others are in it; a trip going on keeps its own. Opening a file whose campaign this browser has asks whether to **join it**, **replace it** or **keep it apart**. Maps (v25) hand their system and packs to their campaign (v3) when they open.

- Oracle: **roll in a campaign**: **Campaign**, at the top of the history, chooses where hand rolls keep their decks, once-only results and history: the Oracle's own (**No campaign**, as before) or a campaign's (a Hexmapper map's, a Travel trip's), shared with its maps and trips.

- Travel: **trips play in campaigns**: **Campaign**, above the system, chooses the world a trip happens in: one of its own (as before), or a Hexmapper map's. In a map's campaign the trip's days are its world clock (a new trip starts on its date, events and holidays coming due go to the journal), its tables read the campaign's clocks, events and factions and change them, and its checks roll on the campaign's Oracle. **One trip at a time** in a campaign, in either app: playing one where another played last asks to pause it, and the party waits until the campaign's clock if it went on. Saved trips (v9) each get a campaign of their own; campaigns (v2) remember which trip played last.

- Hexmapper: a progress clock filled by a trip's result (`world.clocks.<id>: 1`) keeps what its table drew: the trip's Oracle state no longer overwrites the full clock's roll (its deck draws and once-only entries were forgotten).

- Packs: **a faction's starting hexes are on one map**: `territory: { map: maps/frontier.otd.json, hexes: ['15,9'] }` gives them only on that example map of the pack (they were given on any map with those coordinates, somewhere else entirely); its regions still start on any map that has them. `hexes` without `map` is refused with a message saying so. Systems' Factions tab has **On the map**; the Grey Marches' Fort Keld names its example map.

- Hexmapper: **every map belongs to a campaign**, the world it's played in: its world clock and weather, the factions' sheets and the Oracle are the campaign's, the land each faction holds stays on the map. For now each map has a campaign of its own (maps sharing one, and the Campaign app, come next); maps saved before (map format v24) make theirs with what they had, and play on as before. A map's file carries its campaign; a campaign changed in another window or app shows up on the open map. Backups (v2) include the campaigns; older backups still restore.

- Hexmapper: **a map open in two windows stays the same in both** (or changed by another app): what was played elsewhere (a trip, the world clock, factions, the Oracle) shows up and Undo keeps working; a map edited elsewhere is shown as it was saved there, with a notice, and Undo starts again. Before, the window that saved last overwrote the other's changes.

- Travel, Hexmapper: **characters from the roster**: a trip's **Characters** take roster characters (**From the roster**) and keep their own (**Keep in the roster**); linked ones are written back to the roster after every step and edit, and catch up with what the Characters app changed (the journal says so). A token's sheet can be a roster character too (a recurring NPC). A character travels in one place at a time; taking it elsewhere asks first. Travel opens a trip from a link (`#/trip/<id>`).

- **Characters**, a new app: your roster, the characters this browser keeps, of any system. Make one with a system's characters' sheet, edit its values, conditions, tags and relations, link its page in your notes app, duplicate, delete, and export or import characters as `.otd.json` (a map's party too). Backups include the roster, and **Add to mine** joins it, keeping the newer copy of each character.

- **Marching is an action like the rest (pack format 4)**: nothing about moving is built in any more. An action moves the party with a `travel.move` step, along the route while time passes and its conditions hold (`march: { do: [{ travel.move: destination }] }`); actions take **parameters** (`params: { until: { choices: [destination, hex, 3] } }`, read as `{{params.until}}`), chosen beside their button in the trip panel and given by a `do:` step's `with:`; the trip goes on by itself (the World clock, a travel order) with the action `travel.onward` names (`onward: { do: march, with: { until: destination } }`). The steps `speed` and `advance` are `travel.speed` and `travel.advance`. The trip panel's **Travel** and **1 hex** buttons are gone: its buttons are the system's actions, the moving ones first, each with its choices (**March** · to the destination / one hex / three hexes); a check that stops a march on the way leaves it under way, and **Go on** finishes it (and the rest of what the action does). **Wait for the next march** is **Wait to go on**. Packs of format 3 aren't read: our packs (Core, the Grey Marches) are at format 4, and the Grey Marches' forced march and night march now march too. Systems' **Rules** tab has **Goes on by itself with**, and its actions **Parameters**.

- **The Generic rules are Core's system**, data instead of code: Core has a `kind: system` (`core`: its travel rules, a plain calendar whose day has parts, the night tagged `dark`, and its characters' and party's sheets, translated in its overlays). A map that chooses no system plays it, as before; maps and Travel's trips that played the built-in rules play Core's (map format v22, trips v7). Its rules name parts of the day instead of hours (march while it isn't `dark`, camp from the night until the morning). **A system without travel rules doesn't travel**: the Hexmapper's Play says so and starts no trip (its world, oracle and factions still play), and Travel doesn't list it; a system whose pack isn't loaded is no longer played with the Generic rules in its place. Systems shows Core's system read-only like any bundled one (its **YAML** is its files); **New system** starts from a copy of its rules and names Core's calendar (the pack depends on Core); **New sheet**, **New party sheet** and **New calendar** start with made-up rows (`value-1`) and the calendar with parts of the day. Health, Wounded and Morale are no longer named by the apps: packs name their own. Kal-Arath names Core's calendar and its parts of the day.

- Hexmapper: the World view's **Factions** say what a faction is and where its land comes from (**Their land**: where the system says it starts, painted by hand, won and lost on world turns); a button's help sits beside it (**What it does**), so reading about **World turn** no longer runs one. Systems' **Factions** tab says the land it gives is where they start, the map's from then on.

- Travel, Hexmapper: **what just happened, beside the buttons**: under the trip's buttons, a box shows the journal lines of the last step (a march's hexes and checks, what an action changed), replaced at each step; the rest of the panel is a tab at a time, **Party** (supplies, stats, the party's sheet, characters), **Journal** and **So far**, the one chosen remembered by this browser. Maps (v23) and Travel's saved trips (v8) keep where the last step starts.

- Travel, Hexmapper: **the trip panel's sections fold** by their heading (**Supplies**, **Stats**, **The party**, **Characters**, **So far**, **Journal**), remembered by this browser; the status, a check waiting for **Continue** and the buttons never do.

- Systems: **a description for every part**, shown as its help where players meet it: the Sheet tab's values, groups, conditions and kinds of relation (and the sheet itself), ways of travelling, supplies, factions and clocks have a **Description (its help)** column, translatable like names. Characters' cards show their groups' and relations' descriptions, the World view a faction's, and the trip panel the chosen way of travelling's.

- Systems: **the divisions of the day as a strip** of the day in the Calendar tab, each part a stretch in its colour; **Every N hours** is gone from the form: **Split into equal parts…** writes the numbered rows to rename or adjust (a division written with `every` shows its parts and can be written as rows). Parts all named 1, 2, 3… read as numbers, like `every`'s.

- Systems: **a weather hex flower is drawn as hexes**, coloured by kind of weather: pick one under **Paint with** and click cells to give them it; a compass shows where each 2d6 total moves the day, and the help explains the walk with an example.

- Travel, Hexmapper: the apps no longer name ways of travelling, supplies, actions or values a system leaves unnamed (`foot`, `food`, `camp`, `lost`…): the system's own names are shown, or the id made readable.

### Fixes

- Systems: a system's **YAML** tab no longer edits the files of another pack it brings (Core's roll modes…): they show read-only, saying whose they are. The notice of packs not read shows **Delete** in red.

## [0.6.1] - 2026-10-18

### Fixes

- A pack of yours in an older pack format can be **deleted** from the notice that lists it (**Delete**, after **Download .zip** to keep it), and an older copy of a bundled pack no longer marks the bundled one as having an **update**.

## [0.6.0] - 2026-10-18

### Apps

- **Packs of an older format don't just vanish**: the Oracle, Travel and Systems lists say which of yours aren't read (**Not read: written for an older pack format**), with **Download .zip** to keep each one; a copy of yours of a bundled pack in an older format no longer hides the bundled one (Core, the Grey Marches), which is used meanwhile.
- A definition writes its texts in its pack's language only: a text in several languages in the file itself (`name: { en: …, es: … }`) is a problem of the pack (translations go in `locales/`; the pack's own name in `pack.yaml` still may).
- **No built-in day, camp or rest (pack format 3)**: travel rules no longer have dawn and nightfall (`day:`), a `day-start` moment, `daylight`, or a camp, rest, march and `lost` nobody declares. A system says when trips start (`travel.start`), when the party can march (`actions.march`; without it, whenever nothing else stops it), and what it does when it can't (**the halt**, `travel.halt: { at: '20:00', do: camp }`: from then on, a party that isn't marching while the time moves on by itself takes it, or the journal says why not); checks and actions may come at a clock (`at: '06:00'`) as at a part of the day. **Packs of an older format aren't read** for now (the apps say so): bring them to format 3. The Systems app's **Update** (format 1) and **Convert** (supplies used per day) are gone, and with them the older forms they converted: `perDay`, `consumes`, `eat: day`, an action's `minutes` / `speed` / `fatigue` / `effects` columns, `allowedTerrains`, a calendar's `watchHours` (Calendar's **Hours per watch**: write `divisions: { watch: { every: 4 } }`), and a table result's `set: { resources, stats, fatigue }` (write `effects`). Our packs (Core, the Grey Marches) are at format 3: the Grey Marches name their day by parts (`travel.start: part.morning`, the halt at `part.night`, `time.tags: dark`). Systems' **Rules** tab has **Trips start** and **Halt** (the older day only for older packs); the Calendar tab loses Dawn and Nightfall, and the Hexmapper's World panel **Until dawn** / **Until dusk** (use **Until…** a part of the day).
- Travel, Hexmapper: **Wait for the next march** replaces **Wait until dawn**: today's march goes by, then the time passes until the system lets the party march again, its halt taken on the way.
- Travel, Hexmapper: a march that goes on past midnight no longer sees the day before's values the trip was given (a night march by torchlight ends with the day).
- **Progress clocks, declared by systems**: a system can name the clocks its world starts with (`kind: clocks`: segments, where each starts, and what happens when it fills: words for the timeline, a table rolled, effects on the factions and other clocks, then it stays full, starts over or goes away). The Hexmapper's world clock starts with them (**Add the system's clocks** brings back missing ones); rules read a declared clock by its id whatever it's renamed; one full clock can fill another. The Systems app has a **Clocks** tab. Map format v19.
- Hexmapper: **progress clocks look like clocks**: a round dial, one wedge per segment, click to fill; **any number of segments**, set when adding one and changed later. An effect can set a clock (`world.clocks.the-siege: '=0'`).
- **The party's own sheet**: a system can name a sheet for the party itself (`partySheet:` in `kind: system`) beside its characters': morale, fatigue, hirelings… in every trip, whoever travels, while characters join and leave. Trips show it as **The party**, above the characters; tables read `party.values.<id>`, `party.conditions`, `party.tags`; effects change it (`party.values.morale: -1`, `party.conditions.shaken: true`) and its conditions block for the whole party. A party stat can be one of its values (`from: { party: morale }`): effects on the stat change the sheet, within its bounds. The Systems app's **Sheet** tab edits both sheets (**New party sheet**); the Generic rules have the smallest one (Morale). Map format v20, trips v6.
- **Who rolls**: a party stat can be one character's value (`from: { pick: charisma }`): **Rolls with**, under the trip's buttons, chooses whose (**The best** by default), and **Ask at every roll** makes each check rolled on a table wait for the choice beside **Continue**. The Grey Marches' Charisma is whoever does the talking.
- Systems: another pack's definitions a system brings (Core's roll modes) are shown read-only with whose they are, no longer offering **Edit a copy** of that pack.
- Travel, Hexmapper: **Ask at every roll** on a line of its own, under **Rolls with**.
- The Grey Marches: their day dawns and falls with parts of their calendar's, watches only at night, foraging with advantage in the morning (instead of the dawn watch), **Lights in the middle watch** in camp where danger is 3 or more with nobody on watch, and **Tales of the road** until the middle watch.
- **Trips read the parts of the day**: checks and actions can come as a part of the calendar's day begins (`at: watch.middle`, `on: meal.elevenses`, while marching, waiting or asleep in camp), steps wait until one (`time: meal.luncheon`), the system's day can start and fall at one (`day: { start: meal.breakfast }`), and conditions read `time.<division>`, `time.tags` and `system.<division>.<part>`; the trip panel shows the parts of the day.
- **Divisions of the day**: a calendar can divide the day as many ways as its system wants (`divisions:` meals, watches, bells…: parts with their times, gaps and tags, or numbered parts `every` N hours; `watchHours` still works). The Hexmapper's World panel shows what the moment is in each and moves time on to the next part (**Next: …**) or a part chosen (**Until…**), instead of **+1 watch**; Systems' Calendar tab edits them; the Grey Marches have their parts of the day.
- Hexmapper: the characters' **relations** are a layer of their own (**Layers → Relations**), hidden by default; Play's **Show relations** is gone, and hiding **Trail and route** no longer hides them (map format v21).
- Hexmapper: **a faction's land is painted by hand**: **Paint its land** in the World view, then click or drag on the map (right click takes hexes away).
- Travel, Hexmapper: **the trip's buttons are at the top**, right under where the party is (and a check waiting for **Continue** above them), instead of under the supplies, stats and characters.
- Faction turn tables read the world's clocks by their full names too (`world.clocks.<id>`, not only `clocks.<id>`).

### Packs

- The Grey Marches: **their three threats are the system's clocks** (`clocks.yaml`): the Greywood Wyrm wakes (rolling what it does first), the Iron Clans' march (at war, the garrison weakened and closer to mutiny, starting over) and the garrison's mutiny (the fort lost).
- The Grey Marches: **The Company** is the party's own sheet (its Morale, Fatigue, Hirelings and Endurance), and getting lost in the dark leaves it **Shaken**: no forced march until a rest.
- Core: **A growing threat** (`core/threat`), a progress clock for any game that strikes with a twist when full and starts over.

### Fixes

- Hexmapper: **a new map no longer shows the last map's factions**: their land stayed drawn after **New map** (the map had none: only the drawing was left).

- Hexmapper: **Play broke on a trip with rules** (since 0.5.0): working out which buttons the party could use failed on the app's live state, so the trip's buttons (March, Camp…) never showed and the panels stopped answering (**Play** wouldn't open, **Map settings** wouldn't close) until the page was reloaded.

- Travel, Hexmapper: **the browser could hang on March**. A hex walked all but a sliver of a minute (minutes towards a hex add up with decimals) was marched towards for no time at all: during the day the trip stopped saying the system's rule didn't let it march on, and at dawn it went round for ever. Such a hex is now entered at once, and trips already saved like that go on.
- Travel: saved trips from every release (one paused on a check, one camped, one with the Generic rules) are kept and tested to open and play on in each new version.

## [0.5.0] - 2026-10-09

### Apps

- **Characters**: a system can give its party characters made with a **sheet** of its own (`kind: sheet`: values with bounds, tracks, groups, conditions that block things, kinds of relation). Trips in Travel, the Hexmapper and Systems' **Try it** get a **Characters** section: add them, choose who acts, change their values and conditions. The party's stats can be made of theirs (`from: { max: survival }` in the bindings: the best, the worst, the sum or how many, leaving some out with `when` / `unless`) and its supplies carried by them (`resources: { food: { carried: rations } }`, shared out as the trip spends them); effects reach them (`party.members.…`, `characters.<id>.…`, `acting.…`, `true` / `false` for conditions), conditions read them, and their conditions block what they say, naming who. The same system still plays with no characters. The Systems app has a **Sheet** tab and, in **Checks**, **From the members** and **Supplies the members carry**; the Generic system has the smallest sheet (health and a wound). Maps keep their party's characters (map format v17, as OTD characters of the party) and saved trips too (trips v5).
- Characters' **relations** (a bond, a home…, to another character, a place, a region or a hex) are edited in each character's sheet, read where the party goes (`hex.related`, `hex.relations.home`) and drawn in the Hexmapper as threads from the party (**Play → Show relations** hides them). **Journey roles** a system declares (`roles` in its bindings: a guide, a lookout…) are given to characters in the trip and read as `roles.<id>.…`; the Systems app's **Checks** tab edits them.
- Hexmapper: a PC, NPC or enemy **token can have a sheet** of the map's system (**Give it a sheet** in its panel), like a statblock: hand rolls with it selected read its values and conditions (`token.health`, `token.conditions`), and it's saved in the map file.
- **Factions and world turns**: a system can declare the powers of its world (`kind: factions`: each a character of a sheet, with a colour and starting land by region or hex). The Hexmapper's World view brings them onto a map, draws their land (the **Factions** layer) and plays their **world turns**, by hand or every few days of the world clock: each faction rolls its turn table, whose effects change its values, another faction's, its land hex by hex and the world clock's progress clocks, written to the timeline. Tables read them as `factions.<id>.*` and `hex.faction`, and a trip's results change them and tick the world clock's progress clocks (`factions.<id>.values.…`, `world.clocks.<name>`). The Systems app has a **Factions** tab; Core brings a generic turn table. Map format v18.
- **Hex flowers** for weather: a season of a weather model can be 19 cells the day moves across by 2d6 (`flower:` with `rows`, `moves`, `edge`), edited in the Systems app's **Weather** tab. The Hexmapper's **world clock rolls its own weather** each day while no trip is going on, shown under its date and read by hand rolls as `weather`.
- Manual: **What tables see** is a full reference: every value with its kind, the values it can take, where they come from and where to see them in the apps.
- Manual: the Systems app's pages are split, one per tab (Overview, Rules, Checks, Sheet, Factions, Calendar, Weather, Roll modes, Try it, YAML), with **Making a system** a short summary that links to them and **Your first system** a page of its own.
- Hexmapper: **the ids tables read can be seen**: a hex's id (`4,2`) and its terrain's (`heath`) in its panel, each terrain's in **Edit palette**, and the name each progress clock is read by (`the-wyrm-wakes`) in the World panel. Values of hexes, icons and tokens written `true` or `false` are read as yes/no, as in YAML (they were text, so `when: { open: true }` never held).
- Hexmapper: **icon ids can be seen** (and copied) under the icons, in their tooltips and in a hex's panel: what tables and conditions read as `icon.id`. Values suggested for hexes, icons and tokens are only what the **map's system** reads (a map with the Generic rules no longer suggests another system's `guards` or `fare`).
- Systems: the **Generic** rules have a read-only **YAML** tab: their travel rules and their characters' sheet as a pack would write them.
- Oracle: **Core is duplicated as a new pack**, not copied: a bundled pack other packs depend on offers **Duplicate as a new pack** (all its files, an id of its own), so the packs that need it keep the bundled one and its updates.
- Hexmapper: **a changed example map is said**: when a newer app brings a changed example, **Maps** marks it **new version**, and opening it offers to **open it beside yours** (your map and trip kept) as well as going on with yours or starting fresh.
- Travel, Hexmapper: **a trip paused on a check waits for Continue**: marching, waiting and the actions are greyed out until you press it (their tooltip says why), instead of letting the trip go on past it.
- Systems: a system that uses **your copy of a pack older than the bundled one** (a copy of Core made before it had a table the system names) says so on the system, with the bundled pack's changes to take; the sidebar marks it, and **the problems button opens the file that has them**. A missing table of another pack says the pack may be an older version or your copy.
- Oracle: **New definition → Table** can start **From pasted text**: a numbered list from a PDF, a CSV or a spreadsheet copy, or a plain list, with the dice guessed from the numbers.
- Oracle: **Odds** beside a table's entries shows how likely each one is with the context typed and the roll mode chosen (and, with dice, how likely each total is).
- Hexmapper: **icon names in Spanish** too (and the search finds an icon by its name in either language).
- Hexmapper, Export: **Split into pages** prints a big map on several sheets of a paper you pick (A4, Letter…), at real scale, overlapping 10 mm to glue, each page saying where it goes (B3); **Empty hexes in white** saves ink in the PDF and PNG.
- Hexmapper: the Text tool lists **Texts on the map** (each with its font and size); clicking one selects it and centres the map on it.
- Hexmapper, World: **the world clock starts on a date you choose** (day, month, year and time in the system's calendar), and **Set the date** moves it later (like moving time on) or earlier (asking first, and never during a trip; the timeline says the clock went back). **Events on a date** of the calendar, besides in N days, each with an **id** (`market-day`: what conditions read as `world.events`) and a description. The example map's events have ids (`market-day`, `clan-march`, `spring-floods`), and the Grey Marches' Market day reads `world.events: market-day`.

### Packs

- The Grey Marches: **the Company** (Kael, Mara and Old Tobin) comes with the example map, made with the system's **Companion** sheet: Survival, Charisma, Navigation and Stealth are theirs (the best of those not wounded, the clumsiest one's…), the food is their rations, eaten a ration per mouth; a fed night heals them, the haunted lights fill their **Dread** and the rite empties it, a ford's rocks sprain the ankle of whoever leads the crossing (which stops the party), a long day on horseback leaves them saddle-sore (no riding), and **Tend the wounded** heals everyone when whoever acts knows how. A **Guide** who knows the way rolls getting lost with advantage, a stealthy **Lookout** keeps the camp hidden, and **Home ground** lifts morale coming into a companion's home (Mara's Ashford Vale, Old Tobin's Fort Keld). Brenna the ferrywoman has a sheet of her own. **Factions**: the Iron Clans, the Vale of Ashford and the garrison of Fort Keld hold their land on the example map and take turns every week (the Clans raid the Vale and march on Fort Keld); the Vale's patrol rides wherever the Vale holds the land. Their winter sky is a hex flower.

## [0.4.0] - 2026-10-09

### Packs

- **Progress by moves**: an action's step `advance: 2` (or `'{{party.stats.rank}}'`) moves the party that many hexes along its route at once, no time passing, entering each as by marching (its checks, its visit, the trip's totals): journeys made of moves instead of hours of marching, in the Hexmapper and on the Travel app's ways (see _Journeys by moves_ in Connecting). The Grey Marches get **Ride with a carter**: on a road by day, two hexes in two hours, once a day.
- `trip.edges` outside a moment of its own (an action's conditions, a hand roll) is the stretch ahead on the route; it used to be empty.
- **The Grey Marches use it all**: the party's **Endurance** (camp and rest while fatigue is under it) and **Stealth** (encounters only where danger is over it); hirelings eat a ration each; **Fish** next to water (a d6 under Survival) and **Market day** in Ashford (on Marketday, or the world clock's market day); checks for **A long day** (marching past 8 hours), **Homesick** (the 10th, 20th and 30th day of a trip), **Going in circles** (a hex entered a third time) and **Out of the Greywood**; the shrine only the first time each trip; foraging in the dawn watch (until 8) is rolled with advantage; the gates roll _Talking your way in_ (a roll mode of their own) when Charisma beats the guards; someone on the road wants what fits their role, and a ruin's guardian is as dangerous as the ruin; the Wyrm roams the Greywood once the world clock's _The Greywood Wyrm wakes_ is full. Ashford is tagged `market` on the example map.
- **A table's own roll, as `roll`**: a table with dice gives its entries the total, for their conditions (`party.stats.survival: { gte: '{{roll}}' }`, a roll-under on the table's own die), texts (`'You rolled {{roll}}'`), `set` and effects. The table rolls first, then picks among the entries whose conditions hold, so a table now rolls (and shows the dice) even when no entry applies.
- **What the trip has done so far**, for conditions and tables: `trip.hexes` and `trip.km` (at the map's scale), `trip.hours` marched, `trip.checks`, `trip.taken.<action>` (each action of the system, 0 until it's taken) and `trip.spent.<supply>` / `trip.gained.<supply>` (what actions, checks and tables took or added; hand edits don't count). The Grey Marches get **Tales of the road**: once a trip, after 50 km, from nightfall, morale +1.
- **Marching is an action the system declares** (`actions.march`, the Travel buttons): its `when` / `unless` are checked as the party marches, and it stops as soon as they no longer hold. Without it, or without its `when`, the party marches by day for the day's marching hours, as before; the engine no longer decides it (nor that nobody marches before dawn). The Grey Marches' **Night march** now lights the torches (`torchlit`, a value of the day their march admits) until midnight, from their own nightfall (`hour: { gte: $nightfall }`).
- **The march's name is the Travel button's**: a system that names its march (`actions.march.name`, editable in Systems) sees it on the trip panel's first button (Travel and the Hexmapper), with its description as help. The Grey Marches call it **March** (**Marchar**).
- **The system sets the scale**: `travel.hexKm` in its travel rules, how many km a hex measures. Trips without a map (Travel, Systems' **Try it**) are played at it (Travel's **km per hex** shows it, locked); a map with the system takes it unless the map sets its own (Hexmapper: Map settings → Map, now empty for "the system's"; maps saved with the old default of 10 km follow their system). The Generic rules and the Grey Marches play at 10 km, Kal-Arath at 30 km. Systems' **Rules** has a **km per hex** field.
- **Full names for every fact**, by where it comes from: `hex.*` (`hex.id`, `hex.terrain`, `hex.danger`…), `time.*` (`time.season`, `time.daylight`, `time.moons.pale`…), `system.*` (`system.nightfall`…), `trip.*` (`trip.day`, `trip.mode`, `trip.moment`…), `world.*` (`world.clocks.<name>`, `world.events`) and `today.*`, besides `party.*`, `yesterday.*`, `from.*` and `around.*`. The short names stay as shortcuts and read the same; full names can't be hidden by a stat or a value with the same name. `hex` alone is now the hex's facts (its id is `hex.id`, also in `from.id`). Suggestions offer both; What tables see lists both; the Grey Marches' travel rules use the full names.
- **Variables and rolls in conditions and effects, `{{…}}`**, the syntax texts already used: another value instead of a fixed one in every condition (`danger: { gt: '{{party.stats.stealth}}' }`, `hour: { gte: '{{nightfall}}' }`, `faction: '{{rival}}'`) and as the amount of an effect (`party.resources.food: '-{{party.stats.mouths}}'`, `'={{party.stats.endurance}}'`, `'-{{loss}}'` from the entry's own values); the journal says what such an effect did. Dice too (`party.stats.str: { gte: '{{1d20}}' }`, `'-{{1d3}}'`), rolled **once per moment**: in a trip the same dice give the same roll all through a day, hex and moment or action (so what's available and the route don't change when looked at again, and each trip rolls its own); in a table, all through one roll (a roll-under entry and its `unless` see the same d20). The **Dice, variables and context** page and Syntax call them variables.
- **More for conditions and tables to read**: the hour (`hour: 14.5`), the calendar's `watch` (its help promised it, nobody passed it), the day of the month (`monthDay`), the system's `dawn`, `nightfall` and `hoursPerDay` as numbers, the trip's `tripDay`, hours `marched` today, actions done today (`doneToday`), `routeLeft` and `arrived`, `visits` to the hex, the hex left (`from.terrain`…), the hexes around (`around.terrain: lake`…), and the world clock's progress clocks and today's events (`clocks.the-wyrm-wakes`, `events: market-day`). Rolls by hand during a trip see everything its checks see.
- **Day and night**: conditions and tables read `daylight` (between the system's dawn and nightfall); an action's step `overtime: 240` lets today's march go on past nightfall (never past midnight); `hideWhenUnavailable: true` hides an action's button while it can't be taken. The Grey Marches rest, forage and force the march only by day (resting can no longer skip the night), and get a **Night march**: four more hours in the dark, +1 fatigue, with getting lost and night encounters in each hex off the road; their rite, talking to the hirelings and the night march only show when they can be taken. The Generic rules rest only by day; Kal-Arath forages only by day.
- **Pack format**: `pack.yaml` says which pack format a pack is written for (`format: 2`), so a pack written for an older one keeps its meaning when the syntax changes. Packs without it are format 1, where a check with neither a table nor effects stopped the trip: they still play that way, and the Systems app's **Checks** tab offers **Update** to write it in today's format. A pack of a newer format than the app reads gets a warning.
- **Systems as their own definition**: `kind: system` names what a game system uses (its travel rules, bindings, calendar, weather models) and the packs whose tables it brings; a pack may declare several, and use parts of the packs it depends on. Older packs with travel rules keep working as before. The Grey Marches declare theirs (`system.yaml`), with its name in Spanish.
- **Example maps of a system**: `maps:` in `kind: system` lists map files (`.otd.json`) kept in the system's pack. The Grey Marches' example map now lives in their pack (`maps/grey-marches.otd.json`).

### Apps

- **The last system follows you between apps**: Travel and Systems open on the system last chosen in either of them or in the Oracle (whose pack the Oracle opens on); remembered in this browser and kept in backups. The Hexmapper keeps each map's own system.
- Travel and Hexmapper Play: **So far** above the journal sums up the trip (hexes, km, hours marched), and opens to the checks, the actions taken and the supplies spent and gained. Saved trips and maps move to a new format (trips v4, maps v16): older trips get their hexes and actions from the journal, the rest counts from then on.
- **Only `pause: true` stops a trip**: a check that nothing rolls (no table bound) used to stop the trip and wait for **Continue**; now it's written in the journal (with its effects, if any) and the trip goes on, unless it says **Pause after it** (`pause: true`). The Grey Marches' landmarks say `pause: true`; packs of an older format keep stopping as before (see **Pack format**). In Systems, a check's table choice says **no table** instead of _nothing: wait for me_.
- **A new app, Systems**, where systems are made and edited: the systems list, **New system**, and each system's **Rules**, **Checks** and **YAML** tabs, with **Edit a copy** and the updates of bundled systems, moved from Travel. **Travel now only plays** trips without a map; each system there links to **Edit in Systems**, and each system in Systems to **Play it in Travel**. Its manual pages (Getting started, Making a system) are in the Manual under Systems.
- Systems: each system opens on its **Overview**, a form for its own definition: its name and description (also translated), the travel rules, bindings and calendar it plays with (**Create** makes new travel rules or bindings), its weather models and the packs it brings. A system of an older pack gets **Declare it**. The **YAML** tab shows every file of its parts.
- Systems: a system's **Calendar**, **Weather** and **Roll modes** tabs edit them with forms (they were YAML only): months with their seasons, weekdays, moons and holidays; kinds of weather and, per season, a grid of weights with how often each kind comes up over many days; roll modes with their rolls, the total kept and what they cancel. **New calendar**, **New weather model** and **New roll modes** start from templates and the system names them. The Oracle's New definition template for travel rules now eats with a day-end action instead of the older `perDay`.
- Systems: a system's **Try it** tab plays a trip without a map with it as it is now (the way hex by hex and the trip, as in Travel), so a change in another tab counts from the next step. Its test trips are kept apart from the Travel app's.
- Hexmapper: **Maps → Example maps** lists the maps every loaded system brings (also your own packs'), each with the system it's played with. Systems: a system's **Overview** lists its example maps, opens one in the Hexmapper, and adds (**Add a map file…**) or removes them.
- Oracle, Systems and Travel: a name cut short in the side list shows whole when pointed at.
- Hexmapper: the **tools bar** on the left folds away too, with a tab on the map's left edge (the tools' keys still work).
- Hexmapper: the icon picker of tokens and points of interest has category chips, as in Icons (**Suggested** first: the usual ones for a token or a place). In Icons, the line under the palette says what it means: **Clicking a hex places: …** (it said _New icons: …_).
- Hexmapper: Play is less cluttered: the party's icon, color and halo are only edited in Tokens (the party token stays selected there), and the system is shown, not chosen: it's the map's, chosen in Map settings → Map → System (choosing it in Play changed the map's and started a new trip).
- Hexmapper: less text in the way: the World panel's long note about a trip going on is a short note under the buttons (its explanation is in the help of **Travel on** / **Wait here**); Play's introduction and the modes' tooltips are the help of **Play mode**; Regions' and Tokens' how-to lines go below, as in Icons and Roads. The Oracle's icon in the tools bar is drawn like the other tools (white, gold when open).
- Help column: a field's explanation no longer has its own **✕** (the column's own fold closes it).
- Hexmapper: the help opens in **its own column** at the far right, beside the side panel (it used to replace it), as in the other apps: a field and its explanation are seen together, and its examples can be inserted into it.
- Help column, every app: moving to a field no longer changes what the column shows (only clicking a dotted label, or <kbd>F1</kbd> in a field, does), so an example can be clicked into any field.
- Oracle: the **?** in the header looks like the other apps' (no button frame).
- Systems: **a system goes elsewhere whole**: its **Overview** ends with **Take it elsewhere**, whose **Export as .zip** saves its pack with every pack it needs (the Grey Marches' file holds them and Core); **Import a system (.zip)…** under the systems list reads it back and opens it. The Oracle's **Import .zip** reads these files too, and now leaves packs already here unchanged alone and asks before replacing a different version (one ↶ undoes the import).
- Systems: the **Overview** lists calendars and weather models by their names (with the id beside them), and the Calendar, Weather and Roll modes tabs show the code in their introductions as code; the Systems app's help texts use made-up names in their examples instead of the Grey Marches' (`seedtime`, `moons.silver`, `highland-skies`…).
- Systems: the tabs wrap when the help column leaves little room, instead of pushing the view (and the YAML editor) wider than its column; the YAML tab names a file's pack when two have the same name.
- Help texts no longer state what one system decides as if it were general (a forest at half speed, water impassable on foot, a day's march per hex): worked examples are hypotheses, and example names are made up rather than the Grey Marches'.
- Travel: a new system also writes its `system.yaml`; a pack's file may hold several travel rules, and the forms and the problems list point at the right one.
- Hexmapper: **a map chooses its system** in **Map settings → Map → System** (the same choice as in Play): its new trips, the World panel's calendar and the Oracle panel use what the system brings. **Packs** are now the ones a map adds to its system's (shown ticked). A trip going on keeps the system it started with, and Play says so when the map's has changed. Maps are migrated (format v14): the system their trip played becomes the map's. In Play and Travel the choice is called **System** (it was **Rules**).

### Fixes

- Conditions: `all`, `any` or `not` beside other pairs (`{ tags: market, any: [ … ] }`) left the other pairs unchecked; now every pair counts.
- Trips: a hex half-walked on a slow day (snow, rain) and faster to walk the next is entered at once; the trip's clock used to go back in time and enter it before dawn.

## [0.3.0] - 2026-10-08

### Apps

- The Hexmapper's top bar looks like the other apps': its icons in the same muted tone, and Preferences (the gear) next to Help.
- The site's front page no longer lists the bundled packs: the apps show them.

## [0.2.0] - 2026-10-08

### Apps

- **Preferences** in every app, under a gear in the header: the language and your notes app (until now only in the Hexmapper's settings), shared by every app; in the Oracle, a **seed** for repeatable rolls (the same seed, the same results; **New session** starts it over) and **which packs the list shows**. The Hexmapper's **Settings** are now **Map settings**, with a map icon.
- The **help column**: a field's help is part of the column (its **✕** closes the column) and lists the manual's sections about it under **In the manual**; **Syntax** opens the page with everything a pack can write; a click on an example in code puts it into the last text box or YAML editor used, at the cursor; the search looks in the technical and packs pages too and shows the words found in bold (also in the Manual app).
- The site's **front page**: an OpenTabletop logo (also the site's icon and in the app list), the packs it comes with, and a footer with the source code on GitHub, where to report a problem, the licence and the version with what's new.

### Fixes

- The manual's links to a section of the same page (like _templates_ in **Syntax**) went to the first page instead.

## [0.1.1] - 2026-10-08

### Apps

- The apps open in your browser's language when we have it (Spanish for `es-*`), until you choose one; the site's front page has flags to choose it, shared with every app.

### Fixes

- The "new version" question comes back after a reload: closing it without answering no longer counts as **Later**, and **Later** only silences that version, so a newer build asks again.

## [0.1.0] - 2026-10-08

The first alpha: the four apps, the open packs and the manual, published as a static site.

### Apps

- **Hexmapper**: hex maps (terrain, roads, rivers, walls and borders, regions, icons, texts, tokens, notes), printing and PNG / real-scale PDF export, a map library in the browser; **Play** on the map with any travel system (routes, checks resolved by the Oracle, discovery of blank hexes, a journal); the **Oracle** panel and the **World clock** (calendars, events, holidays and moons, progress clocks).
- **Oracle**: browse, roll and edit tables, oracles, generators and decks with forms or a YAML editor with live problems; packs (new, import and export, translations, updates of bundled packs).
- **Travel**: trips without a map; travel systems edited with forms (the day, ways of travelling, terrains, supplies, values of the day, actions as steps, checks and their tables) or YAML.
- **Manual**: the user manual of every app, English and Spanish, with search; each app opens it in its help column, which shows the explanation of the field you're on instead, formatted, with working examples.
- **Command line**: `opentabletop validate`, `list` and `roll`.
- Side columns fold away with a tab on their edge in every app, as in the Hexmapper.
- The manual's technical section has a **Syntax** page: every piece of syntax a pack can write (values, ids, dice, ranges, templates, conditions, `set`, `effects`, moments, steps, `blocks`, limits), with examples and links.

### Packs

- **Core**: generic oracles and inspiration for any game, and the Generic travel rules.
- **The Grey Marches**: a frontier setting with an example map that uses every feature. Camp and rest only with food left and fatigue under 10; hunger is rolled when a day ends without food.

### Fixes

- Moving the world clock on with a trip and a route planned travels along the route (marching by day, nights, waiting on arrival) instead of waiting in place; a day passing asks first, and a message at the bottom says why the trip stopped early, or that it arrived.
- A night when the party can't take its night action (camp) passes without it, said in the journal, instead of leaving the trip stuck at nightfall.
- The trip panel has **Wait until dawn**, and travelling in a storm that can't be camped out passes to the next day: a party lost or stormbound with no food is never stuck.
- The trail and planned route follow the drawn shape of the roads, trails and rivers they walk.
- The party's trail and planned route are drawn beside the roads and rivers they follow, not on top of them.
- Waiting with the world clock never moves the party, even with a route planned and discovery on.

### Formats

- Maps as OTD bundles (`.otd.json`, format v13), Travel trips v3, packs as YAML folders; every older format is migrated when read.
- Translations can translate a generator field's fixed text (`fields:` in `locales/`).
