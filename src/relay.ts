import { createBangumiClient } from 'bangumi-api-client';

/**
 * Relay site origin (path-prefix reverse proxy, see server net.conf):
 *   <origin>/bgm/  -> https://api.bgm.tv/
 *   <origin>/nyaa/ -> https://nyaa.si/
 *
 * Replace this single value with the real domain, and also update the CSP
 * connect-src list in src-tauri/tauri.conf.json.
 */
export const RELAY_ORIGIN = 'https://net.vaciller.site';

/** Bangumi API base (the client appends /v0/... paths itself) */
export const BGM_BASE_URL = `${RELAY_ORIGIN}/bgm`;

/** Nyaa search page base (call sites append ?q=<keyword>) */
export const NYAA_SEARCH_URL = `${RELAY_ORIGIN}/nyaa/`;

/** Shared Bangumi API client (single instance for the whole app) */
export const bgm = createBangumiClient({
  userAgent: 'HoshimiNest/0.1.0',
  baseUrl: BGM_BASE_URL,
});
