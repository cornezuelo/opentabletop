<script lang="ts">
  import { writeRef, type Compiled } from '@open-tabletop/oracle-engine'
  import { ConditionEditor } from '@open-tabletop/pack-ui'
  import { contextSuggestions, definitionId } from '@open-tabletop/session'
  import { InfoTip, TagInput } from '@open-tabletop/ui-kit'
  import { oracleUi } from '../../lib/oracle.svelte'
  import { workspace } from '../../lib/packs/workspace.svelte'
  import { getLocale, t } from '../../lib/i18n'
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
   * by hand (`modes`) and/or applied by itself on a condition (`modeWhen` / `modeUnless`).
   */
  const available = $derived.by(() => {
    const deps = workspace.registry.packs.get(def.pack)?.dependencies ?? []
    return [...workspace.registry.rollModes.values()]
      .filter((m) => m.pack === def.pack || deps.includes(m.pack))
      .map((m) => ({
        mode: m,
        ref: writeRef('roll-modes', m.localId, m.pack === def.pack ? undefined : m.pack),
      }))
  })
  const refsOf = (value: unknown) => (Array.isArray(value) ? value.map(String) : [])
  const whenOf = (value: unknown) =>
    (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const resolves = (ref: string, id: string) => definitionId(ref, def.pack) === id
  const offered = (id: string) => refsOf(doc.raw.modes).some((r) => resolves(r, id))
  type ModeKey = 'modeWhen' | 'modeUnless'
  const conditionFor = (key: ModeKey, id: string) =>
    Object.entries(whenOf(doc.raw[key])).find(([r]) => resolves(r, id))?.[1]

  function setOffered(id: string, ref: string, on: boolean) {
    const rest = refsOf(doc.raw.modes).filter((r) => !resolves(r, id))
    const modes = on ? [...rest, ref] : rest
    doc.edit(['modes'], modes.length ? modes : undefined)
    if (doc.raw.advantage !== undefined) doc.edit(['advantage'], undefined)
  }

  /** Tags other definitions already have, to suggest. */
  const knownTags = $derived([
    ...new Set([...workspace.registry.definitions.values()].flatMap((d) => d.tags)),
  ])

  /** What a mode's condition can read. */
  const conditionHints = $derived(contextSuggestions(workspace.registry))
  /** A mode's condition, built as rows; none removes it. */
  function setCondition(key: ModeKey, id: string, ref: string, value: unknown) {
    const rest = Object.fromEntries(
      Object.entries(whenOf(doc.raw[key])).filter(([r]) => !resolves(r, id)),
    )
    const next = value === undefined ? rest : { ...rest, [ref]: value }
    doc.edit([key], Object.keys(next).length ? next : undefined)
  }
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
  <div class="field">
    <span>{t('edit.tags')}<InfoTip text={t('edit.tagsHelp')} /></span>
    <TagInput
      value={Array.isArray(doc.raw.tags) ? doc.raw.tags.map(String) : []}
      choices={knownTags}
      disabled={doc.translating}
      label={t('edit.tags')}
      removeLabel={t('edit.removeTag')}
      onchange={(tags) => doc.edit(['tags'], tags.length ? tags : undefined)}
    />
  </div>
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
            {#each ['modeWhen', 'modeUnless'] as const as key (key)}
              <div class="when">
                <span>{t(`edit.${key}`)}</span>
                <ConditionEditor
                  value={conditionFor(key, mode.id)}
                  suggestions={conditionHints}
                  locale={getLocale()}
                  disabled={doc.translating}
                  label={t(`edit.${key}`)}
                  onchange={(c) => setCondition(key, mode.id, ref, c)}
                />
              </div>
            {/each}
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
  /* Each mode on a line: offered by hand, then its two conditions as rows. */
  .modes {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
    gap: 8px 16px;
  }

  .modes .check {
    padding-top: 18px;
  }

  .modes .when {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    font-size: 12px;
    color: var(--text-muted);
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
