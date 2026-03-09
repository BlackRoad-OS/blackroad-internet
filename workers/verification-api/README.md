# @blackroad/verification-api

Cloudflare Worker + D1 database that powers BlackRoad Internet's source reputation lookup, URL verification caching, and community misinformation reporting.

---

## Table of Contents

1. [Overview](#overview)
2. [Endpoints](#endpoints)
   - [GET /](#get-)
   - [GET /health](#get-health)
   - [GET /reputation/:domain](#get-reputationdomain)
   - [POST /reputation/batch](#post-reputationbatch)
   - [POST /verify](#post-verify)
   - [GET /verify/status](#get-verifystatus)
   - [POST /reports](#post-reports)
   - [GET /reports](#get-reports)
   - [GET /reports/stats](#get-reportsstats)
3. [Database Schema](#database-schema)
4. [Source Reputation Seed Data](#source-reputation-seed-data)
5. [Getting Started](#getting-started)
6. [Configuration](#configuration)
7. [Directory Structure](#directory-structure)
8. [Deployment](#deployment)

---

## Overview

`@blackroad/verification-api` is a [Cloudflare Worker](https://workers.cloudflare.com/) built with [Hono](https://hono.dev/) and backed by a [Cloudflare D1](https://developers.cloudflare.com/d1/) SQLite database. It provides three capabilities:

1. **Source reputation** — Domain-level trust scores (0–1), bias labels, and factual ratings seeded from a curated database of academic journals, wire services, government agencies, fact-checkers, and news outlets.
2. **Verification cache** — Caches `VerificationResult` objects per URL for 1 hour to reduce redundant lookups.
3. **Community reports** — Allows users to flag inaccurate, misleading, satirical, outdated, or biased content; queryable by domain or URL. See [`workers/verification-api/README.md`](workers/verification-api/README.md).

---

## Endpoints

### `GET /`

Returns service metadata.

**Response**

```json
{
  "service": "BlackRoad Verification API",
  "version": "0.1.0",
  "status": "operational",
  "mission": "Accurate info. Period."
}
```

---

### `GET /health`

Liveness probe.

**Response**

```json
{ "ok": true, "ts": 1710000000000 }
```

---

### `GET /reputation/:domain`

Look up the reputation of a single domain.

**Path Parameter**

| Parameter | Description |
|-----------|-------------|
| `domain` | Hostname to look up, e.g. `nasa.gov` |

**Resolution order:**
1. Exact domain match in D1
2. Parent domain (e.g. `climate.nasa.gov` → `nasa.gov`)
3. TLD fallback: `.gov` → 0.88 / `.edu` → 0.85
4. Default: score 0.5, category `unknown`

**Response (found)**

```json
{
  "found": true,
  "domain": "apnews.com",
  "score": 0.93,
  "category": "wire-service",
  "bias": "center",
  "factual": "very-high",
  "updated_at": "2025-01-01T00:00:00"
}
```

**Response (not found)**

```json
{
  "found": false,
  "domain": "example.com",
  "score": 0.5,
  "category": "unknown",
  "bias": "unknown",
  "factual": "unknown"
}
```

---

### `POST /reputation/batch`

Look up reputations for up to 50 domains in one request.

**Request Body**

```json
{ "domains": ["nasa.gov", "twitter.com", "example.com"] }
```

**Response**

```json
{
  "results": {
    "nasa.gov":    { "score": 0.92, "category": "government", "bias": "none",  "factual": "very-high" },
    "twitter.com": { "score": 0.30, "category": "social",     "bias": "mixed", "factual": "low" },
    "example.com": { "score": 0.50, "category": "unknown",    "bias": "unknown","factual": "unknown" }
  }
}
```

---

### `POST /verify`

Verify a URL. Returns a `VerificationResult` (sourced from D1 cache or freshly computed from reputation data).

**Request Body**

```json
{
  "url": "https://apnews.com/article/...",
  "content": "Optional page text for future AI enrichment",
  "claims": ["Optional pre-extracted claims"]
}
```

**Response**

```json
{
  "url": "https://apnews.com/article/...",
  "overall_score": 0.93,
  "source_reputation": 0.93,
  "source_category": "wire-service",
  "source_bias": "center",
  "claims": [],
  "claims_checked": 0,
  "verification_time_ms": 12,
  "method": "cloud-reputation",
  "ai_available": false
}
```

> Results are cached in D1 for 1 hour.

---

### `GET /verify/status`

Check whether a cached verification result exists for a URL.

**Query Parameter**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `url` | ✅ | URL to check |

**Response (found)**

```json
{
  "found": true,
  "url": "...",
  "overall_score": 0.93,
  "cached_at": "2025-01-01T12:00:00"
}
```

**Response (not found)**

```json
{ "found": false }
```

---

### `POST /reports`

Submit a community accuracy report.

**Request Body**

```json
{
  "url": "https://example.com/article",
  "claim_text": "Optional specific claim being reported",
  "report_type": "misleading",
  "details": "Optional free-text explanation",
  "reporter_id": "anonymous"
}
```

**`report_type` values:** `inaccurate` | `misleading` | `satire` | `outdated` | `biased`

**Response**

```json
{ "success": true, "message": "Report submitted" }
```

---

### `GET /reports`

Retrieve community reports for a domain or URL.

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `domain` | ✅ (or `url`) | Filter by domain |
| `url` | ✅ (or `domain`) | Filter by exact URL |
| `limit` | ❌ | Max reports to return (default 20, max 100) |

**Response**

```json
{
  "reports": [ { "id": 1, "url": "...", "report_type": "misleading", "created_at": "..." } ],
  "count": 1
}
```

---

### `GET /reports/stats`

Report counts grouped by type for a domain.

**Query Parameter**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `domain` | ✅ | Domain to summarise |

**Response**

```json
{
  "domain": "example.com",
  "total_reports": 5,
  "by_type": [
    { "report_type": "misleading", "count": 3 },
    { "report_type": "inaccurate", "count": 2 }
  ]
}
```

---

## Database Schema

Defined in `migrations/0001_init.sql` and applied via Wrangler.

```sql
-- Domain trust scores
source_reputation (
  domain TEXT PRIMARY KEY,
  score REAL NOT NULL DEFAULT 0.5,   -- 0.0 (unreliable) → 1.0 (highly trusted)
  category TEXT NOT NULL,            -- academic | journal | government | news | …
  bias TEXT NOT NULL,                -- none | center | center-left | center-right | extreme
  factual TEXT NOT NULL,             -- very-high | high | mixed | low | very-low
  description TEXT,
  updated_at TEXT,
  created_at TEXT
)

-- Cached verification results (TTL: 1 hour)
verification_cache (
  url TEXT PRIMARY KEY,
  result_json TEXT NOT NULL,
  created_at TEXT
)

-- Community misinfo reports
community_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  claim_text TEXT,
  report_type TEXT NOT NULL,
  details TEXT,
  reporter_id TEXT DEFAULT 'anonymous',
  created_at TEXT
)
```

**Indexes:** `idx_reports_domain`, `idx_reports_url`, `idx_cache_created`

---

## Source Reputation Seed Data

The migration seeds the following domain categories:

| Category | Examples | Score Range |
|----------|----------|-------------|
| Scientific journals | `nature.com`, `nejm.org`, `science.org` | 0.96 |
| Academic | `arxiv.org`, `pubmed.ncbi.nlm.nih.gov` | 0.95 |
| Wire services | `apnews.com`, `reuters.com` | 0.91–0.93 |
| Fact-checkers | `snopes.com`, `politifact.com` | 0.90 |
| Government | `nasa.gov`, `cdc.gov`, `nih.gov` | 0.92 |
| Reference | `wikipedia.org`, `britannica.com` | 0.88 |
| Quality news | `bbc.com`, `nytimes.com`, `ft.com` | 0.80–0.86 |
| Tech docs | `developer.mozilla.org`, `stackoverflow.com` | 0.85 |
| Social media | `twitter.com`, `reddit.com` | 0.30 |
| Low credibility | `infowars.com`, `naturalnews.com` | 0.15 |

TLD fallbacks: `.gov` → 0.88, `.edu` → 0.85, `.org` → 0.60

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Apply D1 migrations (local)
wrangler d1 migrations apply blackroad-verification --local

# Start local dev server
pnpm dev
# Worker available at http://localhost:8787

# Generate TypeScript types
pnpm types
```

---

## Configuration

**`wrangler.toml`**

```toml
name = "blackroad-verification-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "blackroad-verification"
database_id = "e781869d-962c-459d-91c3-f0edbf111815"

[observability]
enabled = true
```

**CORS origins:** `http://localhost:1420`, `https://internet.blackroad.io`, `https://search.blackroad.io`

---

## Directory Structure

```
workers/verification-api/
├── package.json
├── tsconfig.json
├── wrangler.toml
├── migrations/
│   └── 0001_init.sql      ← D1 schema + seed data (110+ domains)
└── src/
    ├── index.ts            ← App entry, CORS, route mounting
    └── routes/
        ├── reputation.ts   ← GET /reputation/:domain, POST /reputation/batch
        ├── verify.ts       ← POST /verify, GET /verify/status
        └── reports.ts      ← POST /reports, GET /reports, GET /reports/stats
```

---

## Deployment

```bash
# Apply migrations to production D1
wrangler d1 migrations apply blackroad-verification

# Deploy to Cloudflare Workers
pnpm deploy

# Tail live logs
wrangler tail
```
