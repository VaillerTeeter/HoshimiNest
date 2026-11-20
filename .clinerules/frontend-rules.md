---
description: "Use when: writing or modifying React components, TypeScript, CSS, or shared state in src/. Covers component patterns, import order, styling, state management, and TypeScript rules."
globs: "src/**"
alwaysApply: false
---

# Frontend Rules

<!-- React / TypeScript / CSS / 状态管理规范，操作 src/ 目录时自动加载 -->

## Component Pattern

Always use functional components with hooks. NEVER use class components or HOCs.

Always place page-level components in `src/pages/`, one file per route.

Always annotate component return type as `React.JSX.Element`.

```tsx
function MyComponent({ name }: MyComponentProps): React.JSX.Element {
  return <div>{name}</div>;
}
```

NEVER export components as anonymous default exports. Always use named functions:

✅ `export default function BacklogPage(): React.JSX.Element { ... }`
❌ `export default () => { ... }`

## Props & Types

Always declare props via `interface`. Use `type` for unions and lookup types.

```tsx
interface TaskCardProps {
  task: DownloadTask;
  onPause: (id: string) => void;
}
```

NEVER use `any`. NEVER use `@ts-ignore` without an explanatory comment on the same line.

✅ `// @ts-expect-error: third-party type mismatch in bangumi-api-client v2026`
❌ `// @ts-ignore`

Use type guards with `is` predicates when validating unknown shapes at runtime.

```tsx
function isWatchEntry(v: unknown): v is WatchEntry {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return typeof e.status === 'string' && typeof e.updatedAt === 'number';
}
```

## Imports

Always group imports in this order, separated by blank lines:

1. Tauri API (`@tauri-apps/api/*`)
2. Third-party UI / libraries
3. React and React hooks
4. Internal modules (relative paths)
5. CSS imports (always last)

```tsx
import { invoke } from '@tauri-apps/api/core';

import { Button } from 'animal-island-ui';

import { useState, useCallback } from 'react';

import { useDownload } from '../store/downloadStore';

import './MyPage.css';
```

## CSS

Always use plain CSS. NEVER add Tailwind CSS or any CSS-in-JS library (styled-components, emotion, etc.).

### File Responsibilities

|File|Purpose|
|----|-------|
|`src/styles/theme.css`|The ONLY place for `--theme-*` CSS variables — colors, spacing, typography tokens. Replace this file to change themes.|
|`src/styles/fonts.css`|`@font-face` declarations only. No colors, no layout.|
|`src/App.css`|App shell layout (topbar, sidebar, page containers). All colors MUST reference `var(--theme-*)`.|
|`src/pages/*.css`|Page-level component styles. Co-located with their component. All colors MUST reference `var(--theme-*)`.|

### Color Rule

NEVER write raw color values (`#xxx`, `rgb()`, `hsl()`) in any CSS file except `src/styles/theme.css`. All colors MUST use CSS variables defined in `theme.css`.

✅ `color: var(--theme-text-primary);`
❌ `color: #4a3525;`

### Naming

Use BEM-style naming: `.block__element--modifier`

```text
dl-card                  # Block
dl-card__header          # Element
dl-card--error           # Modifier
dl-progress-bar--done    # Modifier with state
```

## State Management

Global state uses React Context + custom hooks (see `src/store/downloadStore.tsx` and `src/store/authStore.tsx`). NEVER introduce Zustand, Redux, Jotai, MobX, or other state libraries.

Place providers/stores in `src/store/`. Name files in camelCase:

```text
src/store/watchStore.ts       # localStorage helpers
src/store/downloadStore.tsx   # DownloadProvider + useDownload()
src/store/authStore.tsx       # AuthProvider + useAuth()
```

Expose state through a hook wrapping `use(Context)`:

```tsx
// src/store/taskStore.tsx
const TaskContext = createContext<TaskContextValue>({ /* defaults */ });

export function TaskProvider({ children }: { children: ReactNode }): ReactElement {
  // state + callbacks
  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks(): TaskContextValue {
  return use(TaskContext);
}
```

## Remote Assets & Credentials

Always route Bangumi / Nyaa requests through `src/relay.ts` (`RELAY_ORIGIN` + shared `bgm` client). NEVER hardcode `api.bgm.tv`, `lain.bgm.tv` or `nyaa.si`.

Always render remote images through `relayImage()` — it rewrites `lain.bgm.tv` to the relay and returns an inline placeholder for empty urls.

NEVER store tokens, passwords or other credentials in `localStorage` / `sessionStorage`. Bangumi credentials are persisted by Rust (Windows DPAPI) and read via `invoke('load_bangumi_token')`.

Only non-sensitive profile fields (id / username / nickname / avatarUrl) may be cached in `localStorage`.

The season list MUST be loaded through the browse endpoint (`bgm.subjects.getSubjects` with `year` + `month`, `limit: 100`). `POST /v0/search/subjects` is for keyword search only — its index misses roughly half of a season's entries (measured 2026 autumn: browse 189 vs search 89).

## Pre-existing Dependencies

NEVER suggest installing or re-installing these — already in `package.json`:

- `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-notification`, `@tauri-apps/plugin-opener`
- `animal-island-ui`, `bangumi-api-client`, `classnames`
- `react`, `react-dom`

Always invoke Tauri commands via `invoke()` from `@tauri-apps/api/core`. NEVER use other Tauri IPC methods.

```tsx
import { invoke } from '@tauri-apps/api/core';

void invoke('reveal_in_folder', { path: task.saveDir });
```

## File Naming

|Type|Convention|Example|
|----|----------|-------|
|Page component|PascalCase|`DownloadPage.tsx`|
|Shared component|PascalCase|`AccountPanel.tsx`|
|Store|camelCase|`watchStore.ts`|
|Styles (global)|kebab-case|`theme.css`, `fonts.css`|
|Styles (component)|PascalCase + `.css`|`DownloadPage.css`|

## Inline Styles

Inline styles are permitted only for dynamic layout values (widths, visibility). NEVER use inline styles for static design — use CSS classes instead.
