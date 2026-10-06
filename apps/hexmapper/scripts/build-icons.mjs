// Extracts the curated icon subset from @iconify-json/game-icons into a small JSON
// bundled with the app. Run with `npm run icons -w apps/hexmapper` after editing CATEGORIES.
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const set = JSON.parse(readFileSync(require.resolve('@iconify-json/game-icons/icons.json'), 'utf8'))

const CATEGORIES = {
  // Also the terrain glyphs: small symbols drawn on every hex of a terrain.
  terrain: [
    'grass',
    'high-grass',
    'wheat',
    'forest',
    'pine-tree',
    'oak',
    'palm-tree',
    'jungle',
    'hills',
    'mountains',
    'peaks',
    'mountaintop',
    'rock',
    'falling-rocks',
    'desert',
    'cactus',
    'sandstorm',
    'tumbleweed',
    'swamp',
    'reed',
    'waves',
    'wave-crest',
    'snowflake-1',
    'snowing',
    'iceberg',
    'volcano',
    'smoking-volcano',
  ],
  party: [
    'meeple',
    'meeple-group',
    'three-friends',
    'hooded-figure',
    'cowled',
    'barbarian',
    'swordman',
    'archer',
    'wizard-face',
    'mounted-knight',
    'knight-banner',
    'visored-helm',
    'viking-helmet',
    'hiking',
    'walk',
    'footprint',
    'footsteps',
    'camel',
    'caravel',
    'compass',
  ],
  settlements: [
    'castle',
    'village',
    'house',
    'hut',
    'tipi',
    'camping-tent',
    'barn',
    'windmill',
    'lighthouse',
    'watchtower',
    'stone-tower',
    'evil-tower',
    'pagoda',
    'church',
    'temple-gate',
  ],
  landmarks: [
    'castle-ruins',
    'broken-wall',
    'obelisk',
    'stone-pile',
    'graveyard',
    'tombstone',
    'totem',
    'stone-throne',
    'well',
    'stone-bridge',
    'portal',
    'magic-portal',
    'crystal-cluster',
    'gold-mine',
    'mountain-cave',
    'cave-entrance',
    'waterfall',
    'oasis',
  ],
  nature: ['mushrooms', 'herbs-bundle', 'tree-roots'],
  danger: [
    'skull-crossed-bones',
    'death-skull',
    'desert-skull',
    'dragon-head',
    'wolf-head',
    'spider-face',
    'ghost',
    'ogre',
    'troll',
    'orc-head',
    'goblin-head',
    'crossed-swords',
    'bat',
  ],
  misc: [
    'campfire',
    'chest',
    'locked-chest',
    'treasure-map',
    'crown',
    'flag-objective',
    'flying-flag',
    'wooden-sign',
    'direction-signs',
    'caravan',
    'old-wagon',
    'anchor',
    'sailboat',
    'horse-head',
    'hand-of-god',
  ],
}

const icons = []
for (const [category, names] of Object.entries(CATEGORIES)) {
  for (const name of names) {
    const icon = set.icons[name]
    if (!icon) throw new Error(`Unknown game-icons icon: ${name}`)
    icons.push({ id: `game:${name}`, name, category, body: icon.body })
  }
}

const out = {
  source: 'https://game-icons.net (via @iconify-json/game-icons)',
  license: 'CC BY 3.0 — https://creativecommons.org/licenses/by/3.0/',
  size: set.width ?? 512,
  icons,
}
writeFileSync(new URL('../src/assets/icons/game-icons.json', import.meta.url), JSON.stringify(out))
console.log(`Wrote ${icons.length} icons`)
