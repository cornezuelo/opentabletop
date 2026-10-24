# Items

The **Items** tab edits the system's **item catalogues** (`kind: items`): what its characters may carry, to pick by name on a character's card. What every item has in the system (slots, weight, uses…) and where on a body it goes are said by the sheet, in its **Items** section ([Sheet](07-sheet.md#items)). This page explains how items work, then the tab, builds a small kit step by step and lists the usual mistakes.

## How items work

A character **has items**, each with **how many** (a count), and, when the sheet gives items fields, a number for each (a torch's 3 uses, a mail shirt's 2 slots). Nothing about them is built in: what an item's numbers mean, what fills a place and what happens over a limit are all the system's.

- **From a catalogue or by hand.** On a character's card, **Add an item** suggests the catalogues' items by name; any other name makes an item by hand, with the sheet's defaults. An item taken from a catalogue keeps a copy of what it had there (its tags, its numbers), so the character reads the same whatever packs are loaded.
- **Fields, declared by the sheet.** The sheet's **Fields of every item** are numbers like values, with bounds and how they're shown. A field that **Runs out** (a torch's uses) uses one item up when it reaches its min: the count goes down and the next starts again at its number; the last one is gone. One that doesn't stays empty (a lantern without oil).
- **Places, for any body.** The sheet may declare **places** (hands, body, belt, back; a three-headed beast's three heads), each with **tags** and **room**. An item says where it **Fits** by the place's tags (`place.tags: worn` for a mail shirt), never by its name, so the same catalogue serves any body. On the card, an item is moved by dragging its handle (⠿) onto a place, or by picking the place; only the places it fits are offered (hold Shift as you drop it to move only one of a stack). Without places, items are one list.
- **Containers.** An item that **Holds** something is a place too (a backpack, saddlebags): items go inside it if they fit its tags, and they go with it (dropping the backpack drops what's in it).
- **Room** is counted with the field the sheet names in **What fills a place** (slots × how many), or one per item. By default a place over its room only shows its count in red, and the system says what it means, with a condition (below). A sheet (or a place, or a container) whose **Over its room** is `refuse` takes nothing that hasn't room left: the card offers no full place and a move there is refused; what an effect gives goes to the first place it fits with room (then a container with room, then a place that allows more). A sheet's **Room in all** counts everything a character carries. What still has no room is left behind, or waits on the card for the player, as **When it doesn't fit** says. [Limits to carrying](#limits-to-carrying) below.
- **What having it does** is written with the pieces sheets and rules already have: a value **Made of** the items (`{ sum: items.slots }`: the load; `{ max: items.armour, where: { place.tags: worn } }`: the armour worn), a condition that **Holds while** the load is over the capacity (it blocks what it lists), a party stat that counts who carries a rope (`from: { count: true, when: { items.tags: climbing } }`), a table that reads it (`'1d6 + {{min(party.stats.roped, 1)}}'`).
- **Effects give and take them**, by the item's id: `acting.items.torch: -1` (one fewer, from the last ones first), `party.members.items.torch.uses: -1` (an hour of everyone's torch), `acting.items.sword-of-keld: 1` (one more; from the catalogue when the character has none). A field of an item the character doesn't have changes nothing; an item no catalogue has can't be given, and the journal says so.
- **Tables and conditions read them**: `characters.kael.items.torch.count` (how many), `acting.items.torch.uses` (the first one's), `acting.items.tags: light` (carries something tagged light), `acting.places.pack.used` and `.room`, `acting.carried.used` (all of it, against the **Room in all**). All of them: [What tables see](../technical/04-what-tables-see.md#characters).

## The tab

One catalogue at a time; with several, a row of buttons chooses. **New catalogue** makes a small one (a rope and a torch) and adds it to the system's **Overview** (`items:`, a list). A catalogue has:

- Its **Name** (_Gear_, _Weapons_).
- Its **Items**, each by an id (what effects and tables name it with), with its **Name**, **Description**, **Tags**, a box for each field the sheet gives items (empty: the field's default), where it **Fits** (a [condition](../technical/08-conditions.md) on the place: `place.tags` · **is** · `head`) and, for a container, what it **Holds** (its room) and **Holds as** (its tags as a place).

A field a catalogue gives that the sheet doesn't declare is a warning among the system's problems. The YAML: [Item catalogues](../technical/07-kinds.md#item-catalogues).

## Step by step: a delver's kit

A delver with two hands, a body and a pack of six slots; a mail shirt only worn; torches that burn out; and a load that, over the capacity, stops forced marches. Start from a system with a characters' sheet (the [Sheet](07-sheet.md) page's step by step, or any).

1. **What every item has**: in **Sheet → Items**, under **Fields of every item**, add `slots` (_Slots_, **Starts at** `1`, **Min** `0`) and `uses` (_Uses_, **Min** `0`, **Max** `3`, **Shown as** `pips`, **Runs out** ticked). Under **Places**, `hands` (tags `hand`, room `2`), `body` (tags `worn`, room `1`) and `pack` (tags `pack`, room `6`). **What fills a place**: `slots`.
2. **The load**: under **Values**, `load` **Made of** `{ sum: items.slots }`, and `capacity` **Made of** `'{{self.values.toughness * 2}}'` (or any value of yours).
3. **Over the limit**: under **Conditions**, `encumbered`, **Holds while** `self.values.load` · **is over** · `{{self.values.capacity}}`, **Blocks** `actions.forced-march` (an action of your rules).
4. **The catalogue**: in **Items**, **New catalogue**. Keep the rope; give the torch **Uses** `3`; add `mail` (_Mail shirt_, **Slots** `2`, **Fits** `place.tags` · **is** · `worn`).
5. **Name it in the rules**: an action `light` (in [Rules](05-rules.md)) with a step **Changes** `acting.items.torch.uses` · `-1`.
6. **Try it**: in **Try it**, add a character, open its card and **Add an item**: _Rope_, _Torch_, _Mail shirt_ three times.

**What you'll see.** The card's **Items** section has a box per place: **Hands 2 / 2** (the rope and the torch), and **Body 6 / 1** in red: the mail shirts fit only there, one row with **How many** `3`. **Load** shows greyed out, `8`; with Toughness 3, **Capacity** `6`, and _Encumbered_ is ticked in italics, by itself: **Forced march** is greyed out with it as the reason. Set the mail shirts' **How many** to `1`: the load falls to `4` and _Encumbered_ lifts. Choose the character under **Acting** and take **light** three times: the torch's dots empty, and at the third the journal says _Kael: Torch: one is used up_ and it's gone.

## The same in YAML

```yaml
# sheet.yaml: the sheet's items (an excerpt: its other values and conditions stay)
kind: sheet
id: delver
values:
  toughness: { default: 3 }
  load: { name: Load, from: { sum: items.slots } } # step 2
  capacity: { name: Capacity, from: '{{self.values.toughness * 2}}' }
conditions: # step 3
  encumbered:
    name: Encumbered
    when: { self.values.load: { gt: '{{self.values.capacity}}' } }
items: # step 1
  fields:
    slots: { name: Slots, default: 1, min: 0 }
    uses: { name: Uses, min: 0, max: 3, display: pips, spent: true }
  places:
    hands: { name: Hands, tags: [hand], room: 2 }
    body: { name: Body, tags: [worn], room: 1 }
    pack: { name: Pack, tags: [pack], room: 6 }
  size: slots
---
# items.yaml: step 4
kind: items
id: gear
name: Gear
items:
  rope: { name: Rope, tags: [climbing] }
  torch: { name: Torch, uses: 3, tags: [light] }
  mail: { name: Mail shirt, slots: 2, fits: { place.tags: worn } }
```

And the system names the catalogue (`items: [items.gear]` in its `kind: system`).

The Grey Marches carry gear on four places of a body (a rope that helps at the ford, torches that burn on night marches, a backpack, a mail shirt, the Sword of Keld from a hoard): their [page](../packs/02-grey-marches.md). Core's catalogue is the smallest: three items and no fields ([Core](../packs/01-core.md)).

## Limits to carrying

Games limit what a character carries in four ways, and each is written with what sheets already have (made-up numbers: any game's are its own):

- **A hard total**: so much in all, and not one thing more. The sheet's **Room in all** (`room: '{{self.values.capacity}}'`) with **Over its room** `refuse`: everything counts, containers' contents too, and nothing goes in past it.
- **Hard per place**: hands hold two things, a belt one. Each place's **Room** with **Over its room** `refuse`.
- **Soft, with a price**: carry anything, but slowed. A load **Made of** the items, with no **Max**, **Shown against** the capacity, and a condition that **Holds while** it's over (`self.values.load: { gt: '{{self.values.capacity}}' }`) and **Blocks** what it costs.
- **Both**: slowed past one line, stopped at another. The condition of the soft limit, and a **Room in all** larger than it (`'{{self.values.capacity * 2}}'`).

What an effect gives where something refuses goes in as far as it fits (place after place); **When it doesn't fit** says what becomes of the rest: **leave** (the default) leaves it behind, said in the journal (_no room left for 2, left behind_); **ask** keeps it on the character's card, marked in no place, and the trip waits until the player drops something or moves it to a place. A card never adds by hand what has no room. A gain of the party's goes first to whoever has room for it.

The last, with every piece:

```yaml
# sheet.yaml: an excerpt (a soldier's sheet; its other values stay)
kind: sheet
id: soldier
values:
  strength: { name: Strength, default: 4 }
  # Twice Strength, plus what's worn on the body that helps to carry (a webbing belt).
  capacity: { name: Capacity, from: '{{self.values.strength * 2 + self.values.carry}}' }
  carry: { from: { sum: items.carry, where: { place.tags: worn } } }
  load:
    name: Load
    from: { sum: items.weight }
    of: '{{self.values.capacity}}'
    display: bar
    tones: { 0: good, 101%: warning, 200%: danger }
conditions:
  encumbered:
    name: Encumbered
    when: { self.values.load: { gt: '{{self.values.capacity}}' } }
    blocks: [actions.sprint]
items:
  fields:
    weight: { name: Weight, default: 1, min: 0 }
    carry: { name: Helps to carry, default: 0, min: 0 }
  places:
    worn: { name: Worn, tags: [worn], room: 2 }
  size: weight
  # Up to twice the capacity in all, never more.
  room: '{{self.values.capacity * 2}}'
  over: refuse
  # What's found past it waits for the player to drop something.
  full: ask
```

Over the capacity the soldier is _Encumbered_ (no sprinting) and the bar turns amber; at twice it, the bar is red and nothing more goes in: the card adds nothing more, and what a table gives waits on the card, the trip with it, till something is dropped. Tables read it as `acting.carried.used` and `acting.carried.room`. A vehicle or a pack animal is a container with a room of its own (`holds: { room: 40, tags: [cargo] }`), or `over: allow` where it may be crammed (what's inside still counts in all).

## Common mistakes

- **An item that doesn't go where you want.** Its **Fits** reads the place's tags: `place.tags: worn` needs a place tagged `worn`. A place named `body` with no tags fits only items with no **Fits**.
- **A field that shows nowhere.** An item shows only the fields it has: give it a number in the catalogue, or the field a **Starts at** on the sheet.
- **A torch that never burns out.** **Runs out** needs a **Min** (it's spent when it reaches it).
- **A place always over its room.** **What fills a place** counts that field × the count: a field with no default counts 0, and without it each item counts 1.
- **An effect on `items.torch` that gives nothing.** Giving an item needs a catalogue of the system with that id; the journal says _no catalogue of the system has this item_. Take it from the catalogue's list, or name the catalogue in the **Overview**.
- **Expecting the engine to refuse a full pack.** Room is only shown unless the sheet (or the place, or the container) says **Over its room** `refuse`; otherwise say what being over means with a condition that **Holds while** (`self.places.pack.used: { gt: 6 }`) and what it **Blocks**.
- **Gear left behind, or a trip that won't go on.** With `refuse`, what an effect gives with no room left anywhere it fits is left behind, or (**When it doesn't fit** `ask`) waits on the card, marked, and the trip waits with it: drop something or move it to a place; or let a container take more (`holds: { …, over: allow }`). A container copied from a catalogue onto a character keeps what it said then: drop it and add it again from the catalogue.
- **A Room in all that takes nothing.** It reads the sheet's values as they are (`'{{self.values.capacity}}'`): a capacity made of others is worked out first, but one at 0 gives no room. With no **What fills a place**, each item counts one.
- **A stack that won't move.** A whole stack needs room for all of it: hold Shift as you drop it to move one at a time.
- **`tags` as an item's id.** `items.tags` reads every tag of every item: no item may be called `tags`.
