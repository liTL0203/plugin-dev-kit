# Contributing to Plugin Dev Kit

Thank you for your interest in improving Plugin Dev Kit! This document outlines how to contribute.

**[中文版](./CONTRIBUTING.zh-CN.md)** | **English**

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
- Separate language files: `DOC.md` (English) + `DOC.zh-CN.md` (Chinese)
- Add cross-language links at the top of each document
- Keep code examples self-contained and runnable

### Areas Needing Help

- Additional frontend framework templates (React, Svelte)
- macOS/Linux compatibility testing
- Documentation translations
- Example plugins

