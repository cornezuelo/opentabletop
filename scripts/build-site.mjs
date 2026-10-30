// Puts every app's build under one folder (dist/<app>/), ready to serve from a single
// origin so the apps share the user packs stored in the browser. A build with the
// personal-use packs (OTT_PERSONAL_PACKS=1, `make serve`) goes to dist-local/ instead, so
// dist/ is always safe to publish. The root opens Campaign.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { logoSvg } from '../packages/ui-kit/src/apps.data.mjs'

const out = process.env.OTT_PERSONAL_PACKS === '1' ? 'dist-local' : 'dist'
rmSync(out, { recursive: true, force: true })
const apps = readdirSync('apps').filter((app) => existsSync(`apps/${app}/dist/index.html`))
for (const app of apps) cpSync(`apps/${app}/dist`, `${out}/${app}`, { recursive: true })

// The root opens Campaign, where play starts (campaigns.md §11); the other apps are a click
// away in its app switcher.
writeFileSync(
  `${out}/index.html`,
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenTabletop</title>
    <meta name="description" content="Free, open-source tools for solo RPGs, hexcrawls and sandbox campaigns." />
    <link rel="icon" href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg(true))}" />
    <meta http-equiv="refresh" content="0; url=campaign/" />
    <style>
      :root { color-scheme: dark; font-family: system-ui, sans-serif; }
      body { margin: 48px 16px; color: #e8e2d4; background: #1b1a17; }
      a { color: #c8a24a; }
    </style>
  </head>
  <body>
    <p><a href="campaign/">OpenTabletop</a></p>
    <script>
      location.replace('campaign/' + location.hash)
    </script>
  </body>
</html>
`,
)
// Map was called the Hexmapper (up to v0.25.0): its old address sends on to the new one,
// keeping the hash (a map's id, `#/in-campaign/…`). A copy installed for offline use still
// has the old service worker: this one replaces it, unregisters itself and reloads the
// page, so the redirect is reached.
mkdirSync(`${out}/hexmapper`, { recursive: true })
writeFileSync(
  `${out}/hexmapper/index.html`,
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Map · OpenTabletop</title>
    <meta http-equiv="refresh" content="0; url=../map/" />
  </head>
  <body>
    <p><a href="../map/">OpenTabletop Map</a></p>
    <script>
      location.replace('../map/' + location.hash)
    </script>
  </body>
</html>
`,
)
writeFileSync(
  `${out}/hexmapper/sw.js`,
  `self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration
      .unregister()
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((client) => client.navigate(client.url))),
  )
})
`,
)

console.log(`${out}/: ${apps.join(', ')} (and hexmapper/, sending on to map/)`)
