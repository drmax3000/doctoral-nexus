# Design System Master File — Doctoral Nexus

> **LOGIC:** When building/migrating a specific screen, first check `design-system/doctoral-nexus/pages/[screen-name].md`.
> If that file exists, its notes **override/extend** this Master file.
> If not, follow the rules below.

---

**Project:** doctoral-nexus
**Category:** Doctoral research knowledge-management app (dark-mode-primary, native RN/Expo)
**Generated:** Phase 0 of the design-system overhaul, 2026-07-13

**Provenance note:** these tokens are *not* the literal output of `ui-ux-pro-max`'s `--design-system` auto-generator. A test run of that generator picked an "App Store Style Landing" PATTERN (marketing page sections — irrelevant to an installed app's screens) and invented colors unrelated to the app. Instead, this file **locks in the palette the app's own screens already mostly agree on**, resolving the few places they didn't, and cites `ui-ux-pro-max`'s `ux`/`react-native`/`color` domain searches only for precedent and a verification checklist.

---

## Global Rules

### Color Palette

Verified by reading the `const C = {...}` blocks in all 4 "Nexus Dark" screens (`index.tsx`, `node/[id].tsx`, `observations.tsx`, `review.tsx`) — these already agree on every surface/text token below; nothing here is invented.

| Role | Hex / Value | CSS-equivalent var | Source |
|------|-----|--------------|--------|
| Background | `#05060E` | `--color-background` | Agreed 4/4 screens |
| Surface (card, glass) | `rgba(16, 21, 38, 0.72)` | `--color-surface` | Agreed 4/4 screens |
| Surface elevated | `rgba(24, 31, 54, 0.85)` | `--color-surface-hi` | Agreed where used (index, observations) |
| Dock (mobile bottom sheet) | `rgba(13, 17, 32, 0.97)` | `--color-dock` | node/[id] only — needs near-opaque bg over text |
| Input background | `rgba(5, 6, 14, 0.65)` | `--color-input-bg` | node/[id], observations |
| Hairline / border | `rgba(148, 163, 184, 0.10)` | `--color-border` | Agreed 4/4 screens |
| Border, focused | `rgba(167, 139, 250, 0.55)` | `--color-border-focus` | index only today — promote to global |
| Text (primary) | `#F4F6FB` | `--color-text` | Agreed 4/4 screens |
| Text (dim/secondary) | `#8A94AD` | `--color-text-dim` | Agreed 4/4 screens |
| Text (faint/tertiary) | `#586176` | `--color-text-faint` | Agreed 4/4 screens |
| Accent — violet (primary/knowledge) | `#A78BFA` | `--color-violet` | Agreed 4/4 screens — most consistent color in the app |
| Accent — violet deep | `#7C5CE0` | `--color-violet-deep` | index, node/[id] |
| Accent — cyan (secondary/synthesis) | `#67E8F9` | `--color-cyan` | Agreed 3/4 screens (review.tsx doesn't need it) |
| Accent — emerald | `#34D399` | `--color-emerald` | index only today — promote to global (needed for DIMENSION_META) |
| Accent — rose (destructive/contradiction) | `#FB7185` | `--color-rose` | index, node/[id] — matches `relations.ts`'s `contradicts` color exactly |
| Accent — amber (dimension: analytical) | `#FBBF24` | `--color-amber` | Used in node/[id] `DIMENSIONS` const for ANALYTICAL |

**Two distinct ambers exist on purpose, do not merge them:** `#FBBF24` is the *dimension* amber (ANALYTICAL, 7D framework). `#F59E0B` is the *content-type* amber (`CONTENT_TYPE_META.certification`, also reused loosely as `review.tsx`'s local `amber`). They read close but serve different semantic roles (a dimension vs. a content-type badge) — keep both as named tokens, don't collapse to one.

**Reject:** `explore.tsx`'s Tailwind-slate/emoji palette (`#020617`, `#0f172a`, `#1e293b`, `#06b6d4`, etc.) — this is the file that disagreed with the rest of the app; it gets migrated onto the table above in Phase 4.1, not preserved.

### Semantic appendix (unchanged — already centralized, just documented here)

**7D Dimensions** (`DIMENSION_META`, to be added to `theme.ts` in Phase 2 — currently redeclared 3x with the 3rd copy, `explore.tsx`, using conflicting values):

| Dimension | Color | Source of truth (post-Phase 2) |
|---|---|---|
| THEORETICAL | `#A78BFA` (violet) | `theme.ts` `getDimensionMeta()` |
| METHODOLOGICAL | `#67E8F9` (cyan) | `theme.ts` `getDimensionMeta()` |
| EMPIRICAL | `#34D399` (emerald) | `theme.ts` `getDimensionMeta()` |
| ANALYTICAL | `#FBBF24` (amber) | `theme.ts` `getDimensionMeta()` |

**Content types** (`src/constants/content-types.ts` — `CONTENT_TYPE_META`, already correct, unchanged):

| Type | Color | BG tint |
|---|---|---|
| doctoral | `#A78BFA` | `rgba(167, 139, 250, 0.10)` |
| certification | `#F59E0B` | `rgba(245, 158, 11, 0.12)` |
| general | `#4FB0A0` | `rgba(79, 176, 160, 0.12)` |

**Vendors** (`VENDOR_META`, unchanged): aws `#FF9900` · azure `#36A3FF` · gcp `#34A853`

**Relations** (`src/constants/relations.ts` — `RELATION_META`, unchanged): similar `#67E8F9` · contradicts `#FB7185` · builds_on `#A78BFA` · custom `#8A94AD` · confusable_with `#FF5C77` · exam_related `#FFD166` · cites `#C4B5FD`

**Note for Phase 2:** `content-types.ts`/`relations.ts` currently hold these as independent literals that happen to match `theme.ts`'s new tokens (violet, rose/contradicts, cyan/similar). Phase 2 should have them import the shared hex constants from `theme.ts` instead of re-declaring the literal, wherever the value is identical — this is what makes the "single source of truth" claim actually true instead of coincidental agreement.

### Typography

**Locked decision — do NOT adopt `ui-ux-pro-max`'s suggested Google Fonts (Crimson Pro / Atkinson Hyperlegible).** That pairing scored well for "academic/scholarly/readable" mood, but bundling two new Google Fonts means shipping font files + `expo-font` loading — directly working against the user's "cargue lento" (slow load) concern and the zero-new-dependencies guardrail. Instead:

- **Heading / reading font:** keep the existing `SERIF` constant already used in `node/[id].tsx` and duplicated across screens — `Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' })`. Zero-cost (system fonts only). Promote this single declaration into `theme.ts` as `Fonts.serif` so the 4 duplicate copies collapse into one import.
- **Body / UI font:** system default sans (`system-ui` / Roboto / OS default) — already implicit in the app via no explicit `fontFamily` override on most `Text` elements. Make this explicit as `Fonts.sans` in `theme.ts` for consistency, still zero-cost.
- **Mono (code/data):** `Menlo` (iOS) / `monospace` (Android/web) — already used ad hoc in `node/[id].tsx`'s markdown code blocks; promote to `Fonts.mono`.

### Spacing

Keep the existing `Spacing` scale from `theme.ts` (`half:2, one:4, two:8, three:16, four:24, five:32, six:64`) — it isn't part of the drift problem (only the 275 raw literals bypassing it are). No change to the scale itself in Phase 2; screens adopt it during Phase 4 migration instead of their own magic numbers.

### Effects

- "Glass card": `surface`/`surfaceHi` backgrounds + 1px `line` (hairline border) + `borderRadius` (12–16px range, per existing screens) + soft `boxShadow`. Stays hand-rolled (see Phase 6 performance guardrails — no `expo-glass-effect`).
- Focus/active states: `lineFocus` (`rgba(167, 139, 250, 0.55)`) as border color — currently only in `index.tsx`, promote to shared `<Card>`/`<DimensionBadge>` press/focus states.
- No new glow/shadow effects beyond what's already shipped — `ui-ux-pro-max`'s "Dark Mode OLED" style notes (excellent performance, WCAG AAA achievable) validate keeping the current minimal-glow approach rather than adding new decorative effects.

### Icons

Replace hand-picked Unicode glyphs (⌂ ◈ ◇ used for tabs, ✧ ⚠ ⛓ used inline) with `expo-symbols` (already installed, currently unused — zero new dependency). Scope: `_layout.tsx` tab icons first (Phase 4.1); inline glyphs in body copy (✧ AI suggestions, etc.) are decorative/copy — leave as-is unless they're literal interactive icons.

---

## Pre-Delivery Checklist (adapted for native RN, not the generic web checklist)

- [ ] Dimension colors identical across `node/[id].tsx`, `observations.tsx`, `explore.tsx` (the regression this whole effort exists to fix)
- [ ] All `FlatList` usages keep stable `keyExtractor` + memoized `renderItem` (no regression from new `<Card>`/`<EmptyState>` wrappers)
- [ ] No new `Context`/`Provider` introduced for theme — tokens stay static module imports
- [ ] Touch targets ≥ 44×44pt (iOS) / 48×48dp (Android) on all interactive elements, including new `expo-symbols` tab icons
- [ ] Text contrast ≥ 4.5:1 against `#05060E`/`surface` backgrounds (verify `textFaint` `#586176` on `surface` — this is the tightest pairing in the palette, check it explicitly)
- [ ] No new dependencies added to `package.json`
- [ ] `npm run lint` clean after each screen migration
- [ ] Dev-server manual check per screen (`run` skill) before moving to the next

---

## Reference material (ui-ux-pro-max citations, precedent only — not adopted verbatim)

- Style precedent: "Dark Mode (OLED)" — Performance: Excellent, Accessibility: WCAG AAA achievable. Validates staying dark-only rather than investing in light mode this phase.
- Color structure precedent (not values): "Photo Editor & Filters" palette (`colors.csv`) — `background #0F172A`, `card #192134`, `mutedForeground #94A3B8`, `border rgba(255,255,255,0.08)` — structurally similar to our surface/border/muted-text shape, confirms the existing app's token shape (surface tint + low-alpha hairline border + muted-foreground tier) is a sound, common pattern, not idiosyncratic.
- `react-native` stack guidelines cited for Phase 6/7 verification: "Use FlatList for long lists" (High), "Optimize renderItem" (High, memoize list items), "Use React.memo" (Medium), "Use useCallback for handlers" (Medium), "Use useMemo for expensive ops" (Medium), "Avoid anonymous functions in JSX" (Medium), "Use Reanimated" for gesture-driven animation only, not a blanket replacement of the `Animated` API (Medium — "Animated API for complex" is the anti-pattern, not Animated API itself).
