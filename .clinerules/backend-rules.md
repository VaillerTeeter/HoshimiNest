---
description: "Use when: writing or modifying Rust code in src-tauri/. Covers Tauri command structure, state management, external process handling, logging, and compile-time config."
globs: "src-tauri/**"
alwaysApply: false
---

# Backend Rules

<!-- Tauri v2 / Rust 后端规范，操作 src-tauri/ 目录时自动加载 -->

## Tauri Commands

Always declare Tauri commands in `src-tauri/src/lib.rs` and register them in `run()` via `.invoke_handler(tauri::generate_handler![...])`.

Always use `#[tauri::command]` on async functions. NEVER use sync commands for I/O-bound work.

```rust
#[tauri::command]
async fn my_command(app: tauri::AppHandle, ...) -> Result<T, String> { ... }
```

Always receive `app: tauri::AppHandle` as the first parameter. Use `app.state::<MyState>()` to access managed state.

Prefer `Result<T, String>` as the return type for all commands. Use the `?` operator with `.map_err(|e| e.to_string())` or `.map_err(|e| format!("context: {e}"))` for error propagation.

Use `tauri::async_runtime::spawn()` for long-running background tasks spawned from commands (e.g., polling loops, sidecar process monitors). NEVER use `std::thread::spawn` or `tokio::spawn` directly.

## State Management

Always use Tauri managed state (`app.manage(...)` in `run()`) for shared data. Declare state structs with thread-safe wrappers:

```rust
/// task_id → aria2 gid
struct GidMap(Mutex<HashMap<String, String>>);

/// task_id → oneshot sender to stop the polling loop
struct PollStops(Mutex<HashMap<String, oneshot::Sender<()>>>);

/// Flag to break re-entry loops
struct Closing(AtomicBool);
```

Never use global `static mut` or `lazy_static!` for mutable state — always go through `app.state::<T>()`.

## Frontend Communication

Always emit events to the frontend via `app.emit("event-name", payload)`. Define payload types with `#[derive(serde::Serialize, Clone)]`.

```rust
#[derive(serde::Serialize, Clone)]
struct MyEventPayload {
    id: String,
    value: u8,
}

let _ = app.emit("my-event", MyEventPayload { id, value });
```

Never call `app.emit()` from a synchronous context that holds a lock — always clone the `AppHandle` and emit from an async context or after releasing the lock.

## Logging

Always use the `log` crate macros: `debug!`, `info!`, `warn!`, `error!`.

Prefix log messages with a tag for filtering:

```rust
info!("[add_magnet] task={task_id}");
debug!("[{task_id}] gid handoff: {current_gid} → {new_gid}");
error!("[merge][{}] 合并失败: {}", job.id, msg.trim());
```

Use `debug!` for detailed diagnostics, `info!` for lifecycle events, `warn!` for recoverable issues, `error!` for failures.

Register `env_logger` in `run()` before the Tauri builder. Do NOT add additional logging frameworks.

## External Processes

Always use `tauri-plugin-shell` for spawning external binaries (aria2c, mkvmerge, etc.). NEVER use `std::process::Command` directly.

```rust
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

let sidecar_cmd = app.shell().sidecar("mkvmerge").map_err(|e| format!("sidecar error: {e}"))?;
let (mut rx, _child) = sidecar_cmd.args(&args).spawn().map_err(|e| format!("spawn error: {e}"))?;
```

External binaries (`aria2c`, `mkvmerge`) are bundled via `externalBin` in `tauri.conf.json`. Reference them by name via `app.shell().sidecar()`.

Always handle `CommandEvent::Stdout`, `Stderr`, `Terminated`, and the `None` case in the event loop.

## Compile-time Config

Compile-time configuration lives in `src-tauri/app-config.json`. Embed it at compile time with `include_str!`:

```rust
fn load_app_config() -> Result<AppConfig, String> {
    const RAW: &str = include_str!("../app-config.json");
    serde_json::from_str(RAW).map_err(|e| format!("app-config.json 格式错误: {e}"))
}
```

Define a `#[derive(serde::Deserialize)]` struct matching the JSON shape. Changes to `app-config.json` take effect on the next `cargo build`.

## HTTP Client

Always use `reqwest` for outbound HTTP. Include `use reqwest::Client;` and build clients with `reqwest::Client::builder()`.

Include reasonable `User-Agent` headers for external scraping. Use `.timeout(Duration::from_secs(N))` on requests to aria2c and external services.

```rust
let client = reqwest::Client::builder()
    .user_agent("Mozilla/5.0 ...")
    .build()
    .map_err(|e| e.to_string())?;
```

## Clippy & Code Quality

Always respect Clippy's `disallowed_macros` and `too-many-arguments` rules. If a lint is explicitly suppressed, add `#[allow(...)]` with a comment explaining why.

Keep argument counts low. Use helper structs or `app.state()` to pull dependencies into the function body rather than adding more parameters.

Avoid `unwrap()` on locks in async contexts — use `unwrap_or_else(|e| e.into_inner())` to handle poisoned mutexes gracefully.
