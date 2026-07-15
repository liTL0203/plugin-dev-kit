# Contributing to Plugin Dev Kit

Thank you for your interest in improving Plugin Dev Kit! This document outlines how to contribute.

## How to Contribute

### Reporting Issues

1. Check existing issues to avoid duplicates
2. Include: OS version, Rust version, Node.js version, pnpm version
3. Provide a minimal reproduction case
4. Describe expected vs actual behavior

### Submitting Changes

1. Fork this repository
2. Create a branch: `fix/short-description` or `feature/short-description`
3. Make your changes
4. Verify: `cargo check --manifest-path src/Cargo.toml` and `cd frontend && pnpm build`
5. Commit with conventional format: `fix: description` or `feat: description`
6. Submit a Pull Request

### Code Standards

**Rust (Sidecar)**:
- No `unwrap()` or `panic!()` — use `Result` or `.ok()`
- No `println!()` — stdout is reserved for JSON-RPC only
- Use `eprintln!()` for logging

**TypeScript (Frontend)**:
- No `any` type
- No `@ts-ignore` / `@ts-expect-error`
- Use scoped CSS with CSS variables (no hardcoded colors)
- Must handle `theme:change` messages

**Documentation**:
- Bilingual format: English first + Chinese in `<details>` block
- Keep code examples self-contained and runnable

### Areas Needing Help

- Additional frontend framework templates (React, Svelte)
- macOS/Linux compatibility testing
- Documentation translations
- Example plugins

---

<details>
<summary>中文贡献指南</summary>

# 贡献指南

感谢你有兴趣改进 Plugin Dev Kit！

## 如何贡献

### 报告问题

1. 先检查已有 issue 避免重复
2. 请包含：操作系统版本、Rust 版本、Node.js 版本、pnpm 版本
3. 提供最小复现案例
4. 描述预期行为与实际行为

### 提交修改

1. Fork 本仓库
2. 创建分支：`fix/简短描述` 或 `feature/简短描述`
3. 进行修改
4. 验证：`cargo check --manifest-path src/Cargo.toml` 和 `cd frontend && pnpm build`
5. 使用约定格式提交：`fix: 描述` 或 `feat: 描述`
6. 提交 Pull Request

### 代码规范

**Rust (Sidecar)**：
- 禁止 `unwrap()` / `panic!()`，使用 `Result` 或 `.ok()`
- 禁止 `println!()`，stdout 仅用于 JSON-RPC
- 使用 `eprintln!()` 输出日志

**TypeScript (前端)**：
- 禁止 `any` 类型
- 禁止 `@ts-ignore` / `@ts-expect-error`
- 使用 scoped CSS + CSS 变量（禁止硬编码颜色）
- 必须处理 `theme:change` 消息

**文档**：
- 双语格式：英文在前 + 中文在 `<details>` 折叠区域
- 保持代码示例独立可运行

### 需要帮助的方向

- 更多前端框架模板（React、Svelte）
- macOS/Linux 兼容性测试
- 文档翻译
- 示例插件

</details>
