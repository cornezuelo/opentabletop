<script lang="ts">
  import { writeRef } from '@open-tabletop/oracle-engine'
  import { ConditionEditor } from '@open-tabletop/pack-ui'
  import { contextSuggestions, definitionId } from '@open-tabletop/session'
  import type { DefinitionForm } from './doc.svelte'

  /**
   * The roll modes a roll can use (its pack's and its dependencies'), each offered by hand
   * (`modes`, with `offer`) and/or applied by itself on a condition (`modeWhen` /
   * `modeUnless`): a table's or an oracle's whole roll (`path` []), or a generator's rolled
   * field alone (`path` ['fields', name], never offered by hand).
   */
  let {
    doc,
    path = [],
    raw,
    offer = false,
  }: {
    doc: DefinitionForm
    path?: string[]
    /** What holds the modes: the definition's YAML, or the field's. */
    raw: Record<string, unknown>
    offer?: boolean
  } = $props()
  const t = (key: 'edit.modeWhen' | 'edit.modeUnless' | 'edit.noModes') => doc.ui.t(key)
  const pack = $derived(doc.def.pack)

  const available = $derived.by(() => {
    const deps = doc.ui.library.registry.packs.get(pack)?.dependencies ?? []
    return [...doc.ui.library.registry.rollModes.values()]
      .filter((m) => m.pack === pack || deps.includes(m.pack))
      .map((m) => ({
        mode: m,
        ref: writeRef('roll-modes', m.localId, m.pack === pack ? undefined : m.pack),
      }))
  })
  const refsOf = (value: unknown) => (Array.isArray(value) ? value.map(String) : [])
  const whenOf = (value: unknown) =>
    (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const resolves = (ref: string, id: string) => definitionId(ref, pack) === id
  const offered = (id: string) => refsOf(raw.modes).some((r) => resolves(r, id))
  type ModeKey = 'modeWhen' | 'modeUnless'
  const conditionFor = (key: ModeKey, id: string) =>
    Object.entries(whenOf(raw[key])).find(([r]) => resolves(r, id))?.[1]

  function setOffered(id: string, ref: string, on: boolean) {
    const rest = refsOf(raw.modes).filter((r) => !resolves(r, id))
    const modes = on ? [...rest, ref] : rest
    doc.edit([...path, 'modes'], modes.length ? modes : undefined)
    if (raw.advantage !== undefined) doc.edit([...path, 'advantage'], undefined)
  }

  /** What a mode's condition can read. */
  const conditionHints = $derived(contextSuggestions(doc.ui.library.registry))
  /** A mode's condition, built as rows; none removes it. */
  function setCondition(key: ModeKey, id: string, ref: string, value: unknown) {
    const rest = Object.fromEntries(
      Object.entries(whenOf(raw[key])).filter(([r]) => !resolves(r, id)),
    )
    const next = value === undefined ? rest : { ...rest, [ref]: value }
    doc.edit([...path, key], Object.keys(next).length ? next : undefined)
  }
</script>

{#if !available.length}
  <p class="help">{t('edit.noModes')}</p>
{/if}
<div class="modes">
  {#each available as { mode, ref } (mode.id)}
    {#if offer}
      <label class="check">
        <input
          type="checkbox"
          checked={offered(mode.id)}
          disabled={doc.translating}
          onchange={(e) => setOffered(mode.id, ref, e.currentTarget.checked)}
        />
        {doc.ui.modeName(mode)}
      </label>
    {:else}
      <span class="name">{doc.ui.modeName(mode)}</span>
    {/if}
    {#each ['modeWhen', 'modeUnless'] as const as key (key)}
      <div class="when">
        <span>{t(`edit.${key}`)}</span>
        <ConditionEditor
          value={conditionFor(key, mode.id)}
          suggestions={conditionHints}
          locale={doc.ui.locale()}
          disabled={doc.translating}
          label={t(`edit.${key}`)}
          onchange={(c) => setCondition(key, mode.id, ref, c)}
        />
      </div>
    {/each}
  {/each}
</div>

<style>
  /* Each mode on a line: its name (offered by hand, a checkbox), then its two conditions. */
  .modes {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
    gap: 8px 16px;
  }

  .check,
  .name {
    display: flex;
    gap: 6px;
    align-items: center;
    padding-top: 18px;
    color: var(--text-muted);
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .when {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
