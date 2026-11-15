# The rest of play

A proposal for what is left of the review of play outside the fight (backlog: _Play, and above all the fight, reviewed again_, step 4). **Decided with the author (2026-11-15, "de lo por decidir lo recomendado": the recommended answer to each question of §4)**; nothing here is built yet.

The ask (author, 2026-11-14): "la UI/UX de la aplicación a la hora de jugar, especialmente el combate, es muy mejorable. Identifica puntos de mejora."

## 1. What there is today

Looked at again in the built apps (Spanish UI, 1500×950) on 2026-11-15, after v0.60.0.

**Travel opens on a form.** Choosing a system shows, before anything can be played: a trip to choose and its name, **Another trip** and **Delete**; a campaign to choose and a link to it; the system again, a season and **New trip**; the way, with km per cell; and at the right, alone, **Start a trip**. Five rows of settings come before the one thing a trip needs (its way) and the one button that matters. The trip chosen may be one of another system (_Generic rules, day 1_ under the Grey Marches' title). In the list of systems, names are cut short by their badges (_Ker Ne…_).

**The Party tab is some 3200 px tall** with one character: the party's own sheet (500 px), where each stat comes from (380 px), each character unfolded whole (1500 px each: skills, body, gear, standing, every place it carries things in), the trip's own places, this place's sheet and, last of all, **Here**: who is present and **Add from the bestiary**. Setting a scene means scrolling past everything else. The actions stay at the top as the tab scrolls, which is right.

**Map's Play opens on settings.** Before a trip: the play mode, the system and season, **New trip**, discovery and its reach, the trail's options, **Clear trail** and **Remove party**. Nothing says what to do first.

**Fixed already, with no decision needed** (2026-11-15): a new character's name, the party's token not drawn after **New trip** with another trip going on in the campaign, the Play panel scrolling sideways, a lone foe fleeing at once (the Grey Marches' own rule).

## 2. Principles

- **What you came to do is first**; what is set once is folded, or elsewhere.
- **Long lists are folded cards, alike everywhere** (the repo's own rule): a character is a line until it's opened.
- **What changes during play is near the actions**; what is read now and then is a click away.
- Nothing new to learn: the same components (`CardHead`, `CardTools`, `Tabs` with a count), moved and folded.

## 3. Proposal

### A. Travel: the way first, the rest in one line

- With no trip going on, the page is **the way** and **Start a trip with …**, the button under the way, where the eye ends.
- Everything else is one line above it: _Trip: The Grey Marches, day 1 · its own campaign · spring_, with **Change…** unfolding today's rows (trip, name, campaign, system, season, new, delete). Once a trip is going on, the same line says it and stays folded.
- The trip offered under a system is one of that system; with none, a new one, not another system's.
- **km per cell** stays with the way (it's the way's).
- The systems' list: the badges under the name, never cutting it.

### B. The Party tab: folded cards, and Here out of it

- **Here gets a tab of its own** (**Here**, with the count of those present, as tabs already show what's new): who is here, **Add from the bestiary**, this place's sheet. Setting a scene is one click; during a fight the stage already shows them.
- **Each character is a folded card** (`CardHead`: its face, name, main value as on the glance cards, its conditions as chips), unfolded on a click; **Unfold all** / **Fold all** when there are several. A click on a glance card under the actions opens that character's card, as today.
- **The party's own sheet** is a card too, first, unfolded (it's short once the stats leave it).
- **Where each stat comes from** folds to a line (_Stats, and where they come from_).
- The trip's own places stay at the end.

### C. Map's Play: a start, then the trip

- With no trip: one card, _Start a trip with the Grey Marches_ (the season beside it), and what's missing said above the button (_Click a cell to place the party_). **Simple** play (moving the token with no rules) is a link under it, not half the panel.
- Discovery, the trail and **Remove party** move to the trip's **Options** tab, where the other settings of play already are; before a trip, under a folded **Settings**.
- The status strip's place (_In Ashford (0608)_) is a button: it centres the map on the party.

## 4. Decided

The recommended answer to each:

1. **Here as a tab** (recommended), or first in the Party tab.
2. **Characters folded by default** (recommended), or the one acting unfolded.
3. **Travel's settings in one line with Change…** (recommended), or a dialog (**New trip…**) holding them.
4. **Simple play as a link** (recommended), or kept as today's two buttons.
5. Anything of §3 not wanted.

## 5. Order

C (small, Map alone), then B (travel-ui, both apps get it), then A (Travel alone). Each with its tests and the manual's pages (Travel's Playing and Getting started, Map's Play), en/es.
