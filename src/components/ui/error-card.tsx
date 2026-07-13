import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

type ErrorCardProps = {
  title?: string;
  message: string;
  style?: StyleProp<ViewStyle>;
};

export function ErrorCard({ title = '⚠ Connection error', message, style }: ErrorCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(251, 113, 133, 0.08)',
    borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.35)',
    borderRadius: 16, padding: 16,
  },
  title: { color: Colors.dark.rose, fontWeight: '800', fontSize: 14, marginBottom: 4, letterSpacing: 0.5 },
  message: { color: Colors.dark.text, fontSize: 13, lineHeight: 20 },
});
