import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

/* Skeleton loading (auditoria Codex paso 6): reemplaza el spinner generico
   mientras carga por placeholders del mismo ritmo/alto que el contenido
   real. Shimmer via Animated.loop de opacidad — sin libreria nueva. */
function useShimmer() {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return opacity;
}

type SkeletonProps = { style?: StyleProp<ViewStyle> };

/** Bloque base — un rectangulo shimmer, componelo con estilos propios. */
export function Skeleton({ style }: SkeletonProps) {
  const opacity = useShimmer();
  return <Animated.View style={[styles.block, style, { opacity }]} />;
}

/** Forma de tarjeta de nodo (index.tsx / review.tsx). */
export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton style={styles.eyebrow} />
      <Skeleton style={styles.titleLine} />
      <Skeleton style={styles.titleLineShort} />
      <View style={styles.footerRow}>
        <Skeleton style={styles.tag} />
        <Skeleton style={styles.tag} />
      </View>
    </View>
  );
}

/** Fila simple (historial de observaciones, listas angostas). */
export function ListRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton style={styles.rowRail} />
      <View style={styles.rowBody}>
        <Skeleton style={styles.titleLine} />
        <Skeleton style={styles.titleLineShort} />
      </View>
    </View>
  );
}

/** Repite una de las formas de arriba — `count` tarjetas/filas fantasma. */
export function SkeletonList({ count = 4, variant = 'card' }: { count?: number; variant?: 'card' | 'row' }) {
  const Item = variant === 'card' ? CardSkeleton : ListRowSkeleton;
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, i) => <Item key={i} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: Colors.dark.surfaceHi, borderRadius: 8 },
  list: { paddingHorizontal: 20, paddingTop: 6, gap: 16 },
  card: {
    backgroundColor: Colors.dark.surface, borderRadius: 22, padding: 20,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  row: {
    flexDirection: 'row', backgroundColor: Colors.dark.surface, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.dark.border, overflow: 'hidden',
  },
  rowRail: { width: 3, borderRadius: 0 },
  rowBody: { flex: 1, padding: 18, gap: 10 },
  eyebrow: { width: '40%', height: 10, marginBottom: 14 },
  titleLine: { width: '90%', height: 18, marginBottom: 8 },
  titleLineShort: { width: '60%', height: 18 },
  footerRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  tag: { width: 70, height: 20, borderRadius: 10 },
});
