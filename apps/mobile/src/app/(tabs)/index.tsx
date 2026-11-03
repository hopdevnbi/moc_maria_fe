import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, BrandHeader, Body, Panel, Loading, StateMessage } from '@/components/kit';
import { ProviderTile } from '@/components/tiles';
import { useProviders, useServices } from '@/lib/queries';
import { palette as c, round } from '@/theme';

export default function HomeScreen() {
  const providers = useProviders();
  const services = useServices();
  return <Screen>
    <BrandHeader />
    <LinearGradient colors={['#683448', '#9E5368']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
      <Text style={s.kicker}>THƯ GIÃN · SỨC KHỎE · YÊU THƯƠNG</Text>
      <Text style={s.heroTitle}>Chăm sóc thân tâm,{"\n"}trao gửi an lành.</Text>
      <Text style={s.heroDesc}>Tận hưởng phút giây thư thái cùng những dịch vụ phù hợp và chuyên viên Mộc Maria.</Text>
      <Pressable onPress={() => router.navigate('/(tabs)/booking')} style={s.heroButton}>
        <Text style={{ fontSize: 14, color: c.roseDark, fontWeight: '800' }}>Gửi yêu cầu đặt lịch</Text>
        <Ionicons name="arrow-forward" size={16} color={c.roseDark} />
      </Pressable>
      <View style={s.ornament}><Ionicons name="flower-outline" size={108} color="#FFFFFF22" /></View>
    </LinearGradient>
    <View style={s.quick}>
      <Pressable style={s.quickCard} onPress={() => router.navigate('/(tabs)/services')}>
        <Ionicons name="sparkles-outline" color={c.rose} size={24} />
        <Text style={s.quickLabel}>Dịch vụ</Text>
      </Pressable>
      <Pressable style={s.quickCard} onPress={() => router.navigate('/(tabs)/messages')}>
        <Ionicons name="chatbubble-ellipses-outline" color={c.rose} size={24} />
        <Text style={s.quickLabel}>Tư vấn</Text>
      </Pressable>
      <Pressable style={s.quickCard} onPress={() => router.push('/wallet')}>
        <Ionicons name="gift-outline" color={c.rose} size={24} />
        <Text style={s.quickLabel}>Quà tặng</Text>
      </Pressable>
    </View>
    <View style={s.sectionHead}>
      <View><Text style={s.sectionTitle}>Chuyên viên Mộc Maria</Text><Text style={s.sectionHint}>Lựa chọn người đồng hành phù hợp</Text></View>
      <Ionicons name="heart-outline" size={22} color={c.rose} />
    </View>
    {providers.isPending ? <Loading /> : providers.isError
      ? <StateMessage message="Chưa tải được danh sách chuyên viên." retry={() => void providers.refetch()} />
      : providers.data?.length ? providers.data.slice(0, 8).map(p => <ProviderTile key={p.id} item={p} />)
      : <StateMessage message="Chưa có hồ sơ chuyên viên được công bố." />}
    <View style={s.sectionHead}>
      <View><Text style={s.sectionTitle}>Dịch vụ nổi bật</Text><Text style={s.sectionHint}>Thông tin và giá từ hệ thống</Text></View>
      <Pressable onPress={() => router.navigate('/(tabs)/services')}><Text style={{ color: c.rose, fontWeight: '700' }}>Xem tất cả</Text></Pressable>
    </View>
    {services.isPending ? <Loading /> : services.isError
      ? <StateMessage message="Chưa tải được dịch vụ." retry={() => void services.refetch()} />
      : <View style={{ gap: 9 }}>
          {services.data?.slice(0, 3).map(item => <Pressable key={item.service.id}
            onPress={() => router.push({ pathname: '/service/[slug]', params: { slug: item.service.slug } })}>
            <Panel style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}><Text style={s.serviceTitle}>{item.service.name}</Text><Body muted>{item.variants.filter(v => v.isActive).length} lựa chọn</Body></View>
              <Ionicons name="chevron-forward" color={c.rose} size={18}/>
            </Panel>
          </Pressable>)}
        </View>}
    <View style={{ height: 18 }}/>
  </Screen>;
}
const s = StyleSheet.create({
  hero: { padding: 22, borderRadius: round.xl, minHeight: 225, overflow: 'hidden', justifyContent: 'center' },
  kicker: { fontSize: 9, letterSpacing: 2, color: '#F5DFE2', fontWeight: '700', marginBottom: 13 },
  heroTitle: { fontSize: 27, fontWeight: '800', color: c.white, lineHeight: 35 },
  heroDesc: { fontSize: 12, color: '#FFF4F5', maxWidth: 270, lineHeight: 19, marginTop: 9 },
  heroButton: { paddingVertical: 11, paddingHorizontal: 16, backgroundColor: '#FDF4EE', borderRadius: 18, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 18, zIndex: 1 },
  ornament: { position: 'absolute', right: -17, bottom: -22 },
  quick: { flexDirection: 'row', gap: 9, marginVertical: 20 },
  quickCard: { flex: 1, alignItems: 'center', backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 16, paddingVertical: 15, gap: 8 },
  quickLabel: { color: c.ink, fontWeight: '700', fontSize: 12 },
  sectionHead: { marginTop: 15, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: c.ink },
  sectionHint: { fontSize: 12, color: c.muted, marginTop: 4 },
  serviceTitle: { fontSize: 16, fontWeight: '700', color: c.ink, marginBottom: 4 },
});
