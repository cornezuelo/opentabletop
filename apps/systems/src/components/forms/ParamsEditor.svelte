<script lang="ts">
  import { showToast, SuggestInput, TagInput, tooltip } from '@open-tabletop/ui-kit'
  import { freeId } from '@open-tabletop/pack-ui/yaml'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import { t } from '../../lib/i18n'
  import type { SystemDoc } from '../../lib/systemDoc.svelte'

  /**
   * An action's parameters as rows: each one's id, its name, its choices as pills (the first
   * is the default unless `default` says another, so they can be dragged into order) and its
   * default; the whole as YAML one click away, for what rows don't show (a choice's name).
   */
  let {
    doc,
    action,
    disabled = false,
  }: { doc: SystemDoc; action: string; disabled?: boolean } = $props()

  type Raw = Record<string, unknown>
  type Choice = string | number | { id: string | number; name?: unknown }
  const at = $derived(['actions', action, 'params'])
  const params = $derived(
    (((doc.rules.actions ?? {}) as Record<string, Raw>)[action]?.params ?? {}) as Record<
      string,
      Raw
    >,
  )
  const ids = $derived(Object.keys(params))
  let yaml = $state(false)

  const idOf = (c: Choice) => String(typeof c === 'object' ? c.id : c)
  const choicesOf = (p: string) => (params[p]?.choices ?? []) as Choice[]
  /** A choice typed as it reads: `3` a number, anything else a word. */
  const typed = (text: string): string | number =>
    /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text

  function setChoices(p: string, items: string[]) {
    if (!items.length) return showToast(t('actions.paramNeedsChoice'), 'error')
    // Choices written with a name keep it.
    const old = new Map(choicesOf(p).map((c) => [idOf(c), c]))
    doc.edit(
      'travel-rules',
      [...at, p, 'choices'],
      items.map((i) => old.get(i) ?? typed(i)),
    )
    const fallback = params[p]?.default
    if (fallback !== undefined && !items.includes(String(fallback)))
      doc.edit('travel-rules', [...at, p, 'default'], undefined)
  }

  function rename(p: string, next: string) {
    const to = next.trim()
    if (!to || to === p) return
    if (to in params) return showToast(t('forms.idExists', { id: to }), 'error')
    doc.rename('travel-rules', at, p, to)
  }

  function add() {
    const id = freeId('choice', ids)
    doc.edit('travel-rules', [...at, id], { choices: ['yes', 'no'] })
  }

  function remove(p: string) {
    doc.edit('travel-rules', ids.length > 1 ? [...at, p] : at, undefined)
  }

  function setYaml(value: string) {
    const parsed = parseFlow(value)
    if (parsed === null) return showToast(t('forms.badFlow'), 'error')
    doc.edit('travel-rules', at, Object.keys(parsed ?? {}).length ? parsed : undefined)
  }
  const bare = (v: unknown) => flowText(v).replace(/^\{\s*|\s*\}$/g, '')
</script>

<div class="params">
  {#if yaml}
    <SuggestInput
      label={t('actions.params')}
      placeholder={t('actions.noParams')}
      value={bare(params)}
      {disabled}
      onchange={setYaml}
    />
  {:else}
    {#each ids as p (p)}
      {@const choices = choicesOf(p)}
      <div class="param">
        <input
          class="id"
          type="text"
          value={p}
          {disabled}
          aria-label={t('forms.id')}
          onchange={(e) => rename(p, e.currentTarget.value)}
        />
        <input
          type="text"
          placeholder={doc.translating ? doc.baseText(params[p]?.name) : t('actions.paramName')}
          value={doc.text('travel-rules', params[p]?.name, [...at, p, 'name'])}
          {disabled}
          aria-label={t('actions.paramName')}
          onchange={(e) =>
            doc.setText(
              'travel-rules',
              [...at, p, 'name'],
              params[p]?.name,
              [...at, p, 'name'],
              e.currentTarget.value,
            )}
        />
        <TagInput
          label={t('actions.paramChoices')}
          removeLabel={t('forms.removeItem')}
          value={choices.map(idOf)}
          reorder
          {disabled}
          onchange={(items) => setChoices(p, items)}
        />
        <select
          aria-label={t('actions.paramDefault')}
          value={params[p]?.default === undefined ? '' : String(params[p].default)}
          {disabled}
          onchange={(e) =>
            doc.edit(
              'travel-rules',
              [...at, p, 'default'],
              e.currentTarget.value === '' ? undefined : typed(e.currentTarget.value),
            )}
        >
          <option value="">{t('actions.paramFirst')}</option>
          {#each choices as c (idOf(c))}<option value={idOf(c)}>{idOf(c)}</option>{/each}
        </select>
        {#if !disabled}
          <button
            class="icon"
            aria-label={t('forms.remove')}
            use:tooltip={t('forms.remove')}
            onclick={() => remove(p)}>×</button
          >
        {/if}
      </div>
    {:else}
      <span class="none">{t('actions.noParams')}</span>
    {/each}
  {/if}
  <div class="tools">
    {#if !disabled && !yaml}<button class="link" onclick={add}>{t('actions.addParam')}</button>{/if}
    <button class="link" aria-pressed={yaml} onclick={() => (yaml = !yaml)}
      >{yaml ? t('actions.paramsRows') : 'YAML'}</button
    >
  </div>
</div>

<style>
  .params {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .param {
    display: grid;
    grid-template-columns: minmax(4em, 7em) minmax(6em, 1fr) minmax(8em, 2fr) minmax(5em, 8em) auto;
    gap: 4px;
    align-items: start;
  }

  .id {
    font-family: ui-monospace, monospace;
  }

  .none {
    font-size: 12px;
    color: var(--text-muted);
  }

  .tools {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .link {
    padding: 0;
    font: inherit;
    font-size: 11px;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }

  @media (width <= 700px) {
    .param {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
