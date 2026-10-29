# Getting started

The Campaign app shows your **campaigns**: the worlds your maps and trips are played in. A campaign keeps what is going on in its world: the game system, the world clock (its date, events to come, progress clocks and weather), what happened (its timeline), the factions and the Oracle (decks drawn, once-only results, hand rolls). Every map of the Hexmapper and every trip of Travel is in one campaign, and those of the same campaign share all of that: one date, the same clocks, the same decks. A new map or trip starts in a campaign of its own, so a map played alone needs nothing here.

A campaign keeps only what the rules play with. Its story, places and people live in your notes app: **Notes** links to its page there.

**Campaign is where play starts**: the site's root opens it, it's first in the app switcher, and it opens **the campaign you were playing** (the last one opened here; else the newest). With none yet, it offers to start one ([below](#a-new-campaign)), with quiet links to the Oracle, Characters and the Hexmapper for whoever only wants to roll or keep characters.

## The campaign you play in

Every app's bar says which campaign you're playing, beside the app switcher: **Playing: The Grey Marches ▾** (or **No campaign ▾**). It's the same in every app, and it **follows what you open**: opening a map in the Hexmapper or a trip going on in Travel makes its campaign the one you're playing, and opening a campaign here does too, so the campaign shown is always the one in front of you. Click it for:

- **Open in Campaign ↗**: the campaign here.
- **New campaign ↗**: [a new campaign](#a-new-campaign) here.
- **Play in no campaign** (in the Oracle and Characters): plays in none, for whoever only wants a roll or a character manager.
- The other campaigns this browser keeps. In the Oracle and Characters, choosing one plays in it from then on; where a map, a trip or a campaign is open, they open here instead, since to play in another you open one of its maps or trips.

A campaign that's deleted (here, or with the last map of it in the Hexmapper) is played no more: the bar says **No campaign**. One without a name yet shows as **Untitled campaign**.

Each app uses it: Campaign opens it; the Hexmapper opens a map of it when it starts (the last one open, if it's in it; else its newest) and groups its library by campaign, this one first; Travel opens its latest trip and groups the trips by campaign; Characters shows the characters playing in it, with **All campaigns** and **No campaign** a click away; and the Oracle rolls in it ([Rolling in a campaign](../oracle/02-rolling.md#rolling-in-a-campaign)). It's a preference of this browser, kept with your other preferences in backups.

## The screen

- **Header**: the app switcher (nine dots: every app, Campaign first, your data's backups and exports, and links to the source code, to report a problem and to what's new), **Playing** ([above](#the-campaign-you-play-in)), the gear (**Preferences**: language and notes app, shared by every app) and **?** for this manual. The small tabs on the edges of the middle column (‹ ›) fold the campaigns list and the help column away, and bring them back.
- **Campaigns** (left): **New campaign**, a search box and the campaigns this browser keeps, the last changed first, each with its system and, once its world clock goes, its date. Under the list, **Make or edit systems** opens the Systems app.
- **The campaign** (center): the one chosen in the list, with its tabs.

Labels underlined with dots have an explanation: click one and the help column opens on it.

## A new campaign

**New campaign** (or **Start your campaign**, the first time) asks for a **name** and a **system** (the one you last chose in any app comes first), and two things ticked, which you can untick:

- **Start the world clock**, on the day you choose (**It starts on**: a day of the system's calendar, its first morning by default). Unticked, it can be started later in **World**.
- **Bring its factions** (when the system declares some, with how many): their sheets come now, and the land each starts with comes with each map that joins. Unticked, they can be brought later in **Factions**.

It opens on its **Overview**. Then add maps and trips from **Maps** and **Trips** ([below](#maps-and-trips)).

## How campaigns come to be

You rarely make one here. Campaigns appear by themselves:

- **A new map** (Hexmapper) starts in a campaign of its own, named after the map.
- **A new trip** (Travel) starts in one of its own too, named after the trip (its name, else its system's), and it keeps following the trip's name when you rename the trip or play it with another system, until you rename the campaign yourself.
- **An example map** opens in the campaign its file names: the Grey Marches' two maps share _The Grey Marches_, so the second one you open joins the first one's. If this browser doesn't have that campaign but has others with **the same name or played with the same system** (say, a map of that game you started before), the Hexmapper asks: **Join “…”** one of them (the map shares its world, and the example's own clock and factions are left out), or **Start its own** (the example's campaign, apart).
- **A map file** brings its campaign: if this browser has it already, the Hexmapper asks whether to join it, replace it or keep the file's apart ([Your maps](../hexmapper/01-getting-started.md#your-maps)).

**Two campaigns never share a name**: a new one whose name is taken gets a number, _The Grey Marches (2)_, so you can tell them apart (rename it whenever you like). And opening a map in the Hexmapper says which campaign it's in and which maps and trips are in it too: _This map is in the campaign “The Grey Marches”, with “The Hollow Hills”_.

## Merging two campaigns

Two campaigns that should be one (two maps of the same game that each started their own): move every map and trip of one into the other, and the empty one goes away by itself.

1. In **Maps** and **Trips** of the campaign you'll leave, see what's in it.
2. In the campaign you'll keep, **Add an existing map…** / **Add an existing trip…** and **Bring it ↗** each one (or open each in its app and choose the other campaign: **Map settings → Campaign → The map is in**, Travel's trip room's **Campaign**).
3. The first one you move asks which world stays: **Keep the campaign's** (the one you join) or **Bring this one's** (its clock, factions and Oracle take the place of the other's, for everything in it).

When the last map or trip has moved, the campaign it left is deleted.

## The campaign

At the top, its **name** (click it to change it; every app names the campaign with it) and **⋯** with **Delete**. Under them:

- **System**: the game system its maps and trips are played with, with **Edit the system in Systems →**. It's chosen in a map's **Map settings → Campaign** (or when a trip in it starts), since it is theirs too ([Campaigns](../hexmapper/01-getting-started.md#campaigns)).
- **Notes**: its page in your notes app (a path such as `Campaigns/The long winter`); **↗** opens it.
- With a trip going on in the campaign, a line says which one, with **Open**. One trip goes on in a campaign at a time, since its time is the campaign's ([One trip at a time](../travel/02-playing.md#the-campaign)).

**Delete** is only possible when no map or trip is in the campaign: move them to another campaign (or delete them) first. It asks, and forgets the campaign's clock, timeline, factions and Oracle state.

The campaign's tabs (a choice of them in a window too narrow for them side by side; the address of each, such as `#/campaign/<id>/timeline` or `#/campaign/<id>/factions`, can be linked; `#/campaign/<id>` is its Overview):

### Overview

What is going on, at a glance; each block's title leads to its tab:

- **Today**: the date, the part of the day, the moons and the weather, with moving time on and **Set the date**, as in **World** (to start the clock if it isn't going, too).
- **Going on**: the trip going on in the campaign, with **Continue ↗**; with none, **New trip in this campaign ↗** and **New map in this campaign ↗**. Under it, how many maps, trips, characters and factions it has.
- **Coming next**: the events soonest due. **Progress clocks**: each with its segments filled.
- **Lately**: the last lines of the timeline, and a note of your own.

### World

The world clock, the same one the Hexmapper's **World** panel shows for a map of the campaign: start it on a date, move time on (an hour, to the next part of the day, the next day, the next event, or until a part chosen), set the date, schedule events, keep progress clocks and add the system's ones, and see today's weather. Everything works as in [The world clock](../hexmapper/12-world.md), and it is one clock: moving it here moves it on every map and trip of the campaign, and they see it at once.

Here there is no party, so moving time on only moves the world: its events come due, its weather is rolled day by day, its clocks do what the system says when they fill, and the factions' turns that come due are played, their land changing on the map chosen in [Factions](02-factions.md). A trip going on in the campaign (on a map, or in Travel) waits until the new date when it next steps, living the time that passed; a clock that filled here meanwhile (by hand, or with the factions' turns) is heard then too, if its system names it ([Moments of the world](../oracle/07-connecting.md#5-your-own-travel-system)). While a trip goes on, the clock can't go back, and the world's weather is the trip's (it isn't shown here).

When the world waits for you (a reaction's pause or question, [World](../systems/11-world.md)), **The world waits: …** shows on every tab, with **Go on** or the question's choices; nothing moves the world (here, on a map or in a trip) until you answer, and then the rest goes on.

### Factions

The powers of the campaign's world, their sheets and their land on each of its maps, and world turns: [Factions](02-factions.md).

### Timeline

What happened in the world, newest first: events that came due, holidays and moons, full clocks, the factions' turns, what the world did by itself ([World](../systems/11-world.md)), the clock going back, and your own notes (**Add**). The same timeline as the World panel's, in a page of its own. It's the world's story, not the party's: an event comes due on its day wherever the party is (_Market day in Ashford_ is there whether you're in Ashford or not), and what the party does on a trip (hexes, checks, encounters, places found) goes to the trip's **journal** instead. Only a trip's highlights come here too, a short line each: arrivals (_The party reaches 0707_), places found, checks that stopped the trip (an encounter) and characters who left the party.

### Maps and trips

**Maps** lists the maps of the Hexmapper (its library in this browser) in the campaign, with their size; **Trips**, Travel's trips (a map's trip plays on its map). Each is a card with **Open ↗** (**Continue ↗** for the trip going on, which says so). A campaign doesn't list them itself: each map and trip names its campaign.

- **New map in this campaign ↗** opens the Hexmapper with a new map already in it, played with its system; **New trip in this campaign ↗** opens Travel with a new trip in it, likewise; when a party of the system is in the campaign without a trip ([Characters](#characters)), the new trip offers to bring it, with its members.
- **Add an existing map…** / **Add an existing trip…** lists the others this browser keeps, each with the campaign it's in now (or _a campaign of its own_); **Bring it ↗** opens it in its app and moves it here, as **Map settings → Campaign** or the trip room's **Campaign** does.

If the map or trip brings a world of its own (a world clock, factions, Oracle rolls), its app asks which one stays: **Keep the campaign's** or **Bring this one's**. The campaign it leaves is deleted if nothing else is in it.

### Characters

The characters of your roster ([Characters](../characters/01-getting-started.md)) playing in the campaign: in its trips' parties, among those present, on its maps' tokens, or in it **without a trip** (a quick game: **In a campaign** on its page in Characters), each with where it plays and **Open ↗**. A name opens the character in Characters; **Open the roster ↗** opens the app.

The other apps bring you back here with **Open in Campaign ↗**: under **Playing** in every app's bar, the Hexmapper's World panel (above its tabs), Travel's trip room (under **Campaign**), the Oracle (under **Campaign**, when it rolls in one) and a roster character's **Where it plays** in Characters.

## Where campaigns are kept

Campaigns live in this browser (IndexedDB), beside the Hexmapper's maps, and a [backup](../technical/05-backups.md) includes them. A map saved to a file carries its campaign ([File formats](../technical/02-file-formats.md)). To take a whole campaign elsewhere, with all its maps and trips, the packs it's played with and its characters, use the app switcher's [**Export…**](../technical/05-backups.md#exporting-and-importing-some-of-it).
