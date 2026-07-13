import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

type EmptyStateProps = {
  glyph?: string;
  /** Defaults to the violet knowledge accent — override for screens with a different context color (e.g. certification amber). */
  accentColor?: string;
  title: string;
  description?: string;
  /** Action chips/buttons below the description (e.g. index.tsx's tap-to-search suggestions). */
  children?: React.ReactNode;
};

export function EmptyState({ glyph = '◌', accentColor = Colors.dark.violet, title, description, children }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.glyph, { color: accentColor }]}>{glyph}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 16 },
  glyph: { fontSize: 40, marginBottom: 14, opacity: 0.7 },
  title: {
    color: Colors.dark.text, fontSize: 20, fontFamily: Fonts.serif, textAlign: 'center',
    marginBottom: 8, lineHeight: 28,
  },
  description: { color: Colors.dark.textDim, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  actions: { marginTop: 24, alignItems: 'center' },
});
