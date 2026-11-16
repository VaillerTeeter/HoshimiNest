/**
 * 应用元信息 —— 品牌名、版本号与对外 User-Agent 的唯一出处。
 *
 * 版本号只在 `package.json` 维护（发版时 release CI 会强制它与
 * `src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 及 tag 一致），
 * 这里通过 vite.config.ts 的 `define` 在构建期注入，避免多处手写漏改。
 */

/** 应用名称（与 tauri.conf.json 的 productName 保持一致） */
const APP_NAME = 'HoshimiNest';

/** 项目主页（Bangumi 要求开源项目在 UA 中附上） */
const APP_HOMEPAGE = 'https://github.com/VaillerTeeter/HoshimiNest';

/** 构建版本号 —— 编译期由 vite.config.ts 从 package.json 注入 */
const APP_VERSION = __APP_VERSION__;

/**
 * Bangumi API User-Agent。
 *
 * Bangumi 要求 `<开发者>/<应用>/<版本> (<平台>) (<项目主页>)` 格式：
 * 非浏览器调用方必须带开发者 ID 与应用名，分发型应用附版本号，
 * 开源项目附项目主页（见 bangumi/api 的 `docs-raw/user agent.md`）。
 */
export const USER_AGENT = `VaillerTeeter/${APP_NAME}/${APP_VERSION} (Windows) (${APP_HOMEPAGE})`;
