import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { Colors } from '@/constants/theme';

type CardProps = ViewProps & { elevated?: boolean };

export function Card({ elevated = false, style, ...rest }: CardProps) {
  return <View style={[styles.card, elevated && styles.elevated, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    boxShadow: '0px 12px 28px rgba(0, 0, 0, 0.45)',
  },
  elevated: {
    backgroundColor: Colors.dark.surfaceHi,
  },
});
