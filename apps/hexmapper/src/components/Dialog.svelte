<script lang="ts">
  import { dialog } from '../lib/store/dialog.svelte'

  let element = $state<HTMLDialogElement>()

  $effect(() => {
    if (!element) return
    if (dialog.current && !element.open) element.showModal()
    if (!dialog.current && element.open) element.close()
  })
</script>

<dialog
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
    <div class="buttons">
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
    padding: 20px;
    color: var(--text);
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 10px;
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.5);
  }

  dialog::backdrop {
    background: rgb(0 0 0 / 0.5);
  }

  h2 {
    margin: 0 0 8px;
    font-size: 16px;
    color: var(--accent);
  }

  p {
    margin: 0 0 16px;
    line-height: 1.5;
    color: var(--text-muted);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  button {
    padding: 7px 12px;
    background: var(--bg);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  button:hover {
    border-color: var(--text-muted);
  }

  button.primary {
    color: var(--accent);
    border-color: var(--accent);
  }

  button.danger:hover {
    color: var(--danger);
    border-color: var(--danger);
  }
</style>
