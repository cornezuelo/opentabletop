import { calendarOf, localize, type SessionState, type TravelSystem } from '@open-tabletop/session'
import {
  availableActions,
  checkInfo,
  declaredValues,
  findPartRef,
  isPartRef,
  type ParamChoice,
} from '@open-tabletop/travel-engine'
import { divisionName, partName } from './dayParts'
import { idText, type Translate } from './i18n'
import { actionNothingOf, type JournalContext } from './journal'
import { conditionTeller, memberNamer, whoNamed } from './members'
import { connectionName } from './terrains'

/**
 * Everything a trip's journal needs to say its lines in words, by the system's own names:
 * the trip panel's journal and the line over the map that says what happened last.
 */
export function journalContext(o: {
  system: TravelSystem
  session: SessionState
  locale: string
  t: Translate
  /** Calendar day the trip started (shown as day 1). */
  startDay: number
  hexLabel?: (hex: string) => string
  terrainName?: (id: string) => string
  /** Display name of an Oracle definition (journal entries of hand rolls). */
  nameOf?: (id: string) => string
  /** The host's facts (the world clock's), for members' values made of them. */
  facts?: Record<string, unknown>
}): Omit<
  JournalContext,
  | 'actionName'
  | 'checkName'
  | 'valueName'
  | 'terrainName'
  | 'actionNothing'
  | 'partName'
  | 'modeName'
  | 'dayValues'
  | 'memberName'
> & {
  actionName: (id: string) => string
  checkName: (event: string) => string | undefined
  valueName: (key: string) => string
  terrainName: (id: string) => string
  actionNothing: (id: string) => string | undefined
  partName: (moment: string) => string
  modeName: (id: string) => string
  dayValues: Record<string, string>
  memberName: (path: string) => string | undefined
} {
  const { system, session, locale, t } = o
  const text = (value: Parameters<typeof localize>[0]) => localize(value, locale, 'en')
  const actions = availableActions(system.rules)
  const calendar = calendarOf(system)
  const terrainName = o.terrainName ?? ((id: string) => id.replaceAll('-', ' '))
  const actionName = (id: string) => text(actions.all[id]?.name) ?? idText(t, `actions.${id}`, id)
  /** Name of a value results change: a stat of the system, as it names it. */
  const valueName = (key: string) => {
    const stat = system.bindings?.stats?.[key]
    if (stat) return text(stat.name) ?? key
    return idText(t, `resources.${key}`, key)
  }
  /** A clock (`06:00`) or a part of the calendar's day by its name ("Meals: supper"). */
  const untilText = (moment: string) => {
    if (!isPartRef(moment)) return moment
    const found = findPartRef(calendar.divisions ?? [], moment)
    return found
      ? `${divisionName(found.division, locale, t('watches'))}: ${partName(found.division, found.part, locale)}`
      : moment
  }
  const choiceId = (c: ParamChoice) => (typeof c === 'object' ? c.id : c)
  return {
    t,
    partName: untilText,
    startDay: o.startDay,
    hexLabel: o.hexLabel ?? ((hex) => hex),
    nameOf: o.nameOf ?? ((id) => id),
    actionName,
    checkName: (event: string) => text(checkInfo(system.rules, event).name),
    calendar,
    valueName,
    terrainName,
    connectionName: (id: string) => connectionName(t, id, { system, locale }),
    actionNothing: (id: string) => actionNothingOf(system.rules, id, locale),
    dayValues: Object.fromEntries(
      Object.entries(declaredValues(system.rules)).map(([id, v]) => [
        id,
        text(v.name) ?? idText(t, `values.${id}`, id),
      ]),
    ),
    memberName: memberNamer(
      system,
      session.members,
      locale,
      t,
      o.facts,
      session.party,
      [...(session.present ?? []), ...(session.leaving ?? [])].map((p) => p.character),
    ),
    conditionTold: conditionTeller(system, session, locale),
    textOf: (value: unknown) => text(value as Parameters<typeof localize>[0]) ?? '',
    modeName: (id: string) => text(system.rules.modes[id]?.name) ?? idText(t, `modes.${id}`, id),
    paramName: (action: string, key: string) => {
      const param = actions.all[action]?.params?.[key]
      return param ? (text(param.name) ?? key) : key
    },
    choiceName: (action: string, key: string, choice: string) => {
      const c = actions.all[action]?.params?.[key]?.choices?.find(
        (c) => String(choiceId(c)) === choice,
      )
      // One the trip listed (`from: present.ids`): whoever it is, by name.
      return c === undefined
        ? (whoNamed(session, choice) ?? choice)
        : ((typeof c === 'object' ? text(c.name) : undefined) ??
            String(choiceId(c)).replaceAll('-', ' '))
    },
  }
}
