import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { packSources } from '../../vite.packs.ts'
import { pwa } from '../../vite.pwa.ts'

export default defineConfig({
  // Relative asset URLs: the build works from any folder (site/characters/ next to the other
  // apps, so they share the roster and the user packs stored for that origin).
  base: './',
  plugins: [
    packSources(),
    svelte(),
    pwa({
      name: 'OpenTabletop Characters',
      shortName: 'Characters',
      description: 'Your characters, of any system, ready to travel.',
    }),
  ],
  // Fixed ports so the app switcher can link the apps in development (ui-kit apps.ts).
  server: { port: 5178 },
})
