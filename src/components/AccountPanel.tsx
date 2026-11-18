import { openUrl } from '@tauri-apps/plugin-opener';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { relayImage, type BgmProfile } from '../relay';

/** 创建 Bangumi 个人 Access Token 的官方页面 */
const TOKEN_URL = 'https://next.bgm.tv/demo/access-token';

interface AccountPanelProps {
  /** 是否展开弹框 */
  open: boolean;
  /** 弹框的固定定位坐标；null 表示尚未测量（不渲染） */
  pos: { left: number; top: number } | null;
  /** 登录用户画像；未登录为 null */
  profile: BgmProfile | null;
  /** 登录校验中 */
  submitting?: boolean;
  /** 后台刷新个人信息中 */
  refreshing?: boolean;
  /** 登录失败提示文案；为空时错误行不渲染 */
  error?: string | null;
  /** 提交 Access Token */
  onSubmit?: (token: string) => void;
  /** 退出登录 */
  onLogout: () => void;
  /** 关闭弹框 */
  onClose: () => void;
}

/**
 * 展开时响应 Esc 与「点击弹框外部」来关闭弹框。
 *
 * @param open - 弹框是否展开
 * @param onClose - 关闭回调
 * @param panelRef - 弹框根元素，用于判断点击是否落在面板内部
 */
function usePanelDismiss(
  open: boolean,
  onClose: () => void,
  panelRef: React.RefObject<HTMLFormElement | null>,
): void {
  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    function handleMouseDown(event: MouseEvent): void {
      const { target } = event;
      if (!(target instanceof Element)) {
        return;
      }
      if (panelRef.current?.contains(target) === true) {
        return;
      }
      // 头像按钮自己负责 toggle，这里跳过，避免关闭后又被重新打开
      if (target.closest('.topbar-avatar') !== null) {
        return;
      }
      onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [open, onClose, panelRef]);
}

interface AccountHeaderProps {
  /** 标题文案 */
  title: string;
  /** 关闭弹框 */
  onClose: () => void;
}

/**
 * 弹框标题栏：标题 + 关闭按钮。
 *
 * @param props - 组件属性
 * @param props.title - 标题文案
 * @param props.onClose - 关闭回调
 * @returns 标题栏元素
 */
function AccountHeader({ title, onClose }: AccountHeaderProps): React.JSX.Element {
  return (
    <div className="account-panel__header">
      <span className="account-panel__title">{title}</span>
      <button type="button" className="account-panel__close" aria-label="关闭" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}

/**
 * 「还没有 Token？前往创建」提示区：创建入口链接 + 代理/VPN 备注。
 *
 * 链接通过系统浏览器打开 Bangumi 的 Access Token 页面。
 *
 * @returns 提示区元素
 */
function TokenHelp(): React.JSX.Element {
  return (
    <>
      <p className="account-panel__hint">
        还没有 Token？
        <button
          type="button"
          className="account-panel__link"
          onClick={() => {
            void openUrl(TOKEN_URL);
          }}
        >
          前往创建
        </button>
      </p>
      <p className="account-panel__note">
        提示：创建 Token 需要访问 bgm.tv，如果页面打不开，请先开启代理 / VPN。
      </p>
    </>
  );
}

interface AccountProfileProps {
  /** 登录用户画像 */
  profile: BgmProfile;
  /** 后台刷新个人信息中 */
  refreshing: boolean;
  /** 退出登录 */
  onLogout: () => void;
}

/**
 * 已登录视图：头像、昵称、用户名与退出按钮。
 *
 * @param props - 组件属性
 * @param props.profile - 登录用户画像
 * @param props.refreshing - 后台刷新个人信息中
 * @param props.onLogout - 退出登录回调
 * @returns 已登录视图元素
 */
function AccountProfile({ profile, refreshing, onLogout }: AccountProfileProps): React.JSX.Element {
  const handleOpenProfile = (): void => {
    void openUrl(`https://bgm.tv/user/${encodeURIComponent(profile.username)}`);
  };

  return (
    <>
      <button
        type="button"
        className="account-panel__profile"
        title="在浏览器中打开 Bangumi 个人主页"
        aria-label={`在浏览器中打开 ${profile.nickname} 的 Bangumi 主页`}
        onClick={handleOpenProfile}
      >
        <img
          className="account-panel__avatar"
          src={relayImage(profile.avatarUrl)}
          alt={profile.nickname}
        />
        <div className="account-panel__names">
          <span className="account-panel__nickname">{profile.nickname}</span>
          <span className="account-panel__username">
            @{profile.username} · UID {String(profile.id)}
            {refreshing ? ' · 刷新中…' : ''}
          </span>
        </div>
      </button>
      <div className="account-panel__actions">
        <button type="button" className="account-panel__logout" onClick={onLogout}>
          退出登录
        </button>
      </div>
    </>
  );
}

/**
 * 顶栏账号弹框。
 *
 * 未登录显示登录表单（Token 输入 + 创建入口 + 登录按钮），已登录显示
 * 个人信息与退出按钮。Token 校验与持久化由 `authStore` 负责。
 *
 * @param props - 弹框属性
 * @param props.open - 是否展开
 * @param props.pos - 弹框的固定定位坐标；null 表示尚未测量
 * @param props.profile - 登录用户画像；未登录为 null
 * @param props.submitting - 登录校验中
 * @param props.refreshing - 后台刷新个人信息中
 * @param props.error - 登录失败文案
 * @param props.onSubmit - 提交 Token 回调
 * @param props.onLogout - 退出登录回调
 * @param props.onClose - 关闭回调
 * @returns 展开时返回弹框元素，否则返回 null
 */
export default function AccountPanel({
  open,
  pos,
  profile,
  submitting = false,
  refreshing = false,
  error = null,
  onSubmit,
  onLogout,
  onClose,
}: AccountPanelProps): React.JSX.Element | null {
  const [token, setToken] = useState<string>('');
  const panelRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 展开时自动聚焦输入框
  useEffect(() => {
    if (!open || pos === null) {
      return;
    }
    inputRef.current?.focus();
  }, [open, pos]);

  usePanelDismiss(open, onClose, panelRef);

  if (!open || pos === null) {
    return null;
  }

  const trimmed = token.trim();
  const hasError = error !== null && error.length > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (trimmed === '' || submitting) {
      return;
    }
    if (onSubmit !== undefined) {
      onSubmit(trimmed);
    }
  }

  return createPortal(
    <form
      className="topbar-account"
      ref={panelRef}
      style={{ left: pos.left, top: pos.top }}
      onSubmit={handleSubmit}
    >
      <AccountHeader title={profile === null ? '登录 Bangumi' : 'Bangumi 账号'} onClose={onClose} />
      {profile === null ? (
        <>
          <input
            ref={inputRef}
            className="account-panel__input"
            type="password"
            autoComplete="off"
            placeholder="粘贴 Access Token"
            aria-label="Access Token"
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
            }}
          />
          <TokenHelp />
          {hasError && <p className="account-panel__error">{error}</p>}
          <div className="account-panel__actions">
            <button
              type="submit"
              className={`account-panel__submit${submitting ? ' account-panel__submit--loading' : ''}`}
              disabled={trimmed === '' || submitting}
            >
              登录
            </button>
          </div>
        </>
      ) : (
        <AccountProfile profile={profile} refreshing={refreshing} onLogout={onLogout} />
      )}
    </form>,
    document.body,
  );
}
