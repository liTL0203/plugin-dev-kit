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
    timeoutMs: number = 10000,
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const id = `core-${String(++coreInvokeId)}-${Date.now().toString(36)}`
        const timeout = setTimeout(() => {
            window.removeEventListener('message', handler)
            reject(new Error(`Core 命令 ${command} 超时 (${Math.round(timeoutMs / 1000)}s)`))
        }, timeoutMs)

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
  // ────────────────────────────────────────────────────────────────────────────
  // 文件选择/保存桥（替代 iframe 内 input[type=file]）
  //
  // 背景：iframe 里的 <input type="file"> 弹出的系统对话框由 WebView2 引擎
  // 进程创建，与应用窗口无属主链——不置前也不模态。改走核心桥后对话框以
  // 本插件宿主窗口为属主（置前 + 模态），且路径不落插件手（token 授权）。
  //
  // BridgeFile 鸭子类型兼容 File 的常用面（name/size/slice/text/arrayBuffer），
  // 拖拽等原生入口拿到的真 File 可与之混用（结构化类型）。
  // ────────────────────────────────────────────────────────────────────────────

  /** 文件选择/保存的超时（用户浏览文件系统的合理上限，须大于默认 10s） */
  const FILE_DIALOG_TIMEOUT_MS = 600_000

  /** 桥单次分块读取粒度（与核心 PLUGIN_FILE_CHUNK_MAX_BYTES 对齐） */
  const BRIDGE_CHUNK_BYTES = 4 * 1024 * 1024

  /** 小文件全量缓存阈值（超过则按需取段不驻留内存） */
  const BRIDGE_CACHE_LIMIT = 8 * 1024 * 1024

  /** 文件类型过滤器 */
  export interface BridgeFileFilter {
    name: string
    extensions: string[]
  }

  /** Blob 片段的结构化形态（File.slice 与桥片段共用） */
  export interface SliceLike {
    arrayBuffer(): Promise<ArrayBuffer>
  }

  /** 可随机访问的文件面（File 与 BridgeFile 的公共结构） */
  export interface RandomAccessFileLike {
    readonly name: string
    readonly size: number
    slice(start?: number, end?: number): SliceLike
  }

  /** 桥选文件（File 的鸭子类型） */
  export interface BridgeFile extends RandomAccessFileLike {
    text(): Promise<string>
    arrayBuffer(): Promise<ArrayBuffer>
    /** 还原为原生 File（供 createObjectURL/FileReader 等 Blob 专属 API 使用） */
    toFile(mime?: string): Promise<File>
  }

  interface PickFileMeta {
    token: string
    name: string
    size: number
  }

  interface ChunkResult {
    base64: string
    size: number
  }

  /** base64 → Uint8Array（atob 逐字节） */
  function bridgeBase64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  }

  /** Uint8Array → 独立 ArrayBuffer（显式拷贝，规避 ArrayBufferLike 类型歧义） */
  function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const ab = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(ab).set(bytes)
    return ab
  }

  /** 单文件实现：核心桥分块读取；小文件内容本地缓存支持多次访问 */
  class BridgeFileImpl implements BridgeFile {
    readonly name: string
    readonly size: number
    private readonly token: string
    private cache: Uint8Array | null = null

    constructor(meta: PickFileMeta) {
      this.token = meta.token
      this.name = meta.name
      this.size = meta.size
    }

    /** 按区间读取（超过单次上限自动续块；遇尾块提前收束） */
    private async fetchRange(offset: number, length: number): Promise<Uint8Array> {
      if (length <= 0) return new Uint8Array(0)
      const out = new Uint8Array(length)
      let done = 0
      while (done < length) {
        const want = Math.min(length - done, BRIDGE_CHUNK_BYTES)
        const r = await invokeCore<ChunkResult>(
          'plugin_read_picked_file_chunk',
          { token: this.token, offset: offset + done, length: want },
          FILE_DIALOG_TIMEOUT_MS,
        )
        const bytes = bridgeBase64ToBytes(r.base64)
        out.set(bytes, done)
        done += bytes.length
        if (bytes.length < want) break
      }
      return out.subarray(0, done)
    }

    private async getContent(): Promise<Uint8Array> {
      if (this.cache) return this.cache
      const bytes = await this.fetchRange(0, this.size)
      if (this.size <= BRIDGE_CACHE_LIMIT) this.cache = bytes
      return bytes
    }

    slice(start = 0, end = this.size): SliceLike {
      const lo = Math.max(0, Math.min(start, this.size))
      const hi = Math.max(lo, Math.min(end, this.size))
      return {
        arrayBuffer: async () => bytesToArrayBuffer(await this.fetchRange(lo, hi - lo)),
      }
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
      return bytesToArrayBuffer(await this.getContent())
    }

    async text(): Promise<string> {
      const bytes = await this.getContent()
      return new TextDecoder().decode(bytes)
    }

    async toFile(mime = ''): Promise<File> {
      return new File([await this.arrayBuffer()], this.name, { type: mime })
    }
  }

  /** 桥保存句柄 */
  export interface BridgeSavedFile {
    readonly name: string
    writeText(content: string): Promise<number>
    writeArrayBuffer(content: ArrayBuffer): Promise<number>
  }

  interface PickResult {
    files: PickFileMeta[]
  }

  interface SaveResult {
    token: string
    fileName: string
  }

  /**
   * 打开系统文件选择框（以本插件宿主窗口为属主，置前 + 模态）
   *
   * @returns 选中文件列表（File 鸭子类型）；取消返回 null
   */
  export async function bridgePickFiles(options: {
    title?: string
    filters?: BridgeFileFilter[]
    multiple?: boolean
    directory?: boolean
  }): Promise<BridgeFile[] | null> {
    const r = await invokeCore<PickResult | null>(
      'plugin_pick_file',
      {
        title: options.title ?? null,
        filters: options.filters ?? null,
        multiple: options.multiple ?? false,
        directory: options.directory ?? false,
      },
      FILE_DIALOG_TIMEOUT_MS,
    )
    if (!r || r.files.length === 0) return null
    return r.files.map((meta) => new BridgeFileImpl(meta))
  }

  /**
   * 打开系统保存框（以本插件宿主窗口为属主，置前 + 模态）
   *
   * @returns 保存句柄（writeText/writeArrayBuffer 各可调用一次）；取消返回 null
   */
  export async function bridgeSaveFile(options: {
    title?: string
    defaultPath?: string
    filters?: BridgeFileFilter[]
  }): Promise<BridgeSavedFile | null> {
    const r = await invokeCore<SaveResult | null>(
      'plugin_save_file',
      {
        title: options.title ?? null,
        defaultPath: options.defaultPath ?? null,
        filters: options.filters ?? null,
      },
      FILE_DIALOG_TIMEOUT_MS,
    )
    if (!r) return null
    return {
      name: r.fileName,
      writeText: (content: string) =>
        invokeCore<{ size: number }>(
          'plugin_write_saved_file',
          { token: r.token, textContent: content },
          FILE_DIALOG_TIMEOUT_MS,
        ).then((w) => w.size),
      writeArrayBuffer: (content: ArrayBuffer) => {
        const bytes = new Uint8Array(content)
        let bin = ''
        const CHUNK = 0x8000
        for (let i = 0; i < bytes.length; i += CHUNK) {
          bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
        }
        return invokeCore<{ size: number }>(
          'plugin_write_saved_file',
          { token: r.token, base64Content: btoa(bin) },
          FILE_DIALOG_TIMEOUT_MS,
        ).then((w) => w.size)
      },
    }
  }
