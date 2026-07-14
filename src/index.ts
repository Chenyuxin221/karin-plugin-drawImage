import { dir } from './dir'
import { logger } from 'node-karin'
import './web/server'

logger.info(`${logger.violet(`[插件:${dir.version}]`)} ${logger.green(dir.name)} 初始化完成~`)
