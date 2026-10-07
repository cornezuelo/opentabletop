import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { pwa } from '../../vite.pwa.ts'

export default defineConfig({
  // Relative asset URLs: the build works from any folder (e.g. site/hexmapper/ next to
  // site/oracle/, so both share the user packs stored for that origin).
  base: './',
  plugins: [
    svelte(),
    pwa({
      name: 'OpenTabletop Oracle',
      shortName: 'Oracle',
      description: 'Roll and edit tables, oracles, generators and decks.',
    }),
  ],
  // Fixed ports so the app switcher can link the apps in development (ui-kit apps.ts).
  server: { port: 5174 },
})
