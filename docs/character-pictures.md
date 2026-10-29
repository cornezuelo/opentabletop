# Pictures for characters — design

Design for the backlog's _Pictures for characters_ (Characters engine, user 2026-10-19: "estaría bien permitir subir imágenes"). **Decided 2026-10-20:** a design document for the user to review first, no code yet. Section 7 lists what needs a decision.

## 1. What there is today

- A **character** (`CharacterState`, character-engine) has its sheet's values, conditions, tags, cards and relations, a name and a `noteRef` to the user's notes app. No picture.
- The **roster** lives in `localStorage` (`opentabletop.characters`), backed up with every `opentabletop.` key. Maps and campaigns live in IndexedDB (`hexmapper` database: `library`, `campaigns`), added to backups explicitly.
- The Hexmapper already embeds **user images** in a map: `MapAsset { id, name, dataUrl }` (imported icons, `importImageFile`), saved in the `.otd.json`. Tokens draw an icon, not a picture.

## 2. What a picture is

One optional **portrait** per character, kept apart from its state so the state stays small:

```ts
interface CharacterState {
  // …
  /** Its portrait, by the id of a picture kept beside the roster or the map (absent: none). */
  picture?: string
}
```

- **The pixels live in one place, referenced by id**, never copied into every trip step or journal: a `pictures` store in IndexedDB (`{ id, dataUrl, name, width, height }`), shared by every app of the origin, like maps and campaigns. A character's `picture` is that id.
- **Shrunk on upload**: the browser decodes it, draws it into a canvas no bigger than 512 px on its longer side and saves it as WebP (or JPEG where WebP can't be written), a few tens of KB. The original isn't kept. SVG is refused (scripts), as packs refuse code.
- **Or from the notes app**: a `noteRef`-style reference to an image in the user's notes (`picture: note:People/Old Tobin.png`), resolved by the notes provider as links are today; nothing stored. Proposal: second, after uploads work (section 7 c).

## 3. Where it shows

- **Characters app**: the character's header gets the portrait (a round crop, the name beside it), **Picture…** to upload, **Remove the picture**; the roster list shows a small one beside each name.
- **Trips** (Travel and the Hexmapper's Party tab): each member's card shows it small in its head; the party sheet has none (section 7 b).
- **Tokens**: a token with a sheet linked to a roster character may draw its portrait **instead of its icon** (a checkbox **Show its picture** in the token's panel), clipped to the token's disc; the map export and print draw it too.
- **Factions and the bestiary** could use the same field later (an emblem, a creature's picture): the store and the field are generic; nothing in this design is character-only but the UI.

## 4. Saving, sharing and backups

- **Backups**: the `pictures` store is added to `@open-tabletop/storage`'s backup explicitly (as maps and campaigns are), and restored with it; a picture no character, map or campaign names any more is dropped on the next backup (no orphan bytes).
- **Exporting a character** (`.otd.json`): the picture travels **embedded** as a `MapAsset`-like entry (`assets: [{ id, name, dataUrl }]`), and the character names it by id; importing puts it into the store (same bytes, same id: kept once).
- **Maps**: a map's file embeds the pictures of its characters (members and tokens) in its `assets`, so a map sent to a friend shows them; opening it fills the store. OTD's `Character` keeps the reference in `ext.character.picture`.
- **Format versions**: the roster's and the map's formats gain an optional field (no meaning changes, no migration needed beyond reading files without it); the backup format gains a store (its version bumps, older backups still restore).

## 5. Pieces

- `storage`: the `pictures` store (DB version bump with its upgrade), `putPicture` / `getPicture` / `removePicture`, backup and restore.
- `ui-kit`: `shrinkImage(file)` (canvas, size, format), and a small `Portrait` component (lazy-loads by id, a placeholder with the initials while it loads or when missing).
- `character-engine`: the `picture` field (validated as an id string), nothing else: it never reads pixels.
- `character-ui`: the header and list pieces; `travel-ui`: the member card's head; Hexmapper: the token option, rendering (PixiJS sprite from the data URL, cached per id) and export.
- Manual: Characters (pictures), Travel's Playing and the Hexmapper's Tokens, File formats (`assets`), Backups; en and es.

## 6. What it isn't

No image editing (crop, filters) beyond the automatic shrink; no galleries or several pictures per character; no pictures in packs (packs stay text data, and a bestiary's art would come with its licence questions); no lore: a picture is a face to recognise, the story stays in the notes app (principle 9).

## 7. Decided with the user (2026-10-23)

- a. **512 px**, WebP.
- b. **The party gets a picture too** (a banner for the Company), on its own sheet's card.
- c. **Images from the notes app** wait until the notes integration is taken up; nice to have if SilverBullet and Obsidian can really serve them, not a priority.
- d. **Tokens opt in**, one by one (**Show its picture**).
- e. **Not a priority**: the work in course comes first.
- f. **Asked 2026-10-29, to fold in when this is taken up:** zoom and crop before the picture is shrunk, and basic operations (rotate, flip, perhaps brightness), in the browser; and pictures on more than characters: items (optional), POIs, perhaps factions, bestiary templates and the party. It points to a store of pictures not tied to characters (see §8).

## 8. An image library? (asked 2026-10-23: "ve pensando en hacer una biblioteca de imágenes… si te tiene sentido, que igual no aporta nada")

Today images are uploaded in three places, each its own way: a map's imported icons and terrain glyphs (`MapAsset`, embedded in that map only), and, with this design, portraits. A library would be **one store of the user's images** (`images` in IndexedDB: id, name, tags, the shrunk bytes, what kind of use it was made for), with **one picker** shared by every app (ui-kit: upload, search by name or tag, pick), and the places that use an image naming it by id.

What it would bring:

- **Reuse**: an icon imported once is offered on every map; a creature's picture serves its token on any map and, later, the bestiary; a faction's emblem the same.
- **One way to manage them**: see them all, rename, tag, delete one nobody uses (with **Used by**, as Systems does for names), instead of images scattered inside maps.
- **Backups once**: one store backed up, not a copy inside each map.

What it costs or changes:

- Maps still **embed** the images they use when saved or exported (a map file must open anywhere); opening one adds its images to the library (same bytes, same id: kept once). So nothing changes for files, only for the browser.
- A small **migration** on the way in: a map's `assets` are copied into the library when the map opens (the map keeps them too, for its file).

**Proposal**: yes, it makes sense, and portraits are the moment to do it: the `pictures` store of section 2 becomes this `images` library from the start (same work, more general), the picker is the one place to upload, and the Hexmapper's icons and glyphs move to it next. A screen to manage the library (in the Characters app? a small app of its own? in Preferences?) is the open question; the picker alone is enough to start.
