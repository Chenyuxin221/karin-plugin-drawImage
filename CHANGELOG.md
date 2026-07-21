# Changelog

## [1.0.1](https://github.com/Chenyuxin221/karin-plugin-drawImage/compare/v1.0.0...v1.0.1) (2026-07-21)


### Bug Fixes

* correct published plugin metadata ([1e45e1d](https://github.com/Chenyuxin221/karin-plugin-drawImage/commit/1e45e1d1c0463cd323b1b3be73c2ce6c3aa10052))

## 1.0.0 (2026-07-21)


### Bug Fixes

* bug ([4955ded](https://github.com/Chenyuxin221/karin-plugin-drawImage/commit/4955ded3037ae004a8e5c96484fa8b14689b1897))
* bug ([77bc31d](https://github.com/Chenyuxin221/karin-plugin-drawImage/commit/77bc31de77b96ba3b43d4aed01dcf9c4d039324a))

## 1.0.0

- 将绘图脚本整理为独立 Karin 插件包
- 支持 `#draw` 文生图
- 支持附图和引用图片的图生图
- 支持 `#tpdraw` 临时透明背景绘图
- 增加全局绘图任务限制开关，默认上一张完成后才能继续下一张
- 增加请求超时配置与更清晰的错误提示
- 支持固定三组配置档与全局配置继承
- 增加 Web 配置面板与配置档切换
- 支持 `images`、`chatCompletions`、`responses`、`custom` 四种接口模式
- `chatCompletions` 与 `responses` 模式支持流式聚合结果
- Web 配置面板增加带场景与 K 标注的固定尺寸预设
- 改进图片结果提取，兼容 Markdown 图片链接与带下载链接的返回格式
