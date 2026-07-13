/**
 * Design-token source of truth for Doctoral Nexus.
 * Locked in `design-system/doctoral-nexus/MASTER.md` (Phase 0 of the design-system
 * overhaul) — that file documents provenance/rationale, this file is the export surface.
 */

import { Platform } from 'react-native';

export const Colors = {
  dark: {
    background: '#05060E',
    surface: 'rgba(16, 21, 38, 0.72)',
    surfaceHi: 'rgba(24, 31, 54, 0.85)',
    dock: 'rgba(13, 17, 32, 0.97)',
    inputBg: 'rgba(5, 6, 14, 0.65)',
    border: 'rgba(148, 163, 184, 0.10)',
    borderFocus: 'rgba(167, 139, 250, 0.55)',
    text: '#F4F6FB',
    textDim: '#8A94AD',
    textFaint: '#586176',
    violet: '#A78BFA',
    violetDeep: '#7C5CE0',
    cyan: '#67E8F9',
    emerald: '#34D399',
    rose: '#FB7185',
    amber: '#FBBF24',
  },
  // Not design-invested — light mode isn't in scope for this pass. Kept only so
  // `ThemeColor` stays a real intersection type and app.json's automatic
  // userInterfaceStyle has somewhere valid to resolve to.
  light: {
    background: '#ffffff',
    surface: '#F0F0F3',
    border: '#E0E1E6',
    text: '#000000',
    textDim: '#60646C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

const DIMENSION_META = {
  THEORETICAL: { label: 'Theoretical', color: Colors.dark.violet },
  METHODOLOGICAL: { label: 'Methodological', color: Colors.dark.cyan },
  EMPIRICAL: { label: 'Empirical', color: Colors.dark.emerald },
  ANALYTICAL: { label: 'Analytical', color: Colors.dark.amber },
} as const;

export type DimensionKey = keyof typeof DIMENSION_META;

/**
 * The one place that knows how a 7D dimension maps to a label/color. Screens call
 * this (or, more commonly, render `<DimensionBadge dimension={...} />`) instead of
 * each re-declaring the same lookup — that duplication is what let `explore.tsx`
 * drift onto a different palette than every other screen.
 */
export function getDimensionMeta(dimension: string) {
  return DIMENSION_META[dimension as DimensionKey] ?? DIMENSION_META.THEORETICAL;
}

export const Fonts = {
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia, "Times New Roman", serif',
  }),
  sans: Platform.select({
    ios: 'system-ui',
    android: 'sans-serif',
    default: 'system-ui, -apple-system, sans-serif',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
