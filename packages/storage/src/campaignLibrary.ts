/**
 * The campaigns of this browser in IndexedDB, keyed by campaign id, beside the map library.
 * Their contents are campaigns in the format of `@open-tabletop/campaign` (`json`,
 * versioned); backups copy them as they are. Every write is announced on
 * `opentabletop.campaigns`, so an app holding a campaign open (the Hexmapper, with a map of
 * it) reads it again.
 */
import { createLibrary } from './library'

/** The channel the campaigns' changes go out on. */
export const CAMPAIGNS_CHANNEL = 'opentabletop.campaigns'

const campaigns = createLibrary('campaigns', CAMPAIGNS_CHANNEL)

export const putCampaign = campaigns.put
export const getCampaign = campaigns.get
export const deleteCampaign = campaigns.delete
/** All campaigns, newest first, without their JSON (for listing). */
export const listCampaigns = campaigns.list
/** Every campaign with its JSON (for backups). */
export const allCampaigns = campaigns.all
/** Writes several campaigns and deletes others in one transaction (restoring a backup). */
export const updateCampaigns = campaigns.update
/** Calls `listener` whenever another window or app changes a campaign. */
export const onCampaignChange = campaigns.onChange
/** Calls `listener` whenever a campaign changes, in this page or another window or app. */
export const onAnyCampaignChange = (listener: Parameters<typeof campaigns.onAnyChange>[0]) =>
  campaigns.onAnyChange(listener)
