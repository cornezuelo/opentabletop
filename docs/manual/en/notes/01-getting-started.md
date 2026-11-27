# Getting started

Notes is OpenTabletop's own notes app: pages in Markdown, kept in this browser, for the lore your games link to (people, places, factions, what the party knows). The other apps keep only what the rules play with; a character, a cell, a place, a faction or a campaign has a **note**, the path of its page, and Notes is where that page is written. If you already use SilverBullet or Obsidian, choose it in **Preferences** instead: the links work the same way.

**The first time** Notes opens with no pages, it writes one in General, **Welcome to Notes**: what it's for, the Markdown it reads (the same as [below](#markdown-at-a-glance)) and how links work, as a cheat sheet. It's yours: change it or delete it; it isn't written again.

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

**Edit** (the pencil, or <kbd>Ctrl</kbd>+<kbd>E</kbd>) writes the page, in Markdown: `# A heading`, `**bold**`, `_italics_`, lists (`- `), tasks (`- [ ] `), quotes (`> `), tables and code ([at a glance](#markdown-at-a-glance)). **Read** (the eye) shows it with its links. What you write is kept as you type.

You needn't know Markdown: the bar over the text writes it for you. Each button puts its marks around what's selected (or leaves the cursor between them, to type), and pressed again takes them off:

- **B**, **I** and **S**: bold, italics and struck out (<kbd>Ctrl</kbd>+<kbd>B</kbd>, <kbd>Ctrl</kbd>+<kbd>I</kbd>).
- **H ▾**: the line as a **Title**, a **Section**, a **Subsection** or **Normal text**, each drawn at its size, the line's own marked (<kbd>Ctrl</kbd>+<kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd>, <kbd>0</kbd>).
- The lines as a list, a numbered list or a quote.
- **Link ▾**: **To a page or the game's** (<kbd>Ctrl</kbd>+<kbd>K</kbd>) opens the suggestions of [links](#links) to choose one, what was selected staying as its text (`[[Old Tobin|the ferryman]]`); **To a website** (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd>) writes `[text](https://)` with the address selected to type it. A link to a website, read, shows **↗** and opens in another tab.
- **Picture** ([below](#pictures)) and **Table**, a table of two columns to fill in.
- **? Markdown** (or <kbd>F1</kbd> in the text): the summary below, in the help column.

The keyboard's **Keyboard shortcuts** lists these keys too.

### Markdown at a glance

<!-- markdown-summary -->

| Write                       | To get                                                  |
| --------------------------- | ------------------------------------------------------- |
| `# Old Tobin`               | the page's big heading                                  |
| `## Secrets`, `### Debts`   | smaller headings (`[[Page#Secrets]]` reaches one)       |
| `**bold**`                  | **bold**                                                |
| `_italics_`                 | _italics_                                               |
| `~~struck out~~`            | ~~struck out~~                                          |
| `` `code` ``                | `code`, letters as they are                             |
| `- a thing`                 | a list (`1. ` numbers it)                               |
| `- [ ] to do`, `- [x] done` | a task, unticked or ticked                              |
| `> what he said`            | a quote                                                 |
| `---`                       | a line across the page                                  |
| `[[Old Tobin]]`             | a link to a page ([Links](#links))                      |
| `[the wiki](https://…)`     | a link to a web page                                    |
| `\| Name \| Owes \|` lines  | a table: a row a line, a line of `---` under the first  |
| `![The mill](picture:…)`    | a picture of your image library ([Pictures](#pictures)) |

An empty line starts a new paragraph. HTML written in a page stays text, and an image off the web shows only its description: a page shows pictures of your image library, nothing else.

<!-- /markdown-summary -->

### Pictures

A page shows pictures of the **image library**, the pictures you've added, shared by every app (portraits, banners, Map's icons): the page names one, it doesn't hold it, so it stays light and the same picture serves every page that shows it.

- **Picture** (the frame), on the bar over the text, opens the library: choose one (**Pages** shows those added for pages, **All** every one), give it a **Caption** if you like (said under it), and **Use this one**. Its line is written where the cursor is: `![The mill from the ford](picture:…)`, the caption between the brackets.
- **Drop or paste** a picture on the text (a file, or one copied from a web page or an image editor): it's kept in the library at once, for pages, and its line is written where it fell. Give it a caption by writing it between the brackets.
- Read, each picture is as wide as the page at most (a small one at its own size), with its caption under it. Under the text being written, each picture of the page shows small: click one to find its line.
- A picture deleted from the library shows a dashed box saying so. **Your images…** (the app switcher) lists the pages that show each picture under **Used by** ([Your images](../technical/05-backups.md#your-images)).

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

**⋯ → Export as .md files** downloads every page as a `.zip`: a folder per campaign (by its name) and **General**, each page a `.md` file at its path. Links between pages stay `[[…]]`, as Obsidian and SilverBullet read them; links into the games become ordinary Markdown links to the apps. The pictures the pages show go in a **pictures** folder, and each page names its own as files (`![The mill](../pictures/The mill.webp)`), as any Markdown reader shows them.

**⋯ → Import .md files…** reads a `.zip` (or several `.md` files): what's in a folder named after one of your campaigns (or General) goes there, the rest into the campaign you're playing. A page at the same path of the same campaign is replaced (after asking), keeping what links to it; links to the apps written by an export become links into the games again. The pictures beside the pages (a `pictures` folder, or any picture the pages name by its file, PNG, JPEG or WebP) are kept in the image library and the pages show them from there; one the library has already is not added twice.

Pages are in your [backups](../technical/05-backups.md) too. Deleting a campaign keeps its pages: they move to General, in a folder named after it.

## The example pages

**⋯ → Add the example pages of The Grey Marches** adds the pages the Grey Marches bring to the campaign you're playing: the campaign's front page, Ashford, the ferry, Hollow Gate, Brenna the ferrywoman and the Iron Clans ([The Grey Marches](../bundled/02-grey-marches.md#notes)). Opening the example map (Map → **Maps → Example maps**) adds them to its campaign by itself, those it doesn't have yet (a page already there, changed or not, stays as it is), and a toast says so: the map's Ashford, ferry and Hollow Gate cells, the ferrywoman and the Iron Clans already link to them.
