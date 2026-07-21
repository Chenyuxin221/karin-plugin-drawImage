import test from 'node:test'
import assert from 'node:assert/strict'

import { dir } from '../src/dir'

test('dir separates npm package name from Karin runtime directory name', () => {
  assert.equal(dir.name, 'karin-plugin-drawimages')
  assert.equal(dir.pluginName, 'karin-plugin-drawImages')
})
