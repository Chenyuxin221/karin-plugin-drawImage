import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

process.env.KARIN_SKIP_CONFIG_WATCH = '1'

if (!process.env.KARIN_DRAWIMAGES_RUNTIME_DIR) {
  const runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drawimages-test-runtime-'))
  process.env.KARIN_DRAWIMAGES_RUNTIME_DIR = runtimeDir
  process.on('exit', () => fs.rmSync(runtimeDir, { recursive: true, force: true }))
}
