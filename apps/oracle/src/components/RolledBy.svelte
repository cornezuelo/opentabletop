<script lang="ts">
  import type { Compiled } from '@open-tabletop/oracle-engine'
  import { rolledBy, UsesList } from '@open-tabletop/oracle-ui'
  import { systemName, type TravelSystem, type Use } from '@open-tabletop/session'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n'
  import { workspace } from '../lib/packs/workspace.svelte'

  /** Who rolls a definition: the places in the systems that bring its pack, folded. */
  let { def }: { def: Compiled } = $props()

  let open = $state(false)
  const found = $derived(rolledBy(workspace.registry, def))
  /** By system, in the order they come. */
  const bySystem = $derived.by(() => {
    const groups: { system: TravelSystem; uses: Use[] }[] = []
    for (const { system, use } of found) {
      const group = groups.find((g) => g.system.id === system.id)
      if (group) group.uses.push(use)
      else groups.push({ system, uses: [use] })
    }
    return groups
  })
</script>

<div class="rolled">
  <span class="label">{t('rolledBy.title')}<InfoTip text={t('rolledBy.help')} /></span>
  {#if found.length}
    <button class="link" aria-expanded={open} onclick={() => (open = !open)}
      >{t('rolledBy.count', { n: found.length })} {open ? '▴' : '▾'}</button
    >
  {:else}
    <span class="none">{t('rolledBy.none')}</span>
  {/if}
</div>
{#if open}
  {#each bySystem as { system, uses } (system.id)}
    {#if bySystem.length > 1}<h4>{systemName(system, getLocale())}</h4>{/if}
    <UsesList {uses} {system} registry={workspace.registry} locale={getLocale()} />
  {/each}
{/if}

<style>
  .rolled {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: baseline;
    font-size: 12px;
  }

  .label,
  .none {
    color: var(--text-muted);
  }

  .link {
    padding: 0;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }

  h4 {
    margin: 6px 0 2px;
    font-size: 12px;
  }
</style>
