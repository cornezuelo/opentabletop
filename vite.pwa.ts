import { VitePWA } from 'vite-plugin-pwa'

/**
 * Makes an app installable and usable offline: a web manifest and a service worker that
 * caches every built file. Each app has its own (they're built into separate folders and
 * served with relative URLs). New versions take over on the next visit.
 */
export function pwa(app: { name: string; shortName: string; description: string }) {
  return VitePWA({
    registerType: 'autoUpdate',
    injectRegister: 'script',
    manifest: {
      name: app.name,
      short_name: app.shortName,
      description: app.description,
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: '#1b1a17',
      theme_color: '#1b1a17',
      icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,webp,woff,woff2,json,ttf}'],
      // The Hexmapper bundles PixiJS and PDF export: bigger than the default 2 MB.
      maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      cleanupOutdatedCaches: true,
    },
  })
}
