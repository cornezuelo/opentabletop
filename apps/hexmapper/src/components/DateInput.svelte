<script lang="ts">
  import { localize } from '@open-tabletop/session'
  import { formatClock, parseClock, type Calendar, type DataCalendar } from '@open-tabletop/time'
  import { getLocale, t } from '../lib/i18n/index.svelte'

  /**
   * A moment written in the calendar's terms: year, month, day and time with a calendar of
   * its own, the day number and time with the default one. `value` is the game time it
   * names; a date the calendar doesn't have (or before day 1) leaves it unchanged and says so.
   */
  let { calendar, value = $bindable() }: { calendar: Calendar; value: number } = $props()

  const data = $derived('dayOf' in calendar ? (calendar as DataCalendar) : undefined)
  const parts = () => calendar.describe(value)

  // What is typed, filled from the value it starts with.
  let year = $state(0)
  let month = $state('')
  let day = $state(1)
  let clock = $state('06:00')
  $effect.pre(() => {
    void calendar
    const p = parts() as ReturnType<Calendar['describe']> & {
      year?: number
      month?: { id: string; day: number }
    }
    year = p.year ?? 0
    month = p.month?.id ?? ''
    day = p.month?.day ?? p.day
    clock = formatClock(p)
  })

  const target = $derived.by((): number | undefined => {
    if (!/^\d{1,2}:\d{2}$/.test(clock)) return undefined
    const minutes = parseClock(clock)
    if (minutes >= calendar.minutesPerDay) return undefined
    const gameDay = data
      ? data.dayOf({ year, month, day })
      : Number.isInteger(day) && day >= 1
        ? day
        : undefined
    return gameDay === undefined ? undefined : calendar.at(gameDay, minutes)
  })
  $effect(() => {
    if (target !== undefined && target !== value) value = target
  })
</script>

<div class="date">
  {#if data}
    <input type="number" class="day" min="1" bind:value={day} aria-label={t('world.dateDay')} />
    <select bind:value={month} aria-label={t('world.dateMonth')}>
      {#each data.def.months as m (m.id)}
        <option value={m.id}>{localize(m.name, getLocale(), 'en') ?? m.id}</option>
      {/each}
    </select>
    <input type="number" class="year" bind:value={year} aria-label={t('world.dateYear')} />
  {:else}
    <label
      >{t('world.dateDayNumber')}
      <input type="number" class="day" min="1" bind:value={day} /></label
    >
  {/if}
  <input
    type="text"
    class="clock"
    bind:value={clock}
    placeholder="06:00"
    aria-label={t('world.at')}
  />
</div>
{#if target === undefined}<p class="bad">{t('world.dateMissing')}</p>{/if}

<style>
  .date {
    display: flex;
    gap: 4px;
    align-items: center;
    flex-wrap: wrap;
  }

  .day {
    width: 4.5em;
  }

  .year {
    width: 5.5em;
  }

  .clock {
    width: 4.5em;
  }

  .bad {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--danger, #c0392b);
  }
</style>
