# review.tsx Overrides

> Rules here override/extend `MASTER.md`. Only deviations are documented.

- Local `const C` is the smallest subset (no `cyan`/`emerald`/`rose`/`lineFocus`/`dock`, adds `amber: '#F59E0B'`) — pure import swap; the local `amber` maps to `MASTER.md`'s *content-type* amber (`CONTENT_TYPE_META.certification.color`), not the *dimension* amber — keep that distinction when migrating (see MASTER.md's "two ambers" note).
- FlatList queue cards + vendor filter chips — same `<Card>`/`<EmptyState>`/`<Loader>` treatment as `observations.tsx`; this screen is the second FlatList proof point before `index.tsx`.
- No dimension picker here (cert-mode screen, vendor-filtered not dimension-filtered) — `<DimensionBadge>` isn't used on this screen; `VENDOR_META` badges are (already centralized, no change needed).
