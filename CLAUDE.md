# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP server that exposes SIA UNAL (Sistema de Información Académica, Universidad Nacional de Colombia) academic data through Model Context Protocol tools. Enables Claude to query course info, grades, schedules, and enrollment data.

## Commands

```bash
npm install                        # Install dependencies
npx playwright install chromium    # Required: install browser for scraping
npm run build                      # Compile TypeScript → dist/
npm run dev                        # Watch mode (tsc --watch)
npm start                          # Run compiled server (node dist/index.js)
```

No lint or test scripts are configured. The server communicates via stdio (StdioServerTransport). The package uses ESM (`"type": "module"`), so all imports must use `.js` extensions even for `.ts` source files.

## Architecture

### Two-Tier Data Access

**Public (no auth):** Two paths exist:
- `src/clients/json-rpc-client.ts` — hits SIA's undocumented JSON-RPC search endpoint directly. The *request body* must be built as a raw string (not `JSON.stringify`) because SIA requires unquoted keys in the request format. The response is standard JSON and is parsed normally with `response.json()`.
- `src/clients/catalog-browser.ts` — a separate unauthenticated Playwright browser for navigating the public Oracle ADF catalog UI (dropdowns, search forms).

**Authenticated:** `src/auth/session-manager.ts` manages a singleton Playwright browser that logs in via Oracle Access Manager (OAM). `src/clients/authenticated-client.ts` uses it to scrape Oracle ADF pages for personal academic data. Sessions expire after 20 minutes automatically.

### Request Pipeline

```
Tool call → server.ts → scraper → client/browser → parser → cached result
                       ↑                                    ↓
                  schemas.ts (Zod)              cache-manager.ts (5 min TTL)
                                                rate-limiter.ts (2s delay)
```

### Key Files

- `src/server.ts` — All MCP tool definitions and error handling; start here when adding/modifying tools
- `src/config/constants.ts` — SIA URLs, DOM selectors, level/typology/sede codes; update when SIA changes its UI
- `src/config/schemas.ts` — Zod schemas for all tool parameters
- `src/types/sia.ts` — All domain TypeScript interfaces; extend here when adding data fields
- `src/auth/session-manager.ts` — Login flow and session lifecycle (20-min expiry, singleton pattern)
- `src/clients/catalog-browser.ts` — Unauthenticated Playwright browser for public catalog browsing
- `src/scrapers/` — One file per data source; `course-search.ts` and `course-groups.ts` use `json-rpc-client`, `catalog-browse.ts` uses `catalog-browser.ts`, and `grades.ts`/`schedule.ts`/`enrollment.ts`/`academic-history.ts` use `authenticated-client.ts`
- `src/parsers/` — Transform raw HTML/JSON responses to typed domain models; `adf-table-parser.ts` handles Oracle ADF HTML table patterns using cheerio

### Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `SIA_SEDE` | `medellin` | Campus name: `medellin`, `bogota`, `manizales`, or `palmira`. Does **not** affect the host (all requests go to `sia.unal.edu.co`); only used for sede selection in catalog UI dropdowns. |
| `SIA_USERNAME` | — | Student/staff username |
| `SIA_PASSWORD` | — | Password (never persisted beyond session) |
| `PLAYWRIGHT_HEADLESS` | `true` | Set `false` to debug browser sessions |
| `RATE_LIMIT_DELAY` | `2000` | ms between requests |
| `CACHE_TTL` | `300000` | Cache lifetime in ms (5 min) |

## Development Notes

- **Debugging scraping issues:** Set `PLAYWRIGHT_HEADLESS=false` to watch the browser. Oracle ADF pages load data asynchronously — scrapers use explicit waits for network idle and DOM selectors.
- **JSON-RPC request format:** The SIA search API requires a non-standard request body with unquoted keys. Build the body as a raw string template (see `json-rpc-client.ts`). Do NOT use `JSON.stringify` for the request. Responses are standard JSON.
- **Adding a new tool:** Define the Zod schema in `schemas.ts`, add the tool definition in `server.ts`, create a scraper in `scrapers/`, and a parser in `parsers/` if needed.
- **ADF table parsing:** Oracle ADF generates deeply nested tables with dynamic IDs. Use `adf-table-parser.ts` patterns with cheerio rather than writing new selectors from scratch. Column names fall back to `col_N` when headers are absent.
- **Two Playwright browsers:** `catalog-browser.ts` (public) and `session-manager.ts` (authenticated) each manage their own singleton browser instance. Both are cleaned up on process exit via `src/index.ts`.
