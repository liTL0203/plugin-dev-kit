# My Desktop Tools — 插件开发套件 (Plugin Dev Kit)

> 为第三方开发者提供的独立、可复用的插件开发脚手架。基于此模板，你可以快速开发自己的桌面工具插件并与 My Desktop Tools 核心程序对接。

---

## 这是什么？

Plugin Dev Kit 是一个**开箱即用的插件脚手架**，包含：

- **Sidecar 后端模板**（Rust）— 通过 JSON-RPC 2.0 与核心程序通信
- **前端 UI 模板**（Vue3 + TypeScript）— 运行在 iframe 沙箱中，通过 postMessage 与核心程序交互
- **一键打包脚本** — 自动构建前后端并生成可分发的 `.zip` 安装包
- **完整开发文档** — 架构说明、协议规范、API 参考、AI 智能体工作流

## 三层架构

```
┌─────────────────────────────────────────────────┐
│           My Desktop Tools (Core)               │
│           Tauri v2 + Vue3 + Rust                │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐  stdin/stdout  ┌────────────┐│
│  │   Core 后端   │◄─────────────►│  Sidecar   ││
│  │   (Rust)     │  JSON-RPC 2.0 │  (你的插件) ││
│  └──────┬───────┘               └────────────┘│
│         │                                      │
│         │ postMessage                          │
│         ▼                                      │
│  ┌──────────────┐   postMessage  ┌───────────┐│
│  │   Core 前端   │◄──────────────►│  前端 UI  ││
│  │   (Vue3)     │                │  (iframe) ││
│  └──────────────┘                └───────────┘│
└─────────────────────────────────────────────────┘
```

- **Sidecar（后端）**：Rust 编译为可执行文件，通过 stdin/stdout JSON-RPC 2.0 与 Core 通信
- **前端 UI**：Vue3 应用，运行在 iframe 沙箱中，通过 postMessage 与 Core 交互
- **核心约束**：前端不直接与 Sidecar 通信，所有请求经 Core 中转

---

## 快速开始

### 环境要求

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | >= 20 | 前端构建 |
| pnpm | >= 9 | 包管理 |
| Rust | >= 1.85 | Sidecar 编译 |
| Cargo | 随 Rust 安装 | Rust 包管理 |

### 1. 获取模板

```bash
# 克隆或下载本 SDK 目录到本地
git clone <仓库地址>
cd plugin-dev-kit/

# 或直接将此目录复制到你喜欢的位置
```

### 2. 替换模板变量

将以下占位符全局替换为你自己的信息：

| 占位符 | 替换为 | 示例 |
|--------|--------|------|
| `{{PLUGIN_ID}}` | 你的插件 ID（小写字母+连字符） | `my-tool` |
| `{{PLUGIN_NAME}}` | 你的插件显示名称 | `我的工具` |

涉及的文件：`manifest.json`、`package.json`、`src/Cargo.toml`、`src/src/main.rs`、`frontend/src/App.vue`、`frontend/index.html`、`scripts/build-zip.mjs`

### 3. 构建与打包

```bash
# 安装依赖
pnpm install

# 一键打包（构建前端 + Sidecar + 生成 ZIP）
pnpm build:zip
```

产物：`{{PLUGIN_ID}}.zip`，可直接通过核心程序的插件管理页面安装。

---

## 开发命令速查

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装根目录依赖 |
| `pnpm dev` | 同时启动前端 HMR + Sidecar 热编译 |
| `pnpm dev:frontend` | 仅启动前端 dev server（端口 1421） |
| `pnpm dev:sidecar` | 仅启动 Sidecar 热编译（cargo watch） |
| `pnpm build:frontend` | 构建前端到 `dist/` |
| `pnpm build:sidecar` | 构建 Sidecar release 二进制 |
| `pnpm build:zip` | 一键打包为 `.zip` 安装包 |

---

## 目录结构

```
plugin-dev-kit/
├── manifest.json                # 插件元数据（身份标识）
├── package.json                 # 构建脚本入口
├── pnpm-lock.yaml               # 依赖锁定
├── RELEASE.md                   # 用户功能说明文档模板
├── CHANGELOG.md                 # 版本更新记录模板
├── PLUGIN_DEV_GUIDE.md          # 完整开发指南（必读）
├── API_REFERENCE.md             # Core API 参考文档
├── EXAMPLES.md                  # 示例代码文档
├── README.md                    # 本文件
├── .cargo/
│   └── config.toml              # Cargo 配置（Windows CRT 静态链接）
├── src/                         # Sidecar 后端（Rust）
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs              # JSON-RPC 入口
│       └── elevated.rs          # 提权模式通信模块
├── frontend/                    # 前端 UI（Vue3）
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── src/
│       ├── main.ts              # 应用入口
│       ├── App.vue              # 主组件（含主题/快捷键/通信模板）
│       ├── style.css            # 双主题 CSS 变量
│       ├── composables/
│       │   └── usePluginBridge.ts  # postMessage 通信桥接
│       └── i18n/
│           ├── index.ts         # i18n 配置
│           └── locales/
│               ├── zh-CN.json
│               └── en-US.json
└── scripts/
    └── build-zip.mjs            # 一键打包脚本
```

---

## 文档索引

| 文档 | 受众 | 内容 |
|------|------|------|
| [PLUGIN_DEV_GUIDE.md](./PLUGIN_DEV_GUIDE.md) | 开发者 / AI 智能体 | 完整开发指南（架构、协议、API、调试、打包、AI 工作流） |
| [API_REFERENCE.md](./API_REFERENCE.md) | 开发者 | Core 提供的所有公开 API 接口参考 |
| [EXAMPLES.md](./EXAMPLES.md) | 开发者 | 可复制的代码示例（通知、主题、设置、事件、通信） |

---

## 安装插件

1. 打开 My Desktop Tools
2. 进入**插件管理**页面
3. 点击**安装插件**，选择生成的 `.zip` 文件
4. 启用插件

---

## 自启动 (on_startup)

如果你的插件需要 Core 启动时自动运行 Sidecar（如代理服务、剪贴板监听、全局快捷键），在 `manifest.json` 中添加：

```json
{
  "activation_events": ["onRoute:/tools/{{PLUGIN_ID}}", "on_startup"]
}
```

不需要后台常驻的插件（如番茄钟）不要添加 `on_startup`。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 (Sidecar) | Rust + serde_json |
| 前端 UI | Vue 3 + TypeScript + Vite |
| 通信协议 | JSON-RPC 2.0 (stdin/stdout) + postMessage (iframe) |
| 国际化 | vue-i18n |
| 包管理 | pnpm |

---

## License

MIT
