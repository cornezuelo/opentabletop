# Getting started

The Campaign app shows your **campaigns**: the worlds your maps and trips are played in. A campaign keeps what is going on in its world: the game system, the world clock (its date, events to come, progress clocks and weather), what happened (its timeline), the factions and the Oracle (decks drawn, once-only results, hand rolls). Every map of the Hexmapper and every trip of Travel is in one campaign, and those of the same campaign share all of that: one date, the same clocks, the same decks. A new map or trip starts in a campaign of its own, so a map played alone needs nothing here.

A campaign keeps only what the rules play with. Its story, places and people live in your notes app: **Notes** links to its page there.

## The screen

- **Header**: the app switcher (nine dots), the gear (**Preferences**: language and notes app, shared by every app) and **?** for this manual. The small tabs on the edges of the middle column (‹ ›) fold the campaigns list and the help column away, and bring them back.
- **Campaigns** (left): **New campaign**, a search box and the campaigns this browser keeps, the last changed first. Under the list, **Make or edit systems** opens the Systems app.
- **The campaign** (center): the one chosen in the list, with its tabs.

Labels underlined with dots have an explanation: click one and the help column opens on it.

## A new campaign

**New campaign** asks for a **name** and a **system** (the one you last chose in any app comes first), and makes an empty campaign: no world clock yet, no maps or trips. Add maps and trips to it from their own apps (below).

## The campaign

At the top, its **name** (click it to change it; every app names the campaign with it) and **Delete**. Under them:

- **System**: the game system its maps and trips are played with, with **Edit the system in Systems →**. It's chosen in a map's **Map settings → Campaign** (or when a trip in it starts), since it is theirs too ([Campaigns](../hexmapper/01-getting-started.md#campaigns)).
- **Notes**: its page in your notes app (a path such as `Campaigns/The long winter`); **↗** opens it.
- With a trip going on in the campaign, a line says which one, with **Open**. One trip goes on in a campaign at a time, since its time is the campaign's ([One trip at a time](../travel/02-playing.md#the-campaign)).

**Delete** is only possible when no map or trip is in the campaign: move them to another campaign (or delete them) first. It asks, and forgets the campaign's clock, timeline, factions and Oracle state.

The campaign's tabs (the address of each, such as `#/campaign/<id>/timeline` or `#/campaign/<id>/factions`, can be linked):

### World

The world clock, the same one the Hexmapper's **World** panel shows for a map of the campaign: start it on a date, move time on (an hour, to the next part of the day, the next day, the next event, or until a part chosen), set the date, schedule events, keep progress clocks and add the system's ones, and see today's weather. Everything works as in [The world clock](../hexmapper/12-world.md), and it is one clock: moving it here moves it on every map and trip of the campaign, and they see it at once.

Here there is no party, so moving time on only moves the world: its events come due, its weather is rolled day by day, its clocks do what the system says when they fill, and the factions' turns that come due are played, their land changing on the map chosen in [Factions](02-factions.md). A trip going on in the campaign (on a map, or in Travel) waits until the new date when it next steps, living the time that passed. While a trip goes on, the clock can't go back, and the world's weather is the trip's (it isn't shown here).

### Factions

The powers of the campaign's world, their sheets and their land on each of its maps, and world turns: [Factions](02-factions.md).

### Timeline

What happened in the world, newest first: events that came due, holidays and moons, full clocks, the factions' turns, the clock going back, and your own notes (**Add**). The same timeline as the World panel's, in a page of its own.

### Maps and trips

The maps of the Hexmapper (its library in this browser) and Travel's trips that are in the campaign, each with **Open ↗**; the trip going on says so. A campaign doesn't list them itself: each map and trip names its campaign. To add one:

- **A map**: open it in the Hexmapper and choose this campaign in **Map settings → Campaign → The map is in**.
- **A trip**: choose it in Travel's trip room (**Campaign**), for a new trip or one under way.

If the map or trip brings a world of its own (a world clock, factions, Oracle rolls), its app asks which one stays. The campaign it leaves is deleted if nothing else is in it.

## Where campaigns are kept

Campaigns live in this browser (IndexedDB), beside the Hexmapper's maps, and a [backup](../technical/05-backups.md) includes them. A map saved to a file carries its campaign ([File formats](../technical/02-file-formats.md)).
