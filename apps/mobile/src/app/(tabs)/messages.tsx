import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/state/auth';
import { Screen, Title, Panel, Body, Loading, StateMessage, Action } from '@/components/kit';
import { formatTime } from '@/lib/http';
import { palette as c } from '@/theme';
import type { ChatThread } from '@/types/domain';

interface ChatProvider {
  id: string; publicName: string; publicAlias?: string; title?: string;
}
export default function InboxScreen() {
  const { status, user, authorized } = useAuth();
  const client = useQueryClient();
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState('');
  const enabled = status === 'authenticated' && !!user;
  const threads = useQuery({ queryKey: ['private', user?.id, 'threads'],
    queryFn: () => authorized<ChatThread[]>('/ktv-chat/threads'),
    enabled, refetchInterval: enabled ? 8000 : false, retry: 1 });
  const providers = useQuery({ queryKey: ['private', user?.id, 'chat-providers'],
    queryFn: () => authorized<ChatProvider[]>('/ktv-chat/providers'),
    enabled: enabled && !!user?.permissions.includes('customer.portal'), staleTime: 60000 });
  async function openWithProvider(id: string) {
    if (opening) return;
    setError(''); setOpening(id);
    try {
      const thread = await authorized<ChatThread>('/ktv-chat/threads', {
        method: 'POST', body: { providerApplicationId: id },
      });
      await client.invalidateQueries({ queryKey: ['private', user?.id, 'threads'] });
      router.push({ pathname: '/conversation/[id]', params: { id: thread.id } });
    } catch (e) { setError(e instanceof Error ? e.message : 'Không mở được cuộc trò chuyện.'); }
    finally { setOpening(null); }
  }
  if (status === 'loading') return <Screen><Loading/></Screen>;
  if (!enabled) return <Screen>
    <Title subtitle="Nhắn tin trực tiếp với chuyên viên Mộc Maria">Tin nhắn</Title>
    <StateMessage message="Hãy đăng nhập để xem tin nhắn của bạn."/>
    <Action icon="log-in-outline" onPress={() => router.navigate('/(tabs)/account')}>Đi đến đăng nhập</Action>
  </Screen>;
  return <Screen>
    <Title subtitle="Trao đổi riêng tư với chuyên viên đã được công bố">Tin nhắn</Title>
    {threads.isPending ? <Loading /> : threads.isError
      ? <StateMessage message="Chưa tải được cuộc trò chuyện." retry={() => void threads.refetch()}/>
      : !threads.data?.length ? <StateMessage message="Bạn chưa có cuộc trò chuyện nào."/> :
        threads.data.map(thread => <Pressable key={thread.id}
          onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: thread.id } })}>
          <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={29} color={c.rose}/>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.ink, fontSize: 15, fontWeight: '800' }}>
                {user?.id === thread.customer_user_id ? thread.provider_name || 'Chuyên viên' : thread.customer_name || 'Khách hàng'}
              </Text>
              <Body muted>{thread.privacy_enabled ? 'Cuộc trò chuyện có mật khẩu bảo vệ' : (thread.last_message || 'Bắt đầu trò chuyện')}</Body>
              <Text style={{ color: c.muted, fontSize: 11 }}>{formatTime(thread.updated_at)}</Text>
            </View>
            {!!thread.unread_count && <View style={{ borderRadius: 20, backgroundColor: c.rose, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: c.white, fontWeight: '800' }}>{thread.unread_count}</Text>
            </View>}
            <Ionicons name="chevron-forward" color={c.muted} size={18}/>
          </Panel>
        </Pressable>)}
    {user?.permissions.includes('customer.portal') && <>
      <Text style={{ color: c.ink, fontSize: 17, fontWeight: '800', marginVertical: 13 }}>Bắt đầu tư vấn mới</Text>
      {providers.isPending ? <Loading/> : providers.isError
        ? <StateMessage message="Chưa tải được chuyên viên tư vấn." retry={() => void providers.refetch()}/>
        : providers.data?.length
          ? providers.data.map(p => <Panel key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}><Text style={{ color: c.ink, fontWeight: '700' }}>{p.publicName}</Text><Body muted>{p.title || 'Chuyên viên'}</Body></View>
              <View style={{ width: 108 }}><Action secondary loading={opening === p.id} onPress={() => void openWithProvider(p.id)}>Nhắn tin</Action></View>
            </Panel>)
          : <StateMessage message="Chưa có chuyên viên tư vấn đang mở."/>}
    </>}
    {!!error && <Text style={{ color: c.error, marginVertical: 10 }}>{error}</Text>}
  </Screen>;
}
