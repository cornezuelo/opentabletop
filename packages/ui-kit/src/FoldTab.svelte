<script lang="ts">
  import { tooltip } from './tooltip'

  /**
   * The small tab on a side panel's edge that folds it away and brings it back (the
   * Hexmapper's). It sits inside a positioned container, against the side the panel is
   * on: `side="left"` for a panel on the left, `right` for one on the right.
   */
  let {
    side,
    open,
    show,
    hide,
    ontoggle,
  }: {
    side: 'left' | 'right'
    open: boolean
    /** What pressing it does, for its tooltip: "Show the pack list". */
    show: string
    hide: string
    ontoggle: () => void
  } = $props()

  const label = $derived(open ? hide : show)
  /** The arrow points the way the panel goes. */
  const arrow = $derived((side === 'right') === open ? '›' : '‹')
</script>

<button
  class="fold {side}"
  aria-expanded={open}
  aria-label={label}
  use:tooltip={label}
  onclick={ontoggle}><span aria-hidden="true">{arrow}</span></button
>

<style>
  .fold {
    position: absolute;
    top: 50%;
    z-index: 2;
    width: 18px;
    height: 48px;
    padding: 0;
    font-size: 16px;
    color: var(--text-muted);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    transform: translateY(-50%);
    cursor: pointer;
  }

  .fold:hover {
    color: var(--accent);
  }

  .right {
    right: 0;
    border-right: none;
    border-radius: 6px 0 0 6px;
  }

  .left {
    left: 0;
    border-left: none;
    border-radius: 0 6px 6px 0;
  }
</style>
