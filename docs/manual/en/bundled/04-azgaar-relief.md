# Azgaar's relief icons

**Azgaar's relief icons** is a bundled pack of images alone, no definitions: the relief icons of [Azgaar's Fantasy Map Generator](https://github.com/Azgaar/Fantasy-Map-Generator), by Max Haniyeu, for [map styles](../packs/20-map-styles.md) to draw terrains with. It's MIT-licensed, which allows maps and pictures made with them too. Core's **Relief** style and the Grey Marches' **Engraved atlas** draw with it, and both packs depend on it.

## What's in it

Two of the generator's sets, each in its folder, with the same 34 pictures:

- `colored/`: flat colours, grey mountains, green trees (Core's **Relief**);
- `illustrated/`: drawn in earth tones with dark lines, as an old atlas (the Grey Marches' **Engraved atlas**). The lines take their colour from the generator's own styles, which an image doesn't have, so each file here says it (a dark brown); otherwise they're as the generator has them.

The pictures: `mount-1` to `mount-6`, `mountSnow-1` to `mountSnow-6`, `hill-1` to `hill-4`, `conifer-1`, `coniferSnow-1`, `deciduous-1`, `deciduous-2`, `acacia-1`, `palm-1`, `deadTree-1`, `deadTree-2`, `cactus-1` to `cactus-3`, `dune-1`, `grass-1`, `swamp-1`, `swamp-2`, `vulcan-1` to `vulcan-3`. See them in the Packs app: open the pack in its left column, and its files are listed, each small.

## Using them in a style of yours

A style names an image by the pack's id and its path: `azgaar-relief/illustrated/hill-2.svg`. Make a copy of a style (Packs' **Map styles**, or **Map settings → Style → Make a copy**), and in its **Art** card, set a terrain's painter to **images (below)** and add the ones you want (they're suggested as you type); several for one terrain give each cell one of them. **How many** a cell shows and **Size** set how they fill it; **Colour** tints them. In YAML:

```yaml
kind: style
id: my-relief
art:
  terrains:
    hills: { images: [azgaar-relief/colored/hill-1.svg, azgaar-relief/colored/hill-3.svg] }
    forest: { images: azgaar-relief/illustrated/conifer-1.svg, count: 3 }
```

Your own pictures go in a pack of yours with **+ Image** on a pack's page ([Packs](../packs/21-packs.md)).
