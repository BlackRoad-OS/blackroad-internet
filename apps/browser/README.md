# @blackroad/browser

The BlackRoad Internet desktop browser — a Tauri 2 + React application that verifies every page you visit in real time.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Directory Structure](#directory-structure)
4. [Getting Started](#getting-started)
5. [React Frontend](#react-frontend)
   - [Components](#components)
   - [Hooks](#hooks)
   - [Types](#types)
6. [Rust / Tauri Backend](#rust--tauri-backend)
   - [Tauri Commands](#tauri-commands)
   - [Verification Pipeline](#verification-pipeline)
7. [Internal URL Scheme](#internal-url-scheme)
8. [Configuration](#configuration)
9. [Building & Packaging](#building--packaging)

---

## Overview

`@blackroad/browser` is the user-facing desktop application. It renders web pages inside a native Tauri webview, passes page content through a dual-layer verification pipeline (cloud reputation check + optional on-device Ollama AI), and surfaces an accuracy score and per-claim verdicts in a collapsible sidebar.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| UI framework | React 18 + TypeScript |
| Styling | Tailwind CSS 3 |
| Build tool | Vite 6 |
| Native shell | Tauri 2 (Rust) |
| HTTP (Rust) | `reqwest` via `tauri-plugin-http` |
| Persistent store | `tauri-plugin-store` (JSON) |
| On-device AI | Ollama (local inference) |

---

## Directory Structure

```
apps/browser/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
│
├── src/                          ← React frontend
│   ├── main.tsx                  ← Entry point
│   ├── App.tsx                   ← Root component + keyboard shortcuts
│   │
│   ├── components/
│   │   ├── browser/
│   │   │   ├── AddressBar.tsx    ← URL input with verification score badge
│   │   │   ├── BrowserFrame.tsx  ← Webview wrapper + internal page router
│   │   │   ├── BookmarksPage.tsx ← blackroad://bookmarks
│   │   │   ├── CommandPalette.tsx← ⌘K overlay
│   │   │   ├── HistoryPage.tsx   ← blackroad://history
│   │   │   ├── NavigationControls.tsx ← Back / Forward / Refresh
│   │   │   ├── NewTabPage.tsx    ← blackroad://newtab
│   │   │   ├── PrivacyDashboard.tsx   ← blackroad://privacy
│   │   │   ├── ReaderMode.tsx    ← Distraction-free reading view
│   │   │   ├── StatusBar.tsx     ← Bottom status bar
│   │   │   └── TabBar.tsx        ← Multi-tab strip
│   │   ├── search/               ← Search result components
│   │   └── sidebar/
│   │       └── VerificationPanel.tsx ← Accuracy score + claims list
│   │
│   ├── hooks/
│   │   ├── useBookmarks.ts       ← Bookmark CRUD + persistence
│   │   ├── useHistory.ts         ← Browsing history with scores
│   │   ├── useKeyboardShortcuts.ts ← Global keybindings
│   │   ├── useTabs.ts            ← Tab lifecycle management
│   │   └── useVerification.ts    ← Verification trigger + state
│   │
│   └── types/
│       ├── browser.ts            ← Tab, PageInfo, BrowserSettings
│       └── verification.ts       ← VerificationResult, ClaimResult, Verdict
│
└── src-tauri/                    ← Rust / Tauri native backend
    ├── Cargo.toml
    ├── tauri.conf.json
    └── src/
        ├── main.rs
        ├── lib.rs                ← Tauri builder, plugin registration
        ├── commands/
        │   ├── mod.rs
        │   ├── navigation.rs     ← navigate_to, go_back, go_forward, refresh_page
        │   ├── settings.rs       ← get_settings, update_settings
        │   └── verification.rs   ← verify_page, get_verification_status, verify_claim
        ├── store/
        │   └── mod.rs            ← tauri-plugin-store initialisation
        └── verification/
            ├── mod.rs
            ├── ollama.rs         ← OllamaClient (local LLM inference)
            └── reputation.rs     ← ReputationDb (cloud fallback)
```

---

## Getting Started

```bash
# From the repo root
pnpm install

# Start Vite dev server + Tauri hot-reload
pnpm dev:browser
```

Tauri opens the app window automatically. The Vite dev server runs on `http://localhost:1420`.

---

## React Frontend

### Components

#### `browser/`

| Component | Description |
|-----------|-------------|
| `TabBar` | Renders the tab strip. Emits `onTabClick`, `onTabClose`, `onNewTab`. |
| `AddressBar` | URL input field with inline verification score badge. Accepts `verificationScore` prop. |
| `NavigationControls` | Back / Forward / Refresh buttons wired to Tauri commands. |
| `BrowserFrame` | Hosts the Tauri webview. Routes `blackroad://` scheme to internal pages. |
| `NewTabPage` | Start page shown on `blackroad://newtab`. |
| `BookmarksPage` | Lists saved bookmarks; shown on `blackroad://bookmarks`. |
| `HistoryPage` | Full history with scores; shown on `blackroad://history`. |
| `PrivacyDashboard` | Privacy stats; shown on `blackroad://privacy`. |
| `ReaderMode` | Distraction-free reading view with inline claim verdicts. |
| `StatusBar` | Bottom bar: HTTPS indicator, verification score, reader mode badge. |
| `CommandPalette` | ⌘K overlay for navigation, settings, and feature toggles. |

#### `sidebar/`

| Component | Description |
|-----------|-------------|
| `VerificationPanel` | Shows overall accuracy score, source reputation, bias label, and a per-claim verdict list. |

### Hooks

| Hook | Description |
|------|-------------|
| `useTabs` | Manages the tab array, active tab, navigation, and title updates. |
| `useVerification` | Calls `verify_page` Tauri command when the active URL changes and tracks loading state. |
| `useBookmarks` | CRUD operations for bookmarks, persisted via `tauri-plugin-store`. |
| `useHistory` | Appends history entries (URL + title + score) and supports `clearHistory`. |
| `useKeyboardShortcuts` | Registers and cleans up all global keyboard shortcuts via `useEffect`. |

### Types

#### `browser.ts`

```typescript
Tab               // id, url, title, favicon?, isLoading
PageInfo          // url, title, is_secure, is_search
BrowserSettings   // verification_enabled, sidebar_position, theme, default_search
```

#### `verification.ts`

```typescript
ClaimType         // "Factual" | "Statistical" | "Quote" | "Opinion" | "Prediction"
Verdict           // "Verified" | "Likely" | "Uncertain" | "Disputed" | "False"
ClaimResult       // text, claim_type, confidence, verdict, reasoning, sources[]
VerificationResult // url, overall_score, source_reputation, source_category, source_bias, claims[], …
```

---

## Rust / Tauri Backend

### Tauri Commands

Commands are registered in `lib.rs` and callable from the React frontend via `@tauri-apps/api`.

| Command | Signature | Description |
|---------|-----------|-------------|
| `navigate_to` | `(url: string)` | Navigate the active webview to a URL |
| `go_back` | `()` | Webview history back |
| `go_forward` | `()` | Webview history forward |
| `refresh_page` | `()` | Reload current page |
| `verify_page` | `(url: string, content?: string)` | Run full verification pipeline; returns `VerificationResult` |
| `get_verification_status` | `(url: string)` | Check cached result without re-running |
| `verify_claim` | `(claim: string, context?: string)` | Verify a single claim string |
| `get_settings` | `()` | Return persisted `BrowserSettings` |
| `update_settings` | `(settings: BrowserSettings)` | Persist updated settings |

### Verification Pipeline

1. **Source reputation** — `ReputationDb` queries the Verification API (`/reputation/:domain`) for a 0–1 trust score, category, and bias label.
2. **Claim extraction** — `OllamaClient` prompts the local model (default: `llama3.2`) to extract up to 5 factual/statistical claims from the page text.
3. **Claim verification** — Each extracted claim is re-submitted to Ollama for a `Verified / Likely / Uncertain / Disputed / False` verdict with confidence and reasoning.
4. **Score aggregation** — `overall_score = source_reputation` when AI is unavailable; when AI runs, claim confidence is averaged and blended with source reputation.

Set `OLLAMA_ENDPOINT` in your environment before launching to enable on-device AI:

```bash
OLLAMA_ENDPOINT=http://localhost:11434 pnpm dev:browser
```

---

## Internal URL Scheme

Pages served by `BrowserFrame` at `blackroad://` URLs:

| URL | Component |
|-----|-----------|
| `blackroad://newtab` | `NewTabPage` |
| `blackroad://history` | `HistoryPage` |
| `blackroad://bookmarks` | `BookmarksPage` |
| `blackroad://privacy` | `PrivacyDashboard` |

---

## Configuration

`tauri.conf.json` key settings:

| Key | Value |
|-----|-------|
| `productName` | `BlackRoad Internet` |
| `identifier` | `io.blackroad.internet` |
| `version` | `0.1.0` |
| `windows[0].width` | `1400` |
| `windows[0].height` | `900` |

---

## Building & Packaging

```bash
# Production build (frontend + Rust)
pnpm build:browser

# Output artifacts
apps/browser/src-tauri/target/release/bundle/
  ├── dmg/          ← macOS disk image
  ├── msi/          ← Windows installer
  └── appimage/     ← Linux AppImage
```
