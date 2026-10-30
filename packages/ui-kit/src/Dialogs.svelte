<script lang="ts">
  import { dialog } from './dialog.svelte'

  /** Renders `ask()` and `confirmAction()` dialogs: mount it once in the app. */

  let element = $state<HTMLDialogElement>()

  $effect(() => {
    if (!element) return
    if (dialog.current && !element.open) element.showModal()
    if (!dialog.current && element.open) element.close()
  })
</script>

<dialog
  class="modal"
  bind:this={element}
  oncancel={(e) => {
    e.preventDefault()
    dialog.current?.resolve(null)
  }}
  onclick={(e) => {
    if (e.target === element) dialog.current?.resolve(null)
  }}
>
  {#if dialog.current}
    {@const request = dialog.current}
    <h2>{request.title}</h2>
    <p>{request.message}</p>
    <div class="dialog-buttons">
      {#each request.buttons as button (button.value)}
        <button class={button.kind} onclick={() => request.resolve(button.value)}
          >{button.label}</button
        >
      {/each}
    </div>
  {/if}
</dialog>

<style>
  dialog {
    max-width: 440px;
  }

  h2 {
    margin: 0 0 8px;
    font-size: 16px;
    color: var(--accent);
  }

  p {
    margin: 0 0 16px;
    white-space: pre-line;
    line-height: 1.5;
    color: var(--text-muted);
  }
</style>
