import { mainValue, type Sheet } from '@open-tabletop/character-engine'
import { lastStepEntries, PARTY_ID, type SessionState } from '@open-tabletop/session'

/**
 * What the last step did to each one's main value (a blow's −2), by id: the party's own sheet
 * (`party`) or a character of the trip, each with the sheet it's drawn with.
 */
export function mainChanges(
  session: SessionState,
  ones: readonly { id: string; sheet: Sheet | undefined }[],
): Record<string, number> {
  const out: Record<string, number> = {}
  const lines = lastStepEntries(session).filter((e) => e.code === 'CHANGED')
  for (const { id, sheet } of ones) {
    const main = sheet && mainValue(sheet)
    if (!main) continue
    const path = id === PARTY_ID ? `party.values.${main}` : `characters.${id}.values.${main}`
    const delta = lines
      .filter((e) => e.data?.path === path)
      .reduce((sum, e) => sum + (Number(e.data?.to) - Number(e.data?.from) || 0), 0)
    if (delta) out[id] = delta
  }
  return out
}
