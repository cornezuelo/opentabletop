import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { packSources } from '../../vite.packs.ts'
import { pwa } from '../../vite.pwa.ts'

export default defineConfig({
  // Relative asset URLs: the build works from any folder (site/campaign/ next to the other
  // apps, so they share the campaigns, maps and user packs stored for that origin).
  base: './',
  plugins: [
    packSources(),
    svelte(),
    pwa({
      name: 'OpenTabletop Campaign',
      shortName: 'Campaign',
      description: 'What is going on in your world: its clock, its maps and trips.',
    }),
  ],
  // Fixed ports so the app switcher can link the apps in development (ui-kit apps.ts).
  server: { port: 5179 },
})
