<script lang="ts">
  import { toasts } from '../lib/store/toasts.svelte'
</script>

<div class="toasts" role="status" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <div class="toast" class:error={toast.kind === 'error'}>{toast.message}</div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    bottom: 16px;
    left: 50%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transform: translateX(-50%);
    pointer-events: none;
  }

  .toast {
    padding: 8px 14px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-left: 3px solid var(--accent);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.4);
  }

  .toast.error {
    border-left-color: var(--danger);
  }
</style>
