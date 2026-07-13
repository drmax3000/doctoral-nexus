# node/[id].tsx Overrides

> Rules here override/extend `MASTER.md`. Only deviations are documented.

- Largest/most complex screen (833 lines) — local `const C` matches `MASTER.md` on every shared key, plus two screen-specific tokens not needed elsewhere: `dock` (`rgba(13,17,32,0.97)`, near-opaque mobile bottom-sheet background) and `inputBg` (`rgba(5,6,14,0.65)`) — both promoted into `MASTER.md`'s table since they're legitimate, reusable surface variants, not one-off drift.
- `DIMENSIONS` const here already agrees with `observations.tsx` — migrating to `<DimensionBadge>` is a mechanical swap, not a value change, unlike `explore.tsx`.
- Responsive split (`WIDE_BREAKPOINT = 920`, `useWindowDimensions`) — extract into `useResponsiveBreakpoint()` hook during this migration (Phase 4.5), reusable groundwork for the deferred web-export phase.
- Exam-traps/quiz deck (`cert-review.tsx`) and AI-suggestions/relationships cards reuse the same `<Card>` primitive as every other screen — no bespoke styling needed once the primitive exists.
- Defensive `typeof x === 'object' ? JSON.stringify(x) : x` casts in JSX (found during exploration) are a data-typing issue upstream, not a design-system concern — explicitly out of scope for this migration.
