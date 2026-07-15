# 插件开发示例

> **版本**: v1.1 | **最后更新**: 2026-07-15
>
> 所有示例均基于 `frontend/src/composables/usePluginBridge.ts` 封装函数，可直接复制使用。

---

## usePluginBridge 导入

所有示例均假设已导入桥接函数：

```typescript
import { invokePlugin, invokeCore, feLog, type SidecarResponse } from './composables/usePluginBridge'
```

---

## 通知系统

### 发送简单通知

```typescript
// 发送简单通知（无声音）
window.parent.postMessage({
  type: 'command',
  payload: {
    method: 'notify',
    params: {
      title: '通知标题',
      body: '通知内容'
    }
  }
}, '*')
```

### 发送带声音的通知

```typescript
// 发送通知（带柔和声音）
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

### 根据场景选择声音风格

```typescript
function notify(title: string, body: string, urgency: 'low' | 'medium' | 'high'): void {
  const soundMap = {
    low: 'gentle',
    medium: 'default',
    high: 'urgent'
  }

  window.parent.postMessage({
    type: 'command',
    payload: {
      method: 'notify',
      params: { title, body, sound: soundMap[urgency] }
    }
  }, '*')
}

// 使用示例
notify('休息提醒', '该休息了', 'low')
notify('任务完成', '番茄钟结束', 'medium')
notify('系统警告', '内存不足', 'high')
```

---

## 主题系统

### 监听主题变更（必须实现）

```typescript
import { onMounted, onUnmounted, ref } from 'vue'

const currentTheme = ref<'dark' | 'light'>('dark')

function handleThemeChange(event: MessageEvent): void {
  const data = event.data as { type?: string; payload?: { theme?: string } } | null
  if (data?.type === 'theme:change' && data.payload?.theme) {
    const theme = data.payload.theme as 'dark' | 'light'
    currentTheme.value = theme
    applyTheme(theme)
  }
}

function applyTheme(theme: 'dark' | 'light'): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  } else {
    document.documentElement.classList.add('light')
    document.documentElement.classList.remove('dark')
  }
}

onMounted(() => {
  window.addEventListener('message', handleThemeChange)
  applyTheme('dark')
  // 主动请求当前主题
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'theme:request' }, '*')
  }
})

onUnmounted(() => {
  window.removeEventListener('message', handleThemeChange)
})
```

### 适配暗黑/亮色模式

```typescript
// 所有颜色必须使用 CSS 变量，禁止硬编码
// style.css 中已定义双主题变量：
// :root { --color-bg: #ffffff; ... }
// .dark { --color-bg: #0d0d0d; ... }

/* 正确 */
.card {
  background: var(--color-bg-2);
  color: var(--color-text);
}

/* 错误 - 硬编码颜色 */
.card {
  background: #1a1a1a;
  color: #fff;
}
```

---

## 语言系统

### 监听语言变更

```typescript
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale: i18nLocale } = useI18n()

function handleLanguageChange(event: MessageEvent): void {
  const data = event.data as { type?: string; payload?: { language?: string } } | null
  if (data?.type === 'language:change' && data.payload?.language) {
    i18nLocale.value = data.payload.language as 'zh-CN' | 'en-US'
  }
}

onMounted(() => {
  window.addEventListener('message', handleLanguageChange)
  // 主动请求当前语言
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'language:request' }, '*')
  }
})

onUnmounted(() => {
  window.removeEventListener('message', handleLanguageChange)
})
```

---

## 设置系统

### 读取插件设置

```typescript
import { invokeCore } from './composables/usePluginBridge'

const settings = await invokeCore<Record<string, unknown>>('get_settings')
console.log(settings) // { theme: 'dark', volume: 80, ... }
```

### 保存插件设置

```typescript
import { invokeCore } from './composables/usePluginBridge'

await invokeCore('save_settings', {
  settings: {
    theme: 'dark',
    volume: 80
  }
})
```

### 设置默认值处理

```typescript
import { invokeCore } from './composables/usePluginBridge'

const settings = await invokeCore<Record<string, unknown>>('get_settings')
const theme = settings.theme ?? 'auto'
const volume = settings.volume ?? 80
```

---

## 事件系统

### 订阅事件

```typescript
import { invokeCore } from './composables/usePluginBridge'

await invokeCore('subscribe', { event: 'my-event' })
```

### 发布事件

```typescript
import { invokeCore } from './composables/usePluginBridge'

await invokeCore('publish', {
  event: 'my-event',
  data: { message: 'Hello' }
})
```

### 插件间通信

```typescript
import { invokeCore } from './composables/usePluginBridge'

// 插件 A：发布事件
await invokeCore('publish', {
  event: 'pomodoro.session_complete',
  data: { duration: 1500 }
})

// 插件 B：订阅事件
await invokeCore('subscribe', { event: 'pomodoro.*' })
```

---

## Sidecar 通信

### 调用 Sidecar 方法

```typescript
import { invokePlugin, type SidecarResponse } from './composables/usePluginBridge'

// 调用带参数的方法
const result = await invokePlugin('my-plugin', 'start_timer', {
  duration_secs: 1500
})
console.log(result.status) // "ok"
console.log(result.data)   // { remaining_secs: 1500 }

// 调用无参数的方法
const status = await invokePlugin('my-plugin', 'get_status')
console.log(status.status) // "ok"
```

### 手写 postMessage 调用 Sidecar

```typescript
function callSidecar(command: string, params: unknown): Promise<SidecarResponse> {
  return new Promise((resolve, reject) => {
    const requestId = `plugin-${Date.now()}`

    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; payload?: { id?: string; result?: unknown; error?: string } } | null
      if (data?.type === 'plugin:response' && data.payload?.id === requestId) {
        window.removeEventListener('message', handler)
        resolve(data.payload.result as SidecarResponse)
      }
    }

    window.addEventListener('message', handler)

    window.parent.postMessage({
      type: 'plugin:invoke',
      payload: {
        id: requestId,
        pluginId: 'my-plugin',
        command,
        params: params ?? null
      }
    }, '*')

    setTimeout(() => {
      window.removeEventListener('message', handler)
      reject(new Error('Sidecar 调用超时 (30s)'))
    }, 30000)
  })
}
```

---

## 前端日志

### 写入持久化日志

```typescript
import { feLog } from './composables/usePluginBridge'

// 写入不同级别的日志
await feLog('info', 'MyPlugin', '插件已初始化')
await feLog('warn', 'MyPlugin', '配置文件缺失，使用默认值')
await feLog('error', 'MyPlugin', '数据加载失败: timeout')
```

---

## 快捷键转发

### 转发 Ctrl+B 到父窗口（必须实现）

```typescript
import { onMounted, onUnmounted } from 'vue'

function handleKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey && event.key === 'b' && window.parent !== window) {
    event.preventDefault()
    window.parent.postMessage({ type: 'shortcut:toggle-sidebar' }, '*')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
```

---

## 完整示例

### 番茄钟插件（使用桥接函数）

```typescript
import { ref, onMounted, onUnmounted } from 'vue'
import { invokePlugin, invokeCore, feLog } from './composables/usePluginBridge'

const timerState = ref<'idle' | 'running' | 'paused'>('idle')
const remainingSecs = ref(0)
const currentTheme = ref<'dark' | 'light'>('dark')

// 开始专注
async function startFocus(): Promise<void> {
  try {
    const result = await invokePlugin('pomodoro', 'start_timer', {
      duration_secs: 1500
    })
    timerState.value = 'running'
    remainingSecs.value = result.data?.remaining_secs ?? 1500
    await feLog('info', 'Pomodoro', '专注计时器已启动')
  } catch (err) {
    await feLog('error', 'Pomodoro', `启动失败: ${err}`)
  }
}

// 结束专注
async function endFocus(): Promise<void> {
  // 发送通知（带柔和声音）
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

  // 发布事件（通知其他插件）
  await invokeCore('publish', {
    event: 'pomodoro.session_complete',
    data: { duration: 1500 }
  })

  timerState.value = 'idle'
}

// 主题监听
function handleThemeChange(event: MessageEvent): void {
  const data = event.data as { type?: string; payload?: { theme?: string } } | null
  if (data?.type === 'theme:change' && data.payload?.theme) {
    currentTheme.value = data.payload.theme as 'dark' | 'light'
    if (currentTheme.value === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}

// 快捷键转发
function handleKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey && event.key === 'b' && window.parent !== window) {
    event.preventDefault()
    window.parent.postMessage({ type: 'shortcut:toggle-sidebar' }, '*')
  }
}

onMounted(() => {
  window.addEventListener('message', handleThemeChange)
  window.addEventListener('keydown', handleKeydown)
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'theme:request' }, '*')
    window.parent.postMessage({ type: 'language:request' }, '*')
  }
})

onUnmounted(() => {
  window.removeEventListener('message', handleThemeChange)
  window.removeEventListener('keydown', handleKeydown)
})
```

### 代理切换插件（使用桥接函数）

```typescript
import { invokePlugin, invokeCore } from './composables/usePluginBridge'

// 切换代理配置
async function switchProfile(profileId: string): Promise<void> {
  // 调用 Sidecar 切换代理
  await invokePlugin('proxy-switch', 'switch_profile', { profile_id: profileId })

  // 保存设置
  await invokeCore('save_settings', {
    settings: { activeProfile: profileId }
  })

  // 发送通知（默认声音）
  window.parent.postMessage({
    type: 'command',
    payload: {
      method: 'notify',
      params: {
        title: '代理切换',
        body: `已切换到配置: ${profileId}`,
        sound: 'default'
      }
    }
  }, '*')
}
```

---

## postMessage 格式速查

### 发送命令

```typescript
// 1. 调用 Sidecar RPC
window.parent.postMessage({
  type: 'plugin:invoke',
  payload: { id: 'unique-id', pluginId: 'my-plugin', command: 'method_name', params: { ... } }
}, '*')

// 2. 调用 Core Tauri 命令
window.parent.postMessage({
  type: 'core:invoke',
  payload: { id: 'unique-id', command: 'get_settings', args: {} }
}, '*')

// 3. Core 功能命令（通知等）
window.parent.postMessage({
  type: 'command',
  payload: { method: 'notify', params: { title: '...', body: '...' } }
}, '*')

// 4. 请求主题/语言
window.parent.postMessage({ type: 'theme:request' }, '*')
window.parent.postMessage({ type: 'language:request' }, '*')

// 5. 前端就绪
window.parent.postMessage({
  type: 'plugin:ready', pluginId: 'my-plugin', timestamp: Date.now()
}, '*')

// 6. 快捷键转发
window.parent.postMessage({ type: 'shortcut:toggle-sidebar' }, '*')
```

### 接收响应

```typescript
window.addEventListener('message', (event) => {
  const { type, payload } = event.data

  // Sidecar RPC 响应
  if (type === 'plugin:response') {
    console.log(payload.result)
  }

  // Sidecar RPC 错误
  if (type === 'plugin:error') {
    console.error(payload.error)
  }

  // Core 命令响应
  if (type === 'core:invoke-response') {
    console.log(payload.result)
  }

  // 主题变更
  if (type === 'theme:change') {
    applyTheme(payload.theme)
  }

  // 语言变更
  if (type === 'language:change') {
    i18nLocale.value = payload.language
  }
})
```

---

## JSON-RPC 2.0 格式速查

### 请求（Core → Sidecar，stdin）

```json
{
  "jsonrpc": "2.0",
  "method": "start_timer",
  "params": { "duration_secs": 1500 },
  "id": 42
}
```

### 成功响应（Sidecar → Core，stdout）

```json
{
  "jsonrpc": "2.0",
  "result": { "status": "ok", "result": "timer_started", "data": { "remaining_secs": 1500 } },
  "id": 42
}
```

### 错误响应（Sidecar → Core，stdout）

```json
{
  "jsonrpc": "2.0",
  "error": { "code": -32000, "message": "Timer already running" },
  "id": 42
}
```

### 通知（Sidecar → Core，无需响应，无 id 字段）

```json
{
  "jsonrpc": "2.0",
  "method": "timer_completed",
  "params": { "type": "focus", "duration_secs": 1500 }
}
```
