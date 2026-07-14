import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getDrawWebSettings,
  parseDrawWebSettings,
  saveDrawWebSettings,
} from '../src/web/settings'

const initialConfig = `draw:
  activeProfile: profile2
  global:
    apiMode: images
    baseUrl: https://api.example.com
    apiKey: sk-global
    endpoint: /v1/images/generations
    model: gpt-image-2
    imageDetail: high
    imageUploadMode: default
    imageUploadUrl: ''
    imageUploadToken: ''
    taskLockEnabled: true
    requestTimeoutSeconds: 600
    moderation: auto
    background: auto
    outputFormat: png
    quality: high
    size: 1024x1024
    n: 1
  profiles:
    profile1:
      name: 配置一
      apiMode: ''
      model: ''
      useEditRoute: false
    profile2:
      name: 聊天绘图
      apiMode: chatCompletions
      model: gpt-5.4
      useEditRoute: false
    profile3:
      name: 配置三
      apiMode: ''
      model: ''
      useEditRoute: false
`

test('draw web settings preserve profile inheritance and save through yaml helpers', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'draw-web-settings-'))
  const configFile = path.join(tempDir, 'config.yaml')
  await fs.writeFile(configFile, initialConfig, 'utf8')

  const current = getDrawWebSettings(configFile)
  assert.equal(current.activeProfile, 'profile2')
  assert.equal(current.profiles.profile1.apiMode, '')
  assert.equal(current.resolvedProfiles.profile1.apiMode, 'images')
  assert.equal(current.profiles.profile2.apiMode, 'chatCompletions')

  current.activeProfile = 'profile1'
  current.global.n = 2
  current.profiles.profile1.model = 'gpt-image-1'
  current.profiles.profile2.model = ''

  const saved = await saveDrawWebSettings(current, configFile)
  assert.equal(saved.activeProfile, 'profile1')
  assert.equal(saved.global.n, 2)
  assert.equal(saved.profiles.profile1.model, 'gpt-image-1')
  assert.equal(saved.profiles.profile2.model, '')
  assert.equal(saved.resolvedProfiles.profile2.model, 'gpt-image-2')

  const content = await fs.readFile(configFile, 'utf8')
  assert.match(content, /activeProfile: profile1/)
  assert.match(content, /profile2:[\s\S]*model: ""/)
})

test('draw web settings reject invalid or unsafe form payloads', () => {
  const valid = getDrawWebSettingsFromFixture()

  assert.throws(
    () => parseDrawWebSettings({ ...valid, activeProfile: 'profile9' }),
    /当前配置档无效/
  )
  assert.throws(
    () => parseDrawWebSettings({ ...valid, global: { ...valid.global, n: 1.5 } }),
    /生成数量必须是大于 0 的整数/
  )
  assert.throws(
    () => parseDrawWebSettings({
      ...valid,
      global: { ...valid.global, imageUploadMode: 'custom', imageUploadUrl: 'not-a-url' },
    }),
    /自定义图床地址必须是有效的 HTTP\(S\) 地址/
  )
})

function getDrawWebSettingsFromFixture () {
  return {
    activeProfile: 'profile1',
    global: {
      apiMode: 'images',
      baseUrl: 'https://api.example.com',
      apiKey: '',
      endpoint: '/v1/images/generations',
      model: 'gpt-image-2',
      imageDetail: 'high',
      imageUploadMode: 'default',
      imageUploadUrl: '',
      imageUploadToken: '',
      taskLockEnabled: true,
      requestTimeoutSeconds: 600,
      moderation: 'auto',
      background: 'auto',
      outputFormat: 'png',
      quality: 'high',
      size: '1024x1024',
      n: 1,
    },
    profiles: {
      profile1: { name: '配置一', apiMode: '', useEditRoute: false },
      profile2: { name: '配置二', apiMode: '', useEditRoute: false },
      profile3: { name: '配置三', apiMode: '', useEditRoute: false },
    },
  }
}
