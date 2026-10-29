import { deserializeCampaign, type Campaign } from '@open-tabletop/campaign'
import { systemIdOf } from '@open-tabletop/session'
import { getCampaign } from '@open-tabletop/storage'
import { showToast } from '@open-tabletop/ui-kit'
import { t } from './i18n'
import { systems } from './packs.svelte'
import { trip } from './trip.svelte'

/**
 * A trip put in a campaign from the Campaign app (`#/in-campaign/<campaign>[/<trip>]`): a
 * new one played with the campaign's system, or one kept here (`id`) joining it as its
 * Campaign field does (asking what stays). The system whose page shows it, or undefined.
 */
export async function openInCampaign(campaign: string, id?: string): Promise<string | undefined> {
  if (id) {
    if (!trip.trips.some((each) => each.id === id)) {
      showToast(t('inCampaign.missing', { id }), 'error')
      return undefined
    }
    trip.open(id)
    await trip.joinCampaign(campaign)
    return trip.saved.system
  }
  const entry = await getCampaign(campaign).catch(() => null)
  let kept: Campaign | null = null
  try {
    kept = entry ? deserializeCampaign(entry.json) : null
  } catch {
    // Unreadable: the trip plays the system last open here.
  }
  const wanted = systemIdOf(kept?.system)
  const system = systems.get(wanted) ? wanted : trip.saved.system
  await trip.create(system, trip.saved.season, campaign)
  return system
}
