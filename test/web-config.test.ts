import test from 'node:test'
import assert from 'node:assert/strict'

import webConfig from '../web.config'

test('web config opens the dedicated drawImages control surface', () => {
  assert.equal(webConfig.info.id, 'karin-plugin-drawImages')
  assert.equal(webConfig.info.name, 'AI 绘图')
  assert.equal(typeof webConfig.page, 'object')
  assert.equal('url' in webConfig.page ? webConfig.page.url : undefined, '/drawimages/config')
  assert.equal('title' in webConfig.page ? webConfig.page.title : undefined, 'AI 绘图配置')
  assert.equal('components' in webConfig, false)
  assert.equal('save' in webConfig, false)
})
