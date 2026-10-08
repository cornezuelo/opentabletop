// Puts every app's build under one folder (dist/<app>/), ready to serve from a single
// origin so the apps share the user packs stored in the browser. A build with the
// personal-use packs (OTT_PERSONAL_PACKS=1, `make serve`) goes to dist-local/ instead, so
// dist/ is always safe to publish. The root gets a small page linking to every app.
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { APP_BLURBS, APP_ICON_SVGS, APP_LIST } from '../packages/ui-kit/src/apps.data.mjs'
import { initialLocale, pickLocale } from '../packages/ui-kit/src/locale.mjs'

// The landing page's language buttons: a flag each, choosing the language every app shares.
const FLAGS = {
  en: `<svg viewBox="0 0 60 30" aria-hidden="true"><clipPath id="uk"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" clip-path="url(#uk)" stroke="#C8102E" stroke-width="4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></svg>`,
  es: `<svg viewBox="0 0 60 30" aria-hidden="true"><path d="M0 0h60v30H0z" fill="#AA151B"/><path d="M0 7.5h60v15H0z" fill="#F1BF00"/></svg>`,
}
const LANGUAGES = { en: 'English', es: 'Español' }

const out = process.env.OTT_PERSONAL_PACKS === '1' ? 'dist-local' : 'dist'
rmSync(out, { recursive: true, force: true })
const apps = readdirSync('apps').filter((app) => existsSync(`apps/${app}/dist/index.html`))
for (const app of apps) cpSync(`apps/${app}/dist`, `${out}/${app}`, { recursive: true })

// The landing page lists the apps like the app switcher: its order, icons and descriptions
// (ui-kit's apps.data.mjs), in the language every app shares (ui-kit's locale.mjs), with
// flags to change it.
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
      header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
      .langs { display: flex; gap: 6px; }
      .langs button { display: flex; padding: 3px; background: none; border: 1px solid transparent;
        border-radius: 4px; cursor: pointer; opacity: 0.55; }
      .langs button:hover, .langs button:focus-visible { opacity: 1; outline: none; border-color: #3a362d; }
      .langs button[aria-pressed='true'] { opacity: 1; border-color: #c8a24a; }
      .langs svg { width: 30px; height: 15px; border-radius: 2px; }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>OpenTabletop</h1>
        <nav class="langs" aria-label="Language / Idioma">
          ${Object.entries(LANGUAGES)
            .map(
              ([code, name]) =>
                `<button type="button" data-locale="${code}" lang="${code}" aria-label="${name}" aria-pressed="false">${FLAGS[code]}</button>`,
            )
            .join('\n          ')}
        </nav>
      </header>
      <p data-en="Free, open-source tools for solo RPGs, hexcrawls and sandbox campaigns. Everything runs in your browser, offline." data-es="Herramientas libres para rol en solitario, hexcrawls y campañas sandbox. Todo funciona en tu navegador, sin conexión.">Free, open-source tools for solo RPGs, hexcrawls and sandbox campaigns. Everything runs in your browser, offline.</p>
      <ul>
      ${items}
      </ul>
    </main>
    <script>
      ${pickLocale}
      ${initialLocale}
      const KEY = 'opentabletop.locale'
      const available = ${JSON.stringify(Object.keys(LANGUAGES))}
      function show(locale) {
        document.documentElement.lang = locale
        for (const el of document.querySelectorAll('[data-en]')) el.textContent = el.dataset[locale]
        for (const button of document.querySelectorAll('[data-locale]'))
          button.setAttribute('aria-pressed', String(button.dataset.locale === locale))
      }
      for (const button of document.querySelectorAll('[data-locale]'))
        button.addEventListener('click', () => {
          try {
            localStorage.setItem(KEY, button.dataset.locale)
          } catch {
            // Not remembered; it still applies now.
          }
          show(button.dataset.locale)
        })
      show(initialLocale([KEY], available, 'en'))
    </script>
  </body>
</html>
`,
)
console.log(`${out}/: ${apps.join(', ')}`)
