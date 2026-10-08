<script lang="ts">
  import { packTexts } from '@open-tabletop/oracle-ui'
  import { contextSuggestions, systemName } from '@open-tabletop/session'
  import { TripRoom } from '@open-tabletop/travel-ui'
  import { appUrl } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { library, systems } from '../lib/packs.svelte'
  import { trip } from '../lib/trip.svelte'

  /** One system: a trip with it. Its rules are edited in the Systems app. */
  let { id }: { id: string } = $props()

  const system = $derived(systems.get(id))
  const texts = packTexts(() => library.registry, getLocale)
  /** Tags the packs' tables and checks look for (landmark, toll, haunted…). */
  const tags = $derived(contextSuggestions(library.registry).tags ?? [])
</script>

{#if system}
  <article class="system">
    <header>
      <h1>{system.id === 'generic' ? t('nav.generic') : systemName(system, getLocale())}</h1>
      <a class="edit" href={`${appUrl('systems')}#/system/${encodeURIComponent(id)}/rules`}
        >{t('nav.editInSystems')}</a
      >
    </header>
    <div class="body">
      <TripRoom
        {trip}
        {system}
        systems={systems.list}
        locale={getLocale()}
        {tags}
        nameOf={texts.nameOf}
        onsystem={(other) => go({ name: 'system', id: other })}
      />
    </div>
  </article>
{:else}
  <p class="help">{id}?</p>
{/if}

<style>
  .system {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    min-height: 0;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    align-items: baseline;
  }

  h1 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: 24px;
    font-weight: normal;
  }

  .edit {
    font-size: 13px;
    color: var(--accent);
  }

  .body {
    flex: 1;
    min-height: 0;
  }

  .help {
    margin: 6px 0 0;
    color: var(--text-muted);
  }
</style>
