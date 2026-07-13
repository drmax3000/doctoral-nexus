import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';

type LoaderProps = {
  label?: string;
  color?: string;
  /** true (default): flex:1, fills the remaining screen — for a full-screen loading state.
   *  false: sits inline inside a ScrollView without claiming the whole viewport. */
  fill?: boolean;
};

export function Loader({ label, color = Colors.dark.violet, fill = true }: LoaderProps) {
  return (
    <View style={[styles.container, fill && styles.fill]}>
      <ActivityIndicator size="large" color={color} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  fill: { flex: 1, paddingVertical: 0 },
  label: { color: Colors.dark.textDim, marginTop: 18, fontWeight: '700', fontSize: 11, letterSpacing: 3 },
});
