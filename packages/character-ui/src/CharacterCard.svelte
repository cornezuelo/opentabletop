<script lang="ts">
  import {
    applyCharacter,
    boundsOf,
    type CharacterAction,
    type CharacterState,
    type Sheet,
  } from '@open-tabletop/character-engine'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import { knownName, sheetText } from './texts'

  /**
   * One character made from a sheet, edited by hand: its name, its values (tracks as
   * boxes, grouped as the sheet says), its conditions and its tags. Changes go through the
   * character engine, so they keep the sheet's bounds. It knows nothing of trips: the host
   * says what a change means (`onchange`) and how tables read the character (`path`).
   */
  let {
    sheet,
    character,
    locale,
    disabled = false,
    path,
    time,
    names = (id) => id,
    onchange,
  }: {
    sheet: Sheet
    character: CharacterState
    locale: string
    disabled?: boolean
    /** How tables and conditions reach this character (default `characters.<id>`). */
    path?: string
    /** Game time, for when a condition began. */
    time?: number
    /** Names of what a condition blocks (an action, `travel`, `mode.horse`), in words. */
    names?: (id: string) => string
    onchange: (next: CharacterState) => void
  } = $props()

  const t = translator(() => locale)
  const where = $derived(path ?? `characters.${character.id}`)
  /** A sheet's text; without one, the package's name for a known id, else the id. */
  const text = (value: Parameters<typeof sheetText>[0], fallback = '') =>
    sheetText(value, locale) ?? (fallback ? knownName(fallback, locale) : '')

  /** The values by group, those without one first, in the sheet's order. */
  const groups = $derived.by(() => {
    const out: { group: string; ids: string[] }[] = []
    for (const [id, v] of Object.entries(sheet.values)) {
      const group = v.group ?? ''
      let entry = out.find((g) => g.group === group)
      if (!entry) out.push((entry = { group, ids: [] }))
      entry.ids.push(id)
    }
    // Those without a group first, then in the order the sheet lists its groups.
    const order = Object.keys(sheet.groups ?? {})
    const rank = (g: string) =>
      g === '' ? -1 : order.includes(g) ? order.indexOf(g) : order.length
    return out.sort((a, b) => rank(a.group) - rank(b.group))
  })

  function change(action: CharacterAction) {
    onchange(applyCharacter(sheet, character, action).state)
  }
  const setValue = (id: string, value: number) =>
    change({ type: 'change', effects: { [`values.${id}`]: `=${value}` } })
  const setCondition = (id: string, on: boolean) =>
    change({
      type: 'change',
      effects: { [`conditions.${id}`]: on },
      ...(time !== undefined && { time }),
    })
  function setTags(raw: string) {
    const tags = [
      ...new Set(
        raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ]
    onchange({ ...character, tags })
  }

  /** A value's explanation: its description, its bounds, how tables read it. */
  function valueHelp(id: string): string {
    const def = sheet.values[id]
    const bounds = boundsOf(sheet, character, id)
    return [
      text(def.description),
      bounds.min !== undefined && t('min', { min: bounds.min }),
      bounds.max !== undefined && t('max', { max: bounds.max }),
      t('readAs', { keys: `\`${where}.values.${id}\`` }),
    ]
      .filter(Boolean)
      .join('\n\n')
  }
  function conditionHelp(id: string): string {
    const def = sheet.conditions[id]
    return [
      text(def.description),
      def.blocks?.length && t('blocks', { list: def.blocks.map(names).join(', ') }),
      t('readAs', { keys: `\`${where}.conditions: ${id}\`` }),
    ]
      .filter(Boolean)
      .join('\n\n')
  }
</script>

<div class="card">
  <label class="field name">
    <span>{t('name')}</span>
    <input
      type="text"
      value={character.name ?? ''}
      placeholder={character.id}
      {disabled}
      onchange={(e) => onchange({ ...character, name: e.currentTarget.value.trim() || undefined })}
    />
  </label>

  {#each groups as { group, ids } (group)}
    {#if group}<h4>{text(sheet.groups?.[group]?.name, group)}</h4>{/if}
    <div class="values">
      {#each ids as id (id)}
        {@const def = sheet.values[id]}
        {@const value = character.values[id] ?? 0}
        {#if def.track && typeof def.max === 'number'}
          <div class="field track">
            <span>{text(def.name, id)}<InfoTip markdown={valueHelp(id)} /></span>
            <div class="boxes" role="group" aria-label={text(def.name, id)}>
              {#each Array.from({ length: def.max }, (_, i) => i + 1) as box (box)}
                <button
                  type="button"
                  class:on={box <= value}
                  aria-label={t('box', { value: box, max: def.max })}
                  aria-pressed={box <= value}
                  {disabled}
                  onclick={() => setValue(id, box === value ? box - 1 : box)}
                ></button>
              {/each}
            </div>
          </div>
        {:else}
          <label class="field">
            <span>{text(def.name, id)}<InfoTip markdown={valueHelp(id)} /></span>
            <input
              type="number"
              step="any"
              {value}
              {disabled}
              onchange={(e) => setValue(id, Number(e.currentTarget.value) || 0)}
            />
          </label>
        {/if}
      {/each}
    </div>
  {/each}

  {#if Object.keys(sheet.conditions).length}
    <div class="field">
      <span>{t('conditions')}</span>
      <div class="conditions">
        {#each Object.keys(sheet.conditions) as id (id)}
          <label class="condition" class:on={id in character.conditions}>
            <input
              type="checkbox"
              checked={id in character.conditions}
              {disabled}
              onchange={(e) => setCondition(id, e.currentTarget.checked)}
            />
            <span
              >{text(sheet.conditions[id].name, id)}<InfoTip markdown={conditionHelp(id)} /></span
            >
          </label>
        {/each}
      </div>
    </div>
  {/if}

  <label class="field">
    <span>{t('tags')}<InfoTip markdown={t('tagsHelp')} /></span>
    <input
      type="text"
      value={character.tags.join(', ')}
      placeholder={t('tagsPlaceholder')}
      {disabled}
      onchange={(e) => setTags(e.currentTarget.value)}
    />
  </label>
</div>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .field input[type='text'],
  .field input[type='number'] {
    width: 100%;
    min-width: 0;
  }

  h4 {
    margin: 2px 0 0;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .values {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    align-items: end;
    gap: 6px;
  }

  .track {
    grid-column: 1 / -1;
  }

  .boxes {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .boxes button {
    width: 16px;
    height: 16px;
    padding: 0;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 3px;
    cursor: pointer;
  }

  .boxes button.on {
    background: var(--accent);
    border-color: var(--accent);
  }

  .boxes button:disabled {
    cursor: default;
  }

  .conditions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
  }

  .condition {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text);
  }

  .condition.on span {
    color: var(--accent);
  }
</style>
