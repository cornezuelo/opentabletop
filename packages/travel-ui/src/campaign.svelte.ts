import {
  createCampaign,
  deserializeCampaign,
  serializeCampaign,
  type Campaign,
} from '@open-tabletop/campaign'
import { getCampaign, onCampaignChange, putCampaign } from '@open-tabletop/storage'

/** The time of a change (plain text, not reactive state). */
const now = (): string => new Date(Date.now()).toISOString()

/** A campaign kept in this browser, or none if missing or unreadable. */
async function read(id: string): Promise<Campaign | null> {
  try {
    const entry = await getCampaign(id)
    return entry ? deserializeCampaign(entry.json) : null
  } catch {
    return null
  }
}

/**
 * The campaign a host plays in (Travel: the open trip's), read from where campaigns are kept
 * (`@open-tabletop/storage`) and written back as it changes; when another window or app
 * changes it (the Hexmapper, a world turn), it's read again.
 */
export class CampaignKeeper {
  /** The campaign open now (undefined while it's being read). */
  campaign = $state.raw<Campaign | undefined>(undefined)
  private loadingId = ''
  private loading: Promise<Campaign> | undefined
  private writes: Promise<void> = Promise.resolve()
  private unsaved = 0

  constructor() {
    onCampaignChange((change) => {
      const id = this.campaign?.id
      if (!id || this.unsaved) return
      if (change.type === 'many' || (change.type === 'put' && change.id === id))
        void read(id).then((next) => {
          if (next && this.campaign?.id === id && !this.unsaved) this.campaign = next
        })
    })
  }

  /** Opens a campaign: the one kept with this id, or a new one with this name. */
  open(id: string, name: string): Promise<Campaign> {
    if (this.campaign?.id === id) return Promise.resolve(this.campaign)
    if (this.loading && this.loadingId === id) return this.loading
    this.campaign = undefined
    this.loadingId = id
    const loading = read(id).then((kept) => {
      const campaign = kept ?? createCampaign(id, name)
      if (this.loadingId === id) this.campaign = campaign
      return campaign
    })
    this.loading = loading
    return loading
  }

  /** Changes the open campaign and keeps it (in order, one write after another). */
  set(next: Campaign): void {
    const campaign = { ...next, modified: now() }
    if (this.campaign?.id === campaign.id) this.campaign = campaign
    this.write(campaign)
  }

  /** Keeps a campaign that isn't the open one (a trip left it). */
  write(campaign: Campaign): void {
    this.unsaved++
    this.writes = this.writes
      .then(() =>
        putCampaign({
          id: campaign.id,
          name: campaign.name,
          modified: campaign.modified,
          json: serializeCampaign(campaign),
        }),
      )
      .catch(console.error)
      .finally(() => this.unsaved--)
  }

  /** Reads a campaign kept in this browser without opening it. */
  read(id: string): Promise<Campaign | null> {
    return read(id)
  }
}
