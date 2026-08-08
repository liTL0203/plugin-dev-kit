# My Desktop Tools — Plugin Development Guide

> **Version**: v1.1 | **For**: My Desktop Tools Plugin System | **Last Updated**: 2026-07-15
>
> This document is the sole reference for developers and AI agents building plugins. Read it from start to finish to master everything needed for plugin development.
>
> **License**: MIT — see [LICENSE](./LICENSE) for details.

**[中文版](./PLUGIN_DEV_GUIDE.zh-CN.md)** | **English**

---

## Reading Guide / 阅读导航

根据你的角色，推荐以下阅读路径：

| 角色 | 推荐路径 |
|------|----------|
| **快速上手** | 第 1-3 节（架构+目录+manifest）→ 第 12 节（实战） |
| **前端开发者** | 第 5 节（Vue3 前端）→ 第 7 节（postMessage 协议）→ 第 9 节（Core API） |
| **后端开发者** | 第 4 节（Sidecar Rust）→ 第 6 节（JSON-RPC 协议）→ 第 8 节（内置方法） |
| **AI 智能体** | 全文阅读 → 附录 D（MANDATORY 工作流） |

---

## 目录

1. [架构概览](#1-架构概览)
2. [插件目录结构](#2-插件目录结构)
3. [manifest.json 完整规范](#3-manifestjson-完整规范)
4. [Sidecar 后端开发 (Rust)](#4-sidecar-后端开发-rust)
5. [前端开发 (Vue3)](#5-前端开发-vue3)
6. [Core ↔ Sidecar 通信协议 (JSON-RPC 2.0)](#6-core--sidecar-通信协议-json-rpc-20)
7. [Core ↔ 前端通信协议 (postMessage)](#7-core--前端通信协议-postmessage)
8. [内置 RPC 方法清单](#8-内置-rpc-方法清单)
9. [Core 功能 API](#9-core-功能-api)
10. [开发调试](#10-开发调试)
11. [构建与打包](#11-构建与打包)
12. [开发实战：从零开始创建插件](#12-开发实战从零开始创建插件)

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────┐
│                 My Desktop Tools (Core)          │
│                 Tauri v2 + Vue3 + Rust           │
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
│                                                 │
└─────────────────────────────────────────────────┘
```

**每个插件由两部分组成：**

| 组件 | 语言 | 通信方式 | 职责 |
|------|------|----------|------|
| **Sidecar（后端）** | Rust（或任何可编译为可执行文件的语言） | stdin/stdout JSON-RPC 2.0 | 业务逻辑、数据处理、持久化 |
| **前端 UI** | Vue3 + TypeScript | iframe + postMessage | 用户界面、交互、展示 |

**关键约束：**
- 插件运行在独立进程中，与 Core 通过标准协议通信
- 前端通过 iframe 加载，沙箱隔离，通过 `postMessage` 与 Core 交互
- 插件前端 → Core → Sidecar，**前端不直接与 Sidecar 通信**

---

## 2. 插件目录结构

```
my-plugin/                    # 插件根目录（名称即插件 ID）
├── manifest.json             # [必须] 插件元数据
├── CHANGELOG.md              # [必须] 版本更新历史记录
├── RELEASE.md                # [必须] 用户功能说明文档（面向终端用户）
├── PLUGIN_DEV_GUIDE.md       # [必须] 插件开发指南（本文档）
├── API_REFERENCE.md          # [必须] Core API 参考文档
├── EXAMPLES.md               # [必须] 示例代码文档
├── src/                      # [可选] Sidecar Rust 源码
│   ├── Cargo.toml
│   └── src/
│       └── main.rs           # JSON-RPC 入口
├── frontend/                 # [可选] 前端源码
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts
│       ├── App.vue
│       └── style.css
├── scripts/
│   └── build-zip.mjs         # 一键打包脚本
├── dist/                     # [构建生成] 前端构建产物
└── package.json              # 构建脚本入口
```

**安装后的 ZIP 结构（生产环境）：**

```
my-plugin.zip
├── manifest.json
├── README.md                    # 来自 RELEASE.md（用户功能说明）
├── dist/
│   ├── index.html
│   └── assets/
│       ├── index-xxx.js
│       └── index-xxx.css
└── my-plugin-sidecar.exe     # Windows
    # my-plugin-sidecar       # macOS/Linux
```

---

## 2.1 CHANGELOG.md 规范

每个插件**必须**包含 `CHANGELOG.md` 文件，记录版本更新历史。Core 会读取此文件并在插件管理页面展示版本历史。

### 格式要求

```markdown
# v1.1.0 更新说明 (2026-05-10)

## 新增
- 新增功能 A
- 新增功能 B

## 优化
- 优化性能
- 改进 UI

## 修复
- 修复 Bug 1

---

# v1.0.0 更新说明 (2026-04-01)

## 新增
- 初始版本
```

### 解析规则

| 元素 | 格式 | 示例 |
|------|------|------|
| 版本分隔 | `---` | `---` |
| 版本标题 | `# v{version} 更新说明 ({date})` | `# v1.1.0 更新说明 (2026-05-10)` |
| 分类标题 | `## {category}` | `## 新增`、`## 优化`、`## 修复` |
| 条目 | `- {item}` | `- 新增功能 A` |

### 推荐分类

| 分类 | 图标 | 说明 |
|------|------|------|
| 新增 / 新功能 | 包裹 | 新增功能 |
| 优化 / 改进 | 闪电 | 性能优化、体验改进 |
| 修复 / Bug 修复 | 虫子 | Bug 修复 |
| 破坏性变更 | 爆炸 | 不兼容变更 |
| 文档 | 文档 | 文档更新 |

### 注意事项

- 版本号必须与 `manifest.json` 中的 `version` 一致
- 日期格式为 `YYYY-MM-DD`
- 最多展示最近 10 个版本的历史记录
- 每个版本块之间用 `---` 分隔
- 没有 `CHANGELOG.md` 的插件会显示"暂无版本历史"

---

## 3. manifest.json 完整规范

`manifest.json` 是插件的唯一身份标识，**必须**放在插件根目录。

```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "version": "1.0.0",
  "description": "一句话描述插件功能",
  "author": "作者名",
  "private": true,
  "enabled": true,

  "sidecar": {
    "executable": "my-plugin-sidecar",
    "runtime": "rust",
    "args": [],
    "env": {}
  },

  "frontend": {
    "entry": "index.html",
    "dist": "dist",
    "framework": "vue",
    "dev_port": 1421
  },

  "capabilities": [],
  "routes": ["/tools/my-plugin"],
  "activation_events": ["onRoute:/tools/my-plugin"],
  "subscribed_events": [],
  "dependencies": []
}
```

### 字段说明

| 字段 | 类型 | 必须 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | string | 是 | — | 唯一标识，小写字母+连字符，如 `"pomodoro"` |
| `name` | string | 是 | — | 显示名称，如 `"番茄钟"` |
| `version` | string | 是 | — | 语义化版本，如 `"1.0.0"` |
| `description` | string | 否 | `""` | 插件描述 |
| `author` | string | 否 | `""` | 作者 |
| `private` | boolean | 否 | `true` | 私有插件标记：`true`（默认）表示私有插件，发版时被过滤，**不会**出现在商城 `plugins.json` 目录；`false` 或删除该字段表示公开插件，正常进入商城目录，所有用户可见可安装 |
| `enabled` | boolean | 否 | `true` | 是否启用 |
| `sidecar` | object | 否 | `null` | 后端配置，无后端则省略 |
| `frontend` | object | 否 | `null` | 前端配置，无 UI 则省略 |
| `capabilities` | string[] | 否 | `[]` | 所需权限，如 `["notification"]` |
| `routes` | string[] | 否 | `[]` | 路由路径 |
| `activation_events` | string[] | 否 | `[]` | 激活条件（见下方说明） |
| `subscribed_events` | string[] | 否 | `[]` | 订阅的事件 |
| `dependencies` | string[] | 否 | `[]` | 依赖的其他插件 ID |
| `run_as_admin_default` | boolean | 否 | `false` | 是否默认以管理员权限启动 sidecar（用户可在插件管理页面覆盖） |
| `requires_payment` | boolean | 否 | `false` | 是否需要付费解锁 |
| `supportedModes` | string[] | 否 | `["inapp", "desktop", "popup"]` | 支持的运行模式 |
| `defaultMode` | string | 否 | `"inapp"` | 默认运行模式 |

### private 字段说明

`private` 字段控制插件是否进入公开商城目录（`plugins.json`），默认值为 `true`（私有）。

- **`private: true`（默认）**：私有插件。发版脚本扫描时被过滤，**不会**出现在商城 `plugins.json` 目录中；但仍可构建 ZIP 并创建 GitHub Release 供指定用户定向下载。
- **`private: false` 或删除该字段**：公开插件。正常进入商城目录，所有用户可见可安装。

开发者若想公开某个插件，只需在 `manifest.json` 中将该参数改为 `false`（或移除字段）即可，无需其他额外操作。

> **注意**：`manifest.json` 为 JSON 格式，不支持 `//` 行注释，字段语义以本文档为准。

### run_as_admin_default 说明

当插件的 sidecar 需要管理员权限才能正常工作时（如修改系统代理、写入受保护目录），设置此字段为 `true`。用户安装插件后，管理员开关将默认开启。

- 代理切换（修改系统代理设置需要管理员权限）
- 网络监控（捕获系统级网络流量）
- 番茄钟（普通用户权限即可运行）
- 纯前端插件（无 sidecar，此字段无意义）

**注意**：提权启动的插件使用命名管道通信（替代 stdin/stdout），详见 `src/src/elevated.rs`。

```json
{
  "run_as_admin_default": true
}
```

### activation_events 说明

支持的事件类型：

| 事件 | 说明 | 示例 |
|------|------|------|
| `onRoute:/tools/{id}` | 用户导航到指定路由时激活（前端加载 + sidecar 启动） | `onRoute:/tools/proxy-switch` |
| `on_startup` | Core 启动时自动激活 sidecar（无需用户点击） | `on_startup` |

**何时使用 `on_startup`**：

- 代理切换（后台代理服务器需一直运行）
- 剪贴板历史（需从启动时监听剪贴板）
- 快捷截图（需注册全局快捷键）
- 番茄钟（用户点击才使用，无需自启）
- 纯前端插件（无 sidecar，自启无意义）

**示例**：

```json
{
  "activation_events": ["onRoute:/tools/proxy-switch", "on_startup"]
}
```

### sidecar 配置

| 字段 | 类型 | 必须 | 默认值 | 说明 |
|------|------|------|--------|------|
| `executable` | string | 是 | — | 可执行文件名（不含 .exe 后缀） |
| `runtime` | string | 否 | `"rust"` | 语言类型 |
| `args` | string[] | 否 | `[]` | 启动参数 |
| `env` | object | 否 | `{}` | 环境变量 |

### frontend 配置

| 字段 | 类型 | 必须 | 默认值 | 说明 |
|------|------|------|--------|------|
| `entry` | string | 否 | `"index.html"` | 入口 HTML 文件 |
| `dist` | string | 否 | `"dist"` | 构建产物目录 |
| `framework` | string | 否 | `""` | 前端框架 |
| `dev_port` | number | 否 | `null` | 开发模式端口，默认 1421 |

### 重要规则

1. **`id` 必须唯一** — 与其他插件不能重复
2. **`executable` 必须匹配 Cargo.toml 的 `[[bin]] name`** — 即 `{id}-sidecar`
3. **`routes` 中的路径即前端路由** — Core 会为每个路由创建动态页面
4. **纯前端插件可以省略 `sidecar`** — 没有后端逻辑的插件可以只有 frontend
5. **纯后端插件可以省略 `frontend`** — 没有界面的后台服务

---

## 4. Sidecar 后端开发 (Rust)

### 4.1 最小可运行示例

`src/src/main.rs`（模板已内置）:

```rust
use serde_json::Value;
use std::io::{self, BufRead, Write};

fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut stdout_lock = stdout.lock();

    // 逐行读取 stdin，每行是一条 JSON-RPC 消息
    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => continue,
        };

        if let Some(resp) = handle_message(&line) {
            // 每行写一条响应到 stdout
            let _ = writeln!(stdout_lock, "{}", resp);
            let _ = stdout_lock.flush();
        }
    }
}

fn handle_message(json: &str) -> Option<String> {
    let value: Value = serde_json::from_str(json).ok()?;
    let method = value.get("method")?.as_str()?;
    let id = value.get("id")?;

    match method {
        "ping" => Some(ok_response(id, "pong")),
        "get_status" => Some(ok_response(id, "running")),
        _ => Some(error_response(id, -32601, "Method not found")),
    }
}

/// 构建成功响应
fn ok_response(id: &Value, result: &str) -> String {
    format!(
        r#"{{"jsonrpc":"2.0","result":{{"status":"ok","result":{}}},"id":{}}}"#,
        result, id
    )
}

/// 构建错误响应
fn error_response(id: &Value, code: i32, message: &str) -> String {
    format!(
        r#"{{"jsonrpc":"2.0","error":{{"code":{},"message":"{}"}},"id":{}}}"#,
        code, message, id
    )
}
```

### 4.2 通信协议要点

- **stdin/stdout 逐行通信** — 每行一条完整 JSON 消息，以 `\n` 结尾
- **stderr 自动转发** — `eprintln!("...")` 的输出会被 Core 捕获并显示在前端控制台
- **必须 flush** — 每次写入 stdout 后必须 `flush()`，否则 Core 收不到响应
- **收到未知方法必须返回错误** — 不要静默忽略

### 4.3 添加自定义方法

在 `handle_message` 的 `match` 中添加：

```rust
match method {
    "ping" => Some(ok_response(id, "pong")),
    "get_status" => Some(ok_response(id, "running")),

    // 自定义方法
    "start_timer" => {
        let duration = value.get("params")
            .and_then(|p| p.get("duration_secs"))
            .and_then(|v| v.as_u64())
            .unwrap_or(1500);
        // 你的业务逻辑...
        Some(ok_response(id, &format!("timer_started: {}s", duration)))
    }

    _ => Some(error_response(id, -32601, "Method not found")),
}
```

### 4.4 Cargo.toml 模板

```toml
[package]
name = "my-plugin-sidecar"
version = "1.0.0"
edition = "2021"

[[bin]]
name = "my-plugin-sidecar"
path = "src/main.rs"

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[profile.release]
opt-level = "z"       # 最小体积
lto = true
codegen-units = 1
strip = true
```

### 4.5 持久化数据

Sidecar 可以读写文件来持久化数据。推荐路径：

```rust
use std::path::PathBuf;

fn get_data_dir() -> PathBuf {
    // Windows: %APPDATA%/my-desktop-tools/plugins/my-plugin/
    let app_data = std::env::var("APPDATA").unwrap_or_default();
    PathBuf::from(app_data)
        .join("my-desktop-tools")
        .join("plugins")
        .join("my-plugin")
}
```

### 4.6 提权模式（管理员权限）

当插件需要管理员权限时（如修改系统代理），Core 会以 `--elevated` 参数启动 Sidecar。此时 stdin/stdout 管道不可用，Sidecar 需要通过 Windows 命名管道通信。

模板已内置 `src/src/elevated.rs` 模块处理此场景：

```rust
mod elevated;

fn main() {
    if elevated::is_elevated() {
        // 提权模式：使用命名管道通信
        elevated::run_elevated(|reader, writer| run_event_loop(reader, writer));
    } else {
        // 普通模式：使用 stdin/stdout
        let stdin = io::stdin();
        let stdout = io::stdout();
        run_event_loop(stdin.lock(), &mut stdout.lock());
    }
}
```

命名管道格式：`\\.\pipe\mdt-{plugin-id}`，JSON-RPC 消息格式与普通模式完全相同。

---

## 5. 前端开发 (Vue3)

### 5.1 最小可运行示例

`frontend/src/App.vue`:

```vue
<template>
  <div class="plugin-container">
    <h1>我的插件</h1>
    <button @click="callBackend">调用后端</button>
    <p>状态: {{ status }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const status = ref('未知')

// 调用 Sidecar 后端方法（通过 Core 中转）
async function callBackend() {
  try {
    const result = await sendCommand('get_status', null)
    status.value = String(result)
  } catch (e) {
    status.value = '错误: ' + String(e)
  }
}

// 封装 postMessage 通信
function sendCommand(command: string, params: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const requestId = Date.now()

    // 监听响应
    const handler = (event: MessageEvent) => {
      const data = event.data
      if (data?.type === 'plugin:response' && data.payload?.command === command) {
        window.removeEventListener('message', handler)
        resolve(data.payload.result)
      } else if (data?.type === 'plugin:error' && data.payload?.command === command) {
        window.removeEventListener('message', handler)
        reject(new Error(data.payload.error))
      }
    }
    window.addEventListener('message', handler)

    // 发送请求
    window.parent.postMessage({
      type: 'plugin:invoke',
      payload: { command, params }
    }, '*')

    // 超时保护
    setTimeout(() => {
      window.removeEventListener('message', handler)
      reject(new Error('请求超时'))
    }, 10000)
  })
}
</script>

<style scoped>
.plugin-container {
  padding: 20px;
}
</style>
```

> **提示**：模板已内置更完善的通信封装 `frontend/src/composables/usePluginBridge.ts`，提供 `invokePlugin()`、`invokeCore()`、`feLog()` 三个函数，建议直接使用。

### 5.2 通信流程

```
前端 (iframe)                    Core (Tauri)                  Sidecar
    │                               │                              │
    │  postMessage({                 │                              │
    │    type: "plugin:invoke",      │                              │
    │    payload: {                  │                              │
    │      command: "start_timer",   │                              │
    │      params: { secs: 1500 }    │                              │
    │    }                           │                              │
    │  })                            │                              │
    │ ─────────────────────────────► │                              │
    │                               │  stdin: JSON-RPC request     │
    │                               │ ────────────────────────────► │
    │                               │                               │
    │                               │  stdout: JSON-RPC response    │
    │                               │ ◄──────────────────────────── │
    │  postMessage({                 │                              │
    │    type: "plugin:response",    │                              │
    │    payload: {                  │                              │
    │      command: "start_timer",   │                              │
    │      result: { ... }           │                              │
    │    }                           │                              │
    │  })                            │                              │
    │ ◄───────────────────────────── │                              │
```

### 5.3 消息类型

| type | 方向 | payload | 说明 |
|------|------|---------|------|
| `plugin:invoke` | 前端 → Core | `{ command, params }` | 请求 Core 转发命令到 Sidecar |
| `plugin:response` | Core → 前端 | `{ command, result }` | 命令执行成功的响应 |
| `plugin:error` | Core → 前端 | `{ command, error }` | 命令执行失败 |
| `plugin:ready` | 前端 → Core | `{ pluginId, timestamp }` | 前端就绪通知（可选） |
| `theme:change` | Core → 前端 | `{ theme: 'dark' \| 'light' }` | 主题变更通知（必须处理） |
| `theme:request` | 前端 → Core | 无 | 插件请求当前主题（onMounted 时发送） |
| `language:change` | Core → 前端 | `{ language: 'zh-CN' \| 'en-US' }` | 语言变更通知 |
| `language:request` | 前端 → Core | 无 | 插件请求当前语言 |
| `core:invoke` | 前端 → Core | `{ id, command, args }` | 调用 Core Tauri 命令 |
| `core:invoke-response` | Core → 前端 | `{ id, result, error }` | Core 命令响应 |
| `shortcut:toggle-sidebar` | 前端 → Core | 无 | 插件转发 Ctrl+B 快捷键（必须转发） |

### 5.4 样式约束

- 前端运行在 iframe 中，占满整个内容区域（100% 宽高）
- 使用 `scoped` CSS 避免样式泄漏
- 使用 CSS 变量（如 `var(--color-text)`）跟随主题，**禁止硬编码颜色**
- 不建议引入 Naive UI 组件库（iframe 隔离，主题不共享）
- **必须监听 `theme:change` 消息**以支持亮色/暗色主题切换（详见第 5.5 节）

### 5.5 主题支持（亮色/暗色）

插件运行在 iframe 中，无法直接获取主应用的主题状态。Core 会通过 `postMessage` 主动推送主题：

**触发时机：**
1. iframe 加载完成时（`@load`）立即发送当前主题
2. 用户在设置中切换主题时实时推送

**插件必须做的事情：**

1. **`style.css` 定义双主题 CSS 变量**（模板已内置）：

```css
/* 亮色模式（默认） */
:root {
  --color-bg: #ffffff;
  --color-bg-2: #f5f5f5;
  --color-text: #111827;
  --color-text-2: #6b7280;
  --color-primary: #3b82f6;
  --color-border: #e5e5e5;
}

/* 暗色模式 */
.dark {
  --color-bg: #0d0d0d;
  --color-bg-2: #1a1a1a;
  --color-text: #ffffff;
  --color-text-2: #9ca3af;
  --color-primary: #60a5fa;
  --color-border: #2a2a2a;
}
```

2. **监听 `theme:change` 消息并切换 class**（模板已内置）：

```typescript
function handleThemeMessage(event: MessageEvent): void {
  const data = event.data as { type?: string; payload?: { theme?: string } } | null
  if (data?.type === 'theme:change' && data.payload?.theme) {
    const theme = data.payload.theme as 'dark' | 'light'
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }
  }
}

// 在 onMounted 中注册监听
window.addEventListener('message', handleThemeMessage)
// 在 onUnmounted 中移除监听
window.removeEventListener('message', handleThemeMessage)
```

3. **所有样式使用 CSS 变量**，禁止硬编码颜色：

```css
/* 正确：使用 CSS 变量 */
.card { background: var(--color-bg-2); color: var(--color-text); }

/* 错误：硬编码颜色 */
.card { background: #1a1a1a; color: #ffffff; }
```

**完整的 CSS 变量清单：**

| 变量 | 亮色值 | 暗色值 | 用途 |
|------|--------|--------|------|
| `--color-bg` | `#ffffff` | `#0d0d0d` | 页面背景 |
| `--color-bg-2` | `#f5f5f5` | `#1a1a1a` | 卡片/面板背景 |
| `--color-bg-3` | `#ebebeb` | `#2a2a2a` | 悬浮/激活背景 |
| `--color-text` | `#111827` | `#ffffff` | 主文本 |
| `--color-text-2` | `#6b7280` | `#9ca3af` | 次要文本 |
| `--color-text-3` | `#9ca3af` | `#555555` | 辅助文本/占位符 |
| `--color-primary` | `#3b82f6` | `#60a5fa` | 主色调/按钮 |
| `--color-primary-hover` | `#2563eb` | `#3b82f6` | 主色调悬浮态 |
| `--color-border` | `#e5e5e5` | `#2a2a2a` | 边框 |
| `--color-border-2` | `#f0f0f0` | `#1e1e1e` | 细边框/分隔线 |
| `--color-shadow` | `rgba(0,0,0,0.06)` | `rgba(59,130,246,0.08)` | 阴影 |
| `--color-error` | `#ef4444` | `#f87171` | 错误/危险 |
| `--color-success` | `#22c55e` | `#4ade80` | 成功 |
| `--color-warning` | `#f59e0b` | `#fbbf24` | 警告 |

### 5.6 快捷键转发（必须）

插件运行在 iframe 中，父窗口无法直接监听 iframe 内的键盘事件。因此插件**必须**将 Shell 级快捷键转发给 Core。

**Shell 保留快捷键：**

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl+B` | 切换侧边栏显隐 | 由 Core 处理，插件只需转发 |

**插件必须添加以下代码（模板已内置）：**

```typescript
/**
 * 转发 Shell 级快捷键到父窗口
 * 跨源 iframe 的键盘事件无法被父窗口直接监听，需要通过 postMessage 转发
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey && event.key === 'b' && window.parent !== window) {
    event.preventDefault()
    window.parent.postMessage({ type: 'shortcut:toggle-sidebar' }, '*')
  }
}

// 在 onMounted 中注册
window.addEventListener('keydown', handleKeydown)
// 在 onUnmounted 中移除
window.removeEventListener('keydown', handleKeydown)
```

**禁止插件自行占用 Ctrl+B**，该快捷键已保留给 Shell。

### 5.7 异步数据加载规范（MANDATORY）

> **核心原则**：插件前端（iframe 内）必须遵循异步优先、懒加载原则。不要阻塞首屏渲染，不要预加载用户不需要的数据。

#### 原则

| 原则 | 说明 |
|------|------|
| **禁止阻塞渲染** | 不要在 `onMounted` 中使用 `await` 阻塞首屏渲染 |
| **按需加载** | 数据仅在用户需要时加载（切换标签、点击按钮等用户操作触发） |
| **懒加载** | 不要一次性预加载所有数据（如 `await Promise.all([loadA(), loadB(), loadC()])`） |
| **加载反馈** | 任何异步操作必须有加载状态提示（loading 文字、spinner、骨架屏） |

#### 正确模式

```typescript
// 正确: 组件立即渲染，数据异步加载，有加载状态
import { ref, onMounted } from 'vue'

const isLoading = ref(false)
const data = ref<MyData[]>([])
const errorMsg = ref('')

onMounted(() => {
  loadData()  // 不用 await，组件立即渲染
})

async function loadData(): Promise<void> {
  isLoading.value = true
  errorMsg.value = ''
  try {
    const result = await sendCommand('get_data', null)
    data.value = result
  } catch (err) {
    errorMsg.value = '加载失败'
  } finally {
    isLoading.value = false
  }
}
```

```html
<!-- 正确: 不同状态显示不同 UI -->
<div v-if="isLoading" class="loading-state">加载中...</div>
<div v-else-if="errorMsg" class="error-state">{{ errorMsg }}</div>
<div v-else-if="data.length === 0" class="empty-state">暂无数据</div>
<div v-else>
  <!-- 数据内容 -->
</div>
```

#### 禁止模式

```typescript
// 禁止: onMounted 中 await 阻塞首屏渲染
onMounted(async () => {
  await loadAllData()  // 用户看到白屏直到数据返回
})

// 禁止: 同时预加载所有标签页的数据
onMounted(async () => {
  await Promise.all([
    loadTabAData(),  // 用户可能只看 Tab B
    loadTabBData(),
    loadTabCData(),
  ])
})

// 禁止: 无加载状态的数据更新
onMounted(() => {
  sendCommand('get_data', null).then((r) => {
    data.value = r  // 加载期间 data 为空，用户无任何提示
  })
})
```

#### 检查清单

```
- 插件前端不阻塞首屏渲染（无 onMounted 中的顶层 await）
- 数据按需加载（点击/切换时触发，不预加载）
- 所有异步区域有加载状态 UI
- 加载失败有错误提示
- 不需要后台常驻的插件不声明 on_startup
```

### 5.8 usePluginBridge 通信封装

模板内置了 `frontend/src/composables/usePluginBridge.ts`，提供三个核心函数：

```typescript
import { invokePlugin, invokeCore, feLog } from './composables/usePluginBridge'

// 1. 调用 Sidecar RPC（前端 → Core → Sidecar）
const result = await invokePlugin('my-plugin', 'get_status')
console.log(result.status) // "ok"

// 2. 调用 Core Tauri 命令（前端 → Core 后端）
const settings = await invokeCore('get_settings')

// 3. 写入前端日志（持久化到 startup.log）
await feLog('info', 'MyPlugin', '用户点击了开始按钮')
```

### 5.6 Dual-Mode UI Development (Popup vs InApp)

Plugins that declare both `inapp` and `popup` in `supportedModes` can benefit from a **dual-mode UI** architecture: the same frontend codebase renders different interfaces depending on how the plugin is loaded.

#### Mode Detection

The Core loads plugins into iframes. When a plugin runs as a **standalone popup window** (triggered by Quick Action or detached from sidebar), the iframe URL contains `#/standalone-plugin/{pluginId}`. When running **in-app** (embedded in the main window via sidebar navigation), the URL does not contain this hash.

```typescript
// App.vue — mode detection
import { computed } from 'vue'
import PopupComponent from './components/PopupMode.vue'
import InAppComponent from './components/InAppMode.vue'

const isPopupMode = computed(() =>
  window.location.hash.includes('/standalone-plugin/')
)
```

#### Conditional Rendering

```vue
<template>
  <PopupComponent v-if="isPopupMode" />
  <InAppComponent v-else />
</template>
```

Both components share the same composable (`useTranslator.ts` in the ai-translator example) for business logic, but each renders a different UI:

| Aspect | Popup Mode | InApp Mode |
|--------|-----------|------------|
| **Purpose** | Quick action execution | Full feature experience |
| **Layout** | Single column, compact | Dual-pane (workspace + sidebar) |
| **Features** | Core function only (translate) | + Settings, history, templates |
| **Config controls** | Hidden (use defaults) | Full configuration panel |
| **Window size** | Small (e.g., 400×480) | Full main window area |
| **Trigger** | Quick Action panel selection | Sidebar navigation click |

#### Best Practices

1. **Share business logic**: Extract all state management and API calls into a composable (`useXxx.ts`), used by both modes.
2. **Popup = minimal**: Only show what's needed for the immediate task. No settings, no history management, no model selection.
3. **InApp = complete**: Provide full configuration, history, and settings alongside the core function.
4. **Theme sync**: Both modes share the same postMessage-based theme/language synchronization logic in the root `App.vue` shell.
5. **Manifest configuration**: `defaultMode: "popup"` + `standalone.width/height` control the popup window dimensions.

#### Real Example: ai-translator Plugin

- `App.vue`: Detects mode, renders `PopupTranslate.vue` or `InAppTranslate.vue`
- `PopupTranslate.vue`: Source text preview + result + copy button + language chips. No model selector, no settings.
- `InAppTranslate.vue`: Dual-pane layout — left: manual input + translate; right: history list + settings panel.
- `useTranslator.ts`: Shared composable with `doTranslate()`, `loadAiConfig()`, `handleContextData()`, etc.

---

## 6. Core ↔ Sidecar 通信协议 (JSON-RPC 2.0)

### 6.1 请求格式（Core → Sidecar）

```json
{
  "jsonrpc": "2.0",
  "method": "start_timer",
  "params": { "duration_secs": 1500 },
  "id": 42
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `jsonrpc` | string | 固定 `"2.0"` |
| `method` | string | 方法名 |
| `params` | object/null | 方法参数（可选） |
| `id` | number | 请求 ID，用于匹配响应 |

### 6.2 响应格式（Sidecar → Core）

**成功：**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "ok",
    "result": "timer_started",
    "data": { "remaining_secs": 1500 }
  },
  "id": 42
}
```

**失败：**

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Timer already running"
  },
  "id": 42
}
```

### 6.3 通知格式（Sidecar → Core，无需响应）

```json
{
  "jsonrpc": "2.0",
  "method": "timer_completed",
  "params": { "type": "focus", "duration_secs": 1500 }
}
```

通知没有 `id` 字段，Core 不会回复。

---

## 7. Core ↔ 前端通信协议 (postMessage)

前端通过 `window.parent.postMessage()` 与 Core 通信，因为前端运行在 iframe 中。

### 7.1 调用后端命令

```typescript
// 发送
window.parent.postMessage({
  type: 'plugin:invoke',
  payload: {
    command: 'start_timer',     // 对应 Sidecar 的 JSON-RPC method
    params: { duration_secs: 1500 }
  }
}, '*')

// 接收响应
window.addEventListener('message', (event) => {
  const { type, payload } = event.data

  if (type === 'plugin:response') {
    // payload: { command: 'start_timer', result: {...} }
    console.log('成功:', payload.result)
  }

  if (type === 'plugin:error') {
    // payload: { command: 'start_timer', error: '...' }
    console.error('失败:', payload.error)
  }
})
```

### 7.2 调用 Core Tauri 命令

```typescript
// 通过 core:invoke 桥接调用 Core 后端命令
window.parent.postMessage({
  type: 'core:invoke',
  payload: {
    id: 'unique-request-id',
    command: 'get_settings',
    args: {}
  }
}, '*')

// 接收响应
window.addEventListener('message', (event) => {
  if (event.data?.type === 'core:invoke-response' && event.data.payload?.id === 'unique-request-id') {
    const result = event.data.payload.result
    console.log(result)
  }
})
```

### 7.3 通知 Core 前端就绪

```typescript
if (window.parent !== window) {
  window.parent.postMessage({
    type: 'plugin:ready',
    pluginId: 'my-plugin',
    timestamp: Date.now()
  }, '*')
}
```

---

## 8. 内置 RPC 方法清单

以下是 Core 会发给 Sidecar 的内置方法，**Sidecar 必须实现这些方法**：

| 方法 | 说明 | params | 预期响应 |
|------|------|--------|----------|
| `ping` | 心跳检测 | 无 | `"pong"` 或任意值 |
| `initialize` | 插件初始化 | 无 | 插件信息（id, name, version） |
| `get_status` | 获取插件状态 | 无 | 当前状态信息 |

**心跳机制：**
- Core 每隔 N 秒（可在设置中配置，默认 30 秒）发送 `ping`
- Sidecar 必须在 **5 秒内** 响应，否则标记为不健康
- 连续 N 次（默认 5 次）无响应后，Core 自动重启 Sidecar

---

## 9. Core 功能 API

详细的 API 请参考 [API_REFERENCE.md](./API_REFERENCE.md)。

### 9.1 通知系统

插件可以通过 Core 发送系统通知：

```typescript
// 前端调用（postMessage）
window.parent.postMessage({
  type: 'command',
  payload: {
    method: 'notify',
    params: {
      title: '通知标题',
      body: '通知内容',
      sound: 'default'  // 可选：default | gentle | urgent
    }
  }
}, '*')
```

### 9.2 主题系统

获取当前主题（通过 postMessage 请求）：

```typescript
// 在 onMounted 中请求当前主题
window.parent.postMessage({ type: 'theme:request' }, '*')

// 监听主题变更
window.addEventListener('message', (event) => {
  if (event.data?.type === 'theme:change') {
    const theme = event.data.payload.theme  // 'dark' | 'light'
    // 切换 CSS class...
  }
})
```

### 9.3 设置系统

读写插件设置（通过 core:invoke 桥接）：

```typescript
// 使用 usePluginBridge 封装
import { invokeCore } from './composables/usePluginBridge'

// 读取设置
const settings = await invokeCore('get_settings')

// 保存设置
await invokeCore('save_settings', { settings: { volume: 80 } })
```

### 9.4 事件系统

订阅和发布事件（通过 core:invoke 桥接）：

```typescript
import { invokeCore } from './composables/usePluginBridge'

// 订阅事件
await invokeCore('subscribe', { event: 'my-event' })

// 发布事件
await invokeCore('publish', { event: 'my-event', data: {} })
```

### 9.5 示例代码

更多示例请参考 [EXAMPLES.md](./EXAMPLES.md)。

---

## 10. 开发调试

### 10.1 开发模式启动

```bash
# 终端 1：启动 Core 应用（My Desktop Tools 主程序）
# 在 Core 应用的开发环境中启动

# 终端 2：启动插件开发模式
cd my-plugin/
pnpm dev
```

在开发模式下：
- **开发插件**（有 `src/` 源码的）的前端会从 `http://localhost:1421/` 加载（Vite dev server）
- **ZIP 插件**（无源码的）始终从 `dist/` 静态文件加载
- 修改前端代码后自动热更新，无需重新构建

### 10.2 Sidecar 日志

Sidecar 的 `stderr` 输出会自动转发到前端控制台：

```rust
// main.rs 中使用 eprintln! 输出调试日志
eprintln!("DEBUG: 收到消息: {}", json);
eprintln!("[INFO] 计时器已启动，时长 {} 秒", duration);
eprintln!("[ERROR] 无法读取配置文件: {}", err);
```

日志级别标记：`[TRACE]`、`[DEBUG]`、`[INFO]`、`[WARN]`、`[ERROR]`

### 10.3 修改 Sidecar 后需要手动重新构建

```bash
cd my-plugin/
pnpm build:sidecar
# 或
cargo build --release --manifest-path src/Cargo.toml
```

然后重启 Core 应用（或通过插件管理页面重新启动插件）。

### 10.4 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 插件不显示在列表中 | manifest.json 格式错误 | 检查 JSON 语法和必填字段 |
| Sidecar 启动失败 | executable 路径不匹配 | 确认 Cargo.toml 的 `[[bin]] name` 与 manifest 的 `executable` 一致 |
| 心跳超时 | Sidecar 未响应 ping | 确认 `handle_message` 处理了 `"ping"` 方法 |
| 前端空白 | dist/ 目录不存在 | 先 `pnpm build:frontend` 构建前端 |
| 通信超时 | Sidecar 未 flush stdout | 确认每次 `writeln!` 后都调用了 `flush()` |

---

## 11. 构建与打包

### 11.1 一键打包

```bash
cd my-plugin/
pnpm build:zip
```

自动执行：前端构建 → Sidecar 构建 → 打 ZIP → 清理临时文件。

产物：`my-plugin.zip`

### 11.2 手动构建

```bash
# 1. 构建前端
cd my-plugin/frontend/
pnpm install
pnpm build

# 2. 构建 Sidecar
cd my-plugin/
cargo build --release --manifest-path src/Cargo.toml
```

### 11.3 安装插件

在 My Desktop Tools 的 **插件管理页面** 点击"安装插件"，选择 `.zip` 文件。

### 11.4 RELEASE.md（用户功能说明文档）

每个插件**必须**包含 `RELEASE.md` 文件，这是面向终端用户的功能说明文档。

**与 README.md 的区别**：

| 文件 | 受众 | 内容 |
|------|------|------|
| `README.md` | 插件开发者 | 源码架构、开发指南、构建命令 |
| `RELEASE.md` | 终端用户 | 功能介绍、使用说明、注意事项 |

**打包行为**：
- `build-zip.mjs` 自动将 `RELEASE.md` 复制到 ZIP 内，重命名为 `README.md`

**RELEASE.md 模板**：

```markdown
# {插件名称}

> {插件名称} 插件 - {一句话描述}

## 功能介绍

- 功能 A：描述
- 功能 B：描述

## 使用说明

1. 打开 My Desktop Tools
2. 进入左侧导航栏的「xxx」页面
3. 操作步骤...

## 注意事项

- 补充用户需要知道的信息

## 版本信息

| 版本 | 日期 | 说明 |
|------|------|------|
| x.x.x | - | 初始版本 |

---

**插件 ID**: {plugin-id}
**作者**: {作者}
```

**AI 智能体必须在开发完成后填写 RELEASE.md，不得留空模板。**

---

## 12. 开发实战：从零开始创建插件

### 步骤 1：复制模板

将 Plugin Dev Kit 目录复制为你自己的插件目录：

```bash
# 复制 SDK 模板到你的工作区
cp -r plugin-dev-kit/ my-plugin/
cd my-plugin/
```

### 步骤 2：替换模板变量

将以下占位符全局替换：

| 占位符 | 替换为 | 示例 |
|--------|--------|------|
| `{{PLUGIN_ID}}` | 你的插件 ID | `my-plugin` |
| `{{PLUGIN_NAME}}` | 你的插件名称 | `我的插件` |

需要替换的文件：
- `manifest.json`
- `package.json`
- `src/Cargo.toml`
- `src/src/main.rs`
- `frontend/src/App.vue`
- `scripts/build-zip.mjs`

### 步骤 3：实现后端逻辑

编辑 `src/src/main.rs`，在 `handle_message` 的 match 中添加你的方法。

### 步骤 4：实现前端 UI

编辑 `frontend/src/App.vue`，通过 `postMessage` 与后端通信。

### 步骤 5：测试

```bash
# 构建后端
cargo build --manifest-path src/Cargo.toml

# 启动前端 dev server
cd frontend && pnpm install && pnpm dev

# 在另一个终端启动 Core 应用
```

### 步骤 6：打包发布

```bash
pnpm build:zip
```

将生成的 `my-plugin.zip` 分享给用户，用户通过插件管理页面安装。

> **注意**: 打包前请确保已填写 `RELEASE.md`（用户功能说明文档），打包脚本会自动将其放入 ZIP。

---

## 附录 A：完整 manifest.json 示例

### 纯前端插件（无后端）

```json
{
  "id": "notes",
  "name": "悬浮便签",
  "version": "1.0.0",
  "description": "透明便签，自制皮肤",
  "enabled": true,
  "frontend": {
    "entry": "index.html",
    "dist": "dist",
    "framework": "vue"
  },
  "routes": ["/tools/notes"]
}
```

### 纯后端插件（无前端）

```json
{
  "id": "auto-cleaner",
  "name": "自动清理",
  "version": "1.0.0",
  "description": "自动清理临时文件",
  "enabled": true,
  "sidecar": {
    "executable": "auto-cleaner-sidecar",
    "runtime": "rust"
  }
}
```

### 完整插件（前后端都有）

```json
{
  "id": "pomodoro",
  "name": "番茄钟",
  "version": "1.0.0",
  "description": "25+5 专注模式",
  "author": "Your Name",
  "enabled": true,
  "sidecar": {
    "executable": "pomodoro-sidecar",
    "runtime": "rust"
  },
  "frontend": {
    "entry": "index.html",
    "dist": "dist",
    "framework": "vue",
    "dev_port": 1421
  },
  "capabilities": ["notification"],
  "routes": ["/tools/pomodoro"]
}
```

---

## 附录 B：错误码规范

| 错误码 | 含义 |
|--------|------|
| `-32700` | JSON 解析错误 |
| `-32600` | 无效请求 |
| `-32601` | 方法不存在 |
| `-32602` | 无效参数 |
| `-32603` | 内部错误 |
| `-32000` ~ `-32099` | 自定义错误 |

---

## 附录 C：插件分类 (category)

在 `manifest.json` 中可选添加 `"category"` 字段：

| 值 | 中文名 | 适用场景 |
|----|--------|---------|
| `focus` | 专注效率 | 番茄钟、快捷启动器 |
| `search` | 搜索翻译 | 本地搜索、智能翻译 |
| `capture` | 截图识别 | 快捷截图、OCR |
| `discipline` | 自律管控 | 自我控制、成长激励 |
| `visual` | 视觉美化 | 动态壁纸、皮肤商店 |
| `companion` | 情感陪伴 | 桌面宠物、AI 对话 |
| `uncategorized` | 未分类 | 兜底 |

在 manifest 中使用：

```json
{
  "id": "pomodoro",
  "category": "focus"
}
```

---

## 附录 D：AI 智能体开发工作流 (MANDATORY)

> **适用对象**: AI 智能体开发 My Desktop Tools 插件时必须遵循。

### D.1 总体流程

```
收到插件开发任务
      │
      ▼
Step 1: 阅读本文档（必须首先完成）
      │
      ▼
Step 2: 设计 manifest.json（插件规格说明）
      │  manifest 未确认，不得写代码
      ▼
Step 3: 设计 API 接口（Sidecar 方法清单）
      │  API 未确认，不得写代码
      ▼
Step 4: 实现开发（按计划逐步执行）
      │
      ▼
Step 5: 自动验证（编译 + 类型检查）
      │  验证未通过，不得汇报完成
      ▼
Step 6: 汇报完成（变更清单 + 验证结果）
```

### D.2 Step 1: 阅读文档

AI 智能体收到插件开发任务后，**必须**：

1. 完整阅读本文档 (`PLUGIN_DEV_GUIDE.md`)
2. 理解三层架构：Core ↔ Sidecar ↔ 前端 iframe
3. 理解两种通信协议：JSON-RPC (stdin/stdout) + postMessage (iframe)
4. 确认已理解内置 RPC 方法 (`ping`, `initialize`, `get_status`)

### D.3 Step 2: 设计 manifest.json（等效于 PRD）

`manifest.json` 是插件的功能规格说明。开发前**必须**先确认 manifest。

**AI 必须输出以下内容并等待确认：**

```markdown
## 插件规格设计

### manifest.json
（输出完整的 manifest.json 内容）

### 功能清单
| 功能 ID | 方法名 | 说明 | Sidecar | 前端 |
|---------|--------|------|---------|------|
| F001 | start_timer | 启动计时器 | 是 | 是 |
| F002 | get_status | 获取当前状态 | 是 | 是 |

### 数据模型（如需持久化）
（描述需要保存的数据结构）

### 验收标准
- [ ] manifest.json 可被 Core 正确解析
- [ ] Sidecar 响应 ping 心跳
- [ ] 前端可通过 postMessage 调用所有方法
- [ ] cargo check 通过
- [ ] pnpm build 通过
- [ ] ZIP 打包成功
- [ ] RELEASE.md 已填写（面向用户的功能说明）

请确认以上设计，确认后开始开发。
```

**禁止在用户确认 manifest 前编写任何代码。**

### D.4 Step 3: 设计 API 接口

明确 Sidecar 需要实现的所有 JSON-RPC 方法：

```markdown
## API 接口设计

### 方法清单

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| ping | 无 | "pong" | 心跳检测（必须） |
| initialize | 无 | { id, name, version } | 初始化（必须） |
| get_status | 无 | { status, ... } | 获取状态（必须） |
| start_xxx | { ... } | { ... } | 自定义方法 |
| stop_xxx | 无 | { ... } | 自定义方法 |

### 错误码
| 错误码 | 含义 |
|--------|------|
| -32001 | xxx |
| -32002 | xxx |
```

### D.5 Step 4: 实现开发

#### 4.1 复杂度分级

| 复杂度 | 判断标准 | 要求 |
|--------|---------|------|
| 简单 | 纯前端或纯后端，< 5 个方法 | 直接开发 |
| 中等 | 前后端都有，5-10 个方法 | 先列子任务再逐步开发 |
| 复杂 | 前后端都有 + 数据持久化 + 多页面 | 必须先输出详细设计再分阶段 |

#### 4.2 开发顺序（推荐）

```
1. 先实现 Sidecar 后端
   a. 复制模板 src/src/main.rs
   b. 替换 {{PLUGIN_ID}} / {{PLUGIN_NAME}}
   c. 在 handle_message 中添加自定义方法
   d. cargo check 验证编译

2. 再实现前端 UI
   a. 复制模板 frontend/src/App.vue
   b. 替换模板变量
   c. 通过 postMessage 封装通信
   d. 实现界面和交互逻辑

3. 最后整合测试
   a. 构建 Sidecar: cargo build --manifest-path src/Cargo.toml
   b. 构建前端: cd frontend && pnpm build
   c. 打包: pnpm build:zip
```

#### 4.3 代码规范

**Rust (Sidecar)：**

```rust
// 正确: 使用 Result 处理错误
fn parse_duration(secs: &Value) -> Result<u64, String> {
    secs.as_u64().ok_or_else(|| "无效的时长参数".to_string())
}

// 禁止: unwrap / panic
let val = json["secs"].as_u64().unwrap();  // 禁止

// 正确: 日志用 eprintln! (自动转发到前端)
eprintln!("[INFO] 计时器已启动");

// 禁止: println! (会污染 stdout 通信通道)
println!("timer started");  // 禁止，stdout 只用于 JSON-RPC 响应
```

**Vue3 (前端)：**

```typescript
// 正确: 明确的类型定义
const timerState = ref<'idle' | 'running' | 'paused'>('idle')

// 禁止: any 类型
const data: any = response  // 禁止

// 正确: scoped CSS
<style scoped>
.timer-display { font-size: 24px; }
</style>

// 正确: 通信封装（复用 sendCommand 模式，见第 5.1 节）
```

**主题支持（必须）：**

```typescript
// 正确: 监听主题变更并切换 class
window.addEventListener('message', (event) => {
  const data = event.data
  if (data?.type === 'theme:change') {
    const theme = data.payload.theme  // 'dark' | 'light'
    document.documentElement.className = theme
  }
})

// 正确: 所有颜色使用 CSS 变量
// .card { background: var(--color-bg-2); color: var(--color-text); }

// 禁止: 硬编码颜色
// .card { background: #1a1a1a; color: #fff; }  // 无法跟随主题切换
```

**快捷键转发（必须）：**

```typescript
// 正确: 转发 Shell 级快捷键
window.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === 'b' && window.parent !== window) {
    event.preventDefault()
    window.parent.postMessage({ type: 'shortcut:toggle-sidebar' }, '*')
  }
})

// 禁止: 插件自行占用 Ctrl+B
// if (event.ctrlKey && event.key === 'b') { myFunction() }  // 快捷键冲突
```

### D.6 Step 5: 自动验证

AI 完成代码后**必须**执行以下验证：

```
=====================================================================
  自动验证检查清单（AI 必须执行）
=====================================================================

  [ ] Rust 编译检查
      cargo check --manifest-path src/Cargo.toml
      零错误 = 通过

  [ ] 前端构建检查
      cd frontend && pnpm build
      构建成功 = 通过

  [ ] manifest.json 语法检查
      确认 JSON 格式正确，必填字段完整

  [ ] 代码规范检查
      - Rust: 无 unwrap/panic
      - TypeScript: 无 any 类型
      - Sidecar: stdout 只输出 JSON-RPC 响应
      - 前端: 使用 scoped CSS
      - 前端: 无硬编码颜色，使用 CSS 变量
      - 前端: 监听 theme:change 消息
      - 前端: 转发 Ctrl+B 快捷键

  [ ] 打包验证
      pnpm build:zip
      ZIP 生成成功 = 通过

  [ ] RELEASE.md 检查
      RELEASE.md 已填写功能介绍和使用说明
      非空模板 = 通过

=====================================================================
```

**验证失败处理：**

| 场景 | 行动 |
|------|------|
| Rust 编译失败 | 修复错误 → 重新验证 → 不得跳过 |
| 前端构建失败 | 修复错误 → 重新验证 |
| 打包失败 | 检查 manifest.json 和文件路径 |
| 发现代码规范违反 | 立即修复 |

### D.7 Step 6: 汇报完成

验证通过后，AI **必须**按以下模板汇报：

```markdown
## 插件开发完成

### 插件信息
- ID: my-plugin
- 名称: 我的插件
- 版本: 1.0.0

### 新增/修改文件

| 文件 | 类型 | 说明 |
|------|------|------|
| manifest.json | 新增 | 插件元数据 |
| src/src/main.rs | 新增 | Sidecar 入口（X 个自定义方法） |
| src/Cargo.toml | 新增 | Rust 项目配置 |
| frontend/src/App.vue | 新增 | 前端主组件 |
| frontend/src/components/xxx.vue | 新增 | xxx 子组件 |
| scripts/build-zip.mjs | 新增 | 打包脚本 |
| RELEASE.md | 新增 | 用户功能说明文档 |

### API 方法清单

| 方法 | 说明 | 状态 |
|------|------|------|
| ping | 心跳 | 完成 |
| initialize | 初始化 | 完成 |
| get_status | 获取状态 | 完成 |
| custom_method_1 | xxx | 完成 |

### 验证结果

| 检查项 | 结果 |
|--------|------|
| cargo check | 通过 |
| pnpm build | 通过 |
| manifest.json | 格式正确 |
| 代码规范 | 无违反 |
| ZIP 打包 | my-plugin.zip 已生成 |

### 安装说明

1. 打开 My Desktop Tools → 插件管理
2. 点击"安装插件"
3. 选择 `my-plugin.zip`
4. 启用插件

### 后续优化建议

- （如有可优化的地方列出）
```

### D.8 强制规则汇总

```
[MANDATORY] 开发前必须完整阅读 PLUGIN_DEV_GUIDE.md
[MANDATORY] manifest.json 未确认前禁止编写代码
[MANDATORY] Rust 代码禁止使用 unwrap() / panic!()
[MANDATORY] Rust 代码禁止用 println!()（stdout 只用于 JSON-RPC）
[MANDATORY] TypeScript 代码禁止使用 any 类型
[MANDATORY] Sidecar 必须实现 ping 方法（心跳检测）
[MANDATORY] Sidecar 每次 stdout 输出后必须 flush
[MANDATORY] 前端禁止直接引入 Naive UI 组件库（iframe 隔离）
[MANDATORY] 前端禁止使用 @ts-ignore / @ts-expect-error
[MANDATORY] 前端禁止硬编码颜色值，必须使用 CSS 变量（主题支持）
[MANDATORY] 前端必须监听 theme:change 消息并切换 dark/light class
[MANDATORY] 前端必须转发 Ctrl+B 快捷键（Shell 保留，插件禁止占用）
[MANDATORY] 需要后台常驻的插件必须声明 on_startup（代理、剪贴板监听、快捷键等）
[MANDATORY] 插件前端必须遵循异步懒加载原则，禁止在 onMounted 中 await 阻塞首屏渲染
[MANDATORY] 开发完成后必须填写 RELEASE.md（面向用户的功能说明文档，不得留空模板）
[MANDATORY] 验证未全部通过前禁止汇报完成
[MANDATORY] 禁止修改插件目录以外的任何文件
```

### D.9 特殊情况

| 场景 | 处理方式 |
|------|---------|
| **仅修改已有插件** | 先读取现有 manifest.json 和代码，分析后再改 |
| **Bug 修复** | 最小化修复，不重构，不改 manifest |
| **用户说"直接做"** | 可跳过 manifest 确认，但完成后必须验证 |
| **纯前端插件** | 无 Sidecar，只需 manifest + frontend |

---

## License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE).

Copyright (c) 2026 li_tl

---

## ⚠️ Disclaimer

- **"AS IS"**: This software is provided "AS IS", without any express or implied warranty.
- **Use at Your Own Risk**: The developer shall not be liable for any direct or indirect losses caused by the use of this software.
- **Third-Party Plugins**: Plugins built with this SDK are independently developed by third parties. The My Desktop Tools Core developer makes no guarantee regarding the behavior, security, or stability of third-party plugins.
- **Compatibility Risks**: This SDK may have unknown defects or be incompatible with certain system environments.
- **Data Backup**: It is recommended to back up important data before using plugins built with this SDK.

> Using this SDK indicates that you have read and agree to the above disclaimer.
