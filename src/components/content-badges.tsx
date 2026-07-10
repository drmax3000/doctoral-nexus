import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  CONTENT_TYPE_META,
  VENDOR_META,
  getContentType,
  getVendor,
} from '@/constants/content-types';

type NodeLike = Parameters<typeof getContentType>[0];

/* Par de badges tipo+vendor para tarjetas y headers de detalle. El badge
   DOCTORAL se omite por defecto (es el caso mayoritario: marcarlo en 68
   tarjetas sería ruido); solo la certificación se señala siempre. */
export function ContentBadges({ node, showDoctoral = false }: { node: NodeLike; showDoctoral?: boolean }) {
  const contentType = getContentType(node);
  const vendor = getVendor(node);
  if (contentType === 'doctoral' && !showDoctoral) return null;

  const meta = CONTENT_TYPE_META[contentType];
  return (
    <View style={styles.row}>
      <View style={[styles.typeBadge, { borderColor: meta.color, backgroundColor: meta.bg }]}>
        <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
      </View>
      {vendor && (
        <View style={[styles.vendorBadge, { borderColor: VENDOR_META[vendor].color }]}>
          <View style={[styles.vendorDot, { backgroundColor: VENDOR_META[vendor].color }]} />
          <Text style={styles.vendorText}>{VENDOR_META[vendor].label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  typeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  vendorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(16, 21, 38, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vendorDot: { width: 6, height: 6, borderRadius: 3 },
  vendorText: { color: '#F4F6FB', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
});
