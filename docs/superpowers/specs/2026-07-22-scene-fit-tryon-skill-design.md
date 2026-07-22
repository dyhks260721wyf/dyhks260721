# Scene Fit Try-on Skill 设计规格

## 1. 背景与目标

`scene-fit-tryon` 是从“入镜 · 场景化 AI 穿搭”作品中抽取出的可复用 Skill，交付对象是比赛评委。Skill 不依赖作品的远程服务端，而是在评委本机启动一个 H5 和仅监听回环地址的轻量网关。

Skill 的核心任务是：接收一张包含完整场景与穿搭的参考图、一张已获授权的人像，以及身材和姿势参数，调用 Seedream 生成一张保留原场景与完整 Look、但使用目标人物身份和个性化身体比例及姿势的写实时尚图片。

交付包不包含 API Key。没有 Key 时，评委仍可通过一套原创预置素材查看完整输入、参数和结果；填写自己的 Seedream API Key 后，可以使用自有图片进行实时生成。

## 2. 成功标准

1. `.zip` 和 `.skill` 包根目录直接包含 `SKILL.md`。
2. 在 Node.js 22 环境中无需安装 npm 依赖即可启动。
3. Skill 启动后 5 秒内提供可访问的本地 H5 地址。
4. 无 API Key 时可以完整查看预置示例，但不会把示例图冒充为用户输入的生成结果。
5. 输入有效 Key 后，可以完成一次真实 Seedream 生成并下载结果。
6. API Key 仅保存在本地进程内存中，不写入文件、浏览器存储或日志。
7. Skill 可以在 Windows、macOS 和 Linux 上运行。
8. 生成失败时保留用户输入并提供明确、可恢复的错误信息。

## 3. 非目标

- 不复制原作品的短视频 Feed、评论、消息、商城、发布或个人主页。
- 不提供账号、云存储、订单、支付或远程任务队列。
- 不在无 Key 或在线生成失败时，用预置结果伪装本次生成成功。
- 不承诺服装尺码、真实试衣精度或购买建议。
- 不持久保存人像、API Key 或生成历史。

## 4. 用户体验

### 4.1 Skill 启动

当用户表达“把场景穿搭换到我的形象”“生成我在这个场景里的穿搭照”“体验 Scene Fit”等意图时，Skill：

1. 运行环境诊断。
2. 启动本地服务并仅绑定 `127.0.0.1`。
3. 选择可用端口并向用户返回 H5 URL。
4. 保持服务进程运行，直到用户结束体验或显式停止。

### 4.2 示例模式

首次打开时默认进入示例模式，展示：

- 原始场景与完整 Look 图。
- 虚构成年人物的身份参考图。
- 身高、体重、体型、穿搭方向和姿势参数。
- AI 预生成结果。
- 场景、身份与结果的三图对照。
- “预置效果示例”标识和素材来源说明。

示例模式允许用户浏览所有输入和结果，但不会声称正在调用 Seedream。用户上传自己的素材后，如果尚未配置 Key，主操作变为“配置 API 后生成”，同时保留“返回查看示例”。

### 4.3 在线生成模式

用户从 API 配置抽屉查看获取说明，将 Seedream API Key 填入密码输入框并提交到本地网关。网关只在当前进程内存中持有 Key。

用户随后：

1. 上传场景穿搭图。
2. 上传授权人像，或在浏览器允许时使用摄像头录入。
3. 选择穿搭方向、身材类型、身高、体重范围和姿势。
4. 确认人像授权与数据用途。
5. 创建生成任务并查看状态。
6. 查看、下载、重新生成或清除结果。

### 4.4 页面状态

H5 顶部始终展示一种明确状态：

- `示例模式`
- `API 已配置`
- `正在生成`
- `生成完成`
- `生成失败`

页面不使用虚假百分比。生成进度只映射到确定的任务阶段：准备输入、提交模型、等待结果、保存结果。

## 5. 交付目录

```text
scene-fit-tryon/
├─ SKILL.md
├─ package.json
├─ scripts/
│  ├─ start.mjs
│  ├─ stop.mjs
│  ├─ doctor.mjs
│  ├─ generate.mjs
│  └─ package.mjs
├─ lib/
│  ├─ server.mjs
│  ├─ prompt-builder.mjs
│  ├─ seedream-client.mjs
│  ├─ job-store.mjs
│  ├─ image-validation.mjs
│  └─ constants.mjs
├─ web/
│  ├─ index.html
│  ├─ app.js
│  └─ styles.css
├─ assets/demo/
│  ├─ scene.jpg
│  ├─ identity.jpg
│  ├─ result.jpg
│  ├─ comparison.jpg
│  └─ example.json
├─ references/
│  ├─ input-contract.md
│  ├─ api-key-guide.md
│  └─ privacy.md
└─ tests/
   ├─ prompt-builder.test.mjs
   ├─ image-validation.test.mjs
   ├─ job-store.test.mjs
   └─ demo-mode.test.mjs
```

`package.json` 只定义脚本和 Node 版本，不声明第三方依赖。实现使用 Node.js 22 内置的 HTTP、Fetch、Web FormData、文件系统和测试模块。

## 6. 组件职责

### 6.1 `SKILL.md`

定义触发条件、启动步骤、示例模式和在线模式的区别、输入要求、安全边界、停止方式及常见错误恢复。Skill 默认启动 H5；当用户明确要求自动化或批处理时，调用 `generate.mjs`。

### 6.2 本地 H5

提供移动端优先但兼容桌面的操作界面。它只与 `127.0.0.1` 本地网关通信，不直接请求 Seedream，也不使用 `localStorage`、`sessionStorage` 或 IndexedDB 保存 Key 和人像。

### 6.3 本地网关

负责静态文件服务、API Key 内存管理、文件校验、提示词构建、Seedream 请求、任务状态和临时文件清理。服务只接受同源请求并验证 `Origin` 和 `Host`，拒绝非回环地址访问。

### 6.4 命令行入口

`generate.mjs` 复用 H5 相同的验证、提示词和 Seedream 客户端，实现非交互调用。Key 只能通过当前进程环境变量或交互式隐藏输入提供，不接受命令行明文参数。

### 6.5 任务存储

每次启动创建独立临时目录。任务状态与图片只保留到进程结束，或由用户点击“清除数据”提前删除。任务 ID 使用 UUID，并在读取文件前进行格式校验。

### 6.6 本地 API 与任务状态

H5 使用以下同源接口：

- `GET /api/demo`：读取预置示例元数据和素材 URL。
- `GET /api/config/status`：只返回 API 是否已配置。
- `POST /api/config`：提交并替换当前进程内存中的 Key。
- `DELETE /api/config`：立即清除内存中的 Key。
- `POST /api/jobs`：提交图片、参数和授权确认，返回任务 ID。
- `GET /api/jobs/:jobId`：读取任务阶段和可公开错误信息。
- `GET /api/jobs/:jobId/result`：读取已完成的结果图片。
- `DELETE /api/jobs/:jobId`：取消任务并删除其临时文件。

任务只允许以下单向状态转换：

```text
queued -> preparing -> generating -> saving -> completed
   |          |             |          |
   +----------+-------------+----------+-> failed
                         |
                         +----------------> cancelled
```

`completed`、`failed` 和 `cancelled` 是终态。状态响应不得包含 API Key、完整提示词、图片 Base64 或本地绝对路径。

## 7. 输入与输出契约

### 7.1 输入

- `sceneImage`：JPEG、PNG 或 WebP，最大 8 MB；必须能看清场景和完整穿搭。
- `identityImage`：JPEG、PNG 或 WebP，最大 4 MB；必须是本人或已获授权的成年人物。
- `heightCm`：140 至 210 的整数。
- `weightRange`：`under_50`、`50_60`、`60_70`、`70_85`、`over_85`。
- `bodyType`：`hourglass`、`triangle`、`pear`、`rectangle`。
- `outfitStyle`：`womenswear` 或 `menswear`。
- `consentAccepted`：必须为 `true`。

### 7.2 输出

- 生成图片文件，保留模型实际返回的 JPEG、PNG 或 WebP 类型。
- 结果元数据：任务 ID、模型、生成模式、输入参数、创建时间和结果尺寸。
- H5 下载文件名：`scene-fit-<timestamp>.<ext>`。

元数据不记录 API Key、完整提示词中的敏感内容或原始人像数据。

## 8. 提示词策略

提示词构建器将输入拆为四类约束：

1. 场景图负责地点、背景身份、完整服装清单、颜色、材质、配饰和光线。
2. 人像图只负责已授权成年人物的可识别身份。
3. 身高、体重和体型转换为纵向比例及肩腰胯关系。
4. 姿势指令重新编排头部、手臂、躯干、重心和腿部，不复刻场景图原人物姿势。

输出要求一名成年人物、自然解剖结构、完整可见的身体比例、合理接地阴影，并禁止文字、水印、额外人物、额外肢体和虚构服装。

## 9. Seedream 集成

默认配置：

- Endpoint：`https://ark.cn-beijing.volces.com/api/plan/v3/images/generations`
- Model：`doubao-seedream-5.0-lite`
- Size：`2K`
- Sequential image generation：关闭
- Watermark：关闭

本地网关将场景图和人像图编码为多参考图请求。它支持上游返回 Base64 或图片 URL，并在保存前校验文件签名和大小。

API Key 配置接口只接受由本地 H5 发出的同源请求，并校验 `Origin`、`Host` 和回环地址。localhost 的 HTTP 页面可用；非回环来源一律拒绝。Key 保存在闭包或会话对象内，状态接口只能返回“已配置/未配置”，不能回传 Key。

## 10. 错误处理

- 无 Key：返回 `API_KEY_REQUIRED`，H5 打开配置抽屉。
- 授权未确认：返回 `CONSENT_REQUIRED`。
- 文件格式或大小错误：返回 `INVALID_IMAGE`。
- 身材或姿势参数错误：返回 `INVALID_INPUT`。
- 401/403：返回 `UPSTREAM_AUTH_FAILED`，清除内存中的无效 Key。
- 429：返回 `RATE_LIMITED`，保留输入并允许稍后重试。
- 上游 5xx：返回 `UPSTREAM_ERROR`，不切换成预置结果。
- 网络中断：任务进入失败或可重试状态，允许用户重新提交。
- 结果内容无效：返回 `INVALID_IMAGE_RESULT`，不保存损坏文件。
- 用户取消：通过 `AbortController` 中止请求，并删除任务临时文件。

所有服务端错误日志必须屏蔽 Authorization Header、API Key、Base64 图片和完整人像路径。

## 11. 预置素材规范

预置素材全部重新生成，不复用作品现有图片，也不使用真实人物：

- 场景：海边现代美术馆。
- Look：钴蓝结构外套、简洁内搭、奶油色长裤及无品牌配饰。
- 身份人物：AI 生成的虚构成年女性。
- 结果姿势：自然行走，与场景图人物姿势明显不同。

`comparison.jpg` 横向或纵向并列场景、身份和结果，供评委快速理解能力。`example.json` 记录对应参数、素材为 AI 生成的声明及结果属于预生成示例的声明。

预置素材不标注为实时 Seedream 结果，除非实际生成过程确实使用 Seedream 且保留了可核验的模型信息。

## 12. 安全与隐私

- 服务只绑定 IPv4 回环地址 `127.0.0.1`。
- API Key 使用密码输入控件，仅存于当前服务进程内存。
- H5 不持久化 Key、人像或生成结果。
- 临时目录权限限制为当前用户，并在正常退出时删除。
- 对异常退出遗留目录，`doctor.mjs` 仅清理由本 Skill 创建且超过 24 小时的目录。
- 所有文件路径必须经过任务 ID 和目录边界校验。
- 页面明确要求用户只能上传本人或已获授权的成年人物图片。

## 13. 测试策略

### 13.1 自动测试

- 提示词测试：所有体型、体重和姿势映射稳定，且包含场景与身份职责边界。
- 图片校验测试：接受合法 JPEG、PNG、WebP，拒绝伪造扩展名、超限和空文件。
- 任务存储测试：状态转换、目录边界、取消和清理行为正确。
- 示例模式测试：无 Key 时示例可读，自有输入不能生成，也不会返回预置图。
- 密钥测试：配置状态不泄露 Key，日志脱敏。
- Seedream 客户端测试：使用本地假上游覆盖成功、401、429、5xx、Base64 和 URL 结果。

### 13.2 视觉与交互验收

- 桌面和移动视口截图无溢出、重叠或空白图片。
- 示例图完整显示，不使用影响检查结果的强裁剪。
- 键盘可访问 API 配置、上传、参数和结果操作。
- 生成状态变化不引起核心布局跳动。
- 无 Key、无摄像头权限和在线失败均有明确下一步。

### 13.3 可选在线测试

只有显式提供测试 Key 时才运行一次真实 Seedream 冒烟测试。普通测试和打包流程不得依赖外部网络或 API Key。

## 14. 打包与交付

`package.mjs` 执行以下步骤：

1. 运行自动测试和环境诊断。
2. 校验 `SKILL.md`、H5 文件、预置素材和引用文档完整。
3. 扫描包内是否包含疑似 API Key、`.env`、日志或临时结果。
4. 生成 `scene-fit-tryon.zip`。
5. 复制相同内容并生成 `scene-fit-tryon.skill`。
6. 解包两种产物，验证根目录直接包含 `SKILL.md`。

打包器使用仓库内的零依赖 ZIP 实现和 Node.js 内置压缩模块，不依赖系统专有命令。最终产物不包含 `node_modules`、开发缓存、真实人像、API Key 或生成任务临时文件。
