# 贡献指南

感谢你有兴趣改进 Plugin Dev Kit！本文档说明如何参与贡献。

**[English](./CONTRIBUTING.md)** | **中文版**

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
- 独立语言文件：`DOC.md`（英文）+ `DOC.zh-CN.md`（中文）
- 在每个文档顶部添加交叉语言链接
- 保持代码示例独立可运行

### 需要帮助的方向

- 更多前端框架模板（React、Svelte）
- macOS/Linux 兼容性测试
- 文档翻译
- 示例插件
