<script lang="ts">
  import type { Registry } from '@open-tabletop/oracle-engine'
  import type { TravelSystem, Use } from '@open-tabletop/session'
  import { translator } from './i18n'
  import { shownPlace, systemTabUrl, type SystemTab } from './usePlace'

  /**
   * The places that use something, one line each: how, where (its name, what it is, the part
   * of it) and a link to where it's edited. A place in a system's tab opens it with `ontab`
   * (Systems), or links to it in Systems.
   */
  let {
    uses,
    system,
    registry,
    locale,
    ontab,
  }: {
    uses: Use[]
    system: TravelSystem
    registry: Registry
    locale: string
    ontab?: (tab: SystemTab) => void
  } = $props()

  const t = translator(() => locale)
  const lines = $derived(
    uses.map((use) => ({ use, place: shownPlace(system, use, registry, locale) })),
  )
</script>

{#if lines.length}
  <ul class="uses">
    {#each lines as { use, place }, i (i)}
      <li>
        <span class="how">{t(`uses.how.${use.how}`)}</span>
        {#if place.href}
          <a href={place.href}>{place.name} ↗</a>
        {:else if place.tab && ontab}
          <button class="link" onclick={() => ontab(place.tab!)}>{place.name}</button>
        {:else if place.tab}
          <a href={systemTabUrl(system, place.tab)}>{place.name} ↗</a>
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
