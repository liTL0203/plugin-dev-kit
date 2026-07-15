# My Desktop Tools — Plugin Dev Kit

> An independent, reusable plugin development scaffold for third-party developers. Build your own desktop tool plugins and integrate with My Desktop Tools.

---

## What is this?

Plugin Dev Kit is a **ready-to-use plugin scaffold** that includes:

- **Sidecar backend template** (Rust) — communicates with Core via JSON-RPC 2.0
- **Frontend UI template** (Vue3 + TypeScript) — runs in an iframe sandbox, communicates with Core via postMessage
- **One-click build script** — automatically builds frontend + backend and generates a distributable `.zip` package
- **Comprehensive documentation** — architecture, protocol specs, API reference, AI agent workflow

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────┐
│           My Desktop Tools (Core)               │
│           Tauri v2 + Vue3 + Rust                │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐  stdin/stdout  ┌────────────┐│
│  │   Core       │◄─────────────►│  Sidecar   ││
│  │   (Rust)     │  JSON-RPC 2.0 │  (Plugin)  ││
│  └──────┬───────┘               └────────────┘│
│         │                                      │
│         │ postMessage                          │
│         ▼                                      │
│  ┌──────────────┐   postMessage  ┌───────────┐│
│  │   Core       │◄──────────────►│  Frontend ││
│  │   (Vue3)     │                │  (iframe) ││
│  └──────────────┘                └───────────┘│
└─────────────────────────────────────────────────┘
```

- **Sidecar (Backend)**: Rust compiled to an executable, communicates with Core via stdin/stdout JSON-RPC 2.0
- **Frontend UI**: Vue3 app running in an iframe sandbox, communicates with Core via postMessage
- **Key constraint**: Frontend does not communicate directly with Sidecar — all requests are routed through Core

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 20 | Frontend build |
| pnpm | >= 9 | Package manager |
| Rust | >= 1.85 | Sidecar compilation |
| Cargo | Included with Rust | Rust package manager |

### 1. Get the Template

```bash
git clone https://gitee.com/li_tl/plugin-dev-kit.git
cd plugin-dev-kit/
```

### 2. Replace Template Variables

Replace the following placeholders globally with your own information:

| Placeholder | Replace with | Example |
|-------------|--------------|---------|
| `{{PLUGIN_ID}}` | Your plugin ID (lowercase + hyphens) | `my-tool` |
| `{{PLUGIN_NAME}}` | Your plugin display name | `My Tool` |

Files affected: `manifest.json`, `package.json`, `src/Cargo.toml`, `src/src/main.rs`, `frontend/src/App.vue`, `frontend/index.html`, `scripts/build-zip.mjs`

### 3. Build & Package

```bash
# Install dependencies
pnpm install

# One-click build (frontend + Sidecar + ZIP)
pnpm build:zip
```

Output: `{{PLUGIN_ID}}.zip` — installable via Core's Plugin Manager.

---

## Command Reference

| Command | Description |
|---------|-------------|
| `pnpm install` | Install root dependencies |
| `pnpm dev` | Start frontend HMR + Sidecar hot-reload simultaneously |
| `pnpm dev:frontend` | Start frontend dev server only (port 1421) |
| `pnpm dev:sidecar` | Start Sidecar hot-reload only (cargo watch) |
| `pnpm build:frontend` | Build frontend to `dist/` |
| `pnpm build:sidecar` | Build Sidecar release binary |
| `pnpm build:zip` | One-click package as `.zip` |

---

## Directory Structure

```
plugin-dev-kit/
├── LICENSE                     # MIT License
├── CONTRIBUTING.md             # Contribution guidelines
├── manifest.json               # Plugin metadata (identity)
├── package.json                # Build script entry
├── pnpm-lock.yaml              # Dependency lock
├── RELEASE.md                  # User-facing feature doc template
├── CHANGELOG.md                # Version history template
├── PLUGIN_DEV_GUIDE.md         # Full development guide (must read)
├── API_REFERENCE.md            # Core API reference
├── EXAMPLES.md                 # Code examples
├── README.md                   # This file
├── .cargo/
│   └── config.toml             # Cargo config (Windows CRT static linking)
├── src/                        # Sidecar backend (Rust)
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs             # JSON-RPC entry point
│       └── elevated.rs         # Elevated mode communication
├── frontend/                   # Frontend UI (Vue3)
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.ts
│       ├── App.vue             # Main component (theme/shortcut/comms)
│       ├── style.css           # Dual-theme CSS variables
│       └── composables/
│           └── usePluginBridge.ts  # postMessage bridge
└── scripts/
    └── build-zip.mjs           # One-click packaging script
```

---

## Documentation

| Document | Audience | Content |
|----------|----------|---------|
| [PLUGIN_DEV_GUIDE.md](./PLUGIN_DEV_GUIDE.md) | Developers / AI Agents | Full guide (architecture, protocols, API, debugging, packaging, AI workflow) |
| [API_REFERENCE.md](./API_REFERENCE.md) | Developers | All public Core API reference |
| [EXAMPLES.md](./EXAMPLES.md) | Developers | Copy-ready code examples |

---

## Install Plugin

1. Open My Desktop Tools
2. Go to **Plugin Manager**
3. Click **Install Plugin**, select the generated `.zip` file
4. Enable the plugin

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend (Sidecar) | Rust + serde_json |
| Frontend UI | Vue 3 + TypeScript + Vite |
| Communication | JSON-RPC 2.0 (stdin/stdout) + postMessage (iframe) |
| i18n | vue-i18n |
| Package Manager | pnpm |

---

## License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE).

Copyright (c) 2026 li_tl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.

---

## ⚠️ Disclaimer

- **"AS IS"**: This software is provided "AS IS", without any express or implied warranty, including but not limited to merchantability, fitness for a particular purpose, and non-infringement.
- **Use at Your Own Risk**: The developer shall not be liable for any direct or indirect losses (including but not limited to data loss, system damage, business interruption) caused by the use of this software. Users must assess and bear all risks.
- **Third-Party Plugins**: Plugins built with this SDK are independently developed by third parties. The My Desktop Tools Core developer makes no guarantee regarding the behavior, security, or stability of third-party plugins. Users must assess and bear the risks of using third-party plugins.
- **Compatibility Risks**: This SDK may have unknown defects or be incompatible with certain system environments, hardware configurations, or third-party software. The developer does not guarantee normal operation in all environments.
- **Data Backup**: It is recommended to back up important data before using plugins built with this SDK.

> Downloading or using this software indicates that you have read and agree to the above disclaimer.

---

<details>
<summary>中文说明</summary>

# My Desktop Tools — 插件开发套件 (Plugin Dev Kit)

> 为第三方开发者提供的独立、可复用的插件开发脚手架。基于此模板，你可以快速开发自己的桌面工具插件并与 My Desktop Tools 核心程序对接。

## 这是什么？

Plugin Dev Kit 是一个**开箱即用的插件脚手架**，包含：

- **Sidecar 后端模板**（Rust）— 通过 JSON-RPC 2.0 与核心程序通信
- **前端 UI 模板**（Vue3 + TypeScript）— 运行在 iframe 沙箱中，通过 postMessage 与核心程序交互
- **一键打包脚本** — 自动构建前后端并生成可分发的 `.zip` 安装包
- **完整开发文档** — 架构说明、协议规范、API 参考、AI 智能体工作流

## 快速开始

### 环境要求

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | >= 20 | 前端构建 |
| pnpm | >= 9 | 包管理 |
| Rust | >= 1.85 | Sidecar 编译 |

### 1. 获取模板

```bash
git clone https://gitee.com/li_tl/plugin-dev-kit.git
cd plugin-dev-kit/
```

### 2. 替换模板变量

| 占位符 | 替换为 | 示例 |
|--------|--------|------|
| `{{PLUGIN_ID}}` | 你的插件 ID（小写字母+连字符） | `my-tool` |
| `{{PLUGIN_NAME}}` | 你的插件显示名称 | `我的工具` |

### 3. 构建与打包

```bash
pnpm install
pnpm build:zip
```

产物：`{{PLUGIN_ID}}.zip`，可直接通过核心程序的插件管理页面安装。

## 开发命令速查

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 同时启动前端 HMR + Sidecar 热编译 |
| `pnpm build:zip` | 一键打包为 `.zip` 安装包 |

## 开发命令速查

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 同时启动前端 HMR + Sidecar 热编译 |
| `pnpm build:zip` | 一键打包为 `.zip` 安装包 |

## 安装插件

1. 打开 My Desktop Tools
2. 进入**插件管理**页面
3. 点击**安装插件**，选择生成的 `.zip` 文件
4. 启用插件

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 (Sidecar) | Rust + serde_json |
| 前端 UI | Vue 3 + TypeScript + Vite |
| 通信协议 | JSON-RPC 2.0 (stdin/stdout) + postMessage (iframe) |

## 开源许可证

本项目采用 **MIT 许可证** — 详见 [LICENSE](./LICENSE)。

版权所有 (c) 2026 li_tl

## ⚠️ 免责声明

- **按"原样"提供**：本软件按"原样"（AS IS）提供，开发者不提供任何明示或暗示的担保。
- **风险自担**：用户因使用本软件而造成的任何直接或间接损失，开发者不承担任何责任。
- **第三方插件免责**：使用本 SDK 开发的插件由第三方独立开发，My Desktop Tools 核心程序开发者不对第三方插件的行为、安全性及稳定性作出任何保证。用户应自行评估并承担使用风险。
- **兼容性风险**：本 SDK 可能存在未知缺陷，或与特定系统环境不兼容。
- **数据备份**：建议在使用基于本 SDK 开发的插件前备份重要数据。

> 下载或使用本软件即表示您已阅读并同意以上免责声明。

</details>
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
