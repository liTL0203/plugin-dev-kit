/**
 * @fileoverview 插件 postMessage 桥接通信 composable（模板）
 * @module composables/usePluginBridge
 * @description 插件运行在 iframe 中，无法直接调用 Tauri IPC。
 * 本模块通过 postMessage 与 Core 宿主窗口桥接通信：
 * - invokePlugin(): 调用 Sidecar RPC（plugin:invoke → plugin:response）
 * - invokeCore(): 调用 Core Tauri 命令（core:invoke → core:invoke-response）
 * - deepUnwrap(): 深层剥离 Vue 响应式代理，避免 structured clone 失败
 *
 * 新插件应复制此文件到自己的 frontend/src/composables/ 目录下使用。
 */

/** Core 命令桥接请求计数器 */
let coreInvokeId = 0

/** 插件 RPC 桥接请求计数器 */
let pluginInvokeId = 0

/**
 * 深层剥离 Vue 响应式代理，确保 postMessage 可序列化
 * Vue reactive Proxy 对象无法被 structured clone 算法克隆，
 * 必须在发送前转为纯 JS 对象。
 */
export function deepUnwrap<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T
}

/**
 * 通过 postMessage 桥接调用 Core 命令
 * @param command - Core Tauri 命令名
 * @param args - 命令参数
 * @returns Core 命令返回值
 */
export function invokeCore<T = unknown>(
    command: string,
    args: Record<string, unknown> = {},
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const id = `core-${String(++coreInvokeId)}-${Date.now().toString(36)}`
        const timeout = setTimeout(() => {
            window.removeEventListener('message', handler)
            reject(new Error(`Core 命令 ${command} 超时 (10s)`))
        }, 10000)

        function handler(event: MessageEvent): void {
            const data = event.data as {
                type?: string
                payload?: { id?: string; result?: unknown; error?: string }
            } | null
            if (data?.type === 'core:invoke-response' && data.payload?.id === id) {
                clearTimeout(timeout)
                window.removeEventListener('message', handler)
                if (data.payload.error) {
                    reject(new Error(data.payload.error))
                } else {
                    resolve(data.payload.result as T)
                }
            }
        }

        window.addEventListener('message', handler)
        window.parent.postMessage(
            {
                type: 'core:invoke',
                payload: deepUnwrap({ id, command, args }),
            },
            '*',
        )
    })
}

/** Sidecar 响应包装结构 */
export interface SidecarResponse<T = unknown> {
    status: string
    data?: T
}

/**
 * 通过 postMessage 桥接调用 Sidecar RPC
 * @param pluginId - 插件 ID
 * @param command - RPC 命令名
 * @param params - RPC 参数
 * @returns Sidecar 响应
 */
export function invokePlugin<T = unknown>(
    pluginId: string,
    command: string,
    params?: Record<string, unknown>,
): Promise<SidecarResponse<T>> {
    return new Promise<SidecarResponse<T>>((resolve, reject) => {
        const id = `plugin-${String(++pluginInvokeId)}-${Date.now().toString(36)}`
        const timeout = setTimeout(() => {
            window.removeEventListener('message', handler)
            reject(new Error(`插件 RPC ${command} 超时 (30s)`))
        }, 30000)

        function handler(event: MessageEvent): void {
            const data = event.data as {
                type?: string
                payload?: { id?: string; command?: string; result?: unknown; error?: string }
            } | null

            if (data?.type === 'plugin:response' && data.payload?.id === id) {
                clearTimeout(timeout)
                window.removeEventListener('message', handler)
                if (data.payload.error) {
                    reject(new Error(data.payload.error))
                } else {
                    resolve(data.payload.result as SidecarResponse<T>)
                }
                return
            }
        }

        window.addEventListener('message', handler)
        window.parent.postMessage(
            {
                type: 'plugin:invoke',
                payload: deepUnwrap({ id, pluginId, command, params: params ?? null }),
            },
            '*',
        )
    })
}

/**
 * 前端日志写入（通过 postMessage 桥接调用 Core frontend_log 命令）
 * 写入 startup.log，生产环境可追踪。
 */
export async function feLog(
    level: string,
    tag: string,
    message: string,
): Promise<void> {
    try {
        await invokeCore('frontend_log', { level, tag, message })
    } catch {
        // 日志写入失败不影响主流程
    }
}
