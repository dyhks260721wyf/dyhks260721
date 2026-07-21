# 入镜 · 场景化 AI 穿搭 Demo

一个以短视频 Feed 为入口的全栈 H5 Demo：暂停视频后识别穿搭单品、查看同款、在评论区阅读 AI 解析，并进入 AI 上身生成流程。

## 已实现

- 3 条原创竖版场景穿搭视频，支持上下滚动、当前视频独占播放和点击暂停。
- 暂停后展示高清识物帧、扫描动效与单品热点。
- 同款搜索抽屉，支持“综合 / 商品”切换。
- 评论区和 AI 解析双标签、摘要、推荐问题及固定答案。
- AI 上身四步流程：人物、身材、确认、结果。
- `GET /api/content` 内容接口。
- `POST /api/generate` 服务端生图接口。
- 配置第三方兼容网关密钥时真实调用 GPT Image 2；未配置时返回本地演示结果。
- Docker standalone 构建配置。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

访问 <http://localhost:3000>。桌面端会展示移动设备画框，手机端自动全屏。

## 兼容网关生图

在 `.env.local` 中配置：

```bash
IMAGE_API_BASE_URL=https://api.8989886.xyz/v1
IMAGE_API_KEY=your_key
IMAGE_API_MODEL=gpt-image-2
IMAGE_API_FALLBACK=true
```

前端不会接触 API Key。服务端使用兼容 SDK 并通过 `baseURL` 只访问第三方网关，按场景图、完整 Look 图、人物图的顺序调用 Image Edits API。为避免网关长时间重试，单次请求上限为 95 秒且不自动重试；无 Key、网关超时或 5xx 时可以返回明确标记的本地演示结果，保证现场链路可继续。

## 参考项目

交互调研参考了 [zyronon/douyin](https://github.com/zyronon/douyin)，本地独立克隆位于相邻目录 `../douyin-reference`，当前参考提交为 `8cc6172`。本项目没有复制其 GPL 源代码或人物素材，只借鉴了移动端视频播放、邻近项渲染和底部抽屉的产品思路。

## 资料

- 产品与原型：`PRD/PRD.md`
- 架构方案：`技术方案.md`
