# Rolling

Open a definition and press **Roll** (or **Draw** for a deck). <kbd>Space</kbd> or <kbd>Enter</kbd> rolls again.

**Roll** throws the dice on the table in the page, between the buttons and the result: they fly, bounce off the edges and each other and come to rest on what came up, and lie there until the next roll; the result shows under the table as they stop, with what the dice added up to (_2d6 = 7_). A d6 (or a Fudge die) is a cube turning over in 3D, a d2 a coin; the other dice their solid, lit from above as they turn; a die's face changes as it turns over, never every moment. A roll mode's other roll is thrown too and fades as it stops. The table is yours too: click it and the dice are thrown again towards there, or drag them and let go, and they fly the way your hand moved; a click (or <kbd>Space</kbd>, <kbd>Enter</kbd>) while they roll stops them where they'll lie. The Oracle never waits for your hand: **Roll** is the throw, whoever rolls the dice of trips and scenes (**Who rolls the dice**, in **Preferences**, is for them). With **Dice and cards move** off, or your system asking for less motion, the dice lie still at once. Map's Oracle panel has the same table, as narrow as the panel.

A table rolled against a number (a skill, a chance: [Rolled against a number](08-dice-and-templates.md#rolled-against-a-number)) says what it needs on the dice table (_You need 40 or less_) and how it went as they stop (_Success_, _Failure_); its result card says it under the dice (_Against 40: Success_).

A value a roll needs that only a trip or a map has (a die whose size is the map's _Finds die_, `1d{{map.values.finds}}`, or a piece's wear) is asked for in **Context**, its box marked, and **Roll** waits for it (_To roll it, give: Finds die_) instead of failing. A name with a part in brackets (`acting.items[params.piece].wear`) is given whole.

## The result

The result card shows the text, the values the entry sets (e.g. `weather: storm`) and what the dice thrown on the table added up to (_2d6 = 7_). Dice are drawn as their solid with its face (d4 to d20, d% as a d10 showing `00`–`99`, Fudge dice as `+`, `−` or blank, a d66 as its two d6, a d2 as a coin; a die with no solid of its own as the one it's rolled with at a table: a d3 as a d6, a d5 as a d10, any other as the smallest with enough faces, so a d7 is a d8). While dice roll, their faces turn through the faces they have, never a 6 on a d3; the dice a keep leaves out are faded and dashed (`4d6kh3`, advantage), an exploding die's faces chained (`6 + 6 + 2`). What the row rolled inside it (a `{{1d3}}` of harm, the `{{2d6}}` of how many come) isn't thrown on the table: the result card draws it under _in the result_, with what's added (`+1`) and its total, tumbling a moment as it appears (**Dice and cards move**, in **Preferences**, turns it off; it never moves when your system reduces motion). Then, under **Details**, the results of every table the roll went through. The rolled entry is highlighted in the list below.

## Context

Some definitions read values: the terrain, the season, a modifier… The **Context** box lists the ones a definition (or any table it rolls) needs, by name (_Holidays_, _Guards_…), with what each one is and its key (`{{icon.guards}}`) in its help (click its dotted name), and the values seen in its conditions as suggestions. The apps name the values maps and trips give; a system names its stats and the other values its tables read (`reads:` in its bindings, see [Connecting](07-connecting.md)). Blank means unknown. An oracle's input (e.g. the odds) is a list here.

In Map these values come from the map and the trip; see [The Oracle in the map](../map/09-oracle.md).

With a context, the entries that can't come up with it (their `when` / `unless` doesn't hold: a night's encounter by day, a marsh's on the hills) leave the list for a folded line under it, _3 more that can't come up here_, which opens to show them; the entry rolled always stays in sight. A condition that rolls dice (`place.danger: { lt: '{{1d6}}' }`) may hold or not, so its entry stays. With nothing typed, every entry shows.

## Roll modes (advantage and others)

Some tables can be rolled in more than one way: a **roll mode** rolls the whole roll several times and keeps one total. Which modes exist, what they're called and what they do is up to each system: Core has **Advantage** (twice, keep the higher) and **Disadvantage** (twice, keep the lower); the Grey Marches add **Carefully** (three times, keep the middle one) for the ford. A table that offers modes shows a choice next to **Roll**; its help (click **Roll mode**) says what each one does. The result card shows the totals that weren't kept.

Some tables also use a mode **by themselves** when a condition holds, whether you roll them by hand or a trip does. In the Grey Marches, _Do we get lost?_ rolls with advantage under clear skies and with disadvantage the day after getting lost; with both, they cancel out and it's a normal roll. How to declare modes and use them: [Kinds of definition](../technical/07-kinds.md#roll-modes).

## Odds

**Odds**, beside **Entries**, shows how likely each entry is **with the context you typed and the roll mode chosen**: the table is rolled a few thousand times as it would be in play, so conditions, ranges, weights and modes all count (limits like `once` don't: each roll starts afresh); it's an estimate, within a percent or so. A last line says how often no entry applies, if ever. With dice, bars above the entries show how likely each total is, exactly.

Change the context or the mode and the odds follow: in the Grey Marches' _Who goes there?_, type `forest` for the terrain and `3` for the danger to see the wolves come up more often; in _Reaction_, choose **Advantage** to see the friendly answers grow.

## Decks and once-only entries

**Draw** deals on the card table in the page, as **Roll** throws dice: the deck face down at the left, with the cards it has left. Click it, or drag its top card onto the table, and the card is dealt and turned over as it lands, upside down when it came out reversed; **Draw** (or <kbd>Space</kbd>) does the same. The cards drawn stay on the table: the last three in a row, the newest at the right (fewer where there's no room for three to be read, as in Map's narrow panel), and the one before them on **Discards**, face up, until the deck is gathered. A hand or a spread (a generator dealing several cards, the Celtic cross) is dealt face down to its places; turn each card over with a click, in any order, or all with **Turn all**, its text showing under the table, and the result shows once they're all up. Rolling it again gathers it first. When the draw gathers the deck (it ran out, or a spread starts from the whole deck), the cards out go back onto it face down and it's riffled before the deal; **Shuffle** shows the same. Under the pointer the deck's top card lifts and glows, as a face-down card of a spread does. With **Dice and cards move** off in **Preferences** (or when your system asks to reduce motion), the cards lie still at once. A deck may have its own back ([Kinds of definition](../technical/07-kinds.md#decks)).

A deck has **Shuffle**. A card drawn is **shown as a card** when its deck gives it a face: Core's tarot with its 1909 pictures (upside down when it comes out reversed), the poker and Spanish decks with their index and suit, the runes, the Lenormand and the dominoes drawn. A trip's journal draws them small beside their line. A deck without faces is told by its text, as before ([Kinds of definition](../technical/07-kinds.md#decks)). A generator can draw from a deck too, and Core's hands and readings (_Poker hand_, _Three-card reading_…) shuffle it first: each one starts from the whole deck. Entries marked `once` can only come up once. **New session** (in the history) forgets both: every card goes back and once-only entries are available again. **Clear** empties the history.

## Rolling in a campaign

Your rolls keep their decks, once-only results and history in **the campaign you're playing**: the one **Playing** says in the bar at the top, shared by every app ([The campaign you play in](../campaign/01-getting-started.md#the-campaign-you-play-in)); **Campaign**, at the top of the history, says which. Click **Playing** to choose another, or **Play in no campaign** for the Oracle's own, kept in this browser. Opening a map or trip in another app changes it too, and the Oracle follows. In a campaign you roll in its world: a card you draw here is gone from the deck for that map's trips too, a once-only result that came up there won't come up here, and the history is the one the map's Oracle panel shows. **New session** and **Clear** act on the campaign's then. When the map or a trip changes it in another window, the Oracle reads it again. Your seed stays this browser's own either way. In a campaign, **Open in Campaign ↗** under it shows it in the [Campaign](../campaign/01-getting-started.md) app.

### Those a result brings: a scene

A result whose effects bring people (`present.grey-wolf: 3`: a pack of wolves, a band of robbers, someone met on the way) shows **Open a scene ↗** under it while you roll in a campaign: it opens the [Campaign](../campaign/01-getting-started.md) app on a new **scene** of that campaign with them, made from the system's bestiary, each with its own rolled values, facing the campaign's cast. There you fight them, turn by turn if the system's fights go in turns. In no campaign it says a scene needs one. Rolled here, they're only words: nothing is made until the scene opens.

A scene is a moment played where the party stands, not a trip: [Trips and scenes](../campaign/03-trips-and-scenes.md).

## Repeatable rolls

In **Preferences** (the gear), **Seed for rolls** makes rolls repeatable: with the same seed, the same rolls in the same order give the same results. The history shows the seed while it's on.

- Write `grey-marches-1`, roll a few tables, then press **New session**: rolling the same tables again brings the same results.
- Share the seed and the tables you rolled, and someone else can replay your session.
- Clear the box to roll at random again.

The seed and where its sequence has got to are kept with the history, so a reload carries on where you were. The command line takes a seed too (`--seed`, see [Working without the interface](../technical/03-without-the-ui.md)).
