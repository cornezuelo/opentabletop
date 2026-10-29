<script lang="ts">
  import { formatCoord, parseKey, type HexKey } from '@open-tabletop/hex'
  import { tokensAt } from '@open-tabletop/map'
  import { PresentHere } from '@open-tabletop/travel-ui'
  import { getLocale, t, type MessageKey } from '../../lib/i18n/index.svelte'
  import { editSession, sessionOf } from '../../lib/play/play'
  import { mapPlace } from '../../lib/play/roster'
  import { activeSystem } from '../../lib/play/systems'
  import { editor } from '../../lib/store/editor.svelte'

  /**
   * What stands on the selected hex: the party, the map's tokens and, during a trip, those
   * present (the copies its results made there), each with its state; a token opens in the
   * token tool, a copy unfolds into its sheet.
   */
  let { key }: { key: HexKey } = $props()

  const play = $derived((void editor.revision, editor.play))
  const session = $derived(play ? sessionOf(play) : null)
  const tokens = $derived((void editor.revision, tokensAt(editor.map, key)))
  const copies = $derived((session?.present ?? []).filter((p) => p.at === key))
  const coord = (at: string) =>
    formatCoord(parseKey(at as HexKey), editor.grid.coordFormat, editor.grid)
  const hexName = (at: string) => editor.map.hexes[at as HexKey]?.name || coord(at)

  function open(id: string) {
    editor.tool = 'token'
    editor.selectedToken = id
  }
</script>

{#snippet onHex()}
  {#if tokens.length}
    <ul class="tokens">
      {#each tokens as token (token.id)}
        <li>
          <button class="link" onclick={() => open(token.id)}
            >{token.name || t(`tokens.kinds.${token.kind}` as MessageKey)}</button
          >
          <span class="muted">{t(`tokens.kinds.${token.kind}` as MessageKey)}</span>
        </li>
      {/each}
    </ul>
  {/if}
{/snippet}

{#if session && (copies.length || tokens.length)}
  <PresentHere
    system={activeSystem()}
    {session}
    locale={getLocale()}
    at={key}
    placeName={hexName}
    place={mapPlace()}
    before={tokens.length ? onHex : undefined}
    onedit={editSession}
  />
{/if}

<style>
  .tokens {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
  }

  .tokens li {
    display: flex;
    gap: 6px;
    align-items: baseline;
  }

  .link {
    padding: 0;
    color: var(--accent);
    background: none;
    border: none;
    cursor: pointer;
  }

  .muted {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
