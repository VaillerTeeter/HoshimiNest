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

## Development Environment

- **OS**: Windows only — NEVER assume macOS/Linux/WSL paths or tools
- **Shell**: PowerShell (`.ps1` scripts) — NEVER write `.sh` or bash scripts
- **Terminal commands**: always use PowerShell syntax; NEVER use Unix-only flags or pipes

## Directory Structure

```text
src/                                       # React frontend source
  ├── App.css                              # global layout & component styles (colors reference theme.css vars)
  ├── App.tsx                              # root component (topbar + sidebar nav + download settings modal)
  ├── assets/
  │   └── fonts/                           # bundled font files
  ├── main.tsx                             # React entry point
  ├── pages/                               # page-level components (one per nav item)
  │   ├── BacklogPage.tsx                  # backlog / plan-to-watch
  │   ├── DownloadPage.tsx                 # download manager
  │   ├── FinishedPage.tsx                 # completed anime (main file, sub-logic in finished/)
  │   ├── QueryPage.tsx                    # seasonal query (main page)
  │   ├── QueryPage/                       # seasonal query sub-components
  │   ├── SearchPage.tsx                   # resource search (main page)
  │   ├── SearchPage/                      # resource search sub-components
  │   ├── TracksPage.tsx                   # track workshop (main file, sub-logic in tracks/)
  │   ├── WatchingPage.tsx                 # currently watching
  │   ├── WatchListPage.tsx                # watchlist base (main file, sub-logic in watchlist/)
  │   ├── finished/                        # completed anime sub-components
  │   ├── tracks/                          # track workshop sub-components
  │   └── watchlist/                       # watchlist sub-components
  ├── store/                               # global state
  │   ├── downloadStore.tsx                # download task context (state machine + aria2 events + localStorage)
  │   └── watchStore.ts                    # watchlist localStorage helpers
  ├── styles/
  │   ├── fonts.css                        # @font-face declarations
  │   └── theme.css                        # theme CSS variables
  └── vite-env.d.ts                        # Vite type declarations
src-tauri/                                 # Tauri/Rust backend
  ├── app-config.json                      # compile-time config (BT trackers, ports, cache)
  ├── build.rs                             # Tauri build script
  ├── capabilities/
  │   └── default.json                     # Tauri ACL capability config
  ├── icons/                               # app icons
  ├── src/
  │   ├── lib.rs                           # Tauri commands + aria2 control + mkvmerge track merge
  │   └── main.rs                          # Rust entry point
  └── tauri.conf.json                      # Tauri app config (window/bundle/permissions)
scripts/                                   # dev & setup scripts (.ps1)
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
