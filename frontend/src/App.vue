<template>
  <div class="plugin-container">
    <h1 class="plugin-title">{{PLUGIN_NAME}}</h1>
    <p class="plugin-desc">{{ t('developing') }}</p>
    <p class="theme-info">{{ t('currentTheme', { theme: currentTheme }) }}</p>
    <button class="test-button" @click="sendTestEvent">{{ t('testCommunication') }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale: i18nLocale } = useI18n()

/** 插件显示名（脚手架生成后改为实际插件名） */
const PLUGIN_NAME = '插件名称'

/** 当前主题状态 */
const currentTheme = ref<'dark' | 'light'>('dark')

/**
 * 监听来自 Core 的主题变更 / 语言变更消息
 * Core 会在 iframe 加载时和主题/语言切换时发送对应消息
 */
function handleCoreMessage(event: MessageEvent): void {
  const data = event.data as { type?: string; payload?: Record<string, unknown> } | null

  // 主题变更
  if (data?.type === 'theme:change' && data.payload?.theme) {
    const theme = data.payload.theme as 'dark' | 'light'
    currentTheme.value = theme
    applyTheme(theme)
  }

  // 语言变更
  if (data?.type === 'language:change' && data.payload?.language) {
    i18nLocale.value = data.payload.language as 'zh-CN' | 'en-US'
  }
}

/**
 * 转发 Ctrl+B 到父窗口（跨源 iframe 的快捷键无法被父窗口直接监听）
 * 仅在 iframe 内部生效，不与父窗口逻辑冲突
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey && event.key === 'b' && window.parent !== window) {
    event.preventDefault()
    window.parent.postMessage({ type: 'shortcut:toggle-sidebar' }, '*')
  }
}

/** 应用主题 class 到 document 根元素 */
function applyTheme(theme: 'dark' | 'light'): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  } else {
    document.documentElement.classList.add('light')
    document.documentElement.classList.remove('dark')
  }
}

/** 发送测试事件 */
const sendTestEvent = (): void => {
  if (window.parent !== window) {
    window.parent.postMessage({
      type: 'plugin:ready',
      pluginId: '{{PLUGIN_ID}}',
      timestamp: Date.now()
    }, '*')
    // plugin:ready 事件已发送
  } else {
    // 独立窗口模式，无法发送 postMessage
  }
}

onMounted(() => {
  window.addEventListener('message', handleCoreMessage)
  window.addEventListener('keydown', handleKeydown)
  // 默认暗色（等待 Core 推送实际主题）
  applyTheme('dark')
  // 主动向 Core 请求当前主题和语言（解决 iframe load 时序问题）
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'theme:request' }, '*')
    window.parent.postMessage({ type: 'language:request' }, '*')
  }
})

onUnmounted(() => {
  window.removeEventListener('message', handleCoreMessage)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.plugin-container {
  padding: 20px;
  text-align: center;
}

.plugin-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--color-text);
}

.plugin-desc {
  font-size: 14px;
  color: var(--color-text-2);
  margin-bottom: 20px;
}

.theme-info {
  font-size: 12px;
  color: var(--color-text-3);
  margin-bottom: 16px;
}

.test-button {
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.test-button:hover {
  background: var(--color-primary-hover);
}
</style>
