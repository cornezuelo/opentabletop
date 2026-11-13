import { refId, type TravelRules } from '@open-tabletop/travel-engine'

/** A row of the party's buttons: a group the system declares (`groups.<id>`), or none. */
export interface ButtonGroup {
  /** The group's id; none for the buttons outside every group. */
  group?: string
  ids: string[]
}

/**
 * The party's buttons by the groups their actions name (`group: groups.camp`), in the order
 * the system declares them; outside every group, those that move go first and the rest last,
 * as they are when the system declares none.
 */
export function buttonGroups(
  buttons: readonly string[],
  rules: Pick<TravelRules, 'actions' | 'groups'>,
  movers: ReadonlySet<string>,
): ButtonGroup[] {
  const groupOf = (id: string) => {
    const group = refId('groups', rules.actions?.[id]?.group)
    return group && rules.groups?.[group] ? group : undefined
  }
  const loose = buttons.filter((id) => !groupOf(id))
  const rows: ButtonGroup[] = [
    { ids: loose.filter((id) => movers.has(id)) },
    ...Object.keys(rules.groups ?? {}).map((group) => ({
      group,
      ids: buttons.filter((id) => groupOf(id) === group),
    })),
    { ids: loose.filter((id) => !movers.has(id)) },
  ]
  return rows.filter((row) => row.ids.length > 0)
}
