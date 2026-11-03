import { Linking, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Title, Panel, Action, Body, Loading, StateMessage } from '@/components/kit';
import { useAuth } from '@/state/auth';
import { apiFetch, formatTime } from '@/lib/http';
import type { GiftEvent, GiftReward } from '@/types/domain';
import { palette as c } from '@/theme';

const eventSite = 'https://event.mocmaria.com/';
export default function WalletScreen() {
  const { status, user, authorized } = useAuth();
  const event = useQuery({ queryKey: ['public', 'gift-event'], queryFn: () => apiFetch<GiftEvent | null>('/gift-events/current'), staleTime: 30000 });
  const wallet = useQuery({ queryKey: ['private', user?.id, 'gift-wallet'],
    queryFn: () => authorized<GiftReward[]>('/gift-events/me/rewards'),
    enabled: status === 'authenticated' && !!user?.permissions.includes('customer.portal'),
    retry: false });
  return <Screen>
    <Action secondary icon="arrow-back-outline" onPress={() => router.back()}>Quay lại</Action>
    <View style={{ height: 17 }} />
    <Title subtitle="Phần quà và ưu đãi được quản lý bởi hệ thống Mộc Maria">Ví quà của tôi</Title>
    <Panel style={{ backgroundColor: c.roseLight, alignItems: 'center' }}>
      <Ionicons name="gift-outline" color={c.rose} size={39}/>
      <Text style={{ color: c.ink, fontWeight: '800', fontSize: 17, marginTop: 11, marginBottom: 5 }}>Mộc Maria tri ân bạn</Text>
      <Body muted>{event.data?.name || event.data?.title || 'Khám phá chương trình quà tặng đang diễn ra.'}</Body>
      <View style={{ height: 14 }}/>
      <Action secondary icon="open-outline" onPress={() => void Linking.openURL(eventSite)}>
        Tham gia sự kiện trên website
      </Action>
    </Panel>
    {status !== 'authenticated'
      ? <><StateMessage message="Hãy đăng nhập để xem ví quà cá nhân."/><Action onPress={() => router.navigate('/(tabs)/account')}>Đăng nhập</Action></>
      : !user?.permissions.includes('customer.portal')
      ? <StateMessage message="Ví quà dành cho tài khoản khách hàng."/>
      : wallet.isPending ? <Loading/> : wallet.isError
      ? <StateMessage message="Chưa tải được ví quà của bạn." retry={() => void wallet.refetch()}/>
      : !wallet.data?.length ? <StateMessage message="Bạn chưa có phần quà nào trong ví."/>
      : wallet.data.map(reward => <Panel key={reward.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name="ribbon-outline" color={c.gold} size={27}/>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.ink, fontWeight: '800' }}>{reward.name || reward.title || 'Phần quà Mộc Maria'}</Text>
          <Body muted>{reward.redeemedAt ? 'Đã sử dụng' : reward.status || 'Xem chi tiết và điều kiện trên website'}</Body>
          {!!reward.createdAt && <Text style={{ color: c.muted, fontSize: 11 }}>{formatTime(reward.createdAt)}</Text>}
        </View>
      </Panel>)}
    <Body muted>Việc mở quà, xác thực, cấp mã QR và sử dụng voucher vẫn do máy chủ quyết định. Bản mobile đầu tiên chỉ hiển thị và dẫn đến trang sự kiện chính thức.</Body>
  </Screen>;
}
