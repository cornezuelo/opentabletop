#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { bytesToDataUrl, isImageFile, isRasterFile } from '@open-tabletop/oracle-engine'
import { run } from './cli'

/**
 * Every YAML, JSON and image file under a folder, with paths relative to it; images as
 * packs keep them (an SVG's text, the others' bytes as a `data:` URL).
 */
function readFolder(root: string) {
  if (!existsSync(root) || !statSync(root).isDirectory()) return null
  const files: { path: string; content: string }[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.') || name === 'node_modules') continue
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(ya?ml|json)$/.test(name) || isImageFile(name))
        files.push({
          path: relative(root, full).split('\\').join('/'),
          content: isRasterFile(name)
            ? bytesToDataUrl(new Uint8Array(readFileSync(full)), name)
            : readFileSync(full, 'utf8'),
        })
    }
  }
  walk(root)
  return files
}

process.exitCode = run(process.argv.slice(2), {
  readFolder,
  out: (text) => console.log(text),
  err: (text) => console.error(text),
})
