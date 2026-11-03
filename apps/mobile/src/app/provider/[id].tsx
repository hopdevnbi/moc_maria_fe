import { useLocalSearchParams, router } from 'expo-router';
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Screen, Title, Panel, Body, Action, Loading, StateMessage } from '@/components/kit';
import { apiFetch } from '@/lib/http';
import type { Provider } from '@/types/domain';
import { palette as c } from '@/theme';

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const valid = typeof id === 'string' && id.length > 0;
  const query = useQuery({ queryKey: ['public', 'provider', id],
    queryFn: () => apiFetch<Provider>('/providers/' + encodeURIComponent(id ?? '')),
    enabled: valid, staleTime: 30000 });
  const item = query.data;
  return <Screen>
    <Action secondary icon="arrow-back-outline" onPress={() => router.back()}>Quay lại</Action>
    <View style={{ height: 16 }} />
    {query.isPending ? <Loading /> : query.isError || !item || item.isDemo
      ? <StateMessage message="Không tìm thấy hồ sơ chuyên viên được công bố." retry={() => void query.refetch()} />
      : <>
        <Panel style={{ alignItems: 'center' }}>
          {item.avatarUrl?.startsWith('https://')
            ? <Image source={{ uri: item.avatarUrl }} style={{ width: 150, height: 160, borderRadius: 25, marginBottom: 17 }} />
            : <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: c.roseLight, marginBottom: 17 }}>
                <Ionicons name="person-outline" color={c.rose} size={65} />
              </View>}
          <Text style={{ fontSize: 23, fontWeight: '800', color: c.ink }}>{item.publicName}</Text>
          <Body muted>{item.title || item.serviceArea || 'Chuyên viên chăm sóc'}</Body>
        </Panel>
        <Title subtitle="Giới thiệu từ hồ sơ được công bố">Về chuyên viên</Title>
        <Panel><Body>{item.introduction || 'Thông tin giới thiệu đang được cập nhật.'}</Body></Panel>
        {!!item.eligibleServices?.length && <Panel>
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.ink, marginBottom: 10 }}>Dịch vụ phù hợp</Text>
          {item.eligibleServices.map((service, index) => <Body key={service.serviceId+'-'+index}>• {service.serviceName}</Body>)}
        </Panel>}
        <Action icon="calendar-outline" onPress={() => router.push({ pathname: '/(tabs)/booking', params: { provider: item.id } })}>Gửi yêu cầu đặt lịch</Action>
      </>}
  </Screen>;
}
