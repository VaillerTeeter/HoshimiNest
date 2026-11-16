import { invoke } from '@tauri-apps/api/core';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from 'react';

import { applyBgmToken, probeToken, type BgmProfile, type ProfileProbe } from '../relay';

// ── Types ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** 当前登录用户画像；未登录为 null */
  profile: BgmProfile | null;
  /** 登录校验中 */
  submitting: boolean;
  /** 后台刷新个人信息中 */
  refreshing: boolean;
  /** 登录失败 / 刷新失败提示文案 */
  error: string | null;
  /** 用 Access Token 登录 */
  login: (token: string) => Promise<void>;
  /** 退出登录并清除本地凭据 */
  logout: () => Promise<void>;
  /** 重新拉取个人信息（头像 / 昵称等） */
  refresh: () => Promise<void>;
}

/** 非敏感个人资料缓存键（只存 id / username / nickname / avatarUrl） */
const PROFILE_CACHE_KEY = 'hoshiminest-bgm-profile';

// ── Local cache helpers ────────────────────────────────────────────────────

/**
 * 运行时类型守卫：校验缓存内容的形状。
 *
 * @param value - 待校验的未知值
 * @returns 是否为合法的个人资料
 */
function isBgmProfile(value: unknown): value is BgmProfile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'number' &&
    typeof entry.username === 'string' &&
    typeof entry.nickname === 'string' &&
    typeof entry.avatarUrl === 'string'
  );
}

/**
 * 读取缓存的个人资料（仅用于启动时立即渲染头像）。
 *
 * @returns 缓存资料；无缓存或解析失败时为 null
 */
function loadCachedProfile(): BgmProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (raw === null || raw === '') {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isBgmProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 写出 / 清除个人资料缓存。
 *
 * @param profile - 要缓存的资料；传 null 清除缓存
 * @returns Nothing
 */
function cacheProfile(profile: BgmProfile | null): void {
  if (profile === null) {
    localStorage.removeItem(PROFILE_CACHE_KEY);
    return;
  }
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
}

// ── Backend credential helpers ─────────────────────────────────────────────

/**
 * 读取磁盘上经 DPAPI 加密保存的 Access Token。
 *
 * @returns token；无 token 或读取失败时为 null
 */
async function loadToken(): Promise<string | null> {
  try {
    const token = await invoke<string | null>('load_bangumi_token');
    return token === null || token === '' ? null : token;
  } catch {
    return null;
  }
}

/**
 * 删除磁盘上的 Access Token（失败不阻断登出流程）。
 *
 * @returns Nothing
 */
async function clearToken(): Promise<void> {
  try {
    await invoke('clear_bangumi_token');
  } catch {
    // 删除失败时内存状态照常清理，下次启动会重新校验
  }
}

/**
 * 把校验结果转成用户可读的错误文案。
 *
 * @param result - Token 校验结果
 * @returns 错误文案
 */
function probeMessage(result: ProfileProbe): string {
  if (result.kind === 'invalid') {
    return 'Token 无效或已过期，请重新创建';
  }
  if (result.kind === 'error') {
    return `请求失败：${result.detail}`;
  }
  return '登录失败，请稍后重试';
}

// ── Session restore ────────────────────────────────────────────────────────

/**
 * 启动时恢复登录态：先用缓存资料展示，再用磁盘 token 后台校验。
 *
 * @param setProfile - profile 状态设置函数
 * @param tokenRef - 内存中的 token 引用（供后续刷新复用）
 * @returns Nothing
 */
function useSessionRestore(
  setProfile: Dispatch<SetStateAction<BgmProfile | null>>,
  tokenRef: MutableRefObject<string | null>,
): void {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await loadToken();
      if (cancelled || token === null) {
        return;
      }
      tokenRef.current = token;
      applyBgmToken(token);
      const result = await probeToken(token);
      if (cancelled) {
        return;
      }
      if (result.kind === 'ok') {
        setProfile(result.profile);
        cacheProfile(result.profile);
        return;
      }
      if (result.kind === 'invalid') {
        await clearToken();
        tokenRef.current = null;
        applyBgmToken(null);
        setProfile(null);
        cacheProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setProfile, tokenRef]);
}

// ── Provider ───────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  submitting: false,
  refreshing: false,
  error: null,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  refresh: () => Promise.resolve(),
});

/**
 * 登录态 Provider：维护 Bangumi 个人凭据与画像。
 *
 * @param props - 组件属性
 * @param props.children - 子节点
 * @returns Provider 元素
 */
export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [profile, setProfile] = useState<BgmProfile | null>(loadCachedProfile);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  useSessionRestore(setProfile, tokenRef);

  const login = useCallback(async (rawToken: string): Promise<void> => {
    const token = rawToken.trim();
    if (token === '') {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await probeToken(token);
      if (result.kind !== 'ok') {
        setError(probeMessage(result));
        return;
      }
      await invoke('save_bangumi_token', { token });
      applyBgmToken(token);
      tokenRef.current = token;
      setProfile(result.profile);
      cacheProfile(result.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : '本地保存登录信息失败');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await clearToken();
    applyBgmToken(null);
    tokenRef.current = null;
    setProfile(null);
    setError(null);
    cacheProfile(null);
  }, []);

  // 面板打开时调用：网页改了头像/昵称后无需重启即可同步
  const refresh = useCallback(async (): Promise<void> => {
    const token = tokenRef.current;
    if (token === null) {
      return;
    }
    setRefreshing(true);
    try {
      const result = await probeToken(token);
      if (result.kind === 'ok') {
        setProfile(result.profile);
        cacheProfile(result.profile);
        setError(null);
        return;
      }
      if (result.kind === 'invalid') {
        await clearToken();
        applyBgmToken(null);
        tokenRef.current = null;
        setProfile(null);
        cacheProfile(null);
        setError('登录已过期，请重新登录');
      }
      // kind === 'error'（网络问题）：静默保留旧资料
    } finally {
      setRefreshing(false);
    }
  }, []);

  const value = useMemo(
    () => ({ profile, submitting, refreshing, error, login, logout, refresh }),
    [profile, submitting, refreshing, error, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * @returns 登录态上下文
 */
export function useAuth(): AuthContextValue {
  return use(AuthContext);
}
