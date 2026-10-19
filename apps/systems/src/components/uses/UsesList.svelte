<script lang="ts">
  import type { TravelSystem, Use } from '@open-tabletop/session'
  import { t } from '../../lib/i18n'
  import { go } from '../../lib/nav.svelte'
  import { shownPlace } from '../../lib/usage'

  /** The places that use a name, one line each, with a link to where each is edited. */
  let { uses, system }: { uses: Use[]; system: TravelSystem } = $props()

  const lines = $derived(uses.map((use) => ({ use, place: shownPlace(system, use) })))
</script>

{#if lines.length}
  <ul class="uses">
    {#each lines as { use, place }, i (i)}
      <li>
        <span class="how">{t(`uses.how.${use.how}`)}</span>
        {#if place.href}
          <a href={place.href}>{place.name} ↗</a>
        {:else if place.tab}
          <button
            class="link"
            onclick={() => go({ name: 'system', id: system.id, tab: place.tab! })}
            >{place.name}</button
          >
        {:else}<span>{place.name}</span>{/if}
        <small>{t(`uses.kinds.${place.kind}`)}</small>
        {#if place.part}<code>{place.part}</code>{/if}
        {#if use.written !== use.name}<small class="as">{t('uses.as', { name: use.written })}</small
          >{/if}
      </li>
    {/each}
  </ul>
{:else}
  <p class="help">{t('uses.none')}</p>
{/if}

<style>
  .uses {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 12px;
  }

  li {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: baseline;
  }

  .how {
    min-width: 7em;
    color: var(--text-muted);
  }

  small {
    color: var(--text-muted);
  }

  code {
    font-size: 11px;
  }

  .link {
    padding: 0;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
