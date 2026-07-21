import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

test('package.json registers karin web config entrypoints', async () => {
  const pkg = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'))

  assert.equal(pkg.karin?.main, 'lib/src/index.js')
  assert.equal(pkg.karin?.['ts-web'], 'web.config.ts')
  assert.equal(pkg.karin?.web, 'lib/web.config.js')
  assert.deepEqual(pkg.karin?.apps, ['lib/src/apps'])
  assert.match(pkg.scripts?.build, /vite build/)
  assert.match(pkg.scripts?.typecheck, /web\/tsconfig\.json/)
  assert.ok(pkg.devDependencies?.react)
  assert.ok(pkg.devDependencies?.vite)
})
