/**
 * @fileoverview 插件前端 Vite 构建配置（含安全加固）
 * @description
 *   安全特性：
 *   1. 生产环境强制禁用 sourcemap，防止源码映射泄露
 *   2. 移除 console.* / debugger 语句
 *   3. 移除所有注释（含 license 注释）
 *   4. 资源文件名混淆（仅保留 hash，去除语义化命名）
 *
 *   深度代码混淆由 build-zip.mjs 后构建步骤通过 javascript-obfuscator 完成。
 */

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // ── 安全：强制禁用 sourcemap ──
    // 生产环境绝不生成 .map 文件，防止源码逆向还原
    sourcemap: false,
    // ── 安全：资源文件名混淆 ──
    // 去除语义化命名（如 "index"、"vendor"），仅保留 hash
    // 使逆向者无法从文件名推断模块功能
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash][extname]',
      },
    },
  },
  // ── 安全：esbuild 转换层加固 ──
  esbuild: {
    // 生产环境移除 console.* 调用和 debugger 语句
    drop: ['console', 'debugger'],
    // 移除所有注释（包括 license 声明，减小信息泄露面）
    legalComments: 'none',
  },
  base: './',
  server: {
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
})
