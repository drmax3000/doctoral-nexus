# _layout.tsx Overrides

> Rules here override/extend `MASTER.md`. Only deviations are documented.

- **Scope:** tab bar (Library/Synthesis/Review) + header chrome for the pushed `node/[id]` screen. Touches every screen indirectly.
- **Known literals to replace (6 total):** `#A78BFA` (violet — already correct, just needs to come from `theme.ts` instead of being inline), `#586176` (textFaint — already correct value), `rgba(16,21,38,0.95)` (near-`surface`, slightly more opaque for header/tab-bar chrome over content — keep as a `surfaceHi`-adjacent value, don't force it to exactly `surfaceHi` if it was chosen deliberately for header contrast), `rgba(148,163,184,0.10)` (== `line`, exact match), `#05060E` (== `background`, exact match), `#F4F6FB` (== `text`, exact match).
- **Icons:** ⌂ (Library) → house/library symbol, ◈ (Synthesis) → pen/notebook symbol, ◇ (Review) → checklist/flashcard symbol, via `expo-symbols`. Pick symbols that read clearly at small tab-bar size — avoid anything requiring color to be legible (a11y: icon shape alone must communicate the tab).
- **No layout change** — this is a token/icon swap only, not a restructure.
