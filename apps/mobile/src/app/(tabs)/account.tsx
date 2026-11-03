import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Screen, Title, Panel, Action, Field, Body, Loading, StateMessage } from '@/components/kit';
import { useAuth } from '@/state/auth';
import { palette as c } from '@/theme';
import { ApiError } from '@/lib/http';

type Mode = 'login' | 'register';
interface Profile {
  displayName?: string;
  email?: string;
  phone?: string;
  avatarUploadEnabled?: boolean;
  membership?: { tier?: string; level?: string };
  customer?: { avatarUrl?: string | null };
  staff?: { avatarUrl?: string | null };
}

export default function AccountScreen() {
  const { user, status, signIn, register, signOut, signOutEverywhere, authorized } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editName, setEditName] = useState('');
  const [editMode, setEditMode] = useState(false);
  const profile = useQuery({
    queryKey: ['private', user?.id, 'profile'],
    queryFn: () => authorized<Profile>(user?.permissions.includes('customer.portal') ? '/customers/me' : '/staff/me'),
    enabled: status === 'authenticated' && !!user && (user.permissions.includes('customer.portal') || user.permissions.includes('staff.portal')),
    retry: false,
  });
  const avatarUrl = profile.data?.customer?.avatarUrl || profile.data?.staff?.avatarUrl;

  async function authenticate() {
    if (!identifier && mode === 'login') { setMessage('Nhập số điện thoại hoặc email để đăng nhập.'); return; }
    if (password.length < (mode === 'register' ? 10 : 1)) {
      setMessage(mode === 'register' ? 'Mật khẩu đăng ký cần tối thiểu 10 ký tự.' : 'Vui lòng nhập mật khẩu.'); return;
    }
    if (mode === 'register' && (!name.trim() || (!email.trim() && !phone.trim()))) {
      setMessage('Nhập tên và ít nhất một thông tin liên hệ.'); return;
    }
    setBusy(true); setMessage('');
    try {
      if (mode === 'login') await signIn(identifier, password);
      else await register(name, phone, email, password);
      setPassword('');
      queryClient.removeQueries({ queryKey: ['private'] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xác thực tài khoản.');
    } finally { setBusy(false); }
  }
  async function updateName() {
    if (!editName.trim()) return;
    setBusy(true); setMessage('');
    try {
      const path = user?.permissions.includes('customer.portal') ? '/customers/me' : '/staff/me';
      await authorized(path, { method: 'PATCH', body: { displayName: editName.trim() } });
      await profile.refetch();
      setEditMode(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không cập nhật được.'); }
    finally { setBusy(false); }
  }
  async function uploadAvatar() {
    setMessage('');
    if (!profile.data?.avatarUploadEnabled) {
      setMessage('Tài khoản này hiện chưa đủ điều kiện hoặc hệ thống chưa bật tải ảnh đại diện.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setMessage('Cần quyền truy cập thư viện ảnh để chọn avatar.'); return; }
    const selected = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (selected.canceled || !selected.assets[0]) return;
    const item = selected.assets[0];
    if (item.fileSize && item.fileSize > 5 * 1024 * 1024) { setMessage('Ảnh tối đa 5 MB.'); return; }
    const form = new FormData();
    form.append('file', { uri: item.uri, type: item.mimeType || 'image/jpeg', name: item.fileName || 'avatar.jpg' } as unknown as Blob);
    setBusy(true);
    try {
      const path = user?.permissions.includes('customer.portal') ? '/customers/me/avatar' : '/staff/me/avatar';
      await authorized(path, { method: 'POST', body: form });
      await profile.refetch();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Tải ảnh thất bại.'); }
    finally { setBusy(false); }
  }
  if (status === 'loading') return <Screen><Loading message="Đang kiểm tra phiên đăng nhập..."/></Screen>;
  if (status === 'anonymous') return <Screen>
    <Title subtitle="Đăng nhập để quản lý yêu cầu, nhắn tin và xem quà tặng">Xin chào bạn!</Title>
    <Panel style={{ padding: 22 }}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <View style={{ flex: 1 }}><Action secondary={mode !== 'login'} onPress={() => { setMode('login'); setMessage(''); }}>Đăng nhập</Action></View>
        <View style={{ flex: 1 }}><Action secondary={mode !== 'register'} onPress={() => { setMode('register'); setMessage(''); }}>Đăng ký</Action></View>
      </View>
      {mode === 'register' && <>
        <Field label="Tên hiển thị" value={name} onChangeText={setName} placeholder="Họ và tên" autoCapitalize="words"/>
        <Field label="Số điện thoại" value={phone} onChangeText={setPhone} placeholder="09..." keyboardType="phone-pad"/>
        <Field label="Email (nếu có)" value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none"/>
      </>}
      {mode === 'login' && <Field label="Email hoặc số điện thoại" value={identifier} onChangeText={setIdentifier}
        placeholder="Thông tin đăng nhập" autoCapitalize="none" autoComplete="username"/>}
      <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/>
      {!!message && <Text style={{ color: c.error, marginBottom: 14 }}>{message}</Text>}
      <Action loading={busy} onPress={() => void authenticate()} icon="lock-closed-outline">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</Action>
    </Panel>
    <Body muted>Ứng dụng đang ở giai đoạn phát triển. Phiên đăng nhập được lưu an toàn trên thiết bị, nhưng có thể cần đăng nhập lại khi token hết hạn cho đến khi Backend hỗ trợ refresh phiên native.</Body>
  </Screen>;
  return <Screen>
    <Title subtitle="Thông tin tài khoản của bạn">Tài khoản</Title>
    <Panel style={{ alignItems: 'center', paddingVertical: 24 }}>
      {avatarUrl?.startsWith('https://')
        ? <Image source={{ uri: avatarUrl }} style={{ width: 85, height: 85, borderRadius: 43, marginBottom: 12 }}/>
        : <Ionicons name="person-circle-outline" size={84} color={c.rose}/>}
      <Text style={{ color: c.ink, fontSize: 22, fontWeight: '800' }}>{profile.data?.displayName || user?.displayName}</Text>
      <Body muted>{user?.email || user?.phone || 'Hội viên Mộc Maria'}</Body>
      <View style={{ height: 12 }}/>
      {profile.data?.avatarUploadEnabled
        ? <Action secondary icon="camera-outline" loading={busy} onPress={() => void uploadAvatar()}>Đổi ảnh đại diện</Action>
        : <Body muted>Đổi ảnh đại diện chỉ khả dụng khi tài khoản được cấp quyền và hệ thống lưu trữ đã sẵn sàng.</Body>}
    </Panel>
    {profile.isError && <StateMessage message="Chưa lấy được hồ sơ tài khoản." retry={() => void profile.refetch()}/>}
    <Panel>
      <Text style={{ color: c.ink, fontWeight: '700', fontSize: 15, marginBottom: 13 }}>Thông tin cá nhân</Text>
      {editMode ? <>
        <Field label="Tên hiển thị" value={editName} onChangeText={setEditName} />
        <Action loading={busy} onPress={() => void updateName()}>Lưu thay đổi</Action>
      </> : <Action secondary icon="create-outline" onPress={() => { setEditName(profile.data?.displayName || user?.displayName || ''); setEditMode(true); }}>Chỉnh sửa tên hiển thị</Action>}
    </Panel>
    <Panel style={{ gap: 9 }}>
      {user?.permissions.includes('customer.portal') && <Action secondary icon="gift-outline" onPress={() => router.push('/wallet')}>Ví quà Mộc Maria</Action>}
      {user?.permissions.includes('staff.portal') && <Action secondary icon="briefcase-outline" onPress={() => router.push('/provider-workspace')}>Không gian làm việc KTV</Action>}
      <Action secondary icon="chatbubbles-outline" onPress={() => router.navigate('/(tabs)/messages')}>Tin nhắn của tôi</Action>
    </Panel>
    {!!message && <Text style={{ color: c.error, marginVertical: 12 }}>{message}</Text>}
    <Action secondary icon="log-out-outline" onPress={() => {
      setMessage('');
      void signOut().then(() => queryClient.clear()).catch(() => setMessage('Không thể kết thúc phiên trên thiết bị.'));
    }}>Đăng xuất trên thiết bị</Action>
    <View style={{ height: 10 }}/>
    <Pressable accessibilityRole="button" onPress={() => {
      void signOutEverywhere().then(() => queryClient.clear()).catch((err: unknown) => {
        setMessage(err instanceof ApiError ? err.message : 'Không thể đăng xuất trên tất cả thiết bị.');
      });
    }}><Text style={{ color: c.muted, textAlign: 'center', padding: 12 }}>Đăng xuất tất cả thiết bị</Text></Pressable>
  </Screen>;
}
