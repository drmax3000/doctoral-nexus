# explore.tsx Overrides

> Rules here override/extend `MASTER.md`. Only deviations are documented.

- **Status:** kept per user decision, migrated now alongside `_layout.tsx` (Phase 4.1), navigation/reachability unchanged (still not wired into the live tab bar).
- **This is the file that caused the dimension-color conflict** — its inline ternary (THEORETICAL blue `#3b82f6`, METHODOLOGICAL amber `#f59e0b`, EMPIRICAL green `#10b981`, ANALYTICAL purple `#a855f7`) must be replaced with `<DimensionBadge>` (Phase 3), not just re-themed with new hex — the whole inline color-selection logic goes away, not just its palette.
- **Full palette replacement, not partial:** every other color in this file (`#020617`, `#0f172a`, `#1e293b`, `#06b6d4`, `#94a3b8`, `#ef4444`, `#64748b`) is the Tailwind-slate set rejected in `MASTER.md` — swap wholesale to the `#05060E`/`surface`/`line` family, not blended with the old set.
- **Emoji icons** (📄 💡 🟢 ⚠️) — replace with `expo-symbols` to match the rest of the app (Master file's "Icons" section); this screen is the only one still using literal emoji.
- **No serif headers today** (every other screen uses the `SERIF` heading font) — add `Fonts.serif` from the Phase 2 `theme.ts` to headers here so it visually matches the rest of the app once reachable.
- **KnowledgeGraph SVG component** (`src/components/knowledge-graph.tsx`) is out of scope for Phase 4.1 — it has its own 29 hex literals and a separate `BOOK_PALETTE`/`GENERAL_PALETTE`; note it here as a known follow-up, not fixed in this pass (it doesn't block the dimension-color bug fix, which lives in `explore.tsx` itself, not the graph viz).
