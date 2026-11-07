# Roll modes

The **Roll modes** tab shows the roll modes of the packs the system brings: its own, and read-only another pack's it brings (like Core's advantage): every system that brings that pack shares them, so they're not copied here; to change them for this system, make your own. **New roll modes** adds them to its own pack. The YAML: [Roll modes](../technical/07-kinds.md#roll-modes).

Each has its name and one of three ways of rolling: how many **Rolls** of the whole roll, how many **Extra dice**, or **Either way** (a percentile die, `d%` or `d66`, read with its tens and units swapped when that's better: a 73 as 37); then which total it **keeps** (`highest`, `lowest`, `middle`; extra dice and either way keep the highest or the lowest) and the modes it **cancels**. If a mode keeps the lowest of a percentile die either way round, a roll of 73 against a chance of 40 is read as 37, under it.
