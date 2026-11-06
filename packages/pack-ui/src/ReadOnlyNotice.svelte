<script lang="ts">
  import { tooltip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'
  import type { PackLibrary } from './library.svelte'
  import NewPackDialog from './NewPackDialog.svelte'
  import PackNotice from './PackNotice.svelte'
  import { manifestOf } from './packs'

  /**
   * pack-ui's `PackNotice` on bundled packs (the pack's page shows its own revert). A pack
   * other packs depend on (Core) isn't copied (a copy would replace it for them, without its
   * updates): it's duplicated as a new pack of yours.
   */
  let {
    library,
    locale,
    root,
    onmade,
  }: {
    library: PackLibrary
    locale: string
    root: string
    /** A duplicate was made, by its folder. */
    onmade: (root: string) => void
  } = $props()
  const t = translator(() => locale)
  const pack = $derived(library.pack(root))
  const needed = $derived.by(() => {
    const id = pack && manifestOf(pack).id
    return !!id && [...library.registry.packs.values()].some((p) => p.dependencies.includes(id))
  })
  let duplicating = $state(false)
</script>

{#snippet duplicate()}
  <button use:tooltip={t('notice.duplicateHelp')} onclick={() => (duplicating = true)}
    >{t('notice.duplicate')}</button
  >
{/snippet}

<PackNotice
  {library}
  {root}
  {locale}
  edited={false}
  texts={{ readOnly: t('notice.packReadOnly') }}
  copy={needed ? duplicate : undefined}
/>
{#if duplicating}<NewPackDialog
    {library}
    {locale}
    {onmade}
    from={root}
    onclose={() => (duplicating = false)}
  />{/if}
