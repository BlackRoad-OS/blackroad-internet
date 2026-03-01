# BlackRoad Internet

**Accurate info. Period.**

BlackRoad Internet is an open-source, privacy-first desktop browser that scores and verifies every page you visit in real time — using on-device AI and a cloud reputation database to surface the truth before you share it.

[![License](https://img.shields.io/github/license/BlackRoad-OS/blackroad-internet)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](package.json)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202-orange)](https://tauri.app)
[![Cloudflare Workers](https://img.shields.io/badge/backend-Cloudflare%20Workers-orange)](https://workers.cloudflare.com)

---

## Table of Contents

1. [What Is BlackRoad Internet?](#what-is-blackroad-internet)
2. [Features](#features)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Install Dependencies](#install-dependencies)
   - [Run in Development](#run-in-development)
   - [Build for Production](#build-for-production)
6. [Packages & Apps](#packages--apps)
7. [Environment Variables](#environment-variables)
8. [Deployment](#deployment)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Roadmap](#roadmap)
11. [Contributing](#contributing)
12. [License](#license)

---

## What Is BlackRoad Internet?

BlackRoad Internet is a **Tauri 2 + React** desktop browser packaged as a native app for macOS, Windows, and Linux. Every page load triggers a reputation check against our Cloudflare-powered backend. When the local Ollama instance is available, claims on the page are extracted and verified by an on-device language model — no data leaves the machine.

The result: every URL you visit receives a **0–100 accuracy score**, a bias label, and a per-claim verdict before you decide to share it.

---

## Features

| Feature | Status |
|---|---|
| Multi-tab browsing | ✅ |
| Real-time source reputation scoring | ✅ |
| On-device AI claim verification (Ollama) | ✅ |
| Cloud reputation database (Cloudflare D1) | ✅ |
| Brave Search integration | ✅ |
| Reader mode | ✅ |
| Bookmark manager | ✅ |
| History with verification scores | ✅ |
| Command palette (⌘K) | ✅ |
| Privacy dashboard | ✅ |
| Community misinfo reports | ✅ |
| Stripe-powered premium subscriptions | 🔜 |
| npm-published component library | 🔜 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              BlackRoad Internet (Tauri)              │
│                                                     │
│   React UI (TypeScript + Tailwind)                  │
│        │                                            │
│   Rust Core (Tauri commands)                        │
│        ├── On-device AI verification (Ollama)       │
│        └── Persistent store (tauri-plugin-store)    │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────────┐  ┌──────────▼──────────┐
│  Search API       │  │  Verification API   │
│  (CF Worker)      │  │  (CF Worker + D1)   │
│                   │  │                     │
│  Brave Search     │  │  Source reputation  │
│  Result ranking   │  │  Claim cache        │
│  0.4·R+0.3·A+…   │  │  Community reports  │
└──────────────────┘  └─────────────────────┘
```

---

## Project Structure

```
blackroad-internet/
├── README.md                     ← You are here
├── package.json                  ← Root workspace (pnpm)
├── pnpm-workspace.yaml           ← Monorepo workspace config
├── turbo.json                    ← Turborepo pipeline
│
├── apps/
│   └── browser/                  ← Tauri desktop browser app
│       ├── README.md
│       ├── src/                  ← React + TypeScript frontend
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── browser/      ← Core browser UI components
│       │   │   ├── search/       ← Search components
│       │   │   └── sidebar/      ← Verification sidebar
│       │   ├── hooks/            ← Custom React hooks
│       │   └── types/            ← Shared TypeScript types
│       └── src-tauri/            ← Rust Tauri backend
│           └── src/
│               ├── commands/     ← Tauri IPC commands
│               ├── store/        ← Persistent storage
│               └── verification/ ← Ollama + reputation client
│
└── workers/
    ├── search-api/               ← Cloudflare Worker: search & ranking
    │   ├── README.md
    │   └── src/index.ts
    └── verification-api/         ← Cloudflare Worker: reputation & verify
        ├── README.md
        ├── src/
        │   ├── index.ts
        │   └── routes/
        │       ├── reputation.ts
        │       ├── verify.ts
        │       └── reports.ts
        └── migrations/
            └── 0001_init.sql     ← D1 schema + seed data
```

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org) | ≥ 20 | JavaScript runtime |
| [pnpm](https://pnpm.io) | ≥ 10 | Package manager |
| [Rust](https://rustup.rs) | stable | Tauri native layer |
| [Tauri CLI](https://tauri.app/start/prerequisites/) | v2 | Desktop app bundling |
| [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | ≥ 4 | Deploy Cloudflare Workers |

### Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

### Run in Development

```bash
# Start the desktop browser (Tauri + React hot-reload)
pnpm dev:browser

# Start the Search API Cloudflare Worker locally
cd workers/search-api && pnpm dev

# Start the Verification API Cloudflare Worker locally
cd workers/verification-api && pnpm dev
```

### Build for Production

```bash
# Build all packages in the monorepo
pnpm build

# Build + package the native desktop app (macOS/Windows/Linux)
pnpm build:browser
```

---

## Packages & Apps

| Package | Path | Description |
|---------|------|-------------|
| `@blackroad/browser` | `apps/browser` | Tauri desktop browser |
| `@blackroad/search-api` | `workers/search-api` | Search + ranking Cloudflare Worker |
| `@blackroad/verification-api` | `workers/verification-api` | Reputation + verification Cloudflare Worker |

See the individual README files for each package for detailed documentation:

- [`apps/browser/README.md`](apps/browser/README.md)
- [`workers/search-api/README.md`](workers/search-api/README.md)
- [`workers/verification-api/README.md`](workers/verification-api/README.md)

---

## Environment Variables

### Search API (`workers/search-api`)

| Variable | Required | Description |
|----------|----------|-------------|
| `BRAVE_API_KEY` | Optional | [Brave Search API](https://brave.com/search/api/) key for full-text search. Set via `wrangler secret put BRAVE_API_KEY`. Without this, the `/enrich` endpoint still works. |
| `VERIFICATION_API` | Service binding | Cloudflare service binding to `blackroad-verification-api` (configured in `wrangler.toml`) |

### Verification API (`workers/verification-api`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DB` | Required | Cloudflare D1 database binding (configured in `wrangler.toml`) |

### Browser App (`apps/browser`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OLLAMA_ENDPOINT` | Optional | Local Ollama server URL (default: `http://localhost:11434`). Set as environment variable before launching the app for on-device AI verification. |

---

## Deployment

### Deploy Cloudflare Workers

```bash
# Deploy the verification API (run migrations first)
cd workers/verification-api
wrangler d1 migrations apply blackroad-verification
pnpm deploy

# Deploy the search API
cd workers/search-api
pnpm deploy

# Set Brave Search API key as a secret (optional)
wrangler secret put BRAVE_API_KEY
```

### Package Desktop App

```bash
# Build macOS .dmg / Windows .msi / Linux .AppImage
pnpm build:browser
# Artifacts are output to apps/browser/src-tauri/target/release/bundle/
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘T` | New tab |
| `⌘W` | Close tab |
| `⌘L` | Focus address bar |
| `⌘K` | Open command palette |
| `⌘E` | Toggle verification panel |
| `⌘Shift+R` | Toggle reader mode |
| `⌘D` | Bookmark current page |
| `⌘Y` | Open history |
| `⌘Shift+B` | Open bookmarks |
| `⌘1`–`⌘9` | Switch to tab by index |
| `⌘R` | Refresh current tab |
| `⌘[` | Go back |
| `⌘]` | Go forward |

---

## Roadmap

- **v0.2** — Stripe-powered premium tier (Pro verification, unlimited history sync)
- **v0.2** — npm-published `@blackroad/ui` component library (accuracy badges, score widgets)
- **v0.3** — Mobile app (iOS + Android via Tauri Mobile)
- **v0.3** — Browser extension (Chrome / Firefox)
- **v1.0** — Full AI claim pipeline for all pages, multi-model support

---

## Contributing

Pull requests are welcome. Please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/)
4. Push and open a pull request

---

## License

[MIT](LICENSE) © BlackRoad OS
