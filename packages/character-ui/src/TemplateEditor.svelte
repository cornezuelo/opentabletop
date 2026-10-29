<script lang="ts">
  import { isMadeOf, type Sheet, type TemplateDef } from '@open-tabletop/character-engine'
  import { InfoTip, SuggestInput, TagInput } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import { idName, sheetText } from './texts'

  /**
   * A template of a bestiary edited as the sheet it is made with: its values (a number or a
   * roll in braces, rolled for each copy), its conditions, tags and items, and what makes it
   * a template: the one it is a variant of, the generator for its names, what becomes of
   * copies left behind and how its token looks. It writes the template as the pack does:
   * what is empty is left out.
   */
  let {
    sheet,
    template,
    locale,
    disabled = false,
    others = [],
    items = [],
    onchange,
  }: {
    sheet: Sheet
    template: TemplateDef
    locale: string
    disabled?: boolean
    /** The other templates of its bestiary, for **Variant of**. */
    others?: readonly string[]
    /** The ids of the items the system's catalogues have, for **Items**. */
    items?: readonly string[]
    onchange: (next: TemplateDef) => void
  } = $props()

  const t = translator(() => locale)
  const label = (value: Parameters<typeof sheetText>[0], id: string) =>
    sheetText(value, locale) ?? idName(id)
  const written = (v: unknown) => (v === undefined ? '' : String(v))
  /** A text players read, in the editor's language (translations come as `{ en, es }`). */
  const shown = (v: Parameters<typeof sheetText>[0]) => sheetText(v, locale) ?? ''
  /** What was typed: a number when it is one, else the roll or variable as written. */
  const read = (text: string): number | string | undefined => {
    const s = text.trim()
    if (!s) return undefined
    return Number.isFinite(Number(s)) ? Number(s) : s
  }
  /** The template with a field set, or left out when empty. */
  function set(key: keyof TemplateDef, value: unknown) {
    const next: Record<string, unknown> = { ...template }
    const empty =
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && !value.length) ||
      (typeof value === 'object' && value !== null && !Object.keys(value).length)
    if (empty) delete next[key]
    else next[key] = value
    onchange(next as TemplateDef)
  }
  const mapWith = (
    current: Record<string, number | string> | undefined,
    id: string,
    text: string,
  ) => {
    const next = { ...current }
    const value = read(text)
    if (value === undefined) delete next[id]
    else next[id] = value
    return next
  }
  const setToken = (key: 'icon' | 'kind' | 'color', value: string) => {
    const token: Record<string, string> = { ...template.token }
    if (value) token[key] = value
    else delete token[key]
    set('token', token)
  }

  /** The sheet's values by group, as the card lists them. */
  const groups = $derived.by(() => {
    const out: { group: string; ids: string[] }[] = []
    for (const [id, v] of Object.entries(sheet.values)) {
      if (isMadeOf(sheet, id)) continue
      const group = v.group ?? ''
      let entry = out.find((g) => g.group === group)
      if (!entry) out.push((entry = { group, ids: [] }))
      entry.ids.push(id)
    }
    return out
  })
  /** The rows of items: those it has, and one empty row to add another. */
  const itemRows = $derived([...Object.keys(template.items ?? {}), ''])
  let adding = $state('')
  let addingCount = $state('1')
</script>

<div class="editor">
  <div class="head">
    <label>
      <span>{t('name')}</span>
      <input
        type="text"
        value={shown(template.name)}
        {disabled}
        onchange={(e) => set('name', e.currentTarget.value.trim())}
      />
    </label>
    <label>
      <span>{t('template.description')}</span>
      <input
        type="text"
        value={shown(template.description)}
        {disabled}
        onchange={(e) => set('description', e.currentTarget.value.trim())}
      />
    </label>
    <label>
      <span>{t('template.like')}<InfoTip markdown={t('template.likeHelp')} /></span>
      <select
        value={template.like ?? ''}
        {disabled}
        onchange={(e) => set('like', e.currentTarget.value)}
      >
        <option value="">—</option>
        {#each others as id (id)}<option value={id}>{id}</option>{/each}
      </select>
    </label>
    <label>
      <span>{t('template.names')}<InfoTip markdown={t('template.namesHelp')} /></span>
      <input
        type="text"
        value={written(template.names)}
        {disabled}
        onchange={(e) => set('names', e.currentTarget.value.trim())}
      />
    </label>
    <label>
      <span>{t('template.behind')}<InfoTip markdown={t('template.behindHelp')} /></span>
      <select
        value={template.behind ?? ''}
        {disabled}
        onchange={(e) => set('behind', e.currentTarget.value)}
      >
        <option value="">—</option>
        <option value="stay">{t('template.stay')}</option>
        <option value="leave">{t('template.leave')}</option>
      </select>
    </label>
  </div>

  <h4>{t('values')}<InfoTip markdown={t('template.valuesHelp')} /></h4>
  {#each groups as { group, ids } (group)}
    <section class="group">
      {#if group}<h5>{label(sheet.groups?.[group]?.name, group)}</h5>{/if}
      <div class="values">
        {#each ids as id (id)}
          <label>
            <span>{label(sheet.values[id].name, id)}</span>
            <input
              type="text"
              value={written(template.values?.[id])}
              placeholder={written(sheet.values[id].default ?? 0)}
              {disabled}
              onchange={(e) => set('values', mapWith(template.values, id, e.currentTarget.value))}
            />
          </label>
        {/each}
      </div>
    </section>
  {/each}

  {#if Object.keys(sheet.conditions).length}
    <h4>{t('conditions')}</h4>
    <div class="conditions">
      {#each Object.entries(sheet.conditions) as [id, c] (id)}
        <label class="check">
          <input
            type="checkbox"
            checked={template.conditions?.includes(id) ?? false}
            {disabled}
            onchange={(e) =>
              set(
                'conditions',
                e.currentTarget.checked
                  ? [...(template.conditions ?? []), id]
                  : (template.conditions ?? []).filter((x) => x !== id),
              )}
          />
          {label(c.name, id)}
        </label>
      {/each}
    </div>
  {/if}

  <h4>{t('tags')}<InfoTip markdown={t('template.tagsHelp')} /></h4>
  <TagInput
    label={t('tags')}
    value={template.tags ?? []}
    placeholder={t('template.tagsPlaceholder')}
    removeLabel={t('removeTag')}
    {disabled}
    onchange={(tags) => set('tags', [...new Set(tags)])}
  />

  <h4>{t('items.title')}<InfoTip markdown={t('template.itemsHelp')} /></h4>
  <div class="items">
    {#each Object.entries(template.items ?? {}) as [id, count] (id)}
      <div class="row">
        <span class="id">{id}</span>
        <input
          type="text"
          aria-label={t('items.count')}
          value={written(count)}
          {disabled}
          onchange={(e) => set('items', mapWith(template.items, id, e.currentTarget.value))}
        />
        <button
          type="button"
          class="plain"
          aria-label={t('items.remove')}
          {disabled}
          onclick={() => set('items', mapWith(template.items, id, ''))}>×</button
        >
      </div>
    {/each}
    {#if !disabled}
      <div class="row">
        <SuggestInput
          label={t('items.add')}
          list={items.filter((i) => !(i in (template.items ?? {})))}
          placeholder={t('items.addPlaceholder')}
          value={adding}
          onchange={(v) => (adding = v)}
        />
        <input type="text" aria-label={t('items.count')} bind:value={addingCount} />
        <button
          type="button"
          disabled={!adding.trim()}
          onclick={() => {
            set('items', mapWith(template.items, adding.trim(), addingCount || '1'))
            adding = ''
            addingCount = '1'
          }}>{t('items.addButton')}</button
        >
      </div>
    {/if}
    {#if itemRows.length === 1 && disabled}<p class="none">{t('items.empty')}</p>{/if}
  </div>

  <h4>{t('template.token')}<InfoTip markdown={t('template.tokenHelp')} /></h4>
  <div class="head">
    <label>
      <span>{t('template.tokenIcon')}</span>
      <input
        type="text"
        value={written(template.token?.icon)}
        {disabled}
        onchange={(e) => setToken('icon', e.currentTarget.value.trim())}
      />
    </label>
    <label>
      <span>{t('template.tokenKind')}</span>
      <select
        value={template.token?.kind ?? ''}
        {disabled}
        onchange={(e) => setToken('kind', e.currentTarget.value)}
      >
        <option value="">—</option>
        {#each ['pc', 'npc', 'enemy'] as k (k)}<option value={k}>{k}</option>{/each}
      </select>
    </label>
    <label>
      <span>{t('template.tokenColor')}</span>
      <input
        type="text"
        value={written(template.token?.color)}
        placeholder="#8b1e1e"
        {disabled}
        onchange={(e) => setToken('color', e.currentTarget.value.trim())}
      />
    </label>
  </div>
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  h4,
  h5 {
    margin: 6px 0 0;
    font-size: 13px;
    font-weight: 600;
  }

  h5 {
    color: var(--text-muted);
    font-weight: 500;
  }

  .head,
  .values {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 8px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .conditions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
  }

  .check {
    flex-direction: row;
    align-items: center;
    gap: 6px;
    color: inherit;
  }

  .items {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .row .id {
    min-width: 120px;
  }

  .row input[type='text'] {
    width: 90px;
  }

  .plain {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
  }

  .none {
    margin: 0;
    color: var(--text-muted);
  }
</style>
