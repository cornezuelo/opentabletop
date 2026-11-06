<script lang="ts">
  import { untrack } from 'svelte'
  import type { TravelSystem } from '@open-tabletop/session'
  import { LAND_STARTS, type LandStart } from '@open-tabletop/pack-ui'
  import { InfoTip, Markdown, MoreMenu } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import { bestiaryOf } from '../../lib/bestiary'
  import { createSystemPart, systemParts, systemRoot, type PartTabKind } from '../../lib/newSystem'
  import { library } from '../../lib/packs.svelte'
  import { partDoc } from '../../lib/partDoc.svelte'
  import { sheetScope } from '../../lib/usage'
  import ReadOnly from '../ReadOnly.svelte'
  import PartForm from './PartForm.svelte'

  /**
   * The definitions of one kind a system uses (its calendar, its weather models, the roll
   * modes of its packs): one at a time, edited in a form; a new one from its template.
   */
  let { system, kind, item }: { system: TravelSystem; kind: PartTabKind; item?: string } = $props()

  const parts = $derived(systemParts(system, kind))
  /** An item asked for in the link (a template of a bestiary): the part that has it, unfolded. */
  let chosen = $state(
    untrack(() =>
      item && kind === 'bestiary'
        ? Math.max(
            0,
            parts.findIndex((p) => item in (bestiaryOf(system, p)?.def.templates ?? {})),
          )
        : 0,
    ),
  )
  const part = $derived(parts[Math.min(chosen, parts.length - 1)] ?? null)
  const doc = partDoc(() => part)
  const root = $derived(systemRoot(system))
  /** Whether a new one can be made here: in the system's own pack, once it's editable. */
  const editable = $derived(!!root && library.isEditable(root))
  const canCreate = $derived(
    editable &&
      (kind === 'sheet'
        ? !system.sheet
        : (kind !== 'calendar' && kind !== 'factions' && kind !== 'clocks' && kind !== 'world') ||
          parts.length === 0),
  )
  /** A sheet for the party itself, beside its characters'. */
  const canCreateParty = $derived(editable && kind === 'sheet' && !system.partySheet)
  /** Whether a sheet is the party's own (`partySheet`), not its characters'. */
  const isParty = (p: { id: string }) =>
    kind === 'sheet' && !!system.partySheet?.id.endsWith(`/${p.id}`)
  /** Whose sheet it is, for its tab: its characters', the party's or the factions'. */
  const sheetTab = (p: { id: string }) =>
    (({ members: 'charactersTab', party: 'partyTab', factions: 'factionsTab' }) as const)[
      sheetScope(system, p.id) ?? 'members'
    ]
  const key = $derived(kind === 'roll-modes' ? 'modes' : kind)

  function create(party = false, land?: LandStart) {
    const id = createSystemPart(system, kind, party, land)
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
          onclick={() => (chosen = i)}
          >{p.root === root ? p.id : `${p.root}/${p.id}`}{kind === 'sheet'
            ? ` · ${t(`parts.sheet.${sheetTab(p)}`)}`
            : ''}</button
        >
      {/each}
    </div>
  {/if}
  {#if part && kind === 'sheet' && parts.length === 1 && isParty(part)}
    <p class="help">{t('parts.sheet.onlyParty')}</p>
  {/if}
  {#if part}
    <p class="file">{part.root}/{part.path} · <code>@{part.kind}/{part.id}</code></p>
    {#if part.root !== root}<ReadOnly root={part.root} dependency />{/if}
    {#key `${part.root}/${part.path}/${part.id}`}
      <PartForm {doc} {system} {kind} id={part.id} {item} />
    {/key}
  {:else}
    <p class="help">{t(`parts.${key}.none`)}</p>
  {/if}
  {#if canCreate && kind === 'land'}
    <MoreMenu label={t('parts.land.create')} align="left">
      {#snippet button()}{t('parts.land.create')} ▾{/snippet}
      {#each Object.keys(LAND_STARTS) as LandStart[] as start (start)}
        <button onclick={() => create(false, start)}>{t(`parts.land.starts.${start}`)}</button>
      {/each}
    </MoreMenu>
  {:else if canCreate}
    <button class="button add" onclick={() => create()}>{t(`parts.${key}.create`)}</button>
  {/if}
  {#if canCreateParty}
    <button class="button add" onclick={() => create(true)}>{t('parts.sheet.createParty')}</button>
  {/if}
</div>

<style>
  .parts {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-bottom: 24px;
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
  }
</style>
