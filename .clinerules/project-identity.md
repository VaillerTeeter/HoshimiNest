---
description: "MikanBox project overview — tech stack, directory structure, package manager, dev commands, Rust dependencies. Always apply."
globs: ""
alwaysApply: true
---

# Project Identity

<!-- MikanBox 项目身份与架构，AI 每次对话自动加载 -->

## Project Name & Purpose

MikanBox is a desktop anime tracking & download manager.

## Tech Stack

### Frontend

- **React 19 + TypeScript** — functional components + hooks, strict mode
- **Vite 7** — bundler, dev port `1520`
- **Zustand** — state management (`src/store/`)
- **Plain CSS** — NO Tailwind, NO CSS-in-JS
- **Yarn** — the ONLY package manager

### Backend

- **Tauri v2** — Rust desktop shell
- **Key Rust crates:**
  - `reqwest` (HTTP client, rustls-tls)
  - `serde` + `serde_json` (serialization)
  - `tokio` (async runtime: time, sync, macros, rt)
  - `tauri-plugin-shell` / `tauri-plugin-opener` / `tauri-plugin-dialog`
  - `log` + `env_logger`

### External Binaries

Bundled with the app via `externalBin`:

- `aria2c` — download engine
- `mkvmerge` — media remuxing

## Directory Structure

```text
src/                        # React frontend
  pages/                    # page-level components, one file per route
    BacklogPage.tsx
    DownloadPage.tsx
    FinishedPage.tsx
    QueryPage.tsx / QueryPage/
    SearchPage.tsx / SearchPage/
    TracksPage.tsx / tracks/
    WatchingPage.tsx
    WatchListPage.tsx / watchlist/
    FinishedPage.tsx / finished/
  store/                    # Zustand stores
    downloadStore.tsx
    watchStore.ts
  styles/                   # global CSS
    theme.css
    fonts.css
  assets/                   # static assets
src-tauri/                  # Rust backend
  src/
    lib.rs                  # Tauri commands + plugin registration
    main.rs                 # entry point
  capabilities/             # Tauri capability config
  app-config.json           # compile-time config (BT trackers, ports, cache)
  tauri.conf.json           # Tauri config (window, bundle, CSP, externalBin)
scripts/                    # dev / setup scripts (.ps1)
```

## Package Rules

NEVER run `npm install` or `pnpm add`. Always use `yarn`.

NEVER suggest re-installing these — already in `package.json`:

- `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-opener`
- `animal-island-ui`, `bangumi-api-client`
- `react`, `react-dom`, `zustand`

## Dev Commands

```bash
yarn dev          # Vite dev server (frontend only, port 1520)
yarn tauri dev    # full Tauri app in dev mode
yarn build        # TypeScript check + Vite build
yarn tauri build  # production Tauri bundle
yarn rustcheck    # cargo check (Rust compilation check only)
```

## Window Config

- Window: 1360×820, non-resizable, non-maximizable, frameless (custom titlebar)
- App identifier: `com.vaciller.mikanbox`
