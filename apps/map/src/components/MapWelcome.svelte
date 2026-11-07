<script lang="ts">
  import { busy, Welcome } from '@open-tabletop/ui-kit'
  import { getLocale, t } from '../lib/i18n/index.svelte'
  import {
    library,
    listLibrary,
    newMap,
    openExampleMap,
    openMapFile,
  } from '../lib/io/actions.svelte'
  import { exampleMaps, exampleSystemName, type ExampleMap } from '../lib/io/examples'

  /** A browser with no maps: what to start with, over the empty map, until something is kept. */
  let empty = $state(false)
  let dismissed = $state(false)
  $effect(() => {
    void library.version
    void listLibrary().then((list) => (empty = !list.length))
  })
  const examples = $derived(empty ? exampleMaps() : [])

  let opening = $state<string | null>(null)
  async function open(example: ExampleMap) {
    if (opening) return
    opening = example.id
    try {
      await openExampleMap(example)
    } finally {
      opening = null
    }
  }
</script>

{#if empty && !dismissed}
  <div class="greeting">
    <Welcome title={t('welcome.title')} tagline={t('welcome.tagline')} body={t('welcome.body')}>
      <div class="start">
        <button class="primary" onclick={() => newMap()}>{t('actions.new')}</button>
        <button onclick={openMapFile}>{t('library.import')}</button>
        <button onclick={() => (dismissed = true)}>{t('welcome.empty')}</button>
      </div>
      {#if examples.length}
        <h2>{t('welcome.examples')}</h2>
        <ul>
          {#each examples as example (`${example.pack}/${example.path}`)}
            <li>
              <button use:busy={opening === example.id} onclick={() => open(example)}>
                {example.name}
                <small
                  >{t('library.exampleOf', {
                    system: exampleSystemName(example, getLocale()),
                  })}</small
                >
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </Welcome>
  </div>
{/if}

<style>
  .greeting {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 3;
    box-sizing: border-box;
    width: min(560px, calc(100% - 32px));
    max-height: calc(100% - 32px);
    padding: 20px 24px;
    overflow-y: auto;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    transform: translate(-50%, -50%);
  }

  .start {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  h2 {
    margin: 16px 0 8px;
  }

  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 6px;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  button {
    padding: 6px 12px;
    color: var(--text);
    background: var(--panel-raised, transparent);
    border: 1px solid var(--panel-border);
    border-radius: 6px;
    cursor: pointer;
  }

  button:hover {
    border-color: var(--accent);
  }

  button.primary {
    color: var(--panel);
    background: var(--accent);
    border-color: var(--accent);
  }

  ul button {
    display: flex;
    flex-direction: column;
    width: 100%;
    text-align: left;
  }

  small {
    color: var(--text-muted);
  }
</style>
