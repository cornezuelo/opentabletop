import { CURRENT_CAMPAIGN_KEY, readCurrentCampaign, rememberCampaign } from './currentCampaign'

/**
 * The campaign being played, as every app shows it (**Playing: <campaign> ▾**): read from
 * this browser's preference and kept in step when another tab or app changes it.
 * `id` undefined: **No campaign**.
 */
export const playing = $state<{ id: string | undefined }>({ id: readCurrentCampaign() })

/**
 * Plays in a campaign from now on (none: **No campaign**), in this app and the others. An app
 * calls it when what it opens is in a campaign (a map, a trip), so the campaign shown is
 * always the one in front of you.
 */
export function playIn(id: string | undefined): void {
  if (playing.id === id) return
  rememberCampaign(id)
  changed(id)
}

// Plain listeners, not state: nothing renders them.
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const listeners = new Set<(id: string | undefined) => void>()

/** Hears the campaign being played change (here, in another app or tab); returns a stop. */
export function onPlayingChange(listener: (id: string | undefined) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function changed(id: string | undefined): void {
  playing.id = id
  for (const listener of listeners) listener(id)
}

if (typeof window !== 'undefined')
  window.addEventListener('storage', (e) => {
    if (e.key !== CURRENT_CAMPAIGN_KEY && e.key !== null) return
    const id = readCurrentCampaign()
    if (id !== playing.id) changed(id)
  })
