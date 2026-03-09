# @blackroad/search-api

Cloudflare Worker that powers BlackRoad Internet's search results — fetching from Brave Search and re-ranking every result using the BlackRoad accuracy formula.

---

## Table of Contents

1. [Overview](#overview)
2. [Ranking Formula](#ranking-formula)
3. [Endpoints](#endpoints)
   - [GET /](#get-)
   - [GET /health](#get-health)
   - [GET /search](#get-search)
   - [POST /enrich](#post-enrich)
   - [GET /reputation/:domain](#get-reputationdomain)
4. [Getting Started](#getting-started)
5. [Configuration](#configuration)
6. [Directory Structure](#directory-structure)
7. [Deployment](#deployment)

---

## Overview

`@blackroad/search-api` is a [Cloudflare Worker](https://workers.cloudflare.com/) built with [Hono](https://hono.dev/). It has two operating modes:

- **Full search** (`GET /search`) — Fetches results from the [Brave Search API](https://brave.com/search/api/) and re-ranks them using domain reputation scores from the Verification API.
- **Enrich mode** (`POST /enrich`) — Accepts a client-side result set (e.g., from a scrape) and applies the same ranking formula without calling Brave. Useful when `BRAVE_API_KEY` is not configured.

---

## Ranking Formula

```
final_score = 0.4 × Relevance
            + 0.3 × Accuracy
            + 0.2 × SourceReputation
            + 0.1 × Freshness
```

| Component | Source |
|-----------|--------|
| **Relevance** | Position in raw Brave results (linear decay) |
| **Accuracy** | Domain reputation score from Verification API (0–1) |
| **SourceReputation** | Same as Accuracy (same lookup) |
| **Freshness** | Derived from the result's `age` string (hours → years) |

Results are sorted descending by `final_score` before being returned.

---

## Endpoints

### `GET /`

Returns service metadata and available endpoints.

**Response**

```json
{
  "service": "BlackRoad Search API",
  "version": "0.1.0",
  "status": "operational",
  "ranking": "0.4*Relevance + 0.3*Accuracy + 0.2*SourceReputation + 0.1*Freshness",
  "endpoints": {
    "search": "GET /search?q=query&limit=20",
    "enrich": "POST /enrich",
    "reputation": "GET /reputation/:domain"
  }
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

### `GET /search`

Fetch and rank web search results.

**Query Parameters**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | ✅ | — | Search query |
| `limit` | number | ❌ | `20` | Max results to return (capped at 50) |

**Response**

```json
{
  "query": "climate change",
  "results": [
    {
      "title": "...",
      "url": "https://...",
      "description": "...",
      "domain": "nasa.gov",
      "relevance_score": 0.95,
      "accuracy_score": 0.92,
      "source_reputation": 0.92,
      "freshness_score": 0.90,
      "final_score": 0.93,
      "source_category": "government",
      "source_bias": "none"
    }
  ],
  "total": 20,
  "search_time_ms": 312,
  "engine": "brave",
  "ranking_formula": "0.4*Relevance + 0.3*Accuracy + 0.2*SourceReputation + 0.1*Freshness"
}
```

> **Note:** When `BRAVE_API_KEY` is not set, returns an empty `results` array with a `fallback_url` pointing to DuckDuckGo.

---

### `POST /enrich`

Re-rank a caller-supplied result set using the BlackRoad formula.

**Request Body**

```json
{
  "query": "climate change",
  "results": [
    { "title": "...", "url": "https://...", "description": "..." }
  ]
}
```

**Response** — same shape as `GET /search`.

---

### `GET /reputation/:domain`

Proxy to the Verification API's reputation lookup.

**Path Parameter**

| Parameter | Description |
|-----------|-------------|
| `domain` | Hostname to look up, e.g. `nasa.gov` |

**Response**

```json
{
  "found": true,
  "domain": "nasa.gov",
  "score": 0.92,
  "category": "government",
  "bias": "none",
  "factual": "very-high"
}
```

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start local dev server (wrangler)
pnpm dev
# Worker available at http://localhost:8787

# Set Brave Search API key as a secret (optional)
wrangler secret put BRAVE_API_KEY

# Generate TypeScript types from wrangler bindings
pnpm types
```

---

## Configuration

**`wrangler.toml`**

```toml
name = "blackroad-search-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[vars]
ENVIRONMENT = "production"

[[services]]
binding = "VERIFICATION_API"
service = "blackroad-verification-api"

[observability]
enabled = true
```

**Secrets** (set via `wrangler secret put`):

| Secret | Description |
|--------|-------------|
| `BRAVE_API_KEY` | [Brave Search API](https://brave.com/search/api/) subscription token |

---

## Directory Structure

```
workers/search-api/
├── package.json
├── tsconfig.json
├── wrangler.toml
└── src/
    └── index.ts     ← All routes, ranking logic, Brave integration
```

---

## Deployment

```bash
# Deploy to Cloudflare Workers
pnpm deploy

# Tail live logs
wrangler tail
```

The worker is deployed globally across Cloudflare's edge network. No region configuration is required.
