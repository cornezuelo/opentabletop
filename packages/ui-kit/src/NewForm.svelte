<script lang="ts">
  import type { Snippet } from 'svelte'
  import { busy as busyButton } from './busy'

  /**
   * The page that makes something new: a title, its fields (`<label class="field">` with a
   * `<span>` and a control) and the button that makes it.
   */
  let {
    title,
    create,
    disabled = false,
    busy = false,
    onsubmit,
    children,
  }: {
    title: string
    /** The button's text. */
    create: string
    disabled?: boolean
    /** Making it takes a while: the button turns until it's done. */
    busy?: boolean
    onsubmit: () => void
    children: Snippet
  } = $props()
</script>

<h1>{title}</h1>
<form
  onsubmit={(e) => {
    e.preventDefault()
    onsubmit()
  }}
>
  {@render children()}
  <button class="primary" type="submit" {disabled} use:busyButton={busy}>{create}</button>
</form>

<style>
  h1 {
    margin: 0 0 16px;
    font-family: Georgia, serif;
    font-weight: normal;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 420px;
  }

  form :global(.field) {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .primary {
    align-self: start;
    padding: 6px 14px;
    color: var(--accent);
    background: var(--bg);
    border: 1px solid var(--accent);
    border-radius: 6px;
    cursor: pointer;
  }

  .primary:disabled {
    opacity: 0.4;
  }
</style>
