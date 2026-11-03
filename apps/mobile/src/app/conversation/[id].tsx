import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Panel, Body, Action, Field, Loading, StateMessage } from '@/components/kit';
import { useAuth } from '@/state/auth';
import { ApiError, formatTime } from '@/lib/http';
import type { ChatMessage, ChatThread } from '@/types/domain';
import { palette as c } from '@/theme';

interface PrivacyUnlock { id: string; unlock_token?: string; history_locked: boolean; privacy_enabled: boolean }
export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status, user, authorized } = useAuth();
  const client = useQueryClient();
  const [draft, setDraft] = useState('');
  const [password, setPassword] = useState('');
  const [unlockToken, setUnlockToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState<{ key: string; body: string } | null>(null);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const scrollRef = useRef<ScrollViewInstance>(null);
  const enabled = status === 'authenticated' && !!id && !!user;
  const key = useMemo(() => ['private', user?.id, 'messages', id] as const, [user?.id, id]);
  const threadQuery = useQuery({ queryKey: ['private', user?.id, 'threads'],
    queryFn: () => authorized<ChatThread[]>('/ktv-chat/threads'), enabled });
  const thread = threadQuery.data?.find(row => row.id === id);
  const locked = !!thread?.privacy_enabled && !unlockToken;
  const headers = useMemo<Record<string, string>>(() => {
    const value: Record<string, string> = {};
    if (unlockToken) value['X-Chat-Unlock'] = unlockToken;
    return value;
  }, [unlockToken]);
  const query = useQuery({ queryKey: [...key, unlockToken ? 'unlocked' : 'default'],
    queryFn: ({ signal }) => authorized<ChatMessage[]>(`/ktv-chat/threads/${id}/messages`, {
      headers, signal, timeoutMs: 30000,
    }),
    enabled: enabled && !locked, retry: false });
  const messages = useMemo(() => query.data || [], [query.data]);
  const lastRead = useRef<string | null>(null);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setActive(state === 'active');
      if (state !== 'active') setUnlockToken('');
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!active || !enabled || locked || !query.isSuccess) return;
    const controller = new AbortController();
    async function poll() {
      while (!controller.signal.aborted) {
        const cacheKey = [...key, unlockToken ? 'unlocked' : 'default'];
        const current = client.getQueryData<ChatMessage[]>(cacheKey) || [];
        const last = current[current.length - 1]?.id;
        try {
          const added = await authorized<ChatMessage[]>(`/ktv-chat/threads/${id}/updates${last ? '?after=' + encodeURIComponent(last) : ''}`, {
            headers: unlockToken ? { 'X-Chat-Unlock': unlockToken } : {}, signal: controller.signal, timeoutMs: 30000,
          });
          if (controller.signal.aborted) break;
          if (added.length) {
            client.setQueryData<ChatMessage[]>(cacheKey, previous => {
              const known = new Set((previous || []).map(m => m.id));
              return [...(previous || []), ...added.filter(m => !known.has(m.id))];
            });
            void client.invalidateQueries({ queryKey: ['private', user?.id, 'threads'] });
          }
        } catch (error) {
          if (controller.signal.aborted) break;
          if (error instanceof ApiError && [401, 403, 423].includes(error.status)) {
            setUnlockToken('');
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 1800));
        }
      }
    }
    void poll();
    return () => controller.abort();
  }, [active, enabled, locked, query.isSuccess, client, id, user?.id, unlockToken, authorized, key, headers]);
  useEffect(() => {
    if (!active || !enabled || locked || !messages.length) return;
    const last = messages[messages.length - 1]?.id;
    if (last && lastRead.current !== last) {
      lastRead.current = last;
      void authorized(`/ktv-chat/threads/${id}/read`, {
        method: 'POST', body: { lastMessageId: last }, headers,
      }).catch(() => { lastRead.current = null; });
    }
  }, [active, enabled, locked, messages, authorized, id, unlockToken, headers]);
  useEffect(() => {
    // Remove unlocked content when leaving screen; never persist the unlock capability.
    return () => {
      if (unlockToken && id) {
        void authorized(`/ktv-chat/threads/${id}/privacy/lock`, { method: 'POST', body: {} }).catch(() => {});
        client.removeQueries({ queryKey: ['private', user?.id, 'messages', id] });
      }
    };
  }, [id, unlockToken, authorized, client, user?.id]);
  async function unlock() {
    if (!password) return;
    setBusy(true); setError('');
    try {
      const info = await authorized<PrivacyUnlock>(`/ktv-chat/threads/${id}/privacy/unlock`, {
        method: 'POST', body: { password },
      });
      if (!info.unlock_token) throw new Error('Không thể mở khóa cuộc trò chuyện.');
      setUnlockToken(info.unlock_token);
      setPassword('');
      void client.invalidateQueries({ queryKey: ['private', user?.id, 'threads'] });
    } catch (e) { setError(e instanceof Error ? e.message : 'Mở khóa thất bại.'); }
    finally { setBusy(false); }
  }
  async function send(body: string, key: string) {
    setBusy(true); setError('');
    try {
      const sent = await authorized<ChatMessage>(`/ktv-chat/threads/${id}/messages`, {
        method: 'POST', body: { body, clientMessageId: key }, headers,
      });
      client.setQueryData<ChatMessage[]>([...keyBase(), unlockToken ? 'unlocked' : 'default'], previous => {
        if ((previous || []).some(m => m.id === sent.id)) return previous;
        return [...(previous || []), sent];
      });
      setDraft(''); setFailed(null);
      void client.invalidateQueries({ queryKey: ['private', user?.id, 'threads'] });
    } catch (e) {
      setFailed({ body, key });
      setError(e instanceof Error ? e.message : 'Gửi tin nhắn thất bại.');
    } finally { setBusy(false); }
  }
  function keyBase() { return ['private', user?.id, 'messages', id]; }
  async function chooseImage() {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Cần quyền thư viện ảnh để gửi ảnh.'); return; }
    const selected = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .7 });
    if (selected.canceled || !selected.assets[0]) return;
    const asset = selected.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) { setError('Ảnh tối đa 5 MB.'); return; }
    const form = new FormData();
    form.append('file', { uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || 'chat.jpg' } as unknown as Blob);
    setBusy(true);
    try {
      const upload = await authorized<{ url: string }>(`/ktv-chat/threads/${id}/images`, {
        method: 'POST', body: form, headers, timeoutMs: 40000,
      });
      const sent = await authorized<ChatMessage>(`/ktv-chat/threads/${id}/messages`, {
        method: 'POST', body: { body: '', imageUrl: upload.url, clientMessageId: randomUUID() }, headers,
      });
      client.setQueryData<ChatMessage[]>([...keyBase(), unlockToken ? 'unlocked' : 'default'], previous => [...(previous || []), sent]);
    } catch(e) { setError(e instanceof Error ? e.message : 'Chưa gửi được ảnh.'); }
    finally { setBusy(false); }
  }
  if (!enabled) return <Screen><StateMessage message="Hãy đăng nhập để xem tin nhắn."/><Action onPress={() => router.navigate('/(tabs)/account')}>Đăng nhập</Action></Screen>;
  return <Screen scroll={false}>
    <View style={{ paddingHorizontal: 15, paddingVertical: 12, borderBottomColor: c.line, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 15 }}>
      <Pressable onPress={() => router.back()}><Ionicons name="arrow-back" color={c.rose} size={24}/></Pressable>
      <View style={{ flex: 1 }}><Text style={{ color: c.ink, fontWeight: '800', fontSize: 17 }}>Trò chuyện riêng tư</Text>
        <Text style={{ color: c.muted, fontSize: 12 }}>{thread ? (user?.id === thread.customer_user_id ? thread.provider_name || 'Chuyên viên' : thread.customer_name || 'Khách hàng') : 'Mộc Maria'}</Text>
      </View>
    </View>
    {locked ? <View style={{ padding: 20 }}>
      <Panel><Body>Cuộc trò chuyện đã được bảo vệ bằng mật khẩu. Nhập mật khẩu để xem tin nhắn.</Body></Panel>
      <Field label="Mật khẩu cuộc trò chuyện" value={password} onChangeText={setPassword} secureTextEntry />
      <Action loading={busy} icon="lock-open-outline" onPress={() => void unlock()}>Mở khóa</Action>
      {!!error && <Text style={{ color: c.error, marginTop: 12 }}>{error}</Text>}
    </View> : <>
      {query.isPending ? <Loading/> : query.isError
        ? <View style={{ padding: 20 }}><StateMessage message="Chưa tải được tin nhắn." retry={() => void query.refetch()}/></View>
        : <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 15, flexGrow: 1, justifyContent: 'flex-end' }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          {messages.length === 0 && <Body muted>Hãy gửi lời chào để bắt đầu cuộc trò chuyện.</Body>}
          {messages.map(m => <View key={m.id} style={{
            alignSelf: m.sender_user_id === user?.id ? 'flex-end' : 'flex-start',
            backgroundColor: m.sender_user_id === user?.id ? c.roseLight : c.white,
            borderRadius: 15, padding: 12, marginVertical: 5, maxWidth: '87%',
            borderColor: c.line, borderWidth: 1,
          }}>
            {!!m.body && <Text style={{ color: c.ink, fontSize: 14 }}>{m.body}</Text>}
            {!!m.image_url && m.image_url.startsWith('https://') && <Image source={{ uri: m.image_url }} style={{ width: 190, height: 200, borderRadius: 12 }} resizeMode="contain" />}
            <Text style={{ fontSize: 10, color: c.muted, marginTop: 5 }}>{formatTime(m.created_at)}</Text>
          </View>)}
        </ScrollView>}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ borderTopWidth: 1, borderColor: c.line, padding: 10, backgroundColor: c.white }}>
        {!!error && <Text style={{ color: c.error, padding: 5 }}>{error}</Text>}
        {!!failed && <Pressable onPress={() => void send(failed.body, failed.key)}>
          <Text style={{ color: c.rose, fontWeight: '700', marginBottom: 7 }}>Gửi lại tin nhắn chưa thành công</Text>
        </Pressable>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Pressable disabled={busy} onPress={() => void chooseImage()}><Ionicons name="image-outline" size={26} color={c.rose}/></Pressable>
          <TextInput multiline value={draft} onChangeText={(v) => { setDraft(v); if (failed && v !== failed.body) setFailed(null); }}
            maxLength={2000}
            placeholder="Nhập tin nhắn..." placeholderTextColor={c.muted}
            style={{ flex: 1, maxHeight: 105, backgroundColor: c.background, borderRadius: 15, padding: 11, color: c.ink }} />
          <Pressable disabled={busy || !draft.trim()} onPress={() => {
            const body = draft.trim();
            if (!body) return;
            const key = failed?.body === body ? failed.key : randomUUID();
            void send(body, key);
          }}><Ionicons name="send" color={busy || !draft.trim() ? c.muted : c.rose} size={25}/></Pressable>
        </View>
      </KeyboardAvoidingView>
    </>}
  </Screen>;
}
