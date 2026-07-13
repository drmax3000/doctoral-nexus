# index.tsx ("Library") Overrides

> Rules here override/extend `MASTER.md`. Only deviations are documented.

- Highest-traffic screen (532 lines) — local `const C` is the fullest set and matches `MASTER.md` exactly, including `surfaceHi` and `lineFocus` (the two tokens only this screen uses today, now promoted to the shared table).
- `NodeCard`'s `Animated.spring` press-scale (lines ~49-58) is the one candidate for an opportunistic Reanimated swap (Phase 6: only if same-shape, `useSharedValue`/`useAnimatedStyle` 1:1 replacement — do not add gesture features).
- FlatList of node cards + search + filter chips + stats header — apply `<Card>` to node cards, `<EmptyState>` to `renderEmptyState`, `<Loader>` to initial fetch, keep `keyExtractor`/memoization intact (Phase 6 guardrail — this is the screen where a virtualization regression would be most visible).
- Known out-of-scope follow-up (user-flagged, not part of this visual pass): the note/annotation list itself lacks structure/categorization beyond the dimension filter chips — noted for later iteration, not a Phase 4.4 deliverable.
