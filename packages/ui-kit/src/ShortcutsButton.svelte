<script lang="ts">
  import KeyboardIcon from './KeyboardIcon.svelte'
  import KeyList from './KeyList.svelte'
  import { isTyping, type ShortcutGroup } from './shortcuts'
  import { tooltip } from './tooltip'

  /**
   * A keyboard in every app's header, and the **?** key, opening the app's shortcuts: its own
   * groups (`groups`), then those every app shares.
   */
  let {
    locale,
    groups = [],
    compact = false,
  }: { locale: string; groups?: ShortcutGroup[]; compact?: boolean } = $props()

  const TEXT = {
    en: {
      button: 'Keyboard shortcuts',
      everywhere: 'In every app',
      list: 'These shortcuts',
      help: 'In a field: its explanation, in the help column',
      close: 'Close',
    },
    es: {
      button: 'Atajos de teclado',
      everywhere: 'En todas las aplicaciones',
      list: 'Estos atajos',
      help: 'En un campo: su explicación, en la columna de ayuda',
      close: 'Cerrar',
    },
  }
  const text = $derived(locale === 'es' ? TEXT.es : TEXT.en)
  const shared = $derived<ShortcutGroup>({
    title: text.everywhere,
    shortcuts: [
      { keys: ['?'], does: text.list },
      { keys: ['F1'], does: text.help },
    ],
  })

  let dialog: HTMLDialogElement
  let heading: HTMLHeadingElement
  function toggle() {
    if (dialog.open) dialog.close()
    else {
      dialog.showModal()
      // The list from its top: the dialog would scroll down to its focused Close.
      heading.focus()
    }
  }
  function onkeydown(e: KeyboardEvent) {
    if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return
    e.preventDefault()
    toggle()
  }
</script>

<svelte:window {onkeydown} />

<button
  class="open"
  class:compact
  aria-label={text.button}
  use:tooltip={{ text: text.button, keys: ['?'] }}
  onclick={toggle}
>
  <KeyboardIcon />
</button>

<dialog class="modal" bind:this={dialog} onclick={(e) => e.target === dialog && dialog.close()}>
  <h2 tabindex="-1" bind:this={heading}>{text.button}</h2>
  <div class="groups">
    {#each [...groups, shared] as group (group.title)}
      <section>
        <h3>{group.title}</h3>
        <KeyList shortcuts={group.shortcuts} {locale} />
      </section>
    {/each}
  </div>
  <div class="dialog-buttons">
    <button onclick={() => dialog.close()}>{text.close}</button>
  </div>
</dialog>

<style>
  .open {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    font-size: 15px;
    cursor: pointer;
  }

  .open.compact {
    width: 40px;
    height: 40px;
  }

  .open:hover {
    color: var(--accent);
    border-color: var(--panel-border);
  }

  dialog {
    width: min(1080px, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
  }

  h2 {
    margin: 0 0 12px;
    outline: none;
  }

  /* Groups side by side where there's room, each kept whole. */
  .groups {
    columns: 300px 3;
    column-gap: 28px;
  }

  section {
    break-inside: avoid;
    padding: 12px 0;
    border-top: 1px solid var(--panel-border);
  }

  h3 {
    margin: 0 0 10px;
  }
</style>
