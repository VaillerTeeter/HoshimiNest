use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex
    },
    time::Duration
};

use log::{debug, error, info, warn};
use tauri::{Emitter, Manager};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt
};
use tokio::sync::oneshot;

// ── Helpers ────────────────────────────────────────────────────────────────

/// Build a JSON-RPC 2.0 request body for aria2 calls without the
/// `serde_json::json!` macro (avoids internal `.unwrap()` / `.expect()`
/// calls that trigger `disallowed_methods` / `disallowed_macros`).
fn json_rpc(method: &str, params: serde_json::Value) -> serde_json::Value {
    let mut map = serde_json::Map::new();
    map.insert("jsonrpc".to_string(), serde_json::Value::String("2.0".to_string()));
    map.insert("method".to_string(), serde_json::Value::String(method.to_string()));
    map.insert("id".to_string(), serde_json::Value::String("hoshiminest".to_string()));
    map.insert("params".to_string(), params);
    serde_json::Value::Object(map)
}

/// aria2 JSON-RPC params for single-GID commands (pause / unpause /
/// forceRemove / removeDownloadResult): `[token, gid]`
fn aria2_simple_params(gid: &str) -> serde_json::Value {
    serde_json::Value::Array(vec![token_param(), serde_json::Value::String(gid.to_string())])
}

/// aria2 JSON-RPC params for `aria2.shutdown`: `[token]`
fn aria2_shutdown_params() -> serde_json::Value {
    serde_json::Value::Array(vec![token_param()])
}

/// aria2 JSON-RPC params for `aria2.tellStatus`:
/// `[token, gid, [keys…]]`
fn aria2_tell_status_params(gid: &str) -> serde_json::Value {
    serde_json::Value::Array(vec![
        token_param(),
        serde_json::Value::String(gid.to_string()),
        serde_json::Value::Array(vec![
            serde_json::Value::String("status".to_string()),
            serde_json::Value::String("totalLength".to_string()),
            serde_json::Value::String("completedLength".to_string()),
            serde_json::Value::String("downloadSpeed".to_string()),
            serde_json::Value::String("followedBy".to_string()),
            serde_json::Value::String("verifiedLength".to_string()),
            serde_json::Value::String("connections".to_string()),
            serde_json::Value::String("numSeeders".to_string()),
        ]),
    ])
}

/// aria2 JSON-RPC params for `aria2.tellStopped`:
/// `[token, 0, 128, [keys…]]`
fn aria2_tell_stopped_params() -> serde_json::Value {
    serde_json::Value::Array(vec![
        token_param(),
        serde_json::Value::Number(serde_json::Number::from(0)),
        serde_json::Value::Number(serde_json::Number::from(128)),
        serde_json::Value::Array(vec![
            serde_json::Value::String("gid".to_string()),
            serde_json::Value::String("status".to_string()),
            serde_json::Value::String("followedBy".to_string()),
        ]),
    ])
}

/// Build `aria2.addUri` options map.
fn aria2_add_uri_options(save_dir: &str, tracker_arg: &str) -> serde_json::Value {
    let mut map = serde_json::Map::new();
    map.insert("dir".to_string(), serde_json::Value::String(save_dir.to_string()));
    map.insert("check-integrity".to_string(), serde_json::Value::String("true".to_string()));
    if !tracker_arg.is_empty() {
        map.insert("bt-tracker".to_string(), serde_json::Value::String(tracker_arg.to_string()));
    }
    serde_json::Value::Object(map)
}

/// Build `aria2.addUri` params: `[token, [magnet], options]`
fn aria2_add_uri_params(magnet: &str, options: &serde_json::Value) -> serde_json::Value {
    serde_json::Value::Array(vec![
        token_param(),
        serde_json::Value::Array(vec![serde_json::Value::String(magnet.to_string())]),
        options.clone(),
    ])
}

// ── Constants ─────────────────────────────────────────────────────────────

const ARIA2_PORT: u16 = 6800;
const ARIA2_TOKEN: &str = "hoshiminest-internal";

// ── State ─────────────────────────────────────────────────────────────────

/// task_id → aria2 gid
struct GidMap(Mutex<HashMap<String, String>>);

/// task_id → oneshot sender to stop the polling loop
struct PollStops(Mutex<HashMap<String, oneshot::Sender<()>>>);

/// Handle to the aria2c child process so we can kill it on exit
struct Aria2Child(Mutex<Option<CommandChild>>);

/// Flag to break the CloseRequested re-entry loop
struct Closing(AtomicBool);

/// Whether any mkvmerge job is currently running in the merge queue
struct MergeRunning(AtomicBool);

/// Handle to the currently-running mkvmerge child process (if any).
/// Stored so the close handler can forcefully terminate it if needed.
struct MkvChild(Mutex<Option<CommandChild>>);

/// Windows Job Object handle stored as `usize` (raw HANDLE = *mut c_void cast).
/// Every sidecar process (aria2c, mkvmerge) is assigned to this job.
/// `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` ensures all members are killed when
/// the last handle closes — including on process crash, with no cleanup code.
/// Value 0 means the job was not successfully created.
#[cfg(windows)]
struct WinJob(Mutex<usize>);

// ── Compile-time configuration (编译时配置) ─────────────────────────────────
//
// 修改 src-tauri/app-config.json 后重新编译即可生效。

#[derive(serde::Deserialize)]
struct AppConfig {
    bt_trackers: Vec<String>,
    bt_max_peers: u32,
    disk_cache_mb: u32,
    listen_port_start: u16,
    listen_port_end: u16
}

fn load_app_config() -> Result<AppConfig, String> {
    // include_str! 将文件内容作为字符串引用嵌入到二进制。
    // 文件不存在或 JSON 格式错误时编译期即报错。
    const RAW: &str = include_str!("../app-config.json");
    serde_json::from_str(RAW).map_err(|e| format!("app-config.json 格式错误: {e}"))
}

// ── Progress event payload ──────────────────────────────────────────────────────────────────

#[derive(serde::Serialize, Clone)]
struct DownloadProgress {
    id: String,
    progress: u8,
    speed: Option<String>,
    /// "error" or "complete" — only set on terminal transitions
    aria2_status: Option<String>,
    /// Human-readable download phase (e.g. 元数据解析 / 下载中 / 完整性校验)
    phase: Option<String>,
    /// Number of currently connected peers
    connections: Option<u32>,
    /// Number of seeders known from trackers
    seeders: Option<u32>
}

// ── aria2 JSON-RPC helper ─────────────────────────────────────────────────

fn rpc_url() -> String {
    format!("http://127.0.0.1:{}/jsonrpc", ARIA2_PORT)
}

fn token_param() -> serde_json::Value {
    serde_json::Value::String(format!("token:{}", ARIA2_TOKEN))
}

async fn aria2_call(
    client: &reqwest::Client,
    method: &str,
    params: serde_json::Value
) -> Result<serde_json::Value, String> {
    let body = json_rpc(method, params);
    let resp = client
        .post(rpc_url())
        .json(&body)
        .timeout(Duration::from_secs(8))
        .send()
        .await
        .map_err(|e| format!("aria2 连接失败: {e}"))?;
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if let Some(err) = json.get("error") {
        return Err(format!("aria2 错误: {err}"));
    }
    Ok(json["result"].clone())
}

fn format_speed(bps: u64) -> Option<String> {
    match bps {
        0 => None,
        n if n >= 1_000_000 => Some(format!("{:.1} MB/s", n as f64 / 1_000_000.0)),
        n if n >= 1_000 => Some(format!("{} KB/s", n / 1_000)),
        n => Some(format!("{n} B/s"))
    }
}

// ── Polling loop (one per download task) ─────────────────────────────────

#[allow(clippy::disallowed_macros)]
async fn poll_task(
    app: tauri::AppHandle,
    task_id: String,
    gid: String,
    mut stop: oneshot::Receiver<()>
) {
    let client = reqwest::Client::new();
    // current_gid may change when a magnet's metadata download spawns the
    // real BT download (followedBy). We start with the gid returned by addUri.
    let mut current_gid = gid;

    loop {
        tokio::select! {
            _ = &mut stop => break,
            _ = tokio::time::sleep(Duration::from_millis(500)) => {
                let result = aria2_call(
                    &client,
                    "aria2.tellStatus",
                    aria2_tell_status_params(&current_gid),
                )
                .await;

                match result {
                    Ok(info) => {
                        // ── Magnet metadata handoff ──────────────────────────────
                        // When a magnet link is added, aria2 first creates a tiny
                        // "metadata download" task (gid_A). Once it finishes it
                        // creates the real BT download (gid_B) and stores gid_B in
                        // the `followedBy` field of gid_A. If we don't switch to
                        // gid_B we'd see gid_A complete in ~2 s and falsely report
                        // 100%.
                        if let Some(arr) = info["followedBy"].as_array() {
                            if let Some(new_gid) = arr.first().and_then(|v| v.as_str()) {
                                let new_gid = new_gid.to_string();
                                debug!("[{task_id}] gid handoff: {current_gid} → {new_gid}");
                                // Update gid_map so cancel/pause commands still work
                                app.state::<GidMap>()
                                    .0.lock().unwrap_or_else(|e| e.into_inner())
                                    .insert(task_id.clone(), new_gid.clone());
                                current_gid = new_gid;
                                // Skip emitting progress for the metadata phase;
                                // start polling the real download on the next tick.
                                continue;
                            }
                        }

                        let status = info["status"].as_str().unwrap_or("").to_string();
                        let total = info["totalLength"]
                            .as_str()
                            .and_then(|s| s.parse::<u64>().ok())
                            .unwrap_or(0);
                        let completed = info["completedLength"]
                            .as_str()
                            .and_then(|s| s.parse::<u64>().ok())
                            .unwrap_or(0);
                        let bps = info["downloadSpeed"]
                            .as_str()
                            .and_then(|s| s.parse::<u64>().ok())
                            .unwrap_or(0);
                        // aria2 may still report non-zero speed for a moment
                        // after pause is issued. Force it to zero when paused.
                        let bps = if status == "paused" { 0 } else { bps };

                        let verified = info["verifiedLength"]
                            .as_str()
                            .and_then(|s| s.parse::<u64>().ok())
                            .unwrap_or(0);

                        // Peer / seeder counts (BT only; absent for HTTP tasks)
                        let connections: Option<u32> = info["connections"]
                            .as_str()
                            .and_then(|s| s.parse().ok());
                        let seeders: Option<u32> = info["numSeeders"]
                            .as_str()
                            .and_then(|s| s.parse().ok());

                        // Detect BT check-integrity phase:
                        // aria2 re-hashes pieces in-place when check-integrity=true.
                        // During this phase: status="active", total>0, completed=0,
                        // bps=0, AND verifiedLength is incrementing.
                        // We guard on verified>0 to avoid mis-classifying a brand-new
                        // BT task that has total but hasn't started writing (e.g.
                        // still waiting for peers) as "checking".
                        let is_checking = total > 0
                            && completed == 0
                            && bps == 0
                            && status == "active"
                            && verified > 0;

                        let progress: u8 = if is_checking {
                            // verifiedLength progresses during HTTP integrity checks;
                            // for BT it may stay 0 initially, so cap at 99 to avoid
                            // false 100% before the actual download begins.
                            if total > 0 && verified > 0 {
                                verified.checked_mul(100)
                                    .and_then(|x| x.checked_div(total))
                                    .map(|x| x.min(99) as u8)
                                    .unwrap_or(0)
                            } else {
                                0
                            }
                        } else if total > 0 {
                            completed.checked_mul(100)
                                .and_then(|x| x.checked_div(total))
                                .map(|x| x.min(100) as u8)
                                .unwrap_or(0)
                        } else {
                            0
                        };

                        // Sentinel speed strings signal special phases to the frontend.
                        let speed = if total == 0 && status == "active" {
                            // BT task received metadata GID but DHT/tracker haven't
                            // found peers yet — total length is still unknown.
                            Some("正在解析元数据…".to_string())
                        } else if is_checking {
                            Some("正在校验文件完整性…".to_string())
                        } else {
                            format_speed(bps)
                        };

                        // Compute a human-readable phase for the frontend diagnostics row.
                        let phase: Option<String> = if status == "paused" {
                            Some("已暂停".to_string())
                        } else if status == "waiting" {
                            Some("排队中".to_string())
                        } else if total == 0 && status == "active" {
                            Some("元数据解析".to_string())
                        } else if is_checking {
                            Some("完整性校验".to_string())
                        } else if status == "active" {
                            Some("下载中".to_string())
                        } else {
                            None
                        };

                        let aria2_status = match status.as_str() {
                            "error" => Some("error".to_string()),
                            "complete" => Some("complete".to_string()),
                            _ => None,
                        };

                        if let Some(ref s) = aria2_status {
                            debug!("[{task_id}] terminal: {s} (gid={current_gid}, progress={progress}%)");
                        }

                        let _ = app.emit(
                            "download-progress",
                            DownloadProgress {
                                id: task_id.clone(),
                                progress,
                                speed,
                                aria2_status: aria2_status.clone(),
                                phase,
                                connections,
                                seeders,
                            },
                        );

                        if aria2_status.is_some() || status == "removed" {
                            break;
                        }
                    }
                    Err(_) => {
                        // tellStatus failed — the gid has moved to the stopped list.
                        // This happens in two very different cases:
                        //
                        // Case A — gid is the metadata download (gid_A) that just
                        //   completed and spawned the real BT download (gid_B).
                        //   `followedBy` in the stopped record points to gid_B.
                        //   We must NOT emit "complete" here; instead switch to gid_B.
                        //
                        // Case B — gid is the real BT download that truly finished.
                        //   No `followedBy`. Emit "complete" and exit.
                        let stopped = aria2_call(
                            &client,
                            "aria2.tellStopped",
                            aria2_tell_stopped_params(),
                        )
                        .await;

                        let stopped_arr = match stopped {
                            Ok(v) => v,
                            Err(_) => break,
                        };
                        let items = match stopped_arr.as_array() {
                            Some(a) => a,
                            None => break,
                        };

                        // Find the record for current_gid
                        let record = items.iter().find(|item| {
                            item["gid"].as_str() == Some(&current_gid)
                        });

                        match record {
                            Some(item) if item["status"].as_str() == Some("complete") => {
                                // Check if this completed download spawned another one
                                // (i.e. it was the metadata download for a magnet link)
                                let followed = item["followedBy"]
                                    .as_array()
                                    .and_then(|arr| arr.first())
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string());

                                if let Some(new_gid) = followed {
                                    // Case A: switch to the real BT download gid
                                    debug!("[{task_id}] metadata done → real gid={new_gid}");
                                    app.state::<GidMap>()
                                        .0.lock().unwrap_or_else(|e| e.into_inner())
                                        .insert(task_id.clone(), new_gid.clone());
                                    current_gid = new_gid;
                                    // Continue polling the real download
                                    continue;
                                } else {
                                    // Case B: truly completed
                                    info!("[aria2] complete: task={task_id}");
                                    let _ = app.emit(
                                        "download-progress",
                                        DownloadProgress {
                                            id: task_id.clone(),
                                            progress: 100,
                                            speed: None,
                                            aria2_status: Some("complete".to_string()),
                                            phase: Some("已完成".to_string()),
                                            connections: None,
                                            seeders: None,
                                        },
                                    );
                                    break;
                                }
                            }
                            _ => {
                                debug!("[{task_id}] gid={current_gid} not in stopped list, exiting poll");
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    // Remove stop-sender from registry when the loop ends
    app.state::<PollStops>().0.lock().unwrap_or_else(|e| e.into_inner()).remove(&task_id);
}

// ── mkvmerge types ────────────────────────────────────────────────────────

/// Raw JSON output from `mkvmerge --identify --identification-format json`
#[derive(serde::Deserialize)]
struct MkvIdentifyOutput {
    tracks: Vec<MkvIdentifyTrack>
}

#[derive(serde::Deserialize)]
struct MkvIdentifyTrack {
    id: u32,
    #[serde(rename = "type")]
    track_type: String,
    codec: String,
    properties: MkvTrackProperties
}

#[derive(serde::Deserialize, Default)]
struct MkvTrackProperties {
    language: Option<String>,
    track_name: Option<String>,
    pixel_dimensions: Option<String>
}

/// Track sent to and received from the frontend (matches TypeScript `SelectedTrack`)
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct TrackInfo {
    id: u32,
    #[serde(rename = "type")]
    track_type: String,
    codec: String,
    language: String,
    name: String,
    extra: Option<String>,
    selected: bool,
    label: String
}

/// One file's side of a merge job (matches TypeScript `FileState`)
#[derive(serde::Deserialize, Debug)]
struct MergeFileReq {
    path: Option<String>,
    tracks: Vec<TrackInfo>
}

/// A single merge job sent from the frontend queue (matches TypeScript `MergeJob`)
#[derive(serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct MergeJobReq {
    id: String,
    file_a: MergeFileReq,
    file_b: MergeFileReq,
    output_dir: String,
    output_name: String
}

#[derive(serde::Serialize, Clone)]
struct MergeProgressEvt {
    job_id: String,
    percent: u8
}

#[derive(serde::Serialize, Clone)]
struct MergeStatusEvt {
    job_id: String,
    /// "running" | "done" | "error"
    status: String,
    error: Option<String>
}

/// Emitted after ALL jobs in a merge queue have finished (success or failure).
#[derive(serde::Serialize, Clone)]
struct MergeQueueDoneEvt {
    total: usize,
    done: usize,
    error: usize
}

// ── mkvmerge helpers ──────────────────────────────────────────────────────

/// Mutable state shared across `push_file_track_args` calls within a single
/// merge job.  Grouping the two mutable references into one struct keeps the
/// argument count under the clippy threshold.
struct MergeCtx<'a> {
    args: &'a mut Vec<String>,
    track_order: &'a mut Vec<String>
}

/// 为单个输入文件拼接按轨道类型分组的选择参数（替代已弃用的 --tracks）
fn push_file_track_args(
    ctx: &mut MergeCtx,
    tracks: &[TrackInfo],
    file_idx: usize,
    job_id: &str,
    role: &str
) {
    for (type_str, flag_sel, flag_none) in [
        ("video", "--video-tracks", "--no-video"),
        ("audio", "--audio-tracks", "--no-audio"),
        ("subtitle", "--subtitle-tracks", "--no-subtitles")
    ] {
        let all_of_type: Vec<&TrackInfo> =
            tracks.iter().filter(|t| t.track_type == type_str).collect();
        let selected: Vec<&TrackInfo> =
            all_of_type.iter().filter(|t| t.selected).copied().collect();

        if all_of_type.is_empty() {
            // 文件中无此类型轨道，无需处理
            continue;
        }
        if selected.is_empty() {
            debug!("[merge][{}] {} 无 {} 轨道可选 → {}", job_id, role, type_str, flag_none);
            ctx.args.push(flag_none.to_string());
        } else {
            let ids = selected.iter().map(|t| t.id.to_string()).collect::<Vec<_>>().join(",");
            debug!("[merge][{}] {} {} ids=[{}]", job_id, role, type_str, ids);
            for t in &selected {
                debug!(
                    "[merge][{}]   #{} {} {} lang={} label={}",
                    job_id, t.id, t.track_type, t.codec, t.language, t.label
                );
            }
            ctx.args.push(flag_sel.to_string());
            ctx.args.push(ids);
            for t in &selected {
                if !t.label.is_empty() {
                    ctx.args.push("--language".to_string());
                    ctx.args.push(format!("{}:{}", t.id, t.label));
                }
                // 清空源文件中可能存在的 track name（如"简体"、"繁体"等），
                // 使用 --track-name ID: 将名称置为空字符串
                ctx.args.push("--track-name".to_string());
                ctx.args.push(format!("{}:", t.id));
                ctx.track_order.push(format!("{}:{}", file_idx, t.id));
            }
        }
    }
}

fn build_mkvmerge_args(job: &MergeJobReq) -> Result<Vec<String>, String> {
    let path_a = job.file_a.path.as_deref().ok_or("fileA path is missing")?;
    let path_b = job.file_b.path.as_deref().ok_or("fileB path is missing")?;

    debug!(
        "[merge][{}] A={:?}({} tracks) B={:?}({} tracks)",
        job.id,
        path_a,
        job.file_a.tracks.len(),
        path_b,
        job.file_b.tracks.len()
    );

    let out_path = std::path::Path::new(&job.output_dir).join(&job.output_name);
    let mut args = vec!["-o".to_string(), out_path.to_string_lossy().to_string()];
    info!("[merge][{}] 输出: {:?}", job.id, out_path);

    let mut track_order: Vec<String> = Vec::new();
    let mut ctx = MergeCtx {
        args: &mut args,
        track_order: &mut track_order
    };

    // ── File A ──
    push_file_track_args(&mut ctx, &job.file_a.tracks, 0, &job.id, "fileA");
    ctx.args.push(path_a.to_string());

    // ── File B ──
    push_file_track_args(&mut ctx, &job.file_b.tracks, 1, &job.id, "fileB");
    ctx.args.push(path_b.to_string());

    // ── Track order ──
    if !ctx.track_order.is_empty() {
        ctx.args.push("--track-order".to_string());
        ctx.args.push(ctx.track_order.join(","));
    }

    debug!("[merge][{}] args: {:?}", job.id, args);
    Ok(args)
}

/// Parse a "Progress: N%" line from stdout/stderr and emit progress event.
/// Returns true if a progress line was consumed.
fn handle_mkvmerge_progress(
    app: &tauri::AppHandle,
    job_id: &str,
    line: &str,
    last_pct: &mut u8
) -> bool {
    let trimmed = line.trim();
    let rest = match trimmed.strip_prefix("Progress: ") {
        Some(r) => r,
        None => return false
    };
    let pct_str = match rest.strip_suffix('%') {
        Some(s) => s,
        None => return false
    };
    match pct_str.trim().parse::<u8>() {
        Ok(pct) => {
            if pct != *last_pct {
                debug!("[merge][{}] progress {}%", job_id, pct);
                *last_pct = pct;
            }
            let _ = app.emit("merge-progress", MergeProgressEvt {
                job_id: job_id.to_string(),
                percent: pct
            });
            true
        },
        Err(_) => false
    }
}

async fn run_mkvmerge_job(app: &tauri::AppHandle, job: &MergeJobReq) -> Result<(), String> {
    let args = build_mkvmerge_args(job)?;

    info!("[merge][{}] 启动 mkvmerge sidecar", job.id);
    let sidecar_cmd = app.shell().sidecar("mkvmerge").map_err(|e| {
        error!("[merge][{}] sidecar 查找失败: {e}", job.id);
        format!("找不到 mkvmerge sidecar: {e}")
    })?;

    let (mut rx, child) = sidecar_cmd.args(&args).spawn().map_err(|e| {
        error!("[merge][{}] mkvmerge 启动失败: {e}", job.id);
        format!("mkvmerge 启动失败: {e}")
    })?;
    debug!("[merge][{}] mkvmerge 已启动", job.id);

    // Assign to Windows Job Object so the process is killed with the app on crash.
    #[cfg(windows)]
    {
        let job_val = *app.state::<WinJob>().0.lock().unwrap_or_else(|e| e.into_inner());
        if job_val != 0 {
            win_assign_pid_to_job(job_val, child.pid());
        }
    }
    // Store child so the close handler can kill it if needed.
    *app.state::<MkvChild>().0.lock().unwrap_or_else(|e| e.into_inner()) = Some(child);

    let mut last_err: Vec<u8> = Vec::new();
    let mut last_pct: u8 = 0;

    loop {
        match rx.recv().await {
            Some(CommandEvent::Stdout(bytes)) => {
                let line = String::from_utf8_lossy(&bytes);
                // Try to parse progress lines like "Progress: 45%"
                if !handle_mkvmerge_progress(app, &job.id, &line, &mut last_pct) {
                    let trimmed = line.trim();
                    if !trimmed.is_empty() {
                        // mkvmerge 把错误信息写到 stdout，必需收集以便后续报错
                        info!("[merge][{}] stdout: {}", job.id, trimmed);
                        last_err.extend_from_slice(&bytes);
                    }
                }
            },
            Some(CommandEvent::Stderr(bytes)) => {
                let line = String::from_utf8_lossy(&bytes);
                if !handle_mkvmerge_progress(app, &job.id, &line, &mut last_pct) {
                    let trimmed = line.trim();
                    warn!("[merge][{}] stderr: {}", job.id, trimmed);
                    last_err.extend_from_slice(&bytes);
                }
            },
            Some(CommandEvent::Terminated(payload)) => {
                let code = payload.code.unwrap_or(-1);
                debug!("[merge][{}] exit code={}", job.id, code);
                if code == 1 {
                    // mkvmerge exit 1 = 成功但有警告，不当做失败
                    warn!(
                        "[merge][{}] mkvmerge 有警告但已完成: {}",
                        job.id,
                        String::from_utf8_lossy(&last_err).trim()
                    );
                    break;
                } else if code != 0 {
                    let msg = String::from_utf8_lossy(&last_err);
                    error!("[merge][{}] 合并失败: {}", job.id, msg.trim());
                    app.state::<MkvChild>().0.lock().unwrap_or_else(|e| e.into_inner()).take();
                    return Err(format!("mkvmerge 退出码 {code}: {}", msg.trim()));
                }
                info!("[merge][{}] 合并成功完成", job.id);
                break;
            },
            None => {
                debug!("[merge][{}] 输出流关闭", job.id);
                break;
            },
            _ => {}
        }
    }
    // Process has exited — clear the stored child handle.
    app.state::<MkvChild>().0.lock().unwrap_or_else(|e| e.into_inner()).take();
    Ok(())
}

// ── Windows Job Object helpers ──────────────────────────────────────────────
//
// All sidecar processes (aria2c, mkvmerge) are added to a single Windows Job
// Object configured with JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE.  When the last
// handle to the job closes — whether via normal exit or crash — Windows kills
// every process in the job automatically, with no cleanup code required.
//
// Raw extern "system" FFI is used here instead of a windows-sys/windows crate
// dependency: kernel32.dll is always linked on Windows, the Job Object API has
// been stable since Windows XP, and this avoids any crate version conflicts.

#[cfg(windows)]
#[allow(clippy::upper_case_acronyms)] // intentionally mirrors Windows SDK naming conventions
mod win_ffi {
    pub type HANDLE = *mut core::ffi::c_void;
    pub type BOOL   = i32;
    pub type DWORD  = u32;

    pub const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: DWORD = 0x0000_2000;
    /// JobObjectExtendedLimitInformation
    pub const JOB_EXTENDED_LIMIT_INFO: i32         = 9;
    pub const PROCESS_SET_QUOTA: DWORD              = 0x0100;
    pub const PROCESS_TERMINATE: DWORD              = 0x0001;

    // Mirrors JOBOBJECT_BASIC_LIMIT_INFORMATION (64 bytes on x64).
    // Field order and repr(C) must match the Windows SDK layout exactly.
    #[repr(C)]
    pub struct BasicLimitInfo {
        pub per_process_time: i64,    // PerProcessUserTimeLimit
        pub per_job_time: i64,        // PerJobUserTimeLimit
        pub limit_flags: DWORD,       // LimitFlags
        pub _pad: DWORD,              // explicit padding to align next usize field
        pub min_ws: usize,            // MinimumWorkingSetSize
        pub max_ws: usize,            // MaximumWorkingSetSize
        pub active_process_limit: DWORD,
        pub _pad2: DWORD,
        pub affinity: usize,
        pub priority_class: DWORD,
        pub scheduling_class: DWORD,
    }

    // Mirrors IO_COUNTERS (48 bytes).
    #[repr(C)]
    pub struct IoCounters {
        pub read_ops:    u64,
        pub write_ops:   u64,
        pub other_ops:   u64,
        pub read_bytes:  u64,
        pub write_bytes: u64,
        pub other_bytes: u64,
    }

    // Mirrors JOBOBJECT_EXTENDED_LIMIT_INFORMATION (144 bytes on x64).
    #[repr(C)]
    pub struct ExtendedLimitInfo {
        pub basic:                  BasicLimitInfo,
        pub io_info:                IoCounters,
        pub process_memory_limit:   usize,
        pub job_memory_limit:       usize,
        pub peak_process_memory:    usize,
        pub peak_job_memory:        usize,
    }

    #[link(name = "kernel32")]
    extern "system" {
        pub fn CreateJobObjectW(
            lp_security: *const core::ffi::c_void,
            lp_name: *const u16,
        ) -> HANDLE;

        pub fn SetInformationJobObject(
            h_job: HANDLE,
            info_class: i32,
            lp_info: *const core::ffi::c_void,
            cb_info_len: DWORD,
        ) -> BOOL;

        pub fn AssignProcessToJobObject(h_job: HANDLE, h_proc: HANDLE) -> BOOL;

        pub fn OpenProcess(
            desired_access: DWORD,
            inherit: BOOL,
            pid: DWORD,
        ) -> HANDLE;

        pub fn CloseHandle(h: HANDLE) -> BOOL;
    }
}

/// Create an anonymous Job Object with kill-on-close semantics.
/// Returns the raw HANDLE cast to `usize` (Send-safe opaque storage), or `None` on failure.
#[cfg(windows)]
fn win_create_job() -> Option<usize> {
    use win_ffi::*;

    let job = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
    if job.is_null() {
        return None;
    }

    // Safety: zero-initialised POD struct; only limit_flags is set.
    let mut info: ExtendedLimitInfo = unsafe { std::mem::zeroed() };
    info.basic.limit_flags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

    let ok = unsafe {
        SetInformationJobObject(
            job,
            JOB_EXTENDED_LIMIT_INFO,
            std::ptr::addr_of!(info).cast(),
            std::mem::size_of::<ExtendedLimitInfo>() as DWORD,
        )
    };
    if ok == 0 {
        unsafe { CloseHandle(job) };
        return None;
    }
    // Cast *mut c_void → usize for Send-safe Mutex storage.
    Some(job as usize)
}

/// Assign a process (by PID) to the app Job Object so it gets killed when
/// the job handle closes.  Logs a warning on failure but never panics.
#[cfg(windows)]
fn win_assign_pid_to_job(job: usize, pid: u32) {
    use win_ffi::*;

    let job_handle = job as HANDLE;
    let proc = unsafe { OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, 0, pid) };
    if proc.is_null() {
        warn!("[job] OpenProcess pid={pid} 失败");
        return;
    }
    let ok = unsafe { AssignProcessToJobObject(job_handle, proc) };
    if ok == 0 {
        warn!("[job] AssignProcessToJobObject pid={pid} 失败");
    } else {
        info!("[job] pid={pid} 已加入 Job Object");
    }
    unsafe { CloseHandle(proc) };
}

// ── Commands ──────────────────────────────────────────────────────────────

#[tauri::command]
async fn identify_tracks(app: tauri::AppHandle, path: String) -> Result<Vec<TrackInfo>, String> {
    info!("[identify] 识别轨道: {:?}", path);

    let sidecar_cmd = app.shell().sidecar("mkvmerge").map_err(|e| {
        error!("[identify] sidecar 查找失败: {e}");
        format!("找不到 mkvmerge sidecar: {e}")
    })?;

    let (mut rx, child) = sidecar_cmd
        .args(["--identify", "--identification-format", "json", &path])
        .spawn()
        .map_err(|e| {
            error!("[identify] mkvmerge 启动失败: {e}");
            format!("mkvmerge 启动失败: {e}")
        })?;
    debug!("[identify] mkvmerge --identify 已启动");

    // Assign to Windows Job Object so it is killed with the app on crash.
    #[cfg(windows)]
    {
        let job_val = *app.state::<WinJob>().0.lock().unwrap_or_else(|e| e.into_inner());
        if job_val != 0 {
            win_assign_pid_to_job(job_val, child.pid());
        }
    }
    let _child = child; // keep handle alive until the process exits

    let mut stdout_buf: Vec<u8> = Vec::new();
    let mut stderr_buf: Vec<u8> = Vec::new();
    let mut exit_code: i32 = 0;

    loop {
        match rx.recv().await {
            Some(CommandEvent::Stdout(bytes)) => {
                debug!("[identify] stdout chunk {} bytes", bytes.len());
                stdout_buf.extend_from_slice(&bytes);
            },
            Some(CommandEvent::Stderr(bytes)) => {
                let msg = String::from_utf8_lossy(&bytes);
                warn!("[identify] stderr: {}", msg.trim());
                stderr_buf.extend_from_slice(&bytes);
            },
            Some(CommandEvent::Terminated(payload)) => {
                exit_code = payload.code.unwrap_or(-1);
                debug!("[identify] exit code={}", exit_code);
                break;
            },
            None => {
                debug!("[identify] 输出流关闭");
                break;
            },
            _ => {}
        }
    }

    if exit_code != 0 {
        let msg = String::from_utf8_lossy(&stderr_buf);
        error!("[identify] 识别失败 (exit={}): {}", exit_code, msg.trim());
        return Err(format!("mkvmerge 识别失败 (退出码 {exit_code}): {}", msg.trim()));
    }

    debug!("[identify] stdout {} bytes，解析 JSON", stdout_buf.len());

    let identify: MkvIdentifyOutput = serde_json::from_slice(&stdout_buf).map_err(|e| {
        error!(
            "[identify] JSON 解析失败: {e}\nraw: {}",
            String::from_utf8_lossy(&stdout_buf).chars().take(500).collect::<String>()
        );
        format!("解析 mkvmerge 输出失败: {e}")
    })?;

    debug!("[identify] JSON 解析成功，{} 条轨道", identify.tracks.len());
    let tracks: Vec<TrackInfo> = identify
        .tracks
        .into_iter()
        .map(|t| {
            // Normalize: mkvmerge uses "subtitles", frontend uses "subtitle"
            let track_type = if t.track_type == "subtitles" {
                "subtitle".to_string()
            } else {
                t.track_type
            };
            // Shorten codec: "H.264/AVC/MPEG-4p10" → "H.264"
            let codec = t.codec.split('/').next().unwrap_or(&t.codec).trim().to_string();
            let language = t.properties.language.unwrap_or_else(|| "und".to_string());
            let name = t.properties.track_name.unwrap_or_default();
            let extra = t.properties.pixel_dimensions;
            // Default label; frontend applies DEFAULT_SELECTED based on role
            let label = match track_type.as_str() {
                "video" | "audio" => "ja".to_string(),
                _ => "zh-Hans".to_string()
            };
            TrackInfo {
                id: t.id,
                track_type,
                codec,
                language,
                name,
                extra,
                selected: false,
                label
            }
        })
        .collect();

    info!("[identify] 轨道转换完成，返回 {} 条", tracks.len());
    Ok(tracks)
}

#[tauri::command]
async fn start_merge_queue(app: tauri::AppHandle, jobs: Vec<MergeJobReq>) -> Result<(), String> {
    info!("[queue] 收到合并队列，共 {} 个任务", jobs.len());
    for (i, j) in jobs.iter().enumerate() {
        debug!("[queue]   #{} id={} → {:?}", i + 1, j.id, j.output_name);
    }
    let total = jobs.len();
    app.state::<MergeRunning>().0.store(true, Ordering::SeqCst);
    tauri::async_runtime::spawn(async move {
        let mut done: usize = 0;
        let mut error: usize = 0;
        for job in jobs {
            info!("[queue] 开始任务 id={}", job.id);
            let _ = app.emit("merge-status", MergeStatusEvt {
                job_id: job.id.clone(),
                status: "running".to_string(),
                error: None
            });
            match run_mkvmerge_job(&app, &job).await {
                Ok(()) => {
                    done += 1;
                    info!("[queue] 任务完成 id={}", job.id);
                    let _ = app.emit("merge-status", MergeStatusEvt {
                        job_id: job.id.clone(),
                        status: "done".to_string(),
                        error: None
                    });
                },
                Err(e) => {
                    error += 1;
                    error!("[queue] 任务失败 id={} err={}", job.id, e);
                    let _ = app.emit("merge-status", MergeStatusEvt {
                        job_id: job.id.clone(),
                        status: "error".to_string(),
                        error: Some(e)
                    });
                }
            }
        }
        info!("[queue] 所有任务处理完毕 (成功: {done}, 失败: {error})");
        let _ = app.emit("merge-queue-done", MergeQueueDoneEvt {
            total,
            done,
            error
        });
        app.state::<MergeRunning>().0.store(false, Ordering::SeqCst);
    });
    Ok(())
}

#[tauri::command]
async fn fetch_html(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) \
             AppleWebKit/537.36 (KHTML, like Gecko) \
             Chrome/124.0.0.0 Safari/537.36"
        )
        .build()
        .map_err(|e| e.to_string())?;
    client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())
}

/// `add_magnet` accepts only 4 user-facing parameters (`app` + 3 payload
/// fields) instead of the previous 7 so it stays under the clippy
/// `too-many-arguments` threshold.  `gid_map` and `poll_stops` are now
/// obtained via `app.state()` inside the body.
#[tauri::command]
async fn add_magnet(
    app: tauri::AppHandle,
    task_id: String,
    magnet: String,
    save_dir: String
) -> Result<(), String> {
    if !magnet.starts_with("magnet:") {
        return Err("只接受磁力链接".to_string());
    }
    info!("[add_magnet] task={task_id}");

    // BT tracker list from compile-time config
    let cfg = load_app_config()?;
    let tracker_arg = if cfg.bt_trackers.is_empty() {
        String::new()
    } else {
        cfg.bt_trackers.join(",")
    };

    let client = reqwest::Client::new();

    // If restarting an existing task: stop its poll loop and clean up the old
    // result from aria2's stopped list so it doesn't conflict.
    {
        let gid_map = app.state::<GidMap>();
        let old_gid = gid_map.0.lock().unwrap_or_else(|e| e.into_inner()).get(&task_id).cloned();
        if let Some(old_gid) = old_gid {
            // Remove from aria2 stopped/error result list (no-op if not found)
            let _ =
                aria2_call(&client, "aria2.removeDownloadResult", aria2_simple_params(&old_gid))
                    .await;
        }
    }
    // Stop any existing poll loop for this task
    let tx = {
        let poll_stops = app.state::<PollStops>();
        let x = poll_stops.0.lock().unwrap_or_else(|e| e.into_inner()).remove(&task_id);
        x
    };
    if let Some(tx) = tx {
        let _ = tx.send(());
    }

    // Build addUri options; include bt-tracker only when list is non-empty
    let options = aria2_add_uri_options(&save_dir, &tracker_arg);

    // Try up to 5 times in case aria2c is still starting up
    let mut gid_result = Err(String::new());
    for attempt in 0..5u8 {
        // Always force aria2 to re-verify every BT piece hash from disk.
        // aria2 trusts the .aria2 control file blindly by default — a stale
        // control file from a broken session can claim all pieces are done
        // even when the file on disk is a zero-filled placeholder, causing
        // an instant false "100%". check-integrity=true re-hashes each piece;
        // zeros/corrupt data fails → real re-download. If data is truly
        // complete the check passes quickly and completion is legitimately fast.
        gid_result =
            aria2_call(&client, "aria2.addUri", aria2_add_uri_params(&magnet, &options)).await;
        if gid_result.is_ok() {
            break;
        }
        if attempt < 4 {
            debug!("[{task_id}] add_magnet retry {}/{}", attempt + 1, 4);
            tokio::time::sleep(Duration::from_millis(600)).await;
        }
    }

    let gid = gid_result?.as_str().ok_or("aria2 返回了无效的 gid")?.to_string();
    info!("[add_magnet] ok: task={task_id} gid={gid}");

    {
        let gid_map = app.state::<GidMap>();
        gid_map.0.lock().unwrap_or_else(|e| e.into_inner()).insert(task_id.clone(), gid.clone());
    }

    let (stop_tx, stop_rx) = oneshot::channel();
    {
        let poll_stops = app.state::<PollStops>();
        poll_stops.0.lock().unwrap_or_else(|e| e.into_inner()).insert(task_id.clone(), stop_tx);
    }

    let app2 = app.clone();
    tauri::async_runtime::spawn(async move {
        poll_task(app2, task_id, gid, stop_rx).await;
    });

    Ok(())
}

#[tauri::command]
async fn pause_task(app: tauri::AppHandle, task_id: String) -> Result<(), String> {
    debug!("[pause_task] task={task_id}");
    let gid_map = app.state::<GidMap>();
    let gid = gid_map.0.lock().unwrap_or_else(|e| e.into_inner()).get(&task_id).cloned();
    if let Some(gid) = gid {
        debug!("[pause_task] gid={gid}");
        let client = reqwest::Client::new();
        aria2_call(&client, "aria2.pause", aria2_simple_params(&gid)).await?;
    }
    Ok(())
}

#[tauri::command]
async fn resume_task(app: tauri::AppHandle, task_id: String) -> Result<(), String> {
    debug!("[resume_task] task={task_id}");
    let gid_map = app.state::<GidMap>();
    let gid = gid_map.0.lock().unwrap_or_else(|e| e.into_inner()).get(&task_id).cloned();
    if let Some(gid) = gid {
        debug!("[resume_task] gid={gid}");
        let client = reqwest::Client::new();
        aria2_call(&client, "aria2.unpause", aria2_simple_params(&gid)).await?;
    }
    Ok(())
}

#[tauri::command]
async fn cancel_task(app: tauri::AppHandle, task_id: String) -> Result<(), String> {
    info!("[cancel_task] task={task_id}");

    // Stop polling
    let tx = {
        let poll_stops = app.state::<PollStops>();
        let x = poll_stops.0.lock().unwrap_or_else(|e| e.into_inner()).remove(&task_id);
        x
    };
    if let Some(tx) = tx {
        let _ = tx.send(());
    }

    // Collect file paths before removing from aria2, then remove the task
    let gid_map = app.state::<GidMap>();
    let gid = gid_map.0.lock().unwrap_or_else(|e| e.into_inner()).remove(&task_id);
    if let Some(gid) = gid {
        debug!("[cancel_task] gid={gid}");
        let client = reqwest::Client::new();

        // Query file list from aria2 before removing (may fail if metadata
        // hasn't resolved yet — that's fine, no files to clean up).
        let mut file_paths: Vec<String> = Vec::new();
        let get_files_params =
            serde_json::Value::Array(vec![token_param(), serde_json::Value::String(gid.clone())]);
        match aria2_call(&client, "aria2.getFiles", get_files_params).await {
            Ok(files) => {
                if let Some(arr) = files.as_array() {
                    file_paths.extend(
                        arr.iter().filter_map(|f| f["path"].as_str().map(|s| s.to_string()))
                    );
                }
            },
            Err(e) => {
                debug!("[cancel_task] getFiles failed (expected for unresolved metadata): {e}");
            }
        }

        // Remove the download from aria2 (forceRemove so it works even when paused)
        let _ = aria2_call(&client, "aria2.forceRemove", aria2_simple_params(&gid)).await;
        // Clean up the stopped/result list entry
        let _ = aria2_call(&client, "aria2.removeDownloadResult", aria2_simple_params(&gid)).await;

        // Delete downloaded files from disk
        for path in &file_paths {
            // paths come from aria2 RPC response, not user input
            // nosemgrep
            match std::fs::remove_file(path) {
                Ok(()) => {
                    info!("[cancel_task] 已删除: {path}");
                },
                Err(e) => {
                    warn!("[cancel_task] 删除文件失败: {path} ({e})");
                }
            }
        }
        // Delete .aria2 control files
        for path in &file_paths {
            let control_file = format!("{path}.aria2");
            // paths derived from aria2 RPC response, not user input
            // nosemgrep
            match std::fs::remove_file(&control_file) {
                Ok(()) => {
                    info!("[cancel_task] 已删除控制文件: {control_file}");
                },
                Err(e) => {
                    warn!("[cancel_task] 删除控制文件失败: {control_file} ({e})");
                }
            }
        }
        if !file_paths.is_empty() {
            info!(
                "[cancel_task] 共清理 {} 个数据文件 + {} 个控制文件 (task={task_id})",
                file_paths.len(),
                file_paths.len()
            );
        }
    }
    Ok(())
}

#[tauri::command]
fn reveal_in_folder(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener().open_path(&path, None::<&str>).map_err(|e| e.to_string())
}

// ── App entry ─────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[allow(clippy::disallowed_methods, clippy::disallowed_macros)]
pub fn run() {
    // Initialise env_logger so `RUST_LOG=hoshiminest=debug yarn tauri dev` shows debug output.
    // No-op when RUST_LOG is unset; produces no output in normal use.
    let _ = env_logger::try_init();
    // Build up managed state. WinJob is Windows-only so we must break the
    // method chain to apply it conditionally with #[cfg(windows)].
    let mut builder = tauri::Builder::default()
        .manage(GidMap(Mutex::new(HashMap::new())))
        .manage(PollStops(Mutex::new(HashMap::new())))
        .manage(Aria2Child(Mutex::new(None)))
        .manage(Closing(AtomicBool::new(false)))
        .manage(MergeRunning(AtomicBool::new(false)))
        .manage(MkvChild(Mutex::new(None)));
    #[cfg(windows)]
    {
        builder = builder.manage(WinJob(Mutex::new(0usize)));
    }
    if let Err(e) = builder
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Load compile-time config (embedded from app-config.json)
            let cfg = load_app_config()?;
            debug!(
                "app-config: {} tracker(s), bt_max_peers={}, disk_cache={}M, listen_port={}-{}",
                cfg.bt_trackers.len(),
                cfg.bt_max_peers,
                cfg.disk_cache_mb,
                cfg.listen_port_start,
                cfg.listen_port_end
            );

            // Create the Windows Job Object before spawning any sidecars.
            // All child processes are assigned to this job; JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            // ensures they die with HoshimiNest — even on crash, no cleanup code needed.
            #[cfg(windows)]
            match win_create_job() {
                Some(h) => {
                    *app.handle().state::<WinJob>().0.lock().unwrap_or_else(|e| e.into_inner()) = h;
                    info!("[job] Windows Job Object 创建成功 (kill-on-close 已启用)");
                },
                None => warn!("[job] Windows Job Object 创建失败，子进程将不受 Job 约束"),
            }

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let client = reqwest::Client::new();
                let _ = aria2_call(&client, "aria2.shutdown", aria2_shutdown_params()).await;
                tokio::time::sleep(Duration::from_millis(800)).await;

                let bt_tracker_arg = format!("--bt-tracker={}", cfg.bt_trackers.join(","));
                let bt_max_peers_arg = format!("--bt-max-peers={}", cfg.bt_max_peers);
                let disk_cache_arg = format!("--disk-cache={}M", cfg.disk_cache_mb);
                let listen_port_arg =
                    format!("--listen-port={}-{}", cfg.listen_port_start, cfg.listen_port_end);

                let spawn_result = handle
                    .shell()
                    .sidecar("aria2c")
                    .map_err(|e| error!("aria2c sidecar not found: {e}"))
                    .and_then(|cmd| {
                        cmd.args([
                            "--enable-rpc",
                            &format!("--rpc-listen-port={ARIA2_PORT}"),
                            &format!("--rpc-secret={ARIA2_TOKEN}"),
                            "--rpc-allow-origin-all",
                            "--quiet=true",
                            "--auto-file-renaming=false",
                            "--continue=true",
                            "--seed-time=0",
                            &bt_max_peers_arg,
                            &listen_port_arg,
                            "--bt-enable-lpd=true",
                            &disk_cache_arg,
                            &bt_tracker_arg
                        ])
                        .spawn()
                        .map_err(|e| error!("Failed to spawn aria2c: {e}"))
                    });

                if let Ok((rx, child)) = spawn_result {
                    // Drain stdout/stderr to keep the pipe alive.
                    // aria2c uses --quiet=true so output is negligible, but dropping
                    // the receiver end prematurely can cause broken-pipe issues.
                    tauri::async_runtime::spawn(async move {
                        let mut rx = rx;
                        while rx.recv().await.is_some() {}
                    });

                    #[cfg(windows)]
                    {
                        let job_val = *handle
                            .state::<WinJob>()
                            .0.lock().unwrap_or_else(|e| e.into_inner());
                        if job_val != 0 {
                            win_assign_pid_to_job(job_val, child.pid());
                        }
                    }

                    info!("[aria2] 已启动 (port {ARIA2_PORT})");
                    *handle.state::<Aria2Child>().0.lock().unwrap_or_else(|e| e.into_inner()) =
                        Some(child);
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested {
                api,
                ..
            } = event
            {
                // Block close while any mkvmerge job is running in the merge queue.
                // The frontend listens for "merge-block-close" and shows a dialog.
                if window.app_handle().state::<MergeRunning>().0.load(Ordering::SeqCst) {
                    api.prevent_close();
                    let _ = window.emit("merge-block-close", ());
                    return;
                }
                // Use an AtomicBool to break the re-entry loop:
                // first call → prevent close, clean up aria2, then win.close().
                // second call (triggered by win.close()) → flag is set, let it
                // proceed normally. This allows WebView2 to close gracefully
                // and flush localStorage to disk — app.exit(0) would kill the
                // process too abruptly for WebView2 to write pending data.
                let closing = window.app_handle().state::<Closing>();
                if closing.0.swap(true, Ordering::SeqCst) {
                    // Second time: already cleaned up, allow the close.
                    return;
                }
                api.prevent_close();
                let app = window.app_handle().clone();
                let win = window.clone();
                tauri::async_runtime::spawn(async move {
                    // Terminate any running mkvmerge process first.
                    // (MergeRunning normally prevents reaching here during a merge,
                    // but this is a safety net for race conditions.)
                    if let Some(child) =
                        app.state::<MkvChild>().0.lock().unwrap_or_else(|e| e.into_inner()).take()
                    {
                        info!("[mkvmerge] 关闭时强制终止 mkvmerge 进程");
                        let _ = child.kill();
                    }
                    info!("[aria2] 正在关闭…");
                    let client = reqwest::Client::new();
                    let _ = aria2_call(&client, "aria2.shutdown", aria2_shutdown_params()).await;
                    if let Some(child) =
                        app.state::<Aria2Child>().0.lock().unwrap_or_else(|e| e.into_inner()).take()
                    {
                        let _ = child.kill();
                    }
                    // Small delay so WebView2 can finish any pending I/O before
                    // the natural window-close triggers process exit.
                    tokio::time::sleep(Duration::from_millis(300)).await;
                    // This re-triggers CloseRequested but the flag is now true,
                    // so we skip prevent_close and the window closes gracefully.
                    let _ = win.close();
                    // Wait for WebView2 to flush localStorage to disk after the
                    // window is destroyed, then explicitly exit with code 0 so
                    // that `cargo run` / `yarn tauri dev` don't report a
                    // spurious error (Windows default exit code for window-close
                    // termination is 0xFFFFFFFF).
                    tokio::time::sleep(Duration::from_millis(300)).await;
                    std::process::exit(0);
                });
            }
        })
        .invoke_handler(tauri::generate_handler![
            fetch_html,
            add_magnet,
            pause_task,
            resume_task,
            cancel_task,
            reveal_in_folder,
            identify_tracks,
            start_merge_queue,
        ])
        .run(tauri::generate_context!())
    {
        error!("error while running tauri application: {e}");
        std::process::exit(1);
    }
}
