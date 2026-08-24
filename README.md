# Infinite Liquid Glass

一个可交互的「无限液态玻璃」画廊实验：在 WebGL 2 着色器里实时渲染无限延展的液态玻璃卡片网格，带有折射、色散、惯性相机与动态光照。项目是一个可独立运行的源码包，不依赖任何 OpenAI 托管配置文件。

## 技术栈

- **Next.js 16**（App Router）+ **React 19**，通过 [`vinext`](https://www.npmjs.com/package/vinext) 以 Vite 驱动构建
- **Cloudflare Workers** 运行时，借助 `@cloudflare/vite-plugin` 与 `wrangler` 本地开发 / 部署
- **WebGL 2** 片元着色器负责全部视觉渲染
- **Drizzle ORM** + **Cloudflare D1**（可选，默认未启用数据库）
- **Tailwind CSS 4**（PostCSS）与 TypeScript 5

## 环境要求

- Node.js **22.13** 或更高版本
- 支持 **WebGL 2** 的现代浏览器（推荐最新版 Chrome 或 Edge）

## 本地运行

    npm install
    npm run dev

终端出现本地地址后用浏览器打开即可，默认通常是：

    http://localhost:5173

## 交互说明

- 更大的液态玻璃卡片与更紧凑的无限网格
- 按住鼠标左键向任意方向拖拽浏览
- 120Hz 子步进临界阻尼弹簧相机
- 合并高频指针采样（coalesced events），减少拖拽跳帧
- 松手惯性、速度倾斜与动态折射
- 针对 Retina 屏降低无效像素开销
- 支持触控、滚轮和方向键

## 目录结构

- `app/page.tsx` — WebGL 顶点/片元着色器、无限网格、弹簧相机与拖拽/滚轮/键盘交互逻辑
- `app/globals.css` — 界面、光标、页脚与加载动画样式
- `app/layout.tsx` — 根布局与页面元数据（Open Graph / Twitter 卡片）
- `app/chatgpt-auth.ts` — 可选的 ChatGPT 登录辅助（读取认证请求头、跳转登录/登出）
- `worker/index.ts` — Cloudflare Worker 入口，包含图片优化端点
- `db/` — Drizzle schema 与 D1 连接（`schema.ts` 默认为空，按需添加表）
- `examples/d1/` — 启用 D1 数据库的示例
- `public/liquid-glass-mural.webp` — 六格视觉图集，运行时在 `<canvas>` 上拼装为纹理图集
- `scripts/` — CI 安装、受限构建与运行时环境封装脚本
- `tests/rendered-html.test.mjs` — 对构建产物 Worker 的渲染冒烟测试

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动本地开发服务器（Vite + Wrangler，HMR） |
| `npm run build` | 通过 `scripts/build-verified.sh` 执行有超时限制的 `vinext build` |
| `npm start` | 以生产模式启动 |
| `npm test` | 先构建，再对渲染后的 HTML 运行 Node 测试 |
| `npm run lint` | 运行 ESLint（`eslint-config-next`） |
| `npm run db:generate` | 用 `drizzle-kit` 从 `db/schema.ts` 生成迁移 |

> 构建、安装与 lint 脚本会经 `scripts/sites-env.sh` 封装，把 npm 缓存、Wrangler 与 Miniflare 状态保存在项目本地的 `.sites-runtime/` / `.wrangler/` 目录，避免污染全局环境。

## 数据库（可选）

默认 `db/schema.ts` 为空，应用不需要数据库即可运行。若要启用 Cloudflare D1：

1. 参考 `examples/d1/` 在 `db/schema.ts` 中定义表；
2. 运行 `npm run db:generate` 生成迁移；
3. 在 `vite.config.ts` 中为 `d1` 绑定填入名称，或由控制平面注入真实绑定后，通过 `db/index.ts` 的 `getDb()` 访问。

## 部署

项目以 Cloudflare Worker 形式打包（`worker/index.ts` 为入口）。执行 `npm run build` 生成 `dist/` 产物后，即可用 `wrangler` 部署到 Cloudflare。
