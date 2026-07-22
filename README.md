# 入镜 · 场景化 AI 穿搭 Demo

一个以短视频 Feed 为入口的全栈 H5 Demo：暂停视频后识别穿搭单品、查看同款、在评论区阅读 AI 解析，并进入 AI 上身生成流程。

## 已实现

- 3 条竖版场景穿搭视频示例，支持上下滚动、当前视频独占播放和点击暂停；素材统一转为 H.264/AAC。
- 视频暂停后保留用户暂停时的真实画面，只显示“试试这套穿搭”入口；该暂停帧会随上身请求上传，并作为 Seedream 的场景与完整 Look 参考图。
- 评论、AI 解析、AI 上身三标签，支持摘要、推荐问题和独立上身入口。
- AI 上身四步流程：拍摄/上传人像、性别与身材类型、身高体重、四种动作氛围、授权确认和结果生成。
- 生成结果支持自然语言继续修改场景、姿势和镜头；每次生成保留为可切换版本，并可逐张收藏、下载和发布。
- 生图开始后可收起为全局状态浮窗，用户能继续刷视频或切换底部页面；生成完成或失败后点击浮窗恢复原任务。
- 商城与商品详情，包括分类筛选、场景同款、购物袋和购买交互。
- 个人主页与 AIGC 相册，支持资产详情、原视频溯源和收藏视频。
- 发布页支持文案编辑、原声关联、可见范围、保存相册、商品关联和发布成功反馈。
- 消息页与五栏主导航，完成首页、商城、发布、消息、个人页之间的完整切换。
- `GET /api/content` 内容接口。
- `POST /api/generate` 创建异步生图任务；`GET /api/generate/:jobId` 查询状态并获取结果。
- 配置火山方舟密钥时真实调用 Seedream 5.0 Lite；未配置时返回本地演示结果。
- Docker standalone 构建配置。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

访问 <http://localhost:3000>。桌面端会展示移动设备画框，手机端自动全屏。

## Seedream 生图

在 `.env.local` 中配置：

```bash
IMAGE_API_BASE_URL=https://ark.cn-beijing.volces.com/api/plan/v3/images/generations
IMAGE_API_KEY=your_key
IMAGE_API_MODEL=doubao-seedream-5.0-lite
IMAGE_API_SIZE=2K
AI_JOB_DIR=/tmp/scene-fit-ai-jobs
```

前端不会接触 API Key。服务端把场景图和授权人像作为多参考图直接提交给 Seedream 5.0 Lite，并关闭组图模式，只生成一张 2K 结果图。身高、体重和体型会转换为明确的纵向比例及肩腰胯关系，用户选择的动作氛围会重新编排头部、手臂、躯干、重心与腿部位置，不复刻原视频姿势。首次生成和每次续图都会自动追加统一质量基线 Prompt，约束审美构图、自然姿态、面部与手脚解剖、服装物理关系以及人物与场景的光影融合。结果页再次提交时会增加 `revisionImage` 与 `revisionPrompt`，以上一版本为主参考继续修改，同时保留原场景、Look、授权人像和身体数据作为一致性约束。H5 通过异步任务状态轮询等待结果，不设置人为生图截止时间；只有上游明确返回失败时任务才结束，且不会用原图伪装成生成成功。未配置 Key 时仍提供明确标记的本地演示结果。

## 参考项目

交互调研参考了 [zyronon/douyin](https://github.com/zyronon/douyin)，本地独立克隆位于相邻目录 `../douyin-reference`，当前参考提交为 `8cc6172`。本项目没有复制其 GPL 源代码或人物素材，只借鉴了移动端视频播放、邻近项渲染和底部抽屉的产品思路。

## 资料

- 产品与原型：`PRD/PRD.md`
- 架构方案：`技术方案.md`
