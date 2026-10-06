# Making a system

A travel system is two definitions in a pack, usually in one file: **travel rules** (`kind: travel-rules`) and **bindings** (`kind: bindings`). [Connecting tables to maps and trips](../oracle/07-connecting.md) explains every part of both, step by step, with examples.

## A new system

Write a name in the box at the bottom of the system list and press **+**. It creates one of your packs with the Generic rules to start from and empty bindings, and opens its **YAML** tab. Change it there: every edit is checked as you type, and problems are marked at their line. The system is ready to play right away in this app and in the Hexmapper (in the same browser).

The tables its bindings name go in the same pack: add them in the Oracle app (your new pack is listed there too), or refer to tables of other packs with their full id (`core/weather`).

## Changing a bundled system

Bundled systems are read-only. In their **YAML** tab, **Edit a copy** makes a copy of the whole pack you can change; it replaces the bundled one in this browser. Copies of personal-use packs stay personal use.

## Trying it out

The **Play** tab is the fastest way to check a system: build a short way with the terrains, roads and tags your rules care about, and watch the journal. For example, to test a check with `when: { tags: landmark }`, tag the last hex `landmark` and travel.
