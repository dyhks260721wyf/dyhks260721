# 入镜 · 场景化 AI 穿搭 Demo

一个以短视频 Feed 为入口的全栈 H5 Demo：暂停视频后识别穿搭单品、查看同款、在评论区阅读 AI 解析，并进入 AI 上身生成流程。

## 已实现

- 3 条原创竖版场景穿搭视频，支持上下滚动、当前视频独占播放和点击暂停。
- 暂停后展示高清识物帧、扫描动效与单品热点。
- 同款搜索抽屉，支持“综合 / 商品”切换。
- 评论、AI 解析、AI 上身三标签，支持摘要、推荐问题和独立上身入口。
- AI 上身四步流程：拍摄/上传人像、性别与身材类型、身高体重、授权确认和结果生成。
- 生成结果支持收藏、下载、再生成、一键发布、跳转原视频/原声和同款商品瀑布流。
- 商城与商品详情，包括分类筛选、场景同款、购物袋和购买交互。
- 个人主页与 AIGC 相册，支持资产详情、原视频溯源和收藏视频。
- 发布页支持文案编辑、原声关联、可见范围、保存相册、商品关联和发布成功反馈。
- 消息页与五栏主导航，完成首页、商城、发布、消息、个人页之间的完整切换。
- `GET /api/content` 内容接口。
- `POST /api/generate` 创建异步生图任务；`GET /api/generate/:jobId` 查询状态并获取结果。
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
VISION_ORCHESTRATOR_MODEL=gpt-5.6-sol
AI_JOB_DIR=/tmp/scene-fit-ai-jobs
```

前端不会接触 API Key。服务端通过 `baseURL` 只访问第三方网关，把场景图和授权人像直接交给 `gpt-5.6-sol`；提示词要求 Sol 在同一个 Responses 请求中调用内置 `image_generation` 工具（由 `gpt-image-2` 执行），后端不再单独请求 Images API。上游使用流式响应并接收 keepalive，不设置人为生图截止时间；H5 通过任务状态轮询等待结果，因此不会被浏览器长连接超时截断。只有上游明确返回失败时任务才结束，且不会用原图伪装成生成成功。未配置 Key 时仍提供明确标记的本地演示结果。

## 参考项目

交互调研参考了 [zyronon/douyin](https://github.com/zyronon/douyin)，本地独立克隆位于相邻目录 `../douyin-reference`，当前参考提交为 `8cc6172`。本项目没有复制其 GPL 源代码或人物素材，只借鉴了移动端视频播放、邻近项渲染和底部抽屉的产品思路。

## 资料

- 产品与原型：`PRD/PRD.md`
- 架构方案：`技术方案.md`
