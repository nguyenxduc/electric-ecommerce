// Chep video moi nhat trong demo-output sang demo-videos/demo-tour-<yyyyMMdd-HHmm>.webm
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const out = path.join(root, 'demo-output')
const find = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? find(p) : p.endsWith('.webm') ? [p] : []
  })
const videos = fs.existsSync(out) ? find(out) : []
if (!videos.length) {
  console.error('Khong tim thay video trong demo-output/')
  process.exit(1)
}
const latest = videos.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0]
const d = new Date()
const pad = n => String(n).padStart(2, '0')
const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
const destDir = path.join(root, 'demo-videos')
fs.mkdirSync(destDir, { recursive: true })
const dest = path.join(destDir, `demo-tour-${stamp}.webm`)
fs.copyFileSync(latest, dest)
console.log(`Video: ${dest}`)
