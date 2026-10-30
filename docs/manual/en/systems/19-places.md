# Places

The **Places** tab edits the system's **catalogues of places** (`kind: places`): templates of points of interest its results can make on the party's hex, such as ruins, wayside shrines, camps or lairs. A table entry, an action's step, a deck's card or a discovered hex's contents makes one with an effect (`hex.pois.ruins: 1`). Played on a map in the Hexmapper, it's written into the map as a point of interest that says **Made from** its template, and the template's tags go on its hex; in a trip without a map, the journal notes it. A place keeps what it was made with, so changing a template only touches places made afterwards.

## The tab

One catalogue at a time; with several, a row of buttons chooses. **New catalogue of places** makes a small one (a camp) and adds it to the system's **Overview** (`places:`, a list). A catalogue has:

- Its **Name**.
- Its **Places**: each one by an **Id** (what effects name it with: `hex.pois.<id>`), with:
  - its **Name** and **Description**, what the point of interest says. The description can read the result that makes it (`{{result}}`, the result's own text) and roll (`A camp of {{1d6+2}} travellers`), once, when the place is made;
  - its **Icon**, one of the map's (`game:castle-ruins`, `game:totem`), to tell it apart among the hex's points of interest;
  - its **Tags of the hex**: what the hex gets when the place is made there, which the rules read (an action only possible at a shrine: `hex.tags: shrine`);
  - its **Fields**, `key: value` pairs kept with the point of interest, rolls read when it's made (`skulls: {{1d6+2}}`).

Its name and the places' names and descriptions are written in the language the app is in: in the catalogue itself when it's the pack's own language, otherwise in the pack's translation ([Translating](../technical/01-translating.md)). The YAML: [Places](../technical/07-kinds.md#places).

## Step by step: a camp found by exploring

1. In **Places**, **New catalogue of places**. It comes with a **camp**: give it the description `The ashes of {{1d3}} fires, still warm`.
2. Make a table that may find it: in the Oracle, a table whose entry has `effects: { hex.pois.camp: 1 }`.
3. In **Rules**, give an action a step that rolls it (`roll: table.<your table>`).
4. **Try it**: when the entry comes up, the journal says _A place here: Camp — The ashes of 2 fires, still warm_. On a map in the Hexmapper, the hex gets the point of interest and the tag `camp`.

Discovery can make places too: an entry of the table that decides what a found hex holds (`discover.contents`) with `effects: { hex.pois.camp: 1 }` makes the camp instead of a point of interest from its text ([Discovering the map](../oracle/07-connecting.md#7-discovering-the-map)). The Grey Marches make their ruins, shrines and the dragon's lair this way, and Core's **Explore** makes a _Landmark_ on a 6.

Bundled systems are read-only: **Duplicate** one to change it.
