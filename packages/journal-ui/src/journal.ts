import { emptyJournal, readJournal, type CampaignJournal } from '@open-tabletop/journal'
import { changeJournalEntry, getJournalEntry } from '@open-tabletop/storage'

/** A campaign's journal as this browser keeps it (an empty one while it has none). */
export async function readCampaignJournal(campaign: string): Promise<CampaignJournal> {
  const entry = await getJournalEntry(campaign)
  return (entry && readJournal(entry.json)) || emptyJournal(campaign)
}

/**
 * Changes a campaign's journal as kept (one change at a time, with the trips' moments being
 * copied in). One of a newer format is left as it is.
 */
export function changeCampaignJournal(
  campaign: { id: string; name: string },
  change: (journal: CampaignJournal) => CampaignJournal,
): Promise<void> {
  return changeJournalEntry(campaign.id, campaign.name, (json) => {
    const journal = json === undefined ? emptyJournal(campaign.id) : readJournal(json)
    return journal ? JSON.stringify(change(journal)) : undefined
  })
}
