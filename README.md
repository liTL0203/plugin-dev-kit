# My Desktop Tools — Plugin Dev Kit

> An independent, reusable plugin development scaffold for third-party developers. Build your own desktop tool plugins and integrate with My Desktop Tools.

**[中文版](./README.zh-CN.md)** | **English**

---

## What is this?

Plugin Dev Kit is a **ready-to-use plugin scaffold** that includes:

- **Sidecar backend template** (Rust) — communicates with Core via JSON-RPC 2.0
- **Frontend UI template** (Vue3 + TypeScript) — runs in an iframe sandbox, communicates with Core via postMessage
- **One-click build script** — automatically builds frontend + backend and generates a distributable `.zip` package
- **Comprehensive documentation** — architecture, protocol specs, API reference, AI agent workflow

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────┐
│           My Desktop Tools (Core)               │
│           Tauri v2 + Vue3 + Rust                │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐  stdin/stdout  ┌────────────┐│
│  │   Core       │◄─────────────►│  Sidecar   ││
│  │   (Rust)     │  JSON-RPC 2.0 │  (Plugin)  ││
│  └──────┬───────┘               └────────────┘│
│         │                                      │
│         │ postMessage                          │
│         ▼                                      │
│  ┌──────────────┐   postMessage  ┌───────────┐│
│  │   Core       │◄──────────────►│  Frontend ││
│  │   (Vue3)     │                │  (iframe) ││
│  └──────────────┘                └───────────┘│
└─────────────────────────────────────────────────┘
```

- **Sidecar (Backend)**: Rust compiled to an executable, communicates with Core via stdin/stdout JSON-RPC 2.0
- **Frontend UI**: Vue3 app running in an iframe sandbox, communicates with Core via postMessage
- **Key constraint**: Frontend does not communicate directly with Sidecar — all requests are routed through Core

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 20 | Frontend build |
| pnpm | >= 9 | Package manager |
| Rust | >= 1.85 | Sidecar compilation |
| Cargo | Included with Rust | Rust package manager |

### 1. Get the Template

```bash
git clone https://gitee.com/li_tl/plugin-dev-kit.git
cd plugin-dev-kit/
```

### 2. Replace Template Variables

Replace the following placeholders globally with your own information:

| Placeholder | Replace with | Example |
|-------------|--------------|---------|
| `{{PLUGIN_ID}}` | Your plugin ID (lowercase + hyphens) | `my-tool` |
| `{{PLUGIN_NAME}}` | Your plugin display name | `My Tool` |

Files affected: `manifest.json`, `package.json`, `src/Cargo.toml`, `src/src/main.rs`, `frontend/src/App.vue`, `frontend/index.html`, `scripts/build-zip.mjs`

### 3. Build & Package

```bash
# Install dependencies
pnpm install

# One-click build (frontend + Sidecar + ZIP)
pnpm build:zip
```

Output: `{{PLUGIN_ID}}.zip` — installable via Core's Plugin Manager.

---

## Command Reference

| Command | Description |
|---------|-------------|
| `pnpm install` | Install root dependencies |
| `pnpm dev` | Start frontend HMR + Sidecar hot-reload simultaneously |
| `pnpm dev:frontend` | Start frontend dev server only (port 1421) |
| `pnpm dev:sidecar` | Start Sidecar hot-reload only (cargo watch) |
| `pnpm build:frontend` | Build frontend to `dist/` |
| `pnpm build:sidecar` | Build Sidecar release binary |
| `pnpm build:zip` | One-click package as `.zip` |

---

## Directory Structure

```
plugin-dev-kit/
├── LICENSE                     # MIT License
├── CONTRIBUTING.md             # Contribution guidelines
├── manifest.json               # Plugin metadata (identity)
├── package.json                # Build script entry
├── pnpm-lock.yaml              # Dependency lock
├── RELEASE.md                  # User-facing feature doc template
├── CHANGELOG.md                # Version history template
├── PLUGIN_DEV_GUIDE.md         # Full development guide (must read)
├── API_REFERENCE.md            # Core API reference
├── EXAMPLES.md                 # Code examples
├── README.md                   # This file
├── .cargo/
│   └── config.toml             # Cargo config (Windows CRT static linking)
├── src/                        # Sidecar backend (Rust)
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs             # JSON-RPC entry point
│       └── elevated.rs         # Elevated mode communication
├── frontend/                   # Frontend UI (Vue3)
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.ts
│       ├── App.vue             # Main component (theme/shortcut/comms)
│       ├── style.css           # Dual-theme CSS variables
│       └── composables/
│           └── usePluginBridge.ts  # postMessage bridge
└── scripts/
    └── build-zip.mjs           # One-click packaging script
```

---

## Documentation

| Document | Audience | Content |
|----------|----------|---------|
| [PLUGIN_DEV_GUIDE.md](./PLUGIN_DEV_GUIDE.md) | Developers / AI Agents | Full guide (architecture, protocols, API, debugging, packaging, AI workflow) |
| [API_REFERENCE.md](./API_REFERENCE.md) | Developers | All public Core API reference |
| [EXAMPLES.md](./EXAMPLES.md) | Developers | Copy-ready code examples |

---

## Install Plugin

1. Open My Desktop Tools
2. Go to **Plugin Manager**
3. Click **Install Plugin**, select the generated `.zip` file
4. Enable the plugin

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend (Sidecar) | Rust + serde_json |
| Frontend UI | Vue 3 + TypeScript + Vite |
| Communication | JSON-RPC 2.0 (stdin/stdout) + postMessage (iframe) |
| i18n | vue-i18n |
| Package Manager | pnpm |

---

## License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE).

Copyright (c) 2026 li_tl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.

---

## ⚠️ Disclaimer

- **"AS IS"**: This software is provided "AS IS", without any express or implied warranty, including but not limited to merchantability, fitness for a particular purpose, and non-infringement.
- **Use at Your Own Risk**: The developer shall not be liable for any direct or indirect losses (including but not limited to data loss, system damage, business interruption) caused by the use of this software. Users must assess and bear all risks.
- **Third-Party Plugins**: Plugins built with this SDK are independently developed by third parties. The My Desktop Tools Core developer makes no guarantee regarding the behavior, security, or stability of third-party plugins. Users must assess and bear the risks of using third-party plugins.
- **Compatibility Risks**: This SDK may have unknown defects or be incompatible with certain system environments, hardware configurations, or third-party software. The developer does not guarantee normal operation in all environments.
- **Data Backup**: It is recommended to back up important data before using plugins built with this SDK.

> Downloading or using this software indicates that you have read and agree to the above disclaimer.

