# karin-plugin-drawimages

[![npm version](https://img.shields.io/npm/v/karin-plugin-drawimages?style=flat-square&color=0f766e)](https://www.npmjs.com/package/karin-plugin-drawimages)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](./LICENSE)

Karin 的 AI 绘图插件，支持文生图、图生图、Images API、Responses API、Chat Completions 以及自定义兼容接口。

## 功能

- `#draw` 支持文生图和图生图；图片可以来自当前消息或引用消息。
- `#tpdraw` 临时使用透明背景绘图，不会修改持久化配置。
- 支持保存、复用和管理提示词，正文可以来自命令文本、引用消息或 `.txt`/`.md` 文件。
- Karin Web 面板提供配置档和提示词库管理，包括搜索、新增、编辑和删除。
- 提供三组固定配置档，配置档字段留空时继承全局默认值。
- 支持原始地址、Base64 和自定义图床三种图片输入方式。
- 默认启用绘图任务锁，避免多个绘图请求同时执行。

## 安装

在 Karin 根目录执行：

```bash
pnpm add karin-plugin-drawimages
pnpm exec ki rs
```

重启完成后，登录 Karin Web 面板，打开插件的 `AI 绘图` 配置页。插件页面地址为：

```text
/drawimages/config
```

首次使用至少需要填写全局 `API 服务地址`、`API 密钥` 和 `模型`。配置保存后立即生效。

## Web 配置

Web 面板分为 `全局默认` 和三个配置档。全局默认用于设置通用连接和运行参数，配置档可以覆盖接口地址、接口模式、模型和生成参数。配置档中的字段留空时，会继续使用全局值。

### 接口模式

| 模式 | 默认请求路径 | 说明 |
| --- | --- | --- |
| `Images` | `/v1/images/generations` | Images API 风格接口 |
| `Chat` | `/v1/chat/completions` | Chat Completions 流式接口 |
| `Responses` | `/v1/responses` | Responses 流式接口 |
| `Custom` | 自定义 | 使用配置中填写的请求路径 |

`API 服务地址`只填写服务根地址，例如 `https://api.example.com`，不要把 `/v1/...` 请求路径重复填入。插件会根据接口模式自动选择默认路径。

### 图片和生成参数

- `输入图像细节`控制图生图时发送给上游的图像细节级别。
- 全局`图片输入方式`可选择直接使用原始地址、转换为 Base64，或先上传到自定义图床。
- `输出尺寸`、`生成质量`、`输出格式`、`背景`和`审核级别`由 Images/Custom/Responses 模式使用；Chat 模式不会发送这些输出参数。
- Images 模式的配置档可以开启`图生图使用 Edit 路由`，带输入图片时请求 `/v1/images/edits`。
- 全局`绘图任务锁`限制同一时间只能执行一个绘图任务；`请求超时`和`单次生成数量`也在全局设置中调整。

## 使用命令

| 命令 | 说明 |
| --- | --- |
| `#draw 提示词` | 文生图 |
| `#draw p001` | 使用 ID 为 `p001` 的保存提示词 |
| `#draw p001 补充描述` | 使用保存提示词并追加描述 |
| `#draw 提示词` + 图片 | 使用当前消息图片进行图生图 |
| `#draw 提示词` + 引用图片 | 使用引用消息图片进行图生图 |
| `#tpdraw 提示词` | 临时透明背景绘图 |
| `#tpdraw p001` | 使用保存提示词进行临时透明背景绘图 |
| `#提示词` | 查看提示词列表 |
| `#提示词 p001` | 查看提示词详情 |
| `#新增提示词 0 名称 [正文]` | 新增提示词，管理员或群主可用 |
| `#编辑提示词 p001 0 名称 [正文]` | 编辑提示词，管理员或群主可用 |
| `#删除提示词 p001` | 删除提示词，管理员或群主可用 |
| `#help` | 查看绘图插件命令菜单 |
| `#配置` | 查看三组配置档，管理员或群主可用 |
| `#切换配置1` | 切换到第 1 组配置，管理员或群主可用 |
| `#分辨率` | 查看当前模式可用的分辨率预设，管理员或群主可用 |
| `#切换分辨率1` | 切换当前配置档分辨率，管理员或群主可用 |

管理类群命令要求发送者拥有群管理员权限或群主权限。查看提示词和执行绘图不要求管理员权限，但 `type: 1` 提示词仍然必须附带或引用图片。

## 提示词库

提示词库保存在 Karin 运行时目录：

```text
@karinjs/karin-plugin-drawimages/data/prompts.json
```

文件使用版本化 JSON 格式。每条记录的 `type` 必须是数字 `0` 或 `1`：

```json
{
  "version": 1,
  "prompts": [
    {
      "id": "p001",
      "type": 0,
      "name": "日系头像",
      "text": "日系插画风格，柔和光线，干净背景"
    },
    {
      "id": "p002",
      "type": 1,
      "name": "人物改图",
      "text": "保留人物主体和脸部特征，调整为电影感光影"
    }
  ]
}
```

`type: 0` 是普通文本提示词，直接使用提示词正文。`type: 1` 是需要图片的提示词，使用时必须附带当前消息图片或引用消息图片；图片不会写入 JSON 文件。

提示词 ID 使用 `p001`、`p002` 这类格式，由新增操作自动生成。Web 面板可以按 ID、名称和正文搜索提示词。

新增或编辑群命令可以省略正文。正文读取优先级如下：

1. 命令末尾直接输入的正文。
2. 当前消息附带的 `.txt` 或 `.md` 文件。
3. 引用消息附带的 `.txt` 或 `.md` 文件。
4. 引用消息中的文本。

例如，引用一条文本消息后发送：

```text
#新增提示词 0 日系头像
```

## 透明背景限制

`#tpdraw` 会临时将背景设置为 `transparent`，不改变配置文件。当前 Chat Completions 模式不支持透明背景；模型 `gpt-image-2` 也不支持透明背景，需要切换到支持该参数的模型。

## 运行文件

插件运行时文件位于 Karin 的 `@karinjs` 目录下：

```text
@karinjs/karin-plugin-drawimages/
├── config/config.yaml
└── data/prompts.json
```

通常不需要手动编辑这些文件，推荐使用 Web 面板管理配置和提示词。API 密钥属于敏感信息，请勿提交到 Git 仓库或公开分享。

## 开发

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

启动 Web 配置页开发服务器：

```bash
pnpm web:dev
```

发布前需要重新执行 `pnpm build`。

## 许可证

[Apache-2.0](./LICENSE)
