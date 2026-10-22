<script lang="ts">
  import { UsesList } from '@open-tabletop/oracle-ui'
  import type { TravelSystem, Use } from '@open-tabletop/session'
  import { getLocale } from '../../lib/i18n'
  import { go } from '../../lib/nav.svelte'
  import { library } from '../../lib/packs.svelte'

  /** The places that use a name (oracle-ui's list), each linking to its tab here. */
  let { uses, system }: { uses: Use[]; system: TravelSystem } = $props()
</script>

<UsesList
  {uses}
  {system}
  registry={library.registry}
  locale={getLocale()}
  ontab={(tab) => go({ name: 'system', id: system.id, tab })}
/>
