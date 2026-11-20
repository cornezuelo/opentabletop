# The journal and our own notes app — proposal

Written on autopilot (2026-11-20) for the backlog's step 4 (_Our own notes app and the journal_): a proposal, agreed with the author on 2026-11-20 (§6).

## 1. What there is today

- **Each trip's journal** (session's `JournalEntry`): every step's lines, told in moments (beats), with levels (story, rules) and the dice of each roll; the player's own notes in it (`source: 'user'`). It lives inside the trip (Travel's saved trips, a map's play state) and ends with it.
- **The campaign's Timeline** (Campaign app): what the world did (events, holidays and moons, clocks filling, world turns).
- **The Oracle's history**: rolls made by hand, by campaign.
- **Notes elsewhere**: a character, a cell, a POI or a faction keeps a `noteRef`, a path in the user's notes app (SilverBullet or Obsidian, `note-refs`), opened with ↗. Lore never lives in OpenTabletop (root principle 9).

What's missing: one record of the **whole campaign** (trips, scenes, the world, hand rolls and what the player wrote, in order), kept after a trip ends and exportable; and, for whoever doesn't run SilverBullet or Obsidian, **somewhere to write** the lore those `noteRef`s point at.

## 2. The journal: the campaign's record

**What it is.** One journal per campaign, read in Campaign's **Log** tab (campaigns.md §8: it comes with these pieces), in order of game time:

- the **moments** of every trip and scene played in the campaign, as their journals tell them (title, story lines, what changed), copied in as they're played, so they stay after the trip is gone;
- the **world**: the Timeline's events, world turns and clocks filling;
- **hand rolls** of the Oracle made in the campaign (the question, the dice, the answer);
- **sessions**: _Start a session_ / _End the session_ marks with the real date, so a long campaign reads session by session (_Session 3 · 2026-11-20_);
- **the player's own writing**: a note between any two lines, Markdown, with links (`[[Old Tobin]]`, to a notes page; a cell, `#0608`; a character).

**Kept apart.** A journal grows for months: its own IndexedDB store (`journals`, by campaign), in backups like the images, never inside the campaign's JSON (which every map reads). A trip's own journal stays as it is (the trip plays from it); the campaign's copies what it tells, once, as each moment ends.

**Read as a story or in full.** The same levels as a trip's journal (story, rules), filters by trip, place or character, and a search.

**Exported** as Markdown: one file, sessions as headings, days under them, links to cells as the deep links Map already opens (`<map>/#/<id>/<hex>`), characters and notes by name; ready to paste into SilverBullet or Obsidian.

### Lonelog

[Lonelog](https://lonelog.org/) (Roberto Bisceglie, CC BY-SA 4.0 for its text; the notation itself free to use) writes a solo log with five symbols: `@` an action, `?` a question to the oracle, `d:` a roll, `->` its result, `=>` what happens because of it, and tags in brackets: `[N:Name|…]` people, `[L:Name|…]` places, `[PC:Name|…]` player characters, `[Thread:Name|Open]` threads, a track with its progress (`[Tower:Stability 6/10]`), `+tag` / `-tag` for a change. In Markdown it's written inside code blocks.

The journal maps onto it almost line for line, so **Export as Lonelog** writes the same journal in it:

```
S3
@ March to Hollow Gate
d: Omens 1d6 -> 6
=> The Wyrm stirs in the Greywood [Thread:The Wyrm wakes|Open]
? Is the ford watched? -> Yes, but…
@ Kael scouts ahead
d: 1d6 -> 2 (against 3: Success)
=> The way is clear [PC:Kael|+scouted]
[The Wyrm wakes:3/6]
```

An action taken is `@`, a hand roll in the Oracle a `?` with its answer, every roll `d:` with its dice (and what it was rolled against), a result `->`, its changes `=>` with tags for those changed (characters as `PC`, those present as `N`, places as `L`), a progress clock as a track. Reading Lonelog back (a log written on paper, typed in) is left out: it would need a parser for free text.

## 3. Our own notes app

**What it is**: a small SilverBullet / Obsidian of our own, for whoever has neither: **Notes**, an app of the ecosystem.

- **Pages** in Markdown, with `[[links]]` between them, **backlinks** (what links here), link suggestions as you type, and a search.
- **Links into the games**: `[[character:kael]]`, `[[map:grey-marches#0608]]`, `[[faction:iron-clans]]` show the thing's name and open it in its app; their pages in the games link back (`noteRef`). Notes becomes one more `note-refs` provider (**OpenTabletop Notes** in Preferences, beside SilverBullet and Obsidian), so every `noteRef` that exists already can point at it.
- **Templates** (a new NPC's page with its headings) and `{{…}}` rolled as in the Oracle (`{{1d6}}`, a table: `{{table.names-village}}`), written into the page when inserted, never live.
- **Its files are the user's**: pages export as a folder of `.md` files with ordinary `[[links]]` (a `.zip`), which Obsidian or SilverBullet open as they are; a folder of them imports the same way. Nothing locks them in.

Kept in the browser like everything else (IndexedDB `notes`, in backups). Later, maybe: queries over pages (as SilverBullet's), a canvas, a graph of links: each worth asking for when the rest is used.

## 4. Pieces

- **`journal`** (headless): the campaign's record (entries, sessions, notes), what a trip's moment becomes in it, the Markdown and Lonelog writers. Reads session's journal types; no engine imports it.
- **`notes`** (headless): pages, the links in them (`[[…]]`, typed: page, character, map cell…), backlinks, search, templates' insertion.
- **`journal-ui`** / **`notes-ui`**: the journal's view (Campaign's **Log**, and wherever else it's embedded: a trip's panel could show the campaign's), a page's editor (CodeMirror with Markdown, as Packs' YAML editor) and view (ui-kit's `Markdown`), link suggestions.
- **`apps/notes`**: the Notes app. The journal needs no app of its own at first: Campaign's **Log** is its home (the author wanted it by itself too: a **Journal** view in Notes, or its own app, is cheap once the pieces exist).
- `storage`: `journals` and `notes` stores, in backups.

## 5. Phases (Claude's recommendation)

1. **The campaign's journal**: moments copied in from trips and scenes, the world's and the Oracle's lines, sessions, the player's notes; Campaign's **Log**; Markdown export. The Grey Marches' example campaign shows it from its first trip.
2. **Lonelog export**.
3. **Notes**: pages, links and backlinks, search, the `note-refs` provider, links into the games, `.md` export and import.
4. **Templates and rolls in pages.**
5. Queries, canvas, graphs: only if asked for.

## 6. Decided with the author (2026-11-20)

1. The journal in Campaign's **Log** first; a view in Notes, or an app of its own, later.
2. Moments **copied** into the campaign's journal as they're played (Claude's recommendation, taken on the user's go-ahead).
3. Lonelog: **export only**.
4. **The journal first** (phases 1–2), **Notes after the other real systems** (step 5 of the backlog's order).
5. A trip with no campaign keeps only its own journal, as today.

## 7. Phase 1 as built (2026-11-20)

Agreed with the author before building ("dale", on Claude's proposal and mockup):

1. **Each moment is copied told already, in every UI language** (English and Spanish), at the whole detail (each line with its level, dice and cards, what it changed), beside its raw lines: the trip that could tell it again (its sheets, the foes present, its way) is gone one day. The log tells it at the level chosen (`toldAt`), in the UI's language (`toldIn`, English if missing).
2. **The timeline no longer gets a trip's highlights** (arrivals, places found, pauses): it's the world's only; the trips' moments are in the Log. Old timelines keep the lines they have.
3. The Log as mocked up: sessions newest first (the newest unfolded), days, a moment as the trip's journal draws it (`BeatView`) with where it was played, the world (◆), hand rolls (?), notes (✎); **Show**, **Played in**, a search, **Export**; **+ Write a note** and **+ A note here** beside each line.

How it works:

- `@open-tabletop/journal` (headless): the journal (`CampaignJournal`: moments, sessions, notes, how far each trip was copied), `linesToCopy` / `addMoments`, sessions and notes, and `campaignLog`, which lays the world's timeline and the Oracle's history among them by game time. A trip is known by its first line's real time, so one that goes on in another map (a sub-map) isn't copied twice, and a new trip on the same map starts from its first line.
- Hand rolls keep only their real time: each is laid at the game time of what the journal holds last before it in real time. Lines a trip's journal has of its own that the campaign keeps elsewhere aren't copied: hand rolls (the Oracle's history), what came due in the world (the timeline).
- Sessions are marks at a game time (and a real date): everything from one's start to the next one's is under it.
- `storage`'s `journals` store (IndexedDB v5, one entry per campaign, in backups v4, merged by campaign, the newer kept; deleted with the campaign), changed one change at a time per campaign (`changeJournalEntry`).
- travel-ui's `keepInJournal` / `tellMoments`, called whenever a trip is saved (Travel's and Campaign's scenes' `TripStore`, Map's play): it copies what's new, telling it with the trip's system, sheets and the host's words in each language.
- journal-ui's `CampaignLog` (Campaign's **Log** tab), `shownLog` and `logMarkdown`. A moment where only what happened behind was told (checks that didn't come up) shows only in **Everything**.

Left for later: a campaign's journal in an export (.zip) (backups keep it); a moment's title when a step's first lines are checks that didn't come up was fixed for every journal (travel-ui's `headLine`).
