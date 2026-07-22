import fs from 'node:fs'
import path from 'node:path'

import { defineConfig } from 'node-karin'

import { dir } from './src/dir'

function resolveRealPath (value: string): string {
  try {
    return fs.realpathSync.native(value)
  } catch {
    return path.resolve(value)
  }
}

const isLocalDevelopment = process.env.NODE_ENV === 'development' &&
  resolveRealPath(dir.pluginDir) === resolveRealPath(process.cwd())

export default defineConfig({
  info: {
    id: dir.pluginName,
    name: 'AI 绘图',
    author: {
      name: 'huayunduan',
      home: 'https://github.com/Chenyuxin221/karin-plugin-drawimages',
      avatar: 'https://avatars.githubusercontent.com/chenyuxin221',
    },
    icon: {
      name: 'image',
      size: 24,
      color: '#0f766e',
    },
    version: dir.version,
    description: 'OpenAI Images、Chat Completions 与 Responses 绘图配置',
  },
  page: {
    url: isLocalDevelopment
      ? 'http://localhost:5177/drawimages/config'
      : '/drawimages/config',
    title: 'AI 绘图配置',
    description: '使用 drawImages 自带的配置工作台',
  },
})
