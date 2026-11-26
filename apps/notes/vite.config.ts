import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { packSources } from '../../vite.packs.ts'
import { pwa } from '../../vite.pwa.ts'

export default defineConfig({
  // Relative asset URLs: the build works from any folder (site/notes/ next to the other
  // apps, so they share the pages, campaigns and roster stored for that origin).
  base: './',
  plugins: [
    packSources(),
    svelte(),
    pwa({
      name: 'OpenTabletop Notes',
      shortName: 'Notes',
      description: 'Your notes and lore, by campaign, linked to your games.',
    }),
  ],
  // Fixed ports so the app switcher can link the apps in development (ui-kit apps.ts).
  server: { port: 5180 },
})
