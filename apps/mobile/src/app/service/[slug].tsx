import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';
import { Screen, Panel, Action, Loading, StateMessage, Title, Body } from '@/components/kit';
import { apiFetch, formatPrice } from '@/lib/http';
import type { ServiceItem } from '@/types/domain';
import { palette as c } from '@/theme';

export default function ServiceDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useQuery({ queryKey: ['public', 'service', slug],
    queryFn: () => apiFetch<ServiceItem>('/services/' + encodeURIComponent(slug ?? '')),
    enabled: !!slug, staleTime: 60000 });
  return <Screen>
    <Action secondary icon="arrow-back-outline" onPress={() => router.back()}>Quay lại</Action>
    {query.isPending ? <Loading/> : query.isError || !query.data
      ? <StateMessage message="Không tìm thấy thông tin dịch vụ." retry={() => void query.refetch()} />
      : <>
        <Title subtitle="Dịch vụ chăm sóc tại Mộc Maria">{query.data.service.name}</Title>
        <Panel><Body>{query.data.service.description || 'Thông tin dịch vụ đang được cập nhật.'}</Body></Panel>
        <Text style={{ fontSize: 17, fontWeight: '800', color: c.ink, marginTop: 12, marginBottom: 12 }}>Các lựa chọn</Text>
        {query.data.variants.filter(v => v.isActive).map(v => <Panel key={v.id}>
          <Text style={{ color: c.ink, fontWeight: '700', fontSize: 16 }}>{v.name}</Text>
          <Body muted>{v.durationMinutes} phút</Body>
          <Text style={{ color: c.rose, fontWeight: '800', marginVertical: 9 }}>{formatPrice(v.priceVnd)}</Text>
          <Action secondary onPress={() => router.push({ pathname: '/(tabs)/booking', params: { service: query.data!.service.id } })}>Gửi yêu cầu</Action>
        </Panel>)}
      </>}
  </Screen>;
}
