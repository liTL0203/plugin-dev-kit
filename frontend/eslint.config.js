import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from 'eslint-config-prettier'
import importX from 'eslint-plugin-import-x'
import globals from 'globals'

/**
 * 插件前端 ESLint 配置（flat config，自包含）
 *
 * 插件模板默认启用代码规范检查；如不需要，删除本文件和
 * package.json 中的 eslint 相关 devDependencies 与 lint 脚本即可。
 *
 * 使用方法（frontend 目录内）:
 *   pnpm lint        检查
 *   pnpm lint:fix    自动修复
 *
 * 说明: 不使用类型感知规则（strictTypeChecked），
 * 保持配置零依赖 tsconfig project，复制到任何插件即可使用。
 * 规则与核心程序 mydt-core/eslint.config.js 的语法层规范保持一致。
 */
export default tseslint.config(
  // 全局忽略
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },

  // JS 基础规则（适用于所有文件）
  js.configs.recommended,

  // ── TS 文件: 非类型检查的 TS 推荐规则 ──
  {
    files: ['**/*.{ts,mts,cts}'],
    extends: [...tseslint.configs.recommended],
  },

  // ── 纯 JS 文件 ──
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [...tseslint.configs.recommended],
  },

  // ── Vue 文件: TS 解析器嵌入 <script setup lang="ts"> ──
  {
    files: ['**/*.vue'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
  },

  // Vue 规则
  ...pluginVue.configs['flat/recommended'],

  // Prettier 兼容（关闭与 Prettier 冲突的规则）
  prettierConfig,

  // Import 排序规则（与核心程序保持一致）
  {
    plugins: {
      'import-x': importX,
    },
    rules: {
      'import-x/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // 浏览器全局变量声明（插件前端运行在 iframe 中）
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // 自定义规则: 与核心一致的语法层规范（无类型检查变体）
  {
    files: ['**/*.{ts,mts,cts,vue}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],

      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/require-default-prop': 'off',
      'vue/no-unused-refs': 'error',
    },
  },
)
