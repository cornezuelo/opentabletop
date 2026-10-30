<script lang="ts">
  /**
   * Something is on its way (a list being read, a file being made): a small turning ring,
   * with `label` said to screen readers (and shown beside it when `shown`).
   */
  let { label, shown = false }: { label: string; shown?: boolean } = $props()
</script>

<span class="spinner" role="status">
  <span class="ring" aria-hidden="true"></span>
  {#if shown}<span>{label}</span>{:else}<span class="sr">{label}</span>{/if}
</span>

<style>
  .spinner {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    color: var(--text-muted);
  }

  .ring {
    width: 1em;
    height: 1em;
    border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ring {
      animation-duration: 2.4s;
    }
  }
</style>
