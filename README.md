# karin-plugin-drawImages

[![npm version](https://img.shields.io/npm/v/karin-plugin-drawimages?style=flat-square&color=0f766e)](https://www.npmjs.com/package/karin-plugin-drawimages)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](./LICENSE)

Karin 的 AI 绘图插件。支持文生图、图生图、Responses、Chat Completions 与 Images API 兼容接口。

## 快速开始

在 Karin 根目录执行：

```bash
pnpm add karin-plugin-drawimages
pnpm exec ki rs
```

安装后进入 Karin Web 面板，打开 `AI 绘图` 配置页，填写 `baseUrl`、`apiKey`、模型等参数并保存。

## 功能特性

- `#draw` 文生图，附带或引用图片时自动进入图生图。
- `#tpdraw` 临时透明背景绘图，不会写回配置文件。
- 固定三组配置档，可在 Web 面板或群内命令切换。
- 配置档字段留空时自动继承全局配置。
- 支持 `images`、`responses`、`chatCompletions`、`custom` 四种接口模式。
- 支持默认直传、base64、自定义图床上传三种图片输入处理方式。
- 默认启用绘图任务锁，上一张完成前不接受下一张任务。

## 使用命令

| 命令 | 说明 |
| --- | --- |
| `#draw 提示词` | 文生图 |
| `#draw 提示词` + 图片 | 图生图 |
| `#draw 提示词` + 引用图片 | 使用引用消息里的图片图生图 |
| `#tpdraw 提示词` | 临时透明背景绘图 |
| `#help` | 查看绘图插件命令菜单 |
| `#配置` | 查看三组配置档，群主/管理员可用 |
| `#切换配置1` | 切换到第 1 组配置，群主/管理员可用 |
| `#分辨率` | 查看固定分辨率预设，群主/管理员可用 |
| `#切换分辨率1` | 切换当前配置档分辨率，群主/管理员可用 |

## 开发

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

Web 面板开发：

```bash
pnpm web:dev
```

## 许可证

[Apache-2.0](./LICENSE)
