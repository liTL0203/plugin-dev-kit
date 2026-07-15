# My Desktop Tools — 插件开发套件 (Plugin Dev Kit)

> 为第三方开发者提供的独立、可复用的插件开发脚手架。基于此模板，你可以快速开发自己的桌面工具插件并与 My Desktop Tools 核心程序对接。

**[English](./README.md)** | **中文版**

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

- **Sidecar（后端）**：Rust 编译为可执行文件，通过 stdin/stdout JSON-RPC 2.0 与 Core 通信
- **前端 UI**：Vue3 应用运行在 iframe 沙箱中，通过 postMessage 与 Core 通信
- **关键约束**：前端不直接与 Sidecar 通信 — 所有请求都经由 Core 路由

---

## 快速开始

### 环境要求

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | >= 20 | 前端构建 |
| pnpm | >= 9 | 包管理 |
| Rust | >= 1.85 | Sidecar 编译 |
| Cargo | 随 Rust 安装 | Rust 包管理器 |

### 1. 获取模板

```bash
git clone https://gitee.com/li_tl/plugin-dev-kit.git
cd plugin-dev-kit/
```

### 2. 替换模板变量

全局替换以下占位符为你自己的信息：

| 占位符 | 替换为 | 示例 |
|--------|--------|------|
| `{{PLUGIN_ID}}` | 你的插件 ID（小写字母+连字符） | `my-tool` |
| `{{PLUGIN_NAME}}` | 你的插件显示名称 | `我的工具` |

涉及的文件：`manifest.json`、`package.json`、`src/Cargo.toml`、`src/src/main.rs`、`frontend/src/App.vue`、`frontend/index.html`、`scripts/build-zip.mjs`

### 3. 构建与打包

```bash
# 安装依赖
pnpm install

# 一键构建（前端 + Sidecar + ZIP）
pnpm build:zip
```

产物：`{{PLUGIN_ID}}.zip` — 可通过核心程序的插件管理器安装。

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
├── LICENSE                     # MIT 许可证
├── CONTRIBUTING.md             # 贡献指南（英文）
├── CONTRIBUTING.zh-CN.md       # 贡献指南（中文）
├── manifest.json               # 插件元数据（身份标识）
├── package.json                # 构建脚本入口
├── pnpm-lock.yaml              # 依赖锁定
├── RELEASE.md                  # 用户功能说明文档模板
├── CHANGELOG.md                # 版本更新记录模板
├── PLUGIN_DEV_GUIDE.md         # 完整开发指南（必读）
├── PLUGIN_DEV_GUIDE.zh-CN.md   # 完整开发指南（中文版）
├── API_REFERENCE.md            # Core API 参考文档
├── EXAMPLES.md                 # 示例代码文档
├── README.md                   # 英文说明
├── README.zh-CN.md             # 本文件（中文说明）
├── .cargo/
│   └── config.toml             # Cargo 配置（Windows CRT 静态链接）
├── src/                        # Sidecar 后端（Rust）
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs             # JSON-RPC 入口
│       └── elevated.rs         # 提权模式通信模块
├── frontend/                   # 前端 UI（Vue3）
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.ts             # 应用入口
│       ├── App.vue             # 主组件（含主题/快捷键/通信模板）
│       ├── style.css           # 双主题 CSS 变量
│       └── composables/
│           └── usePluginBridge.ts  # postMessage 通信桥接
└── scripts/
    └── build-zip.mjs           # 一键打包脚本
```

---

## 文档索引

| 文档 | 受众 | 内容 |
|------|------|------|
| [PLUGIN_DEV_GUIDE.zh-CN.md](./PLUGIN_DEV_GUIDE.zh-CN.md) | 开发者 / AI 智能体 | 完整开发指南（架构、协议、API、调试、打包、AI 工作流） |
| [API_REFERENCE.md](./API_REFERENCE.md) | 开发者 | Core 提供的所有公开 API 接口参考 |
| [EXAMPLES.md](./EXAMPLES.md) | 开发者 | 可复制的代码示例（通知、主题、设置、事件、通信） |

---

## 安装插件

1. 打开 My Desktop Tools
2. 进入**插件管理**页面
3. 点击**安装插件**，选择生成的 `.zip` 文件
4. 启用插件

---

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 (Sidecar) | Rust + serde_json |
| 前端 UI | Vue 3 + TypeScript + Vite |
| 通信协议 | JSON-RPC 2.0 (stdin/stdout) + postMessage (iframe) |
| 国际化 | vue-i18n |
| 包管理器 | pnpm |

---

## 开源许可证

本项目采用 **MIT 许可证** — 详见 [LICENSE](./LICENSE)。

版权所有 (c) 2026 li_tl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.

---

## ⚠️ 免责声明

- **按"原样"提供**：本软件按"原样"（AS IS）提供，开发者不提供任何明示或暗示的担保，包括但不限于适销性、特定用途适用性和非侵权性。
- **风险自担**：用户因使用本软件而造成的任何直接或间接损失（包括但不限于数据丢失、系统损坏、业务中断），开发者不承担任何责任。用户须自行评估并承担所有风险。
- **第三方插件免责**：使用本 SDK 开发的插件由第三方独立开发，My Desktop Tools 核心程序开发者不对第三方插件的行为、安全性及稳定性作出任何保证。用户应自行评估并承担使用风险。
- **兼容性风险**：本 SDK 可能存在未知缺陷，或与特定系统环境、硬件配置或第三方软件不兼容。开发者不保证在所有环境中正常运行。
- **数据备份**：建议在使用基于本 SDK 开发的插件前备份重要数据。

> 下载或使用本软件即表示您已阅读并同意以上免责声明。
