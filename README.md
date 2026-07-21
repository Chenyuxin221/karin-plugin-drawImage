# karin-plugin-drawImages

Karin 的 `#draw` AI 绘图插件，支持文生图和图生图，适配 OpenAI Images API 兼容接口，也支持 Chat Completions 与 Responses 图像输入模式。

## 功能

- `#draw 提示词` 文生图
- `#draw 提示词` + 附带图片 图生图
- `#draw 提示词` + 引用图片 图生图
- `#tpdraw 提示词` 临时透明背景绘图，会自动使用 PNG；Chat Completions 和 `gpt-image-2` 不执行该命令
- 固定三组配置档，可在面板中一键切换
- 子配置留空时继承全局配置
- 同一时间只执行一个绘图任务，上一张完成后才能继续下一张
- 支持流式聚合 Chat Completions / Responses 返回结果
- 支持三种图生图输入图片处理方式：默认直传、base64、自定义图床上传

## 安装

将插件放入 Karin 的 `plugins` 目录后执行：

```bash
pnpm install
pnpm build
```

构建完成后重启 Karin。

如果你修改了插件源码，也要重新执行一次：

```bash
pnpm build
```

否则 Karin 继续读取的是 `lib/` 里的旧构建产物。

## 指令

- `#draw 提示词`
- `#draw 提示词` 并附带图片
- `#draw 提示词` 并引用图片
- `#tpdraw 提示词` 临时将背景参数设为透明，不会修改配置文件
- `#配置` 查看配置档列表，当前配置后会显示 `#`
- `#切换配置1` 切换到第 1 个配置档
- `#分辨率` 查看固定分辨率列表，当前分辨率后会显示 `#`
- `#切换分辨率1` 切换当前配置档到第 1 个固定分辨率
- `#help` 查看命令菜单

当消息里带图时，会自动进入图生图模式。

Chat Completions 模式只发送模型、提示词和输入图片，不发送 `size`、`quality`、`outputFormat`、`background`、`moderation` 或 `n`。对应配置档在 Web 面板中会隐藏这些无效字段，分辨率命令也不会修改该配置档。

## 配置方式

插件包内提供：

- `config/config.yaml.example` 配置示例

运行时实际使用的配置文件通常在：

- `@karinjs/karin-plugin-drawimages/config/config.yaml`

也可以直接通过 Karin Web 配置面板修改。

## 配置结构

插件固定提供三组配置档：

- `配置一`
- `配置二`
- `配置三`

顶部的“当前配置”用于切换当前实际生效的配置档。

配置规则是：

- `全局配置` 作为默认值
- `配置一/二/三` 某项留空时，继承全局配置
- 配置档自己填写后，覆盖全局配置

这比较适合下面这种场景：

- 全局统一填写 `baseUrl`、`apiKey`
- `配置一` 走常规文生图模型
- `配置二` 走图生图模型
- `配置三` 作为备用渠道或备用模型

## 配置示例

```yaml
draw:
  activeProfile: profile1
  global:
    apiMode: images
    baseUrl: https://example.com
    apiKey: ''
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
    size: 2160x3840
    n: 1
  profiles:
    profile1:
      name: 配置一
      apiMode: ''
      baseUrl: ''
      apiKey: ''
      endpoint: ''
      model: ''
      imageDetail: ''
      useEditRoute: false
      moderation: ''
      background: ''
      outputFormat: ''
      quality: ''
      size: ''
    profile2:
      name: 配置二
    profile3:
      name: 配置三
```

## 主要配置项

| 字段 | 说明 | 默认值 |
| --- | --- | --- |
| `activeProfile` | 当前启用的配置档 | `profile1` |
| `apiMode` | 接口模式：`images`、`chatCompletions`、`responses`、`custom` | `images` |
| `baseUrl` | API 服务地址，不带末尾 `/` | `https://example.com` |
| `apiKey` | API 密钥 | 空 |
| `endpoint` | 自定义请求路径，仅 `custom` 模式使用 | `/v1/images/generations` |
| `model` | 使用的模型名称 | `gpt-image-2` |
| `imageDetail` | Chat Completions / Responses 图像细节 | `high` |
| `imageUploadMode` | 图生图输入图片处理方式：`default`、`base64`、`custom` | `default` |
| `imageUploadUrl` | 自定义图床上传接口地址，仅 `custom` 模式使用 | 空 |
| `imageUploadToken` | 自定义图床 Bearer Token，仅 `custom` 模式使用 | 空 |
| `taskLockEnabled` | 绘图任务限制，开启后上一张完成前不接受下一张 | `true` |
| `requestTimeoutSeconds` | 上游请求超时时间，单位秒 | `600` |
| `moderation` | 审核级别 | `auto` |
| `background` | 背景模式 | `auto` |
| `outputFormat` | 输出格式 | `png` |
| `quality` | 图片质量 | `high` |
| `size` | 图片尺寸 | `2160x3840` |
| `n` | 一次生成的图片数量 | `1` |

说明：

- `taskLockEnabled`、`requestTimeoutSeconds`、`n` 只在全局配置中设置
- `imageUploadMode`、`imageUploadUrl`、`imageUploadToken` 只在全局配置中设置
- `useEditRoute` 在各配置档里单独设置，不继承全局
- `useEditRoute` 默认关闭；仅当当前配置档 `apiMode=images` 且本次请求带输入图片时，才会切到 `/v1/images/edits`
- `taskLockEnabled` 默认开启；关闭后不限制并发绘图请求
- `size`、`quality`、`outputFormat`、`moderation`、`background` 可以在面板里选择“关闭”，关闭后请求里不会发送该字段

图片上传模式说明：

- `default`：直接使用 QQ 自带图床或原始图片地址
- `base64`：将输入图片转成 `data:image/...;base64,...` 后发给上游
- `custom`：先用 `multipart/form-data` 上传到你自己的图床，再把返回图片 URL 发给上游

自定义图床上传约定：

- 请求方法：`POST`
- 请求体：`multipart/form-data`
- 文件字段名：`file`
- 如果填写了 `imageUploadToken`，插件会自动带上：

```http
Authorization: Bearer <imageUploadToken>
```

图床返回值兼容下面两类：

1. 直接返回纯文本图片 URL
2. 返回 JSON，插件会递归提取第一个 `http/https` 图片链接

例如下面这个接口就是兼容的：

```bash
curl 'https://oss.senapi.fun/api/v1/upload' \
  -H 'Authorization: Bearer <token>' \
  -H 'Accept: application/json' \
  -F 'file=@/path/to/image.png'
```

尺寸预设：

| 场景 | 尺寸 | 标注 |
| --- | --- | --- |
| 头像 / 主图 | `1024x1024` | 1K |
| 横版封面 / PPT | `1536x1024` | 1.5K |
| 竖版手机海报 | `1024x1536` | 1.5K |
| 电脑壁纸 | `2560x1440` | 2K |
| 高清横版海报 | `3840x2160` | 4K |
| 高清竖版海报 | `2160x3840` | 4K |

Web 面板仍保留 `size` 自定义输入，适合上游支持额外分辨率的模型。

## 接口模式说明

### 1. images

固定请求：

```text
/v1/images/generations
```

按 Images API 风格发送请求，默认走：

- 文生图：`/v1/images/generations`
- 图生图：`/v1/images/generations`

如果开启 `useEditRoute`，则仅图生图会切到：

```text
/v1/images/edits
```

### 2. chatCompletions

固定请求：

```text
/v1/chat/completions
```

带图时会把图片放进 `messages[].content` 中，作为 `image_url` 输入，并携带 `imageDetail`。

这个模式会优先走流式请求，再把上游返回内容聚合起来，从里面提取：

- 直链图片 URL
- Markdown 图片链接
- `data:image/...`
- `base64://...`

该模式不支持 Images/Responses 风格的生成参数，包括尺寸、质量、背景、输出格式、审核级别和生成数量。

### 3. responses

固定请求：

```text
/v1/responses
```

带图时会按 Responses API 风格发送 `input[].content`：

- 文本：`input_text`
- 图片：`input_image`

这个模式会携带 `image_generation` 工具参数，并从流式聚合后的文本里提取图片链接。

### 4. custom

自定义请求路径。

适合上游路由不是标准 `/v1/images/generations`、`/v1/chat/completions` 或 `/v1/responses` 的情况。

## Web 面板

Web 配置面板支持：

- 当前配置切换
- 全局配置编辑
- 配置一/二/三单独覆盖
- 单选项切换
- `size` 自定义输入
- 图床上传 Token 隐藏输入

面板元信息里已经补充：

- 插件名称
- 作者信息
- 图标
- 版本号

## 常见问题

### 1. 提示没有配置 API Key

先确认你改的是运行时配置文件，而不是插件目录里的示例文件。

优先检查：

- `@karinjs/karin-plugin-drawimages/config/config.yaml`
- 当前启用的是不是正确的配置档
- 当前配置档是否留空并正确继承了全局 `apiKey`

### 2. 接口返回非 JSON 响应

如果报：

```text
接口返回非 JSON 响应
```

通常说明 `baseUrl + endpoint` 指向了网页、错误页、反代页或者 404 页面。

建议检查：

- `baseUrl` 是否真的是 API 地址
- `endpoint` 是否和当前 `apiMode` 对应
- 反向代理是否正确转发

### 3. 接口请求超时

如果报：

```text
接口请求超时
```

说明上游在 `requestTimeoutSeconds` 限制内没有返回结果。可以：

- 稍后重试
- 调大 `requestTimeoutSeconds`
- 切换更快的模型或渠道

### 4. 当前模型负载较高

如果报：

```text
当前模型负载较高，请稍候重试，或者切换其他模型
```

一般说明请求已经正常到达上游，问题多半在上游模型负载，不是插件本身异常。

### 5. 接口返回成功，但没有拿到图片结果

如果报：

```text
接口返回成功，但没有拿到图片结果
```

常见原因：

- 上游虽然返回 200，但内容里没有实际图片
- 上游返回格式发生变化
- 当前模型只是返回了文本，没有返回图片
- 你还在运行旧的 `lib/` 构建产物

建议排查：

1. 重新执行 `pnpm build`
2. 重启 Karin
3. 检查当前配置档
4. 检查 `apiMode`、`model`、`baseUrl`

### 6. Chat Completions 图生图没有生效

建议优先检查：

- 模型本身是否支持图像输入
- 上游是否真的兼容 `image_url` 格式
- 当前图片链接是否可被上游访问
- 上游是否更偏好流式返回

### 7. 自定义图床上传失败

如果你开启了 `imageUploadMode=custom`，优先检查：

- `imageUploadUrl` 是否是真正的 API 上传地址，而不是网页后台地址
- 图床是否要求 `Bearer Token`
- `imageUploadToken` 是否填写正确
- 图床接口是否接受 `multipart/form-data`
- 图床接口的文件字段名是否为 `file`

插件当前发出的上传请求等价于：

```bash
curl '你的图床上传地址' \
  -H 'Authorization: Bearer <imageUploadToken>' \
  -F 'file=@/path/to/input.png'
```

如果浏览器网页上传能成功、插件失败，通常是因为你用的是网页接口而不是 API 接口。网页接口通常依赖：

- 登录态 Cookie
- CSRF Token
- Referer / X-Requested-With

这类地址不适合直接填到插件里。

## 开发

常用命令：

```bash
pnpm build
pnpm exec tsc --noEmit
```

发布前至少确认：

- 构建通过
- 配置面板能正常打开
- `#draw` 文生图可用
- `#draw` 图生图可用

## 仓库

- GitHub: <https://github.com/Chenyuxin221/karin-plugin-drawImage>
