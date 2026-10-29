/**
 * The campaign being played: a preference of this browser, so Campaign (the site's root)
 * opens it again, and the other apps can say which one you're in (campaigns.md §11).
 * Absent: none yet, or **No campaign**.
 */
export const CURRENT_CAMPAIGN_KEY = 'opentabletop.campaign.current'

export function readCurrentCampaign(
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
): string | undefined {
  try {
    return storage?.getItem(CURRENT_CAMPAIGN_KEY) || undefined
  } catch {
    return undefined
  }
}

/** Remembers the campaign being played (none: forgets it). */
export function rememberCampaign(
  id: string | undefined,
  storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined = globalThis.localStorage,
): void {
  try {
    if (id) storage?.setItem(CURRENT_CAMPAIGN_KEY, id)
    else storage?.removeItem(CURRENT_CAMPAIGN_KEY)
  } catch {
    // Not remembered; Campaign opens the newest one instead.
  }
}
