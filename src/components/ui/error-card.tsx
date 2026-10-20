import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

type ErrorCardProps = {
  title?: string;
  message: string;
  style?: StyleProp<ViewStyle>;
  /** Auditoria Codex: el boton solo aparece si se pasa onRetry — call-sites
   *  existentes que no lo pasan siguen igual, cero cambio visual. */
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  retrying?: boolean;
};

export function ErrorCard({
  title = '⚠ Connection error', message, style, onRetry, retryLabel = 'Retry', retrying = false,
}: ErrorCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Pressable
          accessibilityRole="button"
          disabled={retrying}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            retrying && styles.retryButtonDisabled,
            pressed && !retrying && styles.retryButtonPressed,
          ]}
        >
          <Text style={styles.retryText}>{retrying ? 'Retrying…' : retryLabel}</Text>
        </Pressable>
      )}
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
  retryButton: {
    alignSelf: 'flex-start', marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.5)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  retryButtonDisabled: { opacity: 0.5 },
  retryButtonPressed: { backgroundColor: 'rgba(251, 113, 133, 0.1)' },
  retryText: { color: Colors.dark.rose, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
});
