<script lang="ts">
  import { packTexts } from '@open-tabletop/oracle-ui'
  import { contextSuggestions, type TravelSystem } from '@open-tabletop/session'
  import { TripRoom } from '@open-tabletop/travel-ui'
  import { Markdown } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n'
  import { go } from '../lib/nav.svelte'
  import { library, systems } from '../lib/packs.svelte'
  import { trial } from '../lib/trial.svelte'

  /** Try a system while editing it: a trip without a map with its rules as they are now. */
  let { system }: { system: TravelSystem } = $props()

  const texts = packTexts(() => library.registry, getLocale)
  /** Tags the packs' tables and checks look for (landmark, toll, haunted…). */
  const tags = $derived(contextSuggestions(library.registry).tags ?? [])
</script>

<div class="try">
  <div class="intro"><Markdown text={t('try.intro')} /></div>
  <TripRoom
    trip={trial}
    {system}
    systems={systems.list}
    locale={getLocale()}
    {tags}
    nameOf={texts.nameOf}
    onsystem={(id) => go({ name: 'system', id, tab: 'try' })}
  />
</div>

<style>
  .try {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: 24px;
  }

  .intro {
    font-size: 13px;
    color: var(--text-muted);
  }

  .intro :global(p) {
    margin: 0;
  }
</style>
