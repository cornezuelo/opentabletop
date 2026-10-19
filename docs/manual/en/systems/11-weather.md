# Weather

The **Weather** tab edits the weather models the system names: weather with inertia, where today's weather depends on yesterday's. **New weather model** adds one and names it. A check rolls it (**Rolled on**, under _Weather with inertia_, in [Checks](06-checks.md)), and the [Rules](05-rules.md#weather) say how each weather slows the party. The YAML: [Weather models](../technical/07-kinds.md#weather-models).

## Kinds of weather

Each with a name and what it **sets for the day** (`snowbound: true`).

## Seasons

For each season: what the weather **starts as**, and a grid of weights, yesterday's weather in rows and today's in columns. The Grey Marches' summer: from **Clear**, `clear 5`, `grey 1`, `storm 1`: clear spells last.

**Over many days**, below each grid, says how often each kind comes up in that season, to check it feels right. **Add a season** for each season its calendar uses.

## Hex flowers

**Make it a hex flower** turns a season into a flower of 19 cells instead (**Use weights instead** turns it back): a kind of weather per cell, where the first day **Starts on** and what happens **At the edge**, with how often each kind comes up. The Grey Marches' winter is one.

The flower is drawn as its 19 hexes, each coloured by its kind of weather (the legend beside it says which is which). To change cells, choose a kind under **Paint with** and click the cells to give them it.

**How the weather walks.** The day's weather is the cell the day is on. Each day 2d6 moves it to a neighbouring cell, in the direction the roll gives (**Where each 2d6 goes**, the compass beside the flower: 2–3 north-east, 4–5 east, 6–7 south-east, 8–9 south-west, 10–11 west, 12 north-west, unless the pack changes them with `moves`). So tomorrow is always next to today: the weather drifts instead of jumping. If the day is on **Rain** in the middle and 2d6 rolls 7, tomorrow is the cell below and to its right. A roll that would leave the flower comes back on the far side or stays put (**At the edge**).

Two things shape it: **where** each kind sits (6–7, the commonest rolls, go south-east, so fair weather at the bottom-right is where the days tend to go) and **how many** cells each kind has (three cells of clear sky come up more than one of storm). **Over many days** below checks the result.
