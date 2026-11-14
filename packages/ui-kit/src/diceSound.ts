/**
 * The knock of a die on the table, made on the spot with the browser's sound (no files): a
 * short burst of noise through a filter, louder and lower the harder the knock. Nothing when
 * the browser has no sound, or before the player has touched the page.
 */

let audio: AudioContext | undefined

function context(): AudioContext | undefined {
  if (audio) return audio
  const Ctor =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
  if (!Ctor) return undefined
  try {
    audio = new Ctor()
  } catch {
    return undefined
  }
  return audio
}

/** A knock of `strength` (0 to 1): a die on wood. */
export function knock(strength: number): void {
  const ac = context()
  if (!ac || strength <= 0) return
  if (ac.state === 'suspended') void ac.resume()
  const length = Math.floor(ac.sampleRate * 0.05)
  const buffer = ac.createBuffer(1, length, ac.sampleRate)
  const data = buffer.getChannelData(0)
  // A click that dies away at once.
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 4)
  const source = ac.createBufferSource()
  source.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 900 + (1 - strength) * 1800
  filter.Q.value = 3
  const gain = ac.createGain()
  gain.gain.value = 0.15 + strength * 0.6
  source.connect(filter).connect(gain).connect(ac.destination)
  source.start()
}
