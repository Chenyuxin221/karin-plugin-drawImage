import fs from 'node:fs'
import path from 'node:path'
import { URL, fileURLToPath } from 'node:url'
import { karinPathBase, requireFileSync } from 'node-karin'

/** 插件包绝对路径。 */
const pluginDir = fileURLToPath(new URL('../', import.meta.url))
/** 插件 package.json 内容。 */
const pkg = requireFileSync(path.join(pluginDir, 'package.json'))
/** 插件运行时目录名称。 */
const pluginName = String(pkg.name || 'karin-plugin-drawimages')

/**
 * 插件目录信息。
 */
export const dir = {
  /** 插件根目录绝对路径。 */
  pluginDir,
  /** 插件运行时目录名称。 */
  pluginName,
  /** 插件 package.json 内容。 */
  pkg,
  /** 插件版本，来自 package.json 的 version。 */
  get version () {
    return pkg.version
  },
  /** 插件名称，来自 package.json 的 name。 */
  get name () {
    return pkg.name
  },
  /** 插件在 @karinjs 运行时目录中的绝对路径。 */
  get karinPath () {
    const runtimeDir = process.env.KARIN_DRAWIMAGES_RUNTIME_DIR?.trim()
    if (runtimeDir) return path.resolve(runtimeDir)

    return path.join(karinPathBase, pluginName)
  },
  /** 插件运行时配置目录。 */
  get ConfigDir () {
    return path.join(this.karinPath, 'config')
  },
  /** 插件运行时配置目录。 */
  get configDir () {
    return path.join(this.karinPath, 'config')
  },
  /** 插件运行时配置文件。 */
  get configFile () {
    return path.join(this.configDir, 'config.yaml')
  },
  /** 插件运行时数据目录。 */
  get dataDir () {
    return path.join(this.karinPath, 'data')
  },
  /** 提示词库文件。 */
  get promptFile () {
    return path.join(this.dataDir, 'prompts.json')
  },
  /** 插件运行时资源目录。 */
  get defResourcesDir () {
    return path.join(this.karinPath, 'resources')
  },
}

/**
 * 初始化运行时目录。
 */
export function ensureRuntimeLayout (): void {
  fs.mkdirSync(dir.configDir, { recursive: true })
  fs.mkdirSync(dir.dataDir, { recursive: true })
  fs.mkdirSync(dir.defResourcesDir, { recursive: true })
}
