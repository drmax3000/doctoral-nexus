# observations.tsx Overrides

> Rules here override/extend `MASTER.md`. Only deviations are documented.

- Local `const C` already agrees with `MASTER.md` on every value it declares (bg/surface/surfaceHi/inputBg/line/text/textDim/textFaint/violet/cyan) — this is a pure import swap, no value changes.
- Local `DIMENSIONS` const (with extra `tint`/`border`/`hint` fields beyond `node/[id].tsx`'s copy) → replace entirely with `<DimensionBadge>`. If the picker UI needs the `tint`/`border`/`hint` treatment for a "selected" state, that styling logic belongs inside `<DimensionBadge>`'s own selected-state prop, not re-derived per screen.
- Editor card (textarea + dimension picker + save button) and history list are the two structural pieces — apply `<Card>` to both, `<EmptyState>` to the empty history case, `<Loader>` to the initial fetch.
