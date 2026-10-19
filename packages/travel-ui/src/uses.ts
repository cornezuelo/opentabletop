import { localize, type TravelSystem, type Use } from '@open-tabletop/session'

const ROLLABLE = ['table', 'oracle', 'generator', 'deck']

/**
 * What uses a stat, a supply or a role, for its help in the trip panel: "Read by: Do we get
 * lost?, Encounter" and "Changed by: Forage, Camp", by the names players know (actions,
 * checks, tables, clocks). What it's made of (a stat's `from`) is said elsewhere.
 */
export function usesHelp(
  uses: readonly Use[],
  system: TravelSystem,
  locale: string,
  nameOf: (id: string) => string,
  t: (key: 'tips.readBy' | 'tips.changedBy', params: { names: string }) => string,
): string {
  const placeName = (use: Use): string | undefined => {
    const { kind, pack, id, path } = use.at
    if (ROLLABLE.includes(kind)) return nameOf(`${pack}/${id}`)
    const [, head, key, index] = /^([^.[]+)(?:\.([^.[]+)|\[(\d+)\])?/.exec(path) ?? []
    const text = (t: Parameters<typeof localize>[0], fallback: string) =>
      localize(t, locale, system.locale) ?? fallback
    if (kind === 'travel-rules' && head === 'actions' && key)
      return text((system.rules.actions?.[key] as { name?: string } | undefined)?.name, key)
    if (kind === 'travel-rules' && head === 'checks' && index !== undefined) {
      const check = system.rules.checks?.[Number(index)]
      return check && text(check.name, check.event)
    }
    if (kind === 'clocks' && head === 'clocks' && key)
      return text(system.clocks?.def.clocks[key]?.name, key)
    return undefined
  }
  const names = (hows: Use['how'][]) => [
    ...new Set(
      uses
        .filter((u) => hows.includes(u.how))
        .map(placeName)
        .filter((n): n is string => !!n),
    ),
  ]
  const read = names(['reads'])
  const changed = names(['changes', 'sets'])
  return [
    read.length && t('tips.readBy', { names: read.join(', ') }),
    changed.length && t('tips.changedBy', { names: changed.join(', ') }),
  ]
    .filter(Boolean)
    .join('\n')
}
