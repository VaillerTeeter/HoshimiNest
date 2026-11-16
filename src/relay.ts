import { createBangumiClient } from 'bangumi-api-client';

import { USER_AGENT } from './appMeta';

/**
 * Relay site origin (path-prefix reverse proxy, see server net.conf):
 *   <origin>/bgm/  -> https://api.bgm.tv/
 *   <origin>/nyaa/ -> https://nyaa.si/
 *
 * Replace this single value with the real domain, and also update the CSP
 * connect-src list in src-tauri/tauri.conf.json.
 */
const RELAY_ORIGIN = 'https://net.vaciller.site';

/** Bangumi API base (the client appends /v0/... paths itself) */
const BGM_BASE_URL = `${RELAY_ORIGIN}/bgm`;

/** Nyaa search page base (call sites append ?q=<keyword>) */
export const NYAA_SEARCH_URL = `${RELAY_ORIGIN}/nyaa/`;

/** Inline svg shown when an entry has no cover at all. */
const NO_COVER_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 224">',
  '<rect width="160" height="224" fill="#eae6dd"/>',
  '<circle cx="80" cy="96" r="30" fill="none" stroke="#c9c2b4" stroke-width="6"/>',
  '<path d="M50 156h60" stroke="#c9c2b4" stroke-width="6" stroke-linecap="round"/>',
  '</svg>',
].join('');

/**
 * Placeholder data uri rendered when an entry has no cover.
 *
 * Bangumi returns empty `images.*` strings for some entries; rendering
 * `<img src="">` shows a broken-image icon, so we fall back to this inline svg
 * (no extra request, and the CSP already allows `data:`).
 */
const NO_COVER = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(NO_COVER_SVG)}`;

/**
 * Rewrite a Bangumi cover CDN url (http:// or https://lain.bgm.tv/...) to the
 * relay origin, so cover images load through the same host as the API.
 *
 * The API may hand out plain `http://` urls, which the webview CSP would block.
 * Empty urls (entries without a cover) become an inline placeholder.
 *
 * @param url - Cover url returned by the Bangumi api
 * @returns Url served through the relay, or the inline placeholder when empty
 */
export function relayImage(url: string): string {
  if (url === '') {
    return NO_COVER;
  }
  return url.replace(/^https?:\/\/lain\.bgm\.tv\//, `${RELAY_ORIGIN}/lain/`);
}

/**
 * Shared Bangumi API client (single instance for the whole app).
 *
 * The Authorization header is switched at runtime by `applyBgmToken`, so every
 * request sent through this instance reflects the current login state.
 */
export const bgm = createBangumiClient({
  userAgent: USER_AGENT,
  baseUrl: BGM_BASE_URL,
});

/**
 * Set or clear the Authorization header of the shared client.
 *
 * @param token - Access token; pass null to clear it (anonymous requests)
 * @returns Nothing
 */
export function applyBgmToken(token: string | null): void {
  bgm._client.setConfig({
    headers: {
      Authorization: token === null || token === '' ? null : `Bearer ${token}`,
    },
  });
}

/** Minimal (non-sensitive) profile of the logged-in Bangumi user. */
export interface BgmProfile {
  /** Bangumi user id */
  id: number;
  /** Unique username */
  username: string;
  /** Nickname shown in the UI */
  nickname: string;
  /** Large avatar url (lain.bgm.tv — rewrite with `relayImage` before render) */
  avatarUrl: string;
}

/** Result of an access-token probe. */
export type ProfileProbe =
  { kind: 'ok'; profile: BgmProfile } | { kind: 'invalid' } | { kind: 'error'; detail: string };

/**
 * Validate an access token with a throw-away client (does not touch `bgm`).
 *
 * @param token - Access token to validate
 * @returns Probe result; `ok` carries the user profile
 */
export async function probeToken(token: string): Promise<ProfileProbe> {
  const client = createBangumiClient({ userAgent: USER_AGENT, baseUrl: BGM_BASE_URL, token });
  try {
    const res = await client.users.getMyself();
    if (res.data === undefined) {
      if (res.response.status === 401) {
        return { kind: 'invalid' };
      }
      return { kind: 'error', detail: `HTTP ${String(res.response.status)}` };
    }
    return {
      kind: 'ok',
      profile: {
        id: res.data.id,
        username: res.data.username,
        nickname: res.data.nickname,
        avatarUrl: res.data.avatar.large,
      },
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'network error';
    return { kind: 'error', detail };
  }
}
