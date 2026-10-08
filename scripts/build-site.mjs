// Puts every app's build under one folder (dist/<app>/), ready to serve from a single
// origin so the apps share the user packs stored in the browser. A build with the
// personal-use packs (OTT_PERSONAL_PACKS=1, `make serve`) goes to dist-local/ instead, so
// dist/ is always safe to publish. The root gets a small page linking to every app.
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { APP_BLURBS, APP_ICON_SVGS, APP_LIST } from '../packages/ui-kit/src/apps.data.mjs'

const out = process.env.OTT_PERSONAL_PACKS === '1' ? 'dist-local' : 'dist'
rmSync(out, { recursive: true, force: true })
const apps = readdirSync('apps').filter((app) => existsSync(`apps/${app}/dist/index.html`))
for (const app of apps) cpSync(`apps/${app}/dist`, `${out}/${app}`, { recursive: true })

// The landing page lists the apps like the app switcher: its order, icons and descriptions
// (ui-kit's apps.data.mjs), in English or Spanish after the browser's language.
const listed = APP_LIST.filter((app) => apps.includes(app.id))
const items = listed
  .map(
    (app) => `<li>
        <a href="${app.id}/">
          ${APP_ICON_SVGS[app.id]}
          <span><strong>${app.name}</strong>
            <span data-en="${APP_BLURBS.en[app.id]}" data-es="${APP_BLURBS.es[app.id]}">${APP_BLURBS.en[app.id]}</span></span>
        </a>
      </li>`,
  )
  .join('\n      ')
writeFileSync(
  `${out}/index.html`,
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenTabletop</title>
    <link rel="icon" href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(APP_ICON_SVGS.hexmapper)}" />
    <style>
      :root { color-scheme: dark; font-family: system-ui, sans-serif; }
      body { margin: 0; padding: 48px 16px; color: #e8e2d4; background: #1b1a17; }
      main { max-width: 640px; margin: 0 auto; }
      h1 { margin: 0 0 6px; font-family: Georgia, serif; font-weight: normal; }
      p { margin: 0 0 28px; color: #9c9480; }
      ul { display: grid; gap: 10px; padding: 0; margin: 0; list-style: none; }
      a { display: flex; gap: 14px; align-items: center; padding: 12px 14px; color: inherit;
        text-decoration: none; background: #26241f; border: 1px solid #3a362d; border-radius: 8px; }
      a:hover, a:focus-visible { border-color: #c8a24a; outline: none; }
      svg { flex: none; width: 44px; height: 44px; }
      a > span { display: flex; flex-direction: column; gap: 3px; }
      strong { color: #c8a24a; font-size: 17px; font-weight: 600; }
      a > span > span { color: #9c9480; }
    </style>
  </head>
  <body>
    <main>
      <h1>OpenTabletop</h1>
      <p data-en="Free, open-source tools for solo RPGs, hexcrawls and sandbox campaigns. Everything runs in your browser, offline." data-es="Herramientas libres para rol en solitario, hexcrawls y campañas sandbox. Todo funciona en tu navegador, sin conexión.">Free, open-source tools for solo RPGs, hexcrawls and sandbox campaigns. Everything runs in your browser, offline.</p>
      <ul>
      ${items}
      </ul>
    </main>
    <script>
      if (navigator.language.startsWith('es')) {
        document.documentElement.lang = 'es'
        for (const el of document.querySelectorAll('[data-es]')) el.textContent = el.dataset.es
      }
    </script>
  </body>
</html>
`,
)
console.log(`${out}/: ${apps.join(', ')}`)
