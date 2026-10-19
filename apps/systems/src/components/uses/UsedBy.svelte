<script lang="ts">
  import type { Use } from '@open-tabletop/session'
  import { tooltip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'

  /** A row's "Used by": how many places use it; pressed, the row shows them below. */
  let { uses, open, ontoggle }: { uses: Use[]; open: boolean; ontoggle: () => void } = $props()

  /** Places, not uses: a condition reading a value twice is one place. */
  const places = $derived(
    new Set(uses.map((u) => `${u.at.pack}/${u.at.kind}/${u.at.id}/${u.at.path}`)).size,
  )
</script>

<button
  class="used"
  class:none={!places}
  aria-expanded={open}
  aria-label={places ? t('uses.count', { n: places }) : t('uses.none')}
  use:tooltip={places ? t('uses.count', { n: places }) : t('uses.none')}
  onclick={ontoggle}>{places || '–'} {open ? '▴' : '▾'}</button
>

<style>
  .used {
    height: 30px;
    padding: 0 8px;
    font-size: 12px;
    white-space: nowrap;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .none {
    color: var(--text-muted);
  }
</style>
