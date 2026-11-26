# Getting started

Notes is OpenTabletop's own notes app: pages in Markdown, kept in this browser, for the lore your games link to (people, places, factions, what the party knows). The other apps keep only what the rules play with; a character, a cell, a place, a faction or a campaign has a **note**, the path of its page, and Notes is where that page is written. If you already use SilverBullet or Obsidian, choose it in **Preferences** instead: the links work the same way.

## The screen

- **Header**: the app switcher (nine dots), the campaign you're playing, the keyboard (**Keyboard shortcuts**, also the <kbd>?</kbd> key), the gear (**Preferences**: language, notes app and the rest every app shares) and **?** for this manual.
- **The pages** (left): **New page**, **⋯** (export, import and the packs' example pages), a search, and every page as a tree: a section for the campaign you're playing first, **General** (what belongs to no campaign), then the other campaigns; folders inside each. **+** beside a section or a folder makes a page there.
- **The page** (center): its path and title, its **Campaign**, **Read** (the eye) and **Edit** (the pencil), and **⋯** (delete it).
- **Beside it** (right): what links to it, what of the game it has to do with, and where its title is written without a link ([below](#what-links-here)).

Labels underlined with dots have an explanation: click one and the help column opens on it.

## Pages, folders and campaigns

A page's **path** is its title after the folders it's in, with `/` between them: `npcs/Old Tobin` is **Old Tobin** in the folder **npcs**. Folders are only that: a page at `places/towns/Hollow Gate` makes them. Change the path at the top of the page to rename or move it; the links that reached it are changed to reach it there.

Every page is in a **campaign**, or in **General**. A campaign's pages are its lore; General is for what any campaign may use (house rules, a calendar of your world, people who travel between campaigns). The page's **Campaign** moves it. Two pages of the same campaign can't share a path; two campaigns can each have their own `npcs/Old Tobin`.

**New page** makes an _Untitled_ page in the campaign you're playing (or General, playing none), open to be written: give it its title at the top.

## Writing

**Edit** (the pencil, or <kbd>Ctrl</kbd>+<kbd>E</kbd>) writes the page, in Markdown: `# A heading`, `**bold**`, `_italics_`, lists (`- `), tasks (`- [ ] `), quotes (`> `), tables and code. **Read** (the eye) shows it with its links. What you write is kept as you type.

## Links

Type `[[` and choose what to link to: pages, the headings of a page (after `#`), and the things of your games. As written:

- `[[Old Tobin]]` — the page with that title; `[[npcs/Old Tobin]]` names it by its path, when two pages share a title.
- `[[Old Tobin|the ferryman]]` — shows another text.
- `[[Hollow Gate#Secrets]]` — a heading of a page; `[[#Secrets]]`, a heading of this one.
- `[[character:kael]]` — a character of the roster, by its id: it shows its name now, and opens it in Characters.
- `[[map:a1b2#0608]]` — a cell of a map (the map's id, the cell's label), opened in Map; `[[map:a1b2]]`, the whole map.
- `[[faction:vale/iron-clans]]` — a faction of a campaign (the campaign's id, the faction's), opened in Campaign.
- `[[campaign:vale]]` — a campaign.

The kinds (`character`, `map`, `faction`, `campaign`) are always written in English, whatever the interface's language. A link to a page that doesn't exist yet is drawn dashed: a click makes it, in the same campaign. One to a thing this browser doesn't have (a character deleted) is dashed too.

Where a link looks: a page of a campaign reaches that campaign's pages first, then General's; a page of General reaches General's only. The notes of a campaign's [Log](../campaign/01-getting-started.md) are written with the same links, and read as a page of that campaign.

## What links here

Beside the page:

- **Linked here**: the pages that link to it, each with the lines that do, and the notes of the campaign's [Log](../campaign/01-getting-started.md) that link to it.
- **In the game**: what of the game it names (`[[character:kael]]`…), and what points at it from the game: a character, a cell, a place, a region, a token, a faction or a campaign whose note is this page (**⇄**). Each opens in its app.
- **Not linked**: pages that write its title without linking to it. **Link** (the chain beside each) makes those mentions links.

## From the other apps

In Characters, Map, Campaign and the rest, a thing's **Notes** (or **Linked note**) holds the path of its page. With Notes chosen in Preferences (the default):

- **↗** opens its page here, found among the pages of the thing's campaign (or the one you're playing), then General's; a page that doesn't exist yet is made, beginning with a link back to the thing.
- **✎**, while the note is empty, writes a new page for it, named after it.

## Export and import

**⋯ → Export as .md files** downloads every page as a `.zip`: a folder per campaign (by its name) and **General**, each page a `.md` file at its path. Links between pages stay `[[…]]`, as Obsidian and SilverBullet read them; links into the games become ordinary Markdown links to the apps.

**⋯ → Import .md files…** reads a `.zip` (or several `.md` files): what's in a folder named after one of your campaigns (or General) goes there, the rest into the campaign you're playing. A page at the same path of the same campaign is replaced (after asking), keeping what links to it; links to the apps written by an export become links into the games again.

Pages are in your [backups](../technical/05-backups.md) too. Deleting a campaign keeps its pages: they move to General, in a folder named after it.

## The example pages

**⋯ → Add the example pages of The Grey Marches** adds the pages the Grey Marches bring to the campaign you're playing: the campaign's front page, Ashford, the ferry, Hollow Gate, Brenna the ferrywoman and the Iron Clans ([The Grey Marches](../bundled/02-grey-marches.md#notes)). Open the example map first (Map → Example maps), so they're added to its campaign: the map's Ashford, ferry and Hollow Gate cells, the ferrywoman and the Iron Clans already link to them.
