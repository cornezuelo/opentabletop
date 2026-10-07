#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { run } from './cli'

/** Every YAML or JSON file under a folder, with paths relative to it. */
function readFolder(root: string) {
  if (!existsSync(root) || !statSync(root).isDirectory()) return null
  const files: { path: string; content: string }[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.') || name === 'node_modules') continue
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(ya?ml|json)$/.test(name))
        files.push({
          path: relative(root, full).split('\\').join('/'),
          content: readFileSync(full, 'utf8'),
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
