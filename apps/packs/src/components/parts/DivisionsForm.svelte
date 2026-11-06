<script lang="ts">
  import type { TravelSystem } from '@open-tabletop/session'
  import { usesFor } from '../../lib/usage'
  import { ask, confirmAction, InfoTip, showToast, tooltip } from '@open-tabletop/ui-kit'
  import { freeId } from '@open-tabletop/pack-ui/yaml'
  import {
    equalParts,
    RESERVED_DIVISIONS,
    readDivisions,
    type DivisionDef,
  } from '@open-tabletop/time'
  import { t } from '../../lib/i18n'
  import type { PartDoc } from '../../lib/partDoc.svelte'
  import ListRows from '../forms/ListRows.svelte'

  /**
   * A calendar's divisions of the day (`divisions:`), as many as the system wants: each one
   * its id (how conditions read it, `time.<id>`), its name, its parts as rows (id, name,
   * from, until, tags) and a strip of the day showing them. Numbered parts of equal length
   * are written as rows too (**Split into equal parts…**); a division the YAML writes with
   * `every` is shown as its parts, and **Write them as rows** turns it into them.
   */
  let { doc, system }: { doc: PartDoc; system?: TravelSystem } = $props()

  type Item = Record<string, unknown>
  const data = $derived(doc.data())
  const disabled = $derived(!doc.editable)
  const divisions = $derived(
    typeof data.divisions === 'object' && data.divisions !== null
      ? Object.entries(data.divisions as Record<string, Item>)
      : [],
  )
  const ids = $derived(divisions.map(([id]) => id))

  function add() {
    const id = freeId('division', ids)
    doc.edit('', ['divisions', id], { parts: [{ id: 'morning', from: '06:00' }] })
  }

  function rename(from: string, raw: string) {
    const to = raw.trim()
    if (!to || to === from) return
    if (ids.includes(to)) return showToast(t('forms.idExists', { id: to }), 'error')
    if ((RESERVED_DIVISIONS as readonly string[]).includes(to))
      return showToast(t('calendar.divisionReserved', { id: to }), 'error')
    doc.rename('', ['divisions'], from, to)
  }

  async function remove(id: string) {
    if (!(await confirmAction(t('forms.confirmRemove', { name: id })))) return
    const rest = Object.fromEntries(divisions.filter(([other]) => other !== id))
    doc.edit('', ['divisions'], Object.keys(rest).length ? rest : undefined)
  }

  const hoursPerDay = $derived(typeof data.hoursPerDay === 'number' ? data.hoursPerDay : 24)
  const minutesPerDay = $derived(hoursPerDay * 60)

  /** Its parts as the calendar reads them (an `every` division's too), for the strip. */
  const partsOf = (id: string, division: Item) =>
    readDivisions({ [id]: division as DivisionDef }, hoursPerDay)[0]?.parts ?? []

  /** A part's name in the UI's language (its translation, if any), else its id. */
  const partName = (division: string, part: { id: string; name?: unknown }) =>
    doc.text('', part.name, ['divisions', division, 'parts', part.id, 'name']) || part.id

  const clock = (m: number) =>
    `${String(Math.floor(m / 60) % hoursPerDay).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

  /** Its parts as stretches of the strip (one past midnight split in two), gaps left out. */
  function stretches(id: string, division: Item) {
    const parts = partsOf(id, division)
    return parts.flatMap((part, i) => {
      const end = part.until ?? parts[i + 1]?.from ?? parts[0].from + minutesPerDay
      const label = `${partName(id, part)} · ${clock(part.from)}–${clock(end)}`
      const piece = (from: number, to: number) => ({ name: partName(id, part), i, from, to, label })
      return end <= minutesPerDay
        ? [piece(part.from, end)]
        : [piece(part.from, minutesPerDay), piece(0, end - minutesPerDay)]
    })
  }

  /** Writes numbered parts of equal length as its rows, replacing the ones it had. */
  async function split(id: string, division: Item) {
    const hours = await ask(
      t('calendar.splitTitle'),
      t('calendar.splitMessage'),
      [1, 2, 3, 4, 6, 8, 12]
        .filter((h) => h < hoursPerDay)
        .map((h) => ({ value: String(h), label: t('calendar.splitHours', { hours: h }) })),
    )
    if (!hours) return
    const next: Item = { ...division, parts: equalParts(Number(hours), hoursPerDay) }
    delete next.every
    doc.edit('', ['divisions', id], next)
  }

  /** An `every` division written as the rows it reads as, to rename or adjust them. */
  function writeRows(id: string, division: Item) {
    const next: Item = { ...division, parts: equalParts(Number(division.every), hoursPerDay) }
    delete next.every
    doc.edit('', ['divisions', id], next)
  }
</script>

<section>
  <h3>{t('calendar.divisions')}<InfoTip text={t('calendar.divisionsHelp')} /></h3>
  {#each divisions as [id, division] (id)}
    {@const numbered = division?.every !== undefined}
    {@const strip = stretches(id, division)}
    <div class="division">
      <div class="inline">
        <label>
          <span>{t('forms.id')}<InfoTip text={t('calendar.divisionIdHelp')} /></span>
          <input
            type="text"
            value={id}
            {disabled}
            onchange={(e) => rename(id, e.currentTarget.value)}
          />
        </label>
        <label class="wide">
          <span>{t('calendar.itemName')}</span>
          <input
            type="text"
            value={doc.text('', division?.name, ['divisions', id, 'name'])}
            placeholder={doc.translating ? doc.baseText(division?.name) : ''}
            {disabled}
            onchange={(e) =>
              doc.setText(
                '',
                ['divisions', id, 'name'],
                division?.name,
                ['divisions', id, 'name'],
                e.currentTarget.value,
              )}
          />
        </label>
        {#if !disabled}
          <button
            class="icon"
            aria-label={t('forms.remove')}
            use:tooltip={t('forms.remove')}
            onclick={() => remove(id)}>×</button
          >
        {/if}
      </div>
      <!-- The day as a strip: each part a stretch in its colour, gaps left blank. -->
      <div class="strip" role="img" aria-label={strip.map((p) => p.label).join(', ')}>
        {#each strip as piece, n (n)}
          <span
            class="stretch"
            style:left={`${(piece.from / minutesPerDay) * 100}%`}
            style:width={`${((piece.to - piece.from) / minutesPerDay) * 100}%`}
            style:--hue={(piece.i * 67) % 360}
            use:tooltip={piece.label}>{piece.name}</span
          >
        {/each}
      </div>
      <div class="hours" aria-hidden="true">
        {#each [0, 6, 12, 18] as h (h)}{#if h < hoursPerDay}<span
              style:left={`${(h / hoursPerDay) * 100}%`}>{String(h).padStart(2, '0')}:00</span
            >{/if}{/each}
      </div>
      {#if numbered}
        <div class="inline">
          <p class="help">{t('calendar.everyNote', { hours: Number(division.every) })}</p>
          {#if !disabled}<button onclick={() => writeRows(id, division)}
              >{t('calendar.writeRows')}</button
            >{/if}
        </div>
      {:else}
        <ListRows
          {doc}
          at={['divisions', id, 'parts']}
          uses={system && {
            of: (part) => usesFor(system, { kind: 'day-part', division: id, id: part }),
            system,
          }}
          idLabel={t('forms.id')}
          idBase="part"
          template={{ from: '12:00' }}
          columns={[
            { field: 'name', label: t('calendar.itemName'), type: 'text' },
            {
              field: 'from',
              label: t('calendar.partFrom'),
              help: t('calendar.partFromHelp'),
              type: 'time',
            },
            {
              field: 'until',
              label: t('calendar.partUntil'),
              help: t('calendar.partUntilHelp'),
              type: 'time',
            },
            {
              field: 'tags',
              label: t('calendar.partTags'),
              help: t('calendar.partTagsHelp'),
              type: 'words',
            },
          ]}
        />
        {#if !disabled}
          <div class="inline">
            <button onclick={() => split(id, division)}>{t('calendar.split')}</button>
            <span class="help"
              >{t('forms.whatItDoes')}<InfoTip text={t('calendar.splitHelp')} /></span
            >
          </div>
        {/if}
      {/if}
    </div>
  {/each}
  {#if !disabled}
    <button class="add" onclick={add}>{t('calendar.addDivision')}</button>
  {/if}
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .division {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    border: 1px solid var(--panel-border);
    border-radius: 6px;
  }

  .inline {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    align-items: end;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  label.wide input {
    width: 16em;
  }

  .add {
    align-self: flex-start;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  /* The day, midnight to midnight: each part a stretch in its own colour. */
  .strip {
    position: relative;
    height: 22px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .stretch {
    position: absolute;
    top: 0;
    bottom: 0;
    overflow: hidden;
    padding: 0 4px;
    font-size: 11px;
    line-height: 20px;
    white-space: nowrap;
    color: var(--text);
    background: hsl(var(--hue) 40% 50% / 0.45);
    border-right: 1px solid var(--panel-border);
  }

  .hours {
    position: relative;
    height: 14px;
    font-size: 10px;
    color: var(--text-muted);
  }

  .hours span {
    position: absolute;
    transform: translateX(-2px);
  }
</style>
