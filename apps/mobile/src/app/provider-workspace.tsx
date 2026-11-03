import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Title, Panel, Action, Loading, StateMessage, Body } from '@/components/kit';
import { useAuth } from '@/state/auth';
import { formatTime } from '@/lib/http';
import { palette as c } from '@/theme';
import type { Inquiry } from '@/types/domain';

interface Fulfillment {
  inquiryId: string;
  status: string | null;
  startsAt: string | null;
  endsAt: string | null;
}
const label: Record<string, string> = {
  PENDING: 'Chờ phản hồi', CONTACTED: 'Đang trao đổi', CONFIRMED: 'Đã xác nhận',
  IN_SERVICE: 'Đang phục vụ', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy',
  DECLINED: 'Chưa nhận',
};
export default function KtvWorkspaceScreen() {
  const { user, status, authorized } = useAuth();
  const hasAccess = status === 'authenticated' && (!!user?.permissions.includes('staff.portal') || !!user?.roles.includes('THERAPIST'));
  const inquiries = useQuery({ queryKey: ['private', user?.id, 'ktv-inquiries'],
    queryFn: () => authorized<Inquiry[]>('/appointment-inquiries'), enabled: hasAccess, retry: false });
  const fulfillments = useQuery({ queryKey: ['private', user?.id, 'ktv-fulfillments'],
    queryFn: () => authorized<Fulfillment[]>('/provider/inquiry-fulfillments'), enabled: hasAccess, retry: false });
  const byId = new Map(fulfillments.data?.map(f => [f.inquiryId, f]) || []);
  return <Screen>
    <Action secondary icon="arrow-back-outline" onPress={() => router.back()}>Quay lại</Action>
    <View style={{ height: 16 }}/>
    <Title subtitle="Chỉ hiển thị công việc được Backend phân quyền">Không gian KTV</Title>
    {!hasAccess ? <StateMessage message="Tài khoản này chưa có quyền truy cập không gian làm việc KTV."/> :
      inquiries.isPending ? <Loading/> : inquiries.isError
        ? <StateMessage message="Chưa tải được danh sách yêu cầu." retry={() => void inquiries.refetch()}/>
        : !inquiries.data?.length ? <StateMessage message="Hiện chưa có yêu cầu nào được phân công."/>
        : <>
          <Panel style={{ backgroundColor: c.roseLight, flexDirection: 'row', gap: 13, alignItems: 'center' }}>
            <Ionicons name="calendar-number-outline" size={33} color={c.rose}/>
            <View><Text style={{ color: c.rose, fontSize: 25, fontWeight: '800' }}>{inquiries.data.length}</Text><Body>Yêu cầu trong danh sách</Body></View>
          </Panel>
          {inquiries.data.map(item => {
            const fulfillment = byId.get(item.id);
            const state = fulfillment?.status || item.status;
            return <Panel key={item.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: '800', color: c.ink }}>Yêu cầu #{item.id.slice(0, 8)}</Text>
                <Text style={{ color: c.rose, fontWeight: '700' }}>{label[state] || state}</Text>
              </View>
              <Body muted>{formatTime(fulfillment?.startsAt || item.requestedAt)}</Body>
              {!!item.notes && <Body>{item.notes}</Body>}
              <View style={{ height: 12 }}/>
              <Body muted>Mọi thay đổi tiếp nhận, bắt đầu và hoàn thành phục vụ phải được xác nhận trên hệ thống với đầy đủ quy tắc nghiệp vụ. Các thao tác ghi được giữ trên website đến khi hoàn tất API contract mobile.</Body>
            </Panel>;
          })}
        </>}
    <Action secondary icon="chatbubble-ellipses-outline" onPress={() => router.navigate('/(tabs)/messages')}>Xem tin nhắn</Action>
  </Screen>;
}
