# Factions

The **Factions** tab edits the powers of the system's world (`kind: factions`, one per system). **New factions** makes two on Core's turn table, with a sheet of their own, and names them in the system. In the Hexmapper they're brought onto a map from the World view ([Factions](../hexmapper/12-world.md#factions)). The YAML: [Factions](../technical/07-kinds.md#factions).

**Their land.** A faction's land is the hexes it holds on a map. Here you say where each **starts**: the **Regions** (by the names the map gives them) and **Hexes** it holds when a map brings the factions in. From then on the land is the map's: painted by hand in the Hexmapper's World view and won or lost hex by hex on world turns, by what their turn table's results say (`faction.territory: 1` takes a hex from its border, `-1` gives one up; Core's _A faction's turn_ does both). Changing where they start doesn't move the land of a map that already has them.

## What it has

- Their **Name**.
- **Their sheet**: the values, conditions and relations every faction has.
- **Their turn**: what each rolls on a world turn.
- **Every (days)**: how often a world turn comes by itself; empty, only by hand.
- Each faction, with its **Name**, **Colour**, what it **Starts with**, the **Regions** and **Hexes** it starts holding and its **Own turn** table.
