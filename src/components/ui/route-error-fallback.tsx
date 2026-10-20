import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import { reportError } from '@/constants/sentry';

type RouteErrorFallbackProps = {
  error: Error;
  retry: () => Promise<void>;
  /** false en el boundary raiz de _layout.tsx: ahi no hay una Library segura a la que volver. */
  showBackToLibrary?: boolean;
};

/* UI compartida para los ErrorBoundary de ruta que exporta cada pantalla
   (auditoria Codex EH-01, nivel 2 — "pantalla"): Expo Router envuelve cada
   archivo de src/app/ en su propio Try y le pasa {error, retry} si el
   archivo exporta ErrorBoundary. retry() re-renderiza la ruta limpiando el
   error, sin perder la tab bar ni la navegacion. */
export function RouteErrorFallback({ error, retry, showBackToLibrary = true }: RouteErrorFallbackProps) {
  const router = useRouter();

  // Solo se reportan errores que llegaron hasta un boundary (bugs reales de
  // render) -- los AppError de useAsync (backend caido, 404, etc.) ya tienen
  // su propia UI (ErrorCard) y nunca pasan por aca.
  useEffect(() => { reportError(error); }, [error]);

  return (
    <View style={styles.container}>
      <Text style={styles.glyph}>⚠</Text>
      <Text style={styles.title}>Something broke on this screen</Text>
      <Text style={styles.message}>{error.message || 'Unexpected error.'}</Text>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
        onPress={() => retry()}
      >
        <Text style={styles.retryText}>RETRY</Text>
      </Pressable>

      {showBackToLibrary && (
        <Pressable hitSlop={12} onPress={() => router.replace('/')}>
          <Text style={styles.backLink}>← Back to Library</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.dark.background,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 6,
  },
  glyph: { fontSize: 32, color: Colors.dark.rose, marginBottom: 10 },
  title: {
    color: Colors.dark.text, fontSize: 20, fontFamily: Fonts.serif,
    textAlign: 'center', marginBottom: 6,
  },
  message: { color: Colors.dark.textDim, fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 22 },
  retryButton: {
    borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.5)',
    borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12,
    marginBottom: 20,
  },
  retryButtonPressed: { backgroundColor: 'rgba(251, 113, 133, 0.1)' },
  retryText: { color: Colors.dark.rose, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  backLink: { color: Colors.dark.textDim, fontSize: 13, fontWeight: '600' },
});
