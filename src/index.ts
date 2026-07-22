import { dir, ensureRuntimeLayout } from './dir'
import { logger } from 'node-karin'
import './web/server'

try {
  ensureRuntimeLayout()
} catch (error) {
  logger.error('[karin-plugin-drawimages] 初始化运行时目录失败', error)
}

logger.info(`${logger.violet(`[插件:${dir.version}]`)} ${logger.green(dir.name)} 初始化完成~`)
