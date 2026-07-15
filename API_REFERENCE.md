# Core API 参考

> **版本**: v1.1 | **最后更新**: 2026-07-15
>
> 本文档描述 My Desktop Tools Core 提供的所有公开 API 接口，供插件开发者使用。

---

## 通信方式总览

插件运行在 iframe 沙箱中，无法直接调用 Tauri IPC。所有与 Core 的通信均通过 `postMessage` 桥接完成。

| 场景 | 通信方式 | 说明 |
|------|----------|------|
| **前端 → Sidecar** | `plugin:invoke` postMessage | 经 Core 中转，Core 将请求转为 JSON-RPC 发送给 Sidecar |
| **前端 → Core 后端** | `core:invoke` postMessage | 经 Core 中转，Core 执行对应 Tauri 命令 |
| **Core → 前端** | 事件型 postMessage | Core 主动推送（主题变更、语言变更等） |
| **Sidecar → Core** | JSON-RPC (stdin/stdout) | 直接通信 |

### 使用 usePluginBridge 封装（推荐）

模板内置了 `frontend/src/composables/usePluginBridge.ts`，建议直接使用封装函数而非手写 postMessage：

```typescript
import { invokePlugin, invokeCore, feLog } from './composables/usePluginBridge'

// 调用 Sidecar RPC
const result = await invokePlugin('my-plugin', 'get_status')

// 调用 Core Tauri 命令
const settings = await invokeCore('get_settings')

// 写入前端日志
await feLog('info', 'MyPlugin', '操作完成')
```

---

## 通知系统

### notify()

发送通知到系统。

#### 描述

通过 Core 发送系统通知，支持声音提示。通知会显示在系统通知中心，同时可播放提示音。

#### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | `string` | 是 | 通知标题 |
| `body` | `string` | 是 | 通知内容 |
| `sound` | `'default' \| 'gentle' \| 'urgent'` | 否 | 声音风格，默认 `'default'` |

#### 返回值

无返回值。

#### 声音风格

| 风格 | 说明 | 适用场景 |
|------|------|----------|
| `default` | 默认提示音（C-E-G 和弦） | 通用通知 |
| `gentle` | 柔和提示音（低音量长音） | 低优先级通知（休息提醒、更新检测） |
| `urgent` | 急促提示音（高频短音） | 高优先级告警（崩溃、资源告警） |

#### 示例

**前端调用（postMessage）**:

```typescript
window.parent.postMessage({
  type: 'command',
  payload: {
    method: 'notify',
    params: {
      title: '番茄钟',
      body: '专注时间结束！休息 5 分钟',
      sound: 'gentle'
    }
  }
}, '*')
```

**后端调用（JSON-RPC）**:

```json
{
  "jsonrpc": "2.0",
  "method": "notify",
  "params": {
    "title": "番茄钟",
    "body": "专注时间结束！",
    "sound": "gentle"
  },
  "id": 1
}
```

---

## 主题系统

### theme:change 事件（Core → 前端）

#### 描述

当用户切换主题时，Core 会向所有插件 iframe 发送 `theme:change` 事件。插件应监听此事件并更新自身样式。

#### 事件数据

| 字段 | 类型 | 说明 |
|------|------|------|
| `theme` | `'dark' \| 'light'` | 新主题 |

#### 示例

```typescript
// 监听主题变更
window.addEventListener('message', (event) => {
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
})
```

### theme:request（前端 → Core）

#### 描述

插件在 `onMounted` 时主动请求当前主题，解决 iframe 加载时序问题。Core 收到后会立即推送 `theme:change` 事件。

#### 示例

```typescript
onMounted(() => {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'theme:request' }, '*')
  }
})
```

---

## 语言系统

### language:change 事件（Core → 前端）

#### 描述

当用户切换语言时，Core 会向所有插件 iframe 发送 `language:change` 事件。

#### 事件数据

| 字段 | 类型 | 说明 |
|------|------|------|
| `language` | `'zh-CN' \| 'en-US'` | 新语言 |

#### 示例

```typescript
window.addEventListener('message', (event) => {
  const data = event.data as { type?: string; payload?: { language?: string } } | null
  if (data?.type === 'language:change' && data.payload?.language) {
    const language = data.payload.language as 'zh-CN' | 'en-US'
    // 更新 i18n locale...
    i18nLocale.value = language
  }
})
```

### language:request（前端 → Core）

#### 描述

插件在 `onMounted` 时主动请求当前语言。

#### 示例

```typescript
onMounted(() => {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'language:request' }, '*')
  }
})
```

---

## 设置系统

### get_settings()

获取插件设置。

#### 描述

获取当前插件的持久化设置。设置存储在插件数据目录中。

#### 通过 invokeCore() 调用

```typescript
import { invokeCore } from './composables/usePluginBridge'

const settings = await invokeCore('get_settings')
console.log(settings) // { theme: 'dark', volume: 80, ... }
```

#### 手写 postMessage 调用

```typescript
const requestId = `settings-${Date.now()}`

window.parent.postMessage({
  type: 'core:invoke',
  payload: {
    id: requestId,
    command: 'get_settings',
    args: {}
  }
}, '*')

window.addEventListener('message', (event) => {
  if (event.data?.type === 'core:invoke-response' && event.data.payload?.id === requestId) {
    const settings = event.data.payload.result
    console.log(settings)
  }
})
```

#### 返回值

| 类型 | 说明 |
|------|------|
| `object` | 插件设置对象 |

### save_settings()

保存插件设置。

#### 描述

保存插件设置到持久化存储。

#### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `settings` | `object` | 是 | 插件设置对象 |

#### 返回值

无返回值。

#### 通过 invokeCore() 调用

```typescript
import { invokeCore } from './composables/usePluginBridge'

await invokeCore('save_settings', {
  settings: {
    theme: 'dark',
    volume: 80
  }
})
```

---

## 事件系统

### subscribe()

订阅事件。

#### 描述

订阅 Core 事件。当事件发生时，插件会收到通知。

#### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `event` | `string` | 是 | 事件名称 |

#### 通过 invokeCore() 调用

```typescript
import { invokeCore } from './composables/usePluginBridge'

await invokeCore('subscribe', { event: 'my-event' })
```

### publish()

发布事件。

#### 描述

发布事件到 Core。其他订阅了该事件的插件会收到通知。

#### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `event` | `string` | 是 | 事件名称 |
| `data` | `object` | 否 | 事件数据 |

#### 通过 invokeCore() 调用

```typescript
import { invokeCore } from './composables/usePluginBridge'

await invokeCore('publish', {
  event: 'my-event',
  data: { message: 'Hello' }
})
```

---

## Sidecar 通信 API

### invokePlugin()

调用 Sidecar 的 JSON-RPC 方法。

#### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pluginId` | `string` | 是 | 插件 ID |
| `command` | `string` | 是 | RPC 方法名（对应 Sidecar 的 JSON-RPC method） |
| `params` | `object` | 否 | 方法参数 |

#### 通过 invokePlugin() 调用

```typescript
import { invokePlugin } from './composables/usePluginBridge'

const result = await invokePlugin('my-plugin', 'start_timer', {
  duration_secs: 1500
})
console.log(result.status) // "ok"
console.log(result.data)   // { remaining_secs: 1500 }
```

#### 返回值

```typescript
interface SidecarResponse<T = unknown> {
  status: string  // "ok" | "error"
  result?: unknown
  data?: T
}
```

#### 手写 postMessage 调用

```typescript
const requestId = `plugin-${Date.now()}`

window.parent.postMessage({
  type: 'plugin:invoke',
  payload: {
    id: requestId,
    pluginId: 'my-plugin',
    command: 'start_timer',
    params: { duration_secs: 1500 }
  }
}, '*')

window.addEventListener('message', (event) => {
  if (event.data?.type === 'plugin:response' && event.data.payload?.id === requestId) {
    const result = event.data.payload.result
    console.log(result)
  }
})
```

---

## 前端日志 API

### feLog()

将前端日志写入持久化日志文件，生产环境可追踪。

#### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `level` | `string` | 是 | 日志级别：`'info'` / `'warn'` / `'error'` |
| `tag` | `string` | 是 | 日志标签（模块名） |
| `message` | `string` | 是 | 日志内容 |

#### 通过 feLog() 调用

```typescript
import { feLog } from './composables/usePluginBridge'

await feLog('info', 'MyPlugin', '用户点击了开始按钮')
await feLog('error', 'MyPlugin', '数据加载失败: timeout')
```

> **注意**：`feLog()` 内部通过 `invokeCore('frontend_log', { level, tag, message })` 桥接调用。日志写入失败不影响主流程。

---

## 内置 RPC 方法

以下是 Core 会发送给 Sidecar 的内置 JSON-RPC 方法，Sidecar **必须实现**：

| 方法 | 说明 | params | 预期响应 |
|------|------|--------|----------|
| `ping` | 心跳检测 | 无 | `"pong"` 或任意值 |
| `initialize` | 插件初始化 | 无 | `{ id, name, version }` |
| `get_status` | 获取插件状态 | 无 | 当前状态信息 |

---

## postMessage 消息类型完整清单

| type | 方向 | payload 结构 | 说明 |
|------|------|-------------|------|
| `plugin:invoke` | 前端 → Core | `{ id, pluginId, command, params }` | 调用 Sidecar RPC |
| `plugin:response` | Core → 前端 | `{ id, command, result }` | Sidecar RPC 成功响应 |
| `plugin:error` | Core → 前端 | `{ id, command, error }` | Sidecar RPC 失败 |
| `plugin:ready` | 前端 → Core | `{ pluginId, timestamp }` | 前端就绪通知 |
| `core:invoke` | 前端 → Core | `{ id, command, args }` | 调用 Core Tauri 命令 |
| `core:invoke-response` | Core → 前端 | `{ id, result, error }` | Core 命令响应 |
| `command` | 前端 → Core | `{ method, params }` | Core 功能命令（通知等） |
| `theme:change` | Core → 前端 | `{ theme }` | 主题变更 |
| `theme:request` | 前端 → Core | 无 | 请求当前主题 |
| `language:change` | Core → 前端 | `{ language }` | 语言变更 |
| `language:request` | 前端 → Core | 无 | 请求当前语言 |
| `shortcut:toggle-sidebar` | 前端 → Core | 无 | 转发 Ctrl+B 快捷键 |

---

## 版本历史

### v1.1 (2026-07-15)

**新增功能**:
- 补充 `core:invoke` / `core:invoke-response` 消息类型文档
- 补充 `invokePlugin()` / `invokeCore()` 桥接函数文档
- 补充 `feLog()` 前端日志 API
- 补充 `language:change` / `language:request` 语言系统
- 补充完整 postMessage 消息类型清单

**变更**:
- 所有 API 示例从 Tauri `invoke()` 改为 postMessage 桥接方式
- 明确标注每个 API 的正确调用方式

### v1.0 (2026-04-11)

**初始版本**:
- `notify()` 接口
- `get_theme()` 接口
- `theme:change` 事件
- `get_settings()` 接口
- `save_settings()` 接口
- `subscribe()` 接口
- `publish()` 接口
