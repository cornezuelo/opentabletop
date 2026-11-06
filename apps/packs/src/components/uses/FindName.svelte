<script lang="ts">
  import { usesNamed, type TravelSystem } from '@open-tabletop/session'
  import { InfoTip } from '@open-tabletop/ui-kit'
  import { t } from '../../lib/i18n'
  import { knownName, usesIn } from '../../lib/usage'
  import UsesList from './UsesList.svelte'

  /** Find a name: every place in the system's packs that uses it (`docs/used-by.md` §5). */
  let { system }: { system: TravelSystem } = $props()

  let query = $state('')
  const listId = $props.id()
  const uses = $derived(usesIn(system))
  /** Every name met, full and as written, for suggestions. */
  const names = $derived([...new Set(uses.flatMap((u) => [u.name, u.written]))].sort())
  const name = $derived(query.trim())
  const found = $derived(name ? usesNamed(uses, name) : [])
  const known = $derived(!name || knownName(system, name))
  /** Names written like it (one or two letters apart, or ending the same): a typo's likely target. */
  const close = $derived.by(() => {
    if (!name || known) return []
    const last = name.split('.').pop()!
    return names
      .filter(
        (n) => n !== name && (distance(n, name) <= 2 || distance(n.split('.').pop()!, last) <= 1),
      )
      .slice(0, 6)
  })

  function distance(a: string, b: string): number {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i)
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0]
      row[0] = i
      for (let j = 1; j <= b.length; j++) {
        const next = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
        prev = row[j]
        row[j] = next
      }
    }
    return row[b.length]
  }
</script>

<section class="find">
  <h3>{t('uses.find')}<InfoTip text={t('uses.findHelp')} /></h3>
  <input
    type="search"
    list={listId}
    placeholder={t('uses.findPlaceholder')}
    aria-label={t('uses.find')}
    bind:value={query}
  />
  <datalist id={listId}>
    {#each names as n (n)}<option value={n}></option>{/each}
  </datalist>
  {#if name}
    {#if found.length}
      <UsesList uses={found} {system} />
    {:else}
      <p class="help">{t('uses.nothing')}</p>
    {/if}
    {#if !known}
      <p class="help">{t('uses.undeclared')}</p>
      {#if close.length}
        <p class="help close">
          {t('uses.close', { names: '' })}
          {#each close as c (c)}<button class="link" onclick={() => (query = c)}
              ><code>{c}</code></button
            >{/each}
        </p>
      {/if}
    {/if}
  {/if}
</section>

<style>
  .find {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 48em;
  }

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  input {
    max-width: 24em;
  }

  .help {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }

  .close {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    align-items: baseline;
  }

  .link {
    padding: 0;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }
</style>
