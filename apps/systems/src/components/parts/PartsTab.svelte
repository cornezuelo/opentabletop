<script lang="ts">
  import { seasonsFor, type TravelSystem } from '@open-tabletop/session'
  import { InfoTip, Markdown } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import { createSystemPart, systemParts, systemRoot, type PartTabKind } from '../../lib/newSystem'
  import { library } from '../../lib/packs.svelte'
  import { partDoc } from '../../lib/partDoc.svelte'
  import ReadOnly from '../ReadOnly.svelte'
  import CalendarForm from './CalendarForm.svelte'
  import RollModesForm from './RollModesForm.svelte'
  import FactionsForm from './FactionsForm.svelte'
  import SheetForm from './SheetForm.svelte'
  import WeatherForm from './WeatherForm.svelte'

  /**
   * The definitions of one kind a system uses (its calendar, its weather models, the roll
   * modes of its packs): one at a time, edited in a form; a new one from its template.
   */
  let { system, kind }: { system: TravelSystem; kind: PartTabKind } = $props()

  const parts = $derived(systemParts(system, kind))
  let chosen = $state(0)
  const part = $derived(parts[Math.min(chosen, parts.length - 1)] ?? null)
  const doc = partDoc(() => part)
  const root = $derived(systemRoot(system))
  /** Whether a new one can be made here: in the system's own pack, once it's editable. */
  const canCreate = $derived(
    !!root &&
      library.isEditable(root) &&
      ((kind !== 'calendar' && kind !== 'sheet' && kind !== 'factions') || parts.length === 0),
  )
  const key = $derived(kind === 'roll-modes' ? 'modes' : kind)

  function create() {
    const id = createSystemPart(system, kind)
    if (id) chosen = systemParts(system, kind).findIndex((p) => p.id === id && p.root === root)
  }
</script>

<div class="parts">
  <h3>{t(`parts.${key}.title`)}<InfoTip text={t(`parts.${key}.help`)} /></h3>
  <div class="intro"><Markdown text={t(`parts.${key}.intro`)} /></div>
  {#if parts.length > 1}
    <div class="choose" role="tablist">
      {#each parts as p, i (`${p.root}/${p.path}/${p.id}`)}
        <button
          role="tab"
          aria-selected={i === chosen}
          class:active={i === chosen}
          onclick={() => (chosen = i)}>{p.root === root ? p.id : `${p.root}/${p.id}`}</button
        >
      {/each}
    </div>
  {/if}
  {#if part}
    <p class="file">{part.root}/{part.path} · <code>@{part.kind}/{part.id}</code></p>
    {#if part.root !== root}<ReadOnly root={part.root} />{/if}
    {#key `${part.root}/${part.path}/${part.id}`}
      {#if kind === 'calendar'}
        <CalendarForm {doc} />
      {:else if kind === 'factions'}
        <FactionsForm {doc} {system} />
      {:else if kind === 'sheet'}
        <SheetForm {doc} {system} />
      {:else if kind === 'weather'}
        <WeatherForm {doc} seasons={seasonsFor(system)} />
      {:else}
        <RollModesForm {doc} />
      {/if}
    {/key}
  {:else}
    <p class="help">{t(`parts.${key}.none`)}</p>
  {/if}
  {#if canCreate}
    <button class="add" onclick={create}>{t(`parts.${key}.create`)}</button>
  {/if}
</div>

<style>
  .parts {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-bottom: 24px;
  }

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .intro,
  .help {
    margin: 0;
    max-width: 760px;
    color: var(--text-muted);
  }

  .intro :global(p) {
    margin: 0;
  }

  .file {
    margin: 0;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    color: var(--text-muted);
  }

  .choose {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .choose button {
    padding: 3px 10px;
    font-size: 12px;
    color: var(--text-muted);
    background: none;
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .choose button.active {
    color: var(--text);
    border-color: var(--accent);
  }

  .add {
    align-self: flex-start;
    padding: 5px 12px;
    font-size: 13px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }
</style>
