# Overview

The **Overview** tab is the system's own definition (`kind: system`, in `system.yaml`): what it's called, what it plays with and what it brings. A system of an older pack (travel rules and no `kind: system`) shows **Declare it** instead: it writes `system.yaml` naming what the system uses today, and plays the same.

## Name and description

Its **Name** and **Description**, as every app shows them (in the interface's language: the pack's own, or its translation).

## Its parts

- **Travel rules**, **Bindings** and **Calendar**: the ones it plays with, each chosen among this pack's (by id) and its dependencies' (`core/default`), listed by name when they have one (_The Royal Reckoning (royal-reckoning)_). **Open** goes to the tab that edits them; **Create** makes new travel rules (from the Generic ones) or empty bindings and names them.
- **Weather models**: the ones its bindings can name (`weather: highland-skies`), each with its name and id. They're edited in [Weather](10-weather.md).

## Packs it brings

Its own always, and the dependencies you tick, whose tables come with it: a map playing it shows them in its Oracle panel. To bring another pack, add it to the dependencies in `pack.yaml`.

## Example maps

Maps to play the system on, kept in its pack (`maps:`):

- **Open in the Hexmapper →** opens one there as its **Maps → Example maps** would.
- **Add a map file…** copies a map file the Hexmapper's **Save** wrote into the pack's `maps/` folder.
- **Remove** takes it out of the pack.

## Taking it elsewhere

Your systems live only in this browser. To keep one safe, take it to another browser or give it to someone, the Overview ends with **Take it elsewhere**: it lists what the file holds and **Export as .zip** downloads it. The .zip holds every pack the system needs, each in its own folder: its own pack, the packs it brings, those its parts are written in and their dependencies, as far as they go. The Grey Marches' file, for instance, holds the Grey Marches and Core.

**Import a system (.zip)…**, under the systems list, reads such a file back and opens the system it brought (the Oracle's **Import .zip** reads it too):

- packs you don't have are added to yours;
- packs already here and unchanged (a bundled Core, say) are left as they are;
- a pack you have in a different version is replaced only after asking: a user pack is overwritten, a bundled one gets your imported copy over it (**Revert to bundled** brings it back). **↶** undoes the whole import in one step.

A system that uses personal-use packs says so next to the button: keep that file for yourself. The file's layout is in [File formats](../technical/02-file-formats.md#packs).
