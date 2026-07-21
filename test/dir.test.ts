import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

import { dir, ensureRuntimeLayout } from '../src/dir'

test('dir uses npm package name for Karin runtime directory name', () => {
  assert.equal(dir.name, 'karin-plugin-drawimages')
  assert.equal(dir.pluginName, 'karin-plugin-drawimages')
})

test('ensureRuntimeLayout creates runtime directories without writing config yaml', async () => {
  const runtimeDir = await fs.mkdtemp(path.join(process.env.KARIN_DRAWIMAGES_RUNTIME_DIR!, 'layout-'))
  const previousRuntimeDir = process.env.KARIN_DRAWIMAGES_RUNTIME_DIR

  process.env.KARIN_DRAWIMAGES_RUNTIME_DIR = runtimeDir

  try {
    ensureRuntimeLayout()

    const configFile = path.join(runtimeDir, 'config', 'config.yaml')
    const dataStat = await fs.stat(path.join(runtimeDir, 'data'))
    const resourcesStat = await fs.stat(path.join(runtimeDir, 'resources'))

    await assert.rejects(fs.stat(configFile), { code: 'ENOENT' })
    assert.equal(dataStat.isDirectory(), true)
    assert.equal(resourcesStat.isDirectory(), true)
  } finally {
    process.env.KARIN_DRAWIMAGES_RUNTIME_DIR = previousRuntimeDir
    await fs.rm(runtimeDir, { recursive: true, force: true })
  }
})
