---
description: "Use when: writing or modifying React components, TypeScript, CSS, or Zustand stores in src/. Covers component patterns, import order, styling, state management, and TypeScript rules."
globs: "src/**"
alwaysApply: false
---

# Frontend Rules

<!-- React / TypeScript / CSS / Zustand 规范，操作 src/ 目录时自动加载 -->

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

Always use Zustand for state management. NEVER introduce Redux, Jotai, MobX, or other state libraries.

Place store files in `src/store/`. Name stores in camelCase:

```text
src/store/watchStore.ts
src/store/downloadStore.tsx
```

Encapsulate store logic in custom hooks when exposing to components:

```tsx
// src/store/downloadStore.tsx
export function useDownload() {
  return useDownloadStore((s) => ({
    tasks: s.tasks,
    pauseTask: s.pauseTask,
    // ...
  }));
}
```

## Pre-existing Dependencies

NEVER suggest installing or re-installing these — already in `package.json`:

- `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-opener`
- `animal-island-ui`, `bangumi-api-client`
- `react`, `react-dom`, `zustand`

Always invoke Tauri commands via `invoke()` from `@tauri-apps/api/core`. NEVER use other Tauri IPC methods.

```tsx
import { invoke } from '@tauri-apps/api/core';

void invoke('reveal_in_folder', { path: task.saveDir });
```

## File Naming

|Type|Convention|Example|
|----|----------|-------|
|Page component|PascalCase|`DownloadPage.tsx`|
|Store|camelCase|`watchStore.ts`|
|Styles (global)|kebab-case|`theme.css`, `fonts.css`|
|Styles (component)|PascalCase + `.css`|`DownloadPage.css`|

## Inline Styles

Inline styles are permitted only for dynamic layout values (widths, visibility). NEVER use inline styles for static design — use CSS classes instead.
