import fs from 'node:fs'
import path from 'node:path'

import {
  app as karinApp,
  authMiddleware,
  createBadRequestResponse,
  createServerErrorResponse,
  createSuccessResponse,
  logger,
} from 'node-karin'
import express, { type Request, type Response } from 'node-karin/express'

import { dir } from '@/dir'
import { getDrawWebSettings, saveDrawWebSettings } from './settings'

const WEB_PREFIX = '/drawimages'
const webDistPath = path.join(dir.pluginDir, 'lib', 'web')
const webIndexPath = path.join(webDistPath, 'index.html')

function sendWebIndex (_req: Request, res: Response): void {
  try {
    res.setHeader('Cache-Control', 'no-cache')
    res.type('html').send(fs.readFileSync(webIndexPath, 'utf8'))
  } catch (error) {
    logger.error('[karin-plugin-drawImages] 读取 Web UI 入口失败', error)
    createServerErrorResponse(res, '加载 AI 绘图配置页面失败')
  }
}

const router = express.Router()
router.use(express.json({ limit: '256kb' }))

router.get('/api/config', authMiddleware, (_req, res) => {
  try {
    return createSuccessResponse(res, getDrawWebSettings())
  } catch (error) {
    return createServerErrorResponse(
      res,
      `读取绘图配置失败: ${error instanceof Error ? error.message : String(error)}`
    )
  }
})

router.post('/api/config', authMiddleware, async (req, res) => {
  try {
    const settings = await saveDrawWebSettings(req.body)
    return createSuccessResponse(res, settings, '配置已保存')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/无效|必须|不能为空|不是有效/.test(message)) {
      return createBadRequestResponse(res, message)
    }
    return createServerErrorResponse(res, `保存绘图配置失败: ${message}`)
  }
})

router.use('/assets', express.static(webDistPath, {
  redirect: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache')
      return
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  },
}))
router.get('/config', sendWebIndex)
router.get('/config/*path', sendWebIndex)

karinApp.use(WEB_PREFIX, router)
