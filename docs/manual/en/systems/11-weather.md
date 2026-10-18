# Weather

The **Weather** tab edits the weather models the system names: weather with inertia, where today's weather depends on yesterday's. **New weather model** adds one and names it. A check rolls it (**Rolled on**, under _Weather with inertia_, in [Checks](06-checks.md)), and the [Rules](05-rules.md#weather) say how each weather slows the party. The YAML: [Weather models](../technical/07-kinds.md#weather-models).

## Kinds of weather

Each with a name and what it **sets for the day** (`snowbound: true`).

## Seasons

For each season: what the weather **starts as**, and a grid of weights, yesterday's weather in rows and today's in columns. The Grey Marches' summer: from **Clear**, `clear 5`, `grey 1`, `storm 1`: clear spells last.

**Over many days**, below each grid, says how often each kind comes up in that season, to check it feels right. **Add a season** for each season its calendar uses.

## Hex flowers

**Make it a hex flower** turns a season into a flower of 19 cells instead (**Use weights instead** turns it back): a kind of weather per cell, where the first day **Starts on** and what happens **At the edge**, with how often each kind comes up. The Grey Marches' winter is one.
