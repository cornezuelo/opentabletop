/** Maps or trips of one campaign, as a list shows them; `campaign` undefined: each in its own. */
export interface CampaignGroup<T> {
  campaign?: string
  /** The campaign's name (empty for the group of those in a campaign of their own). */
  name: string
  items: T[]
}

/**
 * Maps or trips grouped by the campaign each is in, keeping their order inside a group: the
 * campaign being played (`playing`) first, then the others by name, and last, together, the
 * ones alone in a campaign of their own (made with them, named after them), which would
 * otherwise be a group each.
 */
export function groupByCampaign<T extends { id: string }>(
  items: T[],
  campaignOf: (item: T) => string | undefined,
  names: Record<string, string>,
  playing?: string,
  locale?: string,
): CampaignGroup<T>[] {
  const by = new Map<string, T[]>()
  const alone: T[] = []
  for (const item of items) {
    const campaign = campaignOf(item)
    if (!campaign) alone.push(item)
    else by.set(campaign, [...(by.get(campaign) ?? []), item])
  }
  const groups: CampaignGroup<T>[] = []
  for (const [campaign, list] of by) {
    if (campaign !== playing && list.length === 1 && list[0].id === campaign) alone.push(list[0])
    else groups.push({ campaign, name: names[campaign] || campaign, items: list })
  }
  groups.sort((a, b) =>
    a.campaign === playing ? -1 : b.campaign === playing ? 1 : a.name.localeCompare(b.name, locale),
  )
  if (alone.length) groups.push({ name: '', items: items.filter((item) => alone.includes(item)) })
  return groups
}
