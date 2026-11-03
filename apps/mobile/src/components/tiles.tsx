import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice } from '@/lib/http';
import { palette as c, round } from '@/theme';
import type { Provider, ServiceItem } from '@/types/domain';

export function ProviderTile({ item }: { item: Provider }) {
  return <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/provider/[id]', params: { id: item.id } })}
    style={({ pressed }) => [s.tile, pressed && { opacity: .75 }]}>
    {item.avatarUrl?.startsWith('https://')
      ? <Image source={{ uri: item.avatarUrl }} resizeMode="cover" style={s.photo} />
      : <View style={[s.photo, s.empty]}><Ionicons name="person-outline" size={35} color={c.rose} /></View>}
    <View style={{ flex: 1, gap: 5 }}>
      <Text style={s.title} numberOfLines={1}>{item.publicName}</Text>
      <Text style={s.desc} numberOfLines={2}>{item.title || item.serviceArea || 'Chuyên viên chăm sóc'}</Text>
      <Text style={{ color: c.gold, fontSize: 12, fontWeight: '700' }}>{item.bookable ? 'Có thể gửi yêu cầu' : 'Xem hồ sơ'}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={c.rose} />
  </Pressable>;
}

export function ServiceTile({ item }: { item: ServiceItem }) {
  const active = item.variants.filter(v => v.isActive);
  const min = active.length > 0 ? Math.min(...active.map(v => Number(v.priceVnd)).filter(Number.isFinite)) : null;
  return <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/service/[slug]', params: { slug: item.service.slug } })}
    style={({ pressed }) => [s.tile, pressed && { opacity: .75 }]}>
    <View style={[s.photo, s.empty]}><Ionicons name="flower-outline" size={32} color={c.rose} /></View>
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={s.title} numberOfLines={2}>{item.service.name}</Text>
      <Text style={s.desc} numberOfLines={2}>{item.service.description || 'Chăm sóc tận tâm cùng Mộc Maria'}</Text>
      <Text style={{ color: c.rose, fontWeight: '700', fontSize: 13 }}>{min !== null && Number.isFinite(min) ? 'Từ ' + formatPrice(min) : 'Xem chi tiết'}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={c.rose} />
  </Pressable>;
}
const s = StyleSheet.create({
  tile: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 12, borderRadius: round.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, marginBottom: 10 },
  photo: { width: 82, height: 90, borderRadius: round.md },
  empty: { backgroundColor: c.roseLight, alignItems: 'center', justifyContent: 'center' },
  title: { color: c.ink, fontSize: 16, fontWeight: '800' },
  desc: { color: c.muted, fontSize: 12, lineHeight: 18 },
});
