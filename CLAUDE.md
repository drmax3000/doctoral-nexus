@AGENTS.md

---

# Doctoral Nexus Mobile App

Guidance for the Expo app. Loads only when working under this directory — the repo-root
`CLAUDE.md` holds the cross-cutting constraints that apply everywhere.

## Quick Start

**Prerequisites:** Node.js 18+, npm 9+

```bash
# Start the Expo dev server (displays QR code for mobile scanning or press 'w' for web)
npm start

# Platform-specific builds
npm run ios          # Launch iOS simulator
npm run android      # Launch Android emulator
npm run web          # Open web version (responsive split-view UI at width > 920px)

# Knowledge ingestion (processes markdown from ./conocimientos → SQLite database)
npm run ingest

# Linting
npm run lint

# Reset project to clean state
npm run reset-project
```

**Database Location:** `./src/server/db.js` manages a local SQLite database
(`data/nexus.db`) with WAL (Write-Ahead Logging) and FTS5 (full-text search) enabled for
offline-ready operation.

## Ingesting New Knowledge

1. Place markdown files in `./conocimientos/` (or custom path)
2. Run `npm run ingest` — parses frontmatter, splits by headings, calculates hashes
3. Upserts to SQLite (idempotent via SHA-1)
4. Changes reflected in app on next startup

### Idempotency contract

The `ingest_knowledge.js` script:
- Reads all `.md` and `.txt` files from `./conocimientos/`
- Parses YAML-lite frontmatter (no external dependencies)
- Splits sections by `##` headings (minsize: 400 chars)
- Calculates SHA-1 hash of content
- Only upserts if hash differs (version increments on change)

**Key Implication:** ingestion can be re-run safely without duplicating data.
