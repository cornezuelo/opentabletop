<script lang="ts">
  import type { Snippet } from 'svelte'
  import { confirmAction, InfoTip, Notice } from '@open-tabletop/ui-kit'
  import BundledUpdates from './BundledUpdates.svelte'
  import { translator } from './i18n'
  import type { PackLibrary } from './library.svelte'

  /**
   * What can be done with a pack that isn't the user's to change. On a bundled pack: it's
   * read-only, and **Edit a copy** (explained in the help column) makes it the user's. On the
   * user's edited copy of one: going back to the bundled version, and its updates. A pack only
   * brought along (`dependency`, Core's roll modes in another system) says why it can't change,
   * with no copy. The host may word the read-only line for what it shows (a system, a
   * template), and give its own action in place of **Edit a copy** (`copy`).
   */
  let {
    library,
    root,
    locale,
    dependency,
    edited = true,
    texts = {},
    copy,
  }: {
    library: PackLibrary
    root: string
    locale: string
    /** Shown instead, with no copy, when the pack is only brought along: why it can't change. */
    dependency?: string
    /** Whether to show the edited copy's notice and updates (false: the host shows them). */
    edited?: boolean
    /** `copyHelp`: what the host's own action (`copy`) does, for the help column. */
    texts?: { readOnly?: string; editedCopy?: string; confirmRevert?: string; copyHelp?: string }
    /** An action of the host's in place of **Edit a copy**. */
    copy?: Snippet
  } = $props()

  const t = translator(() => locale)
  const pack = $derived(library.pack(root))

  async function revert() {
    if (await confirmAction(texts.confirmRevert ?? t('notice.confirmRevert')))
      library.removePack(root)
  }
</script>

{#if pack?.origin === 'bundled' && dependency}
  <Notice><span>{dependency}</span></Notice>
{:else if pack?.origin === 'bundled'}
  <Notice>
    <span
      >{texts.readOnly ?? t('notice.readOnly')}{pack.personal
        ? ` ${t('notice.personalCopy')}`
        : ''}<InfoTip markdown={texts.copyHelp ?? t('notice.makeCopyHelp')} /></span
    >
    {#if copy}{@render copy()}{:else}
      <button onclick={() => library.editCopy(root)}>{t('notice.makeCopy')}</button>
    {/if}
  </Notice>
{:else if edited && pack?.overrides}
  <Notice>
    <span>{texts.editedCopy ?? t('notice.editedCopy')}</span>
    <button class="plain" onclick={revert}>{t('notice.revert')}</button>
  </Notice>
  <BundledUpdates {library} {root} {locale} />
{/if}
