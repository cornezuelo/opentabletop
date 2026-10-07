<script lang="ts">
  import type { Compiled } from '@open-tabletop/oracle-engine'
  import { flowText, parseFlow } from '@open-tabletop/pack-ui/flow'
  import { contextSuggestions } from '@open-tabletop/session'
  import { InfoTip, SuggestInput } from '@open-tabletop/ui-kit'
  import { oracleUi } from '../../lib/oracle'
  import { workspace } from '../../lib/packs/workspace.svelte'
  import { t } from '../../lib/i18n'
  import { definitionDoc } from '../../lib/packs/doc.svelte'
  import DeckEditor from './DeckEditor.svelte'
  import EntriesEditor from './EntriesEditor.svelte'
  import GeneratorEditor from './GeneratorEditor.svelte'
  import OracleEditor from './OracleEditor.svelte'
  import TextField from './TextField.svelte'

  /** Form editor of any definition: common texts and language, then its kind's form. */
  let { def, root }: { def: Compiled; root: string } = $props()

  const doc = definitionDoc(() => ({ def, root }))
  const dice = $derived(def.kind === 'table' || def.kind === 'oracle')

  /**
   * The roll modes this definition can use (its pack's and its dependencies'), each offered
   * by hand (`modes`) and/or applied by itself on a condition (`modeWhen`).
   */
  const available = $derived.by(() => {
    const deps = workspace.registry.packs.get(def.pack)?.dependencies ?? []
    return [...workspace.registry.rollModes.values()]
      .filter((m) => m.pack === def.pack || deps.includes(m.pack))
      .map((m) => ({ mode: m, ref: m.pack === def.pack ? m.localId : m.id }))
  })
  const refsOf = (value: unknown) => (Array.isArray(value) ? value.map(String) : [])
  const whenOf = (value: unknown) =>
    (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const resolves = (ref: string, id: string) => ref === id || `${def.pack}/${ref}` === id
  const offered = (id: string) => refsOf(doc.raw.modes).some((r) => resolves(r, id))
  const whenFor = (id: string) =>
    Object.entries(whenOf(doc.raw.modeWhen)).find(([r]) => resolves(r, id))?.[1]

  function setOffered(id: string, ref: string, on: boolean) {
    const rest = refsOf(doc.raw.modes).filter((r) => !resolves(r, id))
    const modes = on ? [...rest, ref] : rest
    doc.edit(['modes'], modes.length ? modes : undefined)
    if (doc.raw.advantage !== undefined) doc.edit(['advantage'], undefined)
  }

  /** A mode's condition, typed as one line: saved when it reads as a map, flagged if not. */
  const conditionHints = $derived(contextSuggestions(workspace.registry))
  let invalid = $state<Record<string, boolean>>({})
  function setWhen(id: string, ref: string, text: string) {
    const value = text.trim() ? parseFlow(text) : undefined
    invalid = { ...invalid, [id]: value === null }
    if (value === null) return
    const rest = Object.fromEntries(
      Object.entries(whenOf(doc.raw.modeWhen)).filter(([r]) => !resolves(r, id)),
    )
    const next = value === undefined ? rest : { ...rest, [ref]: value }
    doc.edit(['modeWhen'], Object.keys(next).length ? next : undefined)
  }
  const conditionText = (value: unknown) =>
    value === undefined ? '' : flowText(value).replace(/^\{\s*|\s*\}$/g, '')
</script>

<div class="editor">
  <div class="top">
    <label class="field grow">
      <span>{t('edit.name')}</span>
      <TextField {doc} path={['name']} />
    </label>
    {#if dice}
      <label class="field dice">
        <span>{t('edit.roll')}<InfoTip text={t('edit.rollHelp')} /></span>
        <input
          type="text"
          value={doc.raw.roll ?? ''}
          disabled={doc.translating}
          onchange={(e) => doc.edit(['roll'], e.currentTarget.value.trim())}
        />
      </label>
    {/if}
    <label class="field lang">
      <span>{t('edit.language')}<InfoTip text={t('edit.translationHelp')} /></span>
      <select bind:value={doc.language}>
        <option value="">{t('edit.baseLanguage', { locale: doc.baseLocale })}</option>
        {#each doc.locales as l (l)}
          <option value={l}>{l}</option>
        {/each}
      </select>
    </label>
  </div>
  <label class="field">
    <span>{t('edit.description')}</span>
    <TextField {doc} path={['description']} multiline />
  </label>
  {#if dice}
    <div class="options">
      <label class="check">
        <input
          type="checkbox"
          checked={doc.raw.clamp !== false}
          disabled={doc.translating}
          onchange={(e) => doc.edit(['clamp'], e.currentTarget.checked ? undefined : false)}
        />
        {t('edit.clamp')}<InfoTip text={t('edit.clampHelp')} />
      </label>
      <label class="check">
        {t('edit.onExhausted')}<InfoTip text={t('edit.onExhaustedHelp')} />
        <select
          value={doc.raw.onExhausted ?? 'reroll'}
          disabled={doc.translating}
          onchange={(e) =>
            doc.edit(
              ['onExhausted'],
              e.currentTarget.value === 'reroll' ? undefined : e.currentTarget.value,
            )}
        >
          {#each ['reroll', 'next', 'none'] as const as policy (policy)}
            <option value={policy}>{t(`edit.exhausted.${policy}`)}</option>
          {/each}
        </select>
      </label>
    </div>
    <div class="field">
      <span>{t('edit.modes')}<InfoTip text={t('edit.modesHelp')} /></span>
      {#if available.length}
        <div class="modes">
          {#each available as { mode, ref } (mode.id)}
            <label class="check">
              <input
                type="checkbox"
                checked={offered(mode.id)}
                disabled={doc.translating}
                onchange={(e) => setOffered(mode.id, ref, e.currentTarget.checked)}
              />
              {oracleUi.modeName(mode)}
            </label>
            <label class="when">
              <span>{t('edit.modeWhen')}</span>
              <SuggestInput
                value={conditionText(whenFor(mode.id))}
                suggestions={conditionHints}
                placeholder={'explorer: { gte: 1 }'}
                invalid={invalid[mode.id]}
                disabled={doc.translating}
                onchange={(text) => setWhen(mode.id, ref, text)}
              />
            </label>
            {#if invalid[mode.id]}<small>{t('edit.notAMap')}</small>{:else}<span></span>{/if}
          {/each}
        </div>
      {:else}
        <p class="help">{t('edit.noModes')}</p>
      {/if}
    </div>
  {/if}

  {#if def.kind === 'table'}
    <EntriesEditor {doc} path={['entries']} rollPath={['roll']} />
  {:else if def.kind === 'oracle'}
    <OracleEditor {doc} />
  {:else if def.kind === 'generator'}
    <GeneratorEditor {doc} />
  {:else}
    <DeckEditor {doc} />
  {/if}
</div>

<style>
  .modes {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 6px 12px;
  }

  .modes .when {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .modes small {
    color: #e3a19f;
  }

  .editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .top {
    display: flex;
    gap: 10px;
  }

  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
  }

  .check {
    display: flex;
    gap: 6px;
    align-items: center;
    color: var(--text-muted);
  }

  .grow {
    flex: 1;
  }

  .dice {
    width: 160px;
  }

  .lang {
    width: 140px;
  }

  .editor :global(.section-title) {
    display: flex;
    gap: 8px;
    align-items: baseline;
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--accent);
  }

  .editor :global(.add-row) {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .editor :global(.add-row button),
  .editor :global(button.plain) {
    padding: 6px 12px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .editor :global(.note) {
    font-size: 11px;
    color: #d8c58a;
  }
</style>
