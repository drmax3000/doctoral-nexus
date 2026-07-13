import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors, getDimensionMeta } from '@/constants/theme';

type DimensionBadgeProps = {
  dimension: string;
  /** 'badge' (default): compact read-only pill for cards/lists/history rows.
   *  'picker': larger selectable row-item, used by the observation-editor dimension selector. */
  variant?: 'badge' | 'picker';
  /** 'badge': full color vs. dimmed. 'picker': active vs. inactive selection state. */
  selected?: boolean;
  /** Only rendered in 'picker' variant. */
  hint?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * The single place that knows how a 7D dimension key maps to a label/color —
 * every screen renders this instead of re-declaring its own DIMENSIONS lookup.
 */
export function DimensionBadge({
  dimension, variant = 'badge', selected = true, hint, onPress, style,
}: DimensionBadgeProps) {
  const meta = getDimensionMeta(dimension);

  if (variant === 'picker') {
    const Wrapper = onPress ? Pressable : View;
    return (
      <Wrapper
        onPress={onPress}
        style={[
          styles.picker,
          {
            borderColor: selected ? meta.color : Colors.dark.border,
            backgroundColor: selected ? withAlpha(meta.color, 0.12) : 'transparent',
          },
          style,
        ]}
      >
        <View style={[styles.dot, { backgroundColor: meta.color, opacity: selected ? 1 : 0.35 }]} />
        <View style={styles.pickerTextWrap}>
          <Text style={[styles.pickerLabel, selected && { color: meta.color }]}>
            {meta.label.toUpperCase()}
          </Text>
          {hint ? <Text style={styles.pickerHint}>{hint}</Text> : null}
        </View>
      </Wrapper>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: withAlpha(meta.color, 0.10), borderColor: withAlpha(meta.color, 0.35), opacity: selected ? 1 : 0.5 },
        style,
      ]}
    >
      <View style={[styles.dot, styles.badgeDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.badgeLabel, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
    </View>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start',
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  picker: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  pickerTextWrap: { flex: 1 },
  pickerLabel: { color: Colors.dark.textDim, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  pickerHint: { color: Colors.dark.textFaint, fontSize: 11, fontWeight: '500', marginTop: 2 },
});
