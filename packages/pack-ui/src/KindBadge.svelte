<script lang="ts">
  import type { Compiled } from '@open-tabletop/oracle-engine'
  import { tooltip } from '@open-tabletop/ui-kit'
  import { translator } from './i18n'

  let {
    kind,
    locale,
    full = false,
  }: { kind: Compiled['kind']; locale: string; full?: boolean } = $props()
  const t = translator(() => locale)
</script>

<span class="badge {kind}" use:tooltip={t(`kindTips.${kind}`)}
  >{full ? t(`kinds.${kind}`) : t(`kinds.${kind}`)[0]}</span
>

<style>
  .badge {
    display: inline-grid;
    flex: none;
    place-items: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    font-size: 11px;
    font-weight: 600;
    color: var(--bg);
    border-radius: 4px;
  }

  .table {
    background: #c8a24a;
  }

  .oracle {
    background: #8fb3c9;
  }

  .generator {
    background: #a7c48b;
  }

  .deck {
    background: #c99090;
  }
</style>
