import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useAuth } from '@/state/auth';
import { useBranches, useProviders, useServices } from '@/lib/queries';
import { Screen, Title, Panel, Action, Body, Field, Loading, StateMessage } from '@/components/kit';
import { palette as c } from '@/theme';
import { ApiError } from '@/lib/http';

const vietnamToday = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (key: string) => parts.find(p => p.type === key)?.value ?? '';
  return get('year') + '-' + get('month') + '-' + get('day');
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const chip = (selected: boolean) => ({
  borderRadius: 14, borderWidth: 1, borderColor: selected ? c.rose : c.line,
  backgroundColor: selected ? c.roseLight : c.white, padding: 12, marginRight: 8, marginBottom: 8,
}) as const;

export default function BookingScreen() {
  const { provider: routeProvider, service: routeService } = useLocalSearchParams<{ provider?: string; service?: string }>();
  const providers = useProviders();
  const services = useServices();
  const branches = useBranches();
  const { status, user, authorized } = useAuth();
  const [provider, setProvider] = useState(routeProvider || '');
  const [service, setService] = useState(routeService || '');
  const [location, setLocation] = useState<'AT_BRANCH' | 'AT_HOME'>('AT_BRANCH');
  const [branch, setBranch] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(vietnamToday());
  const [time, setTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const dedup = useRef<{ signature: string; id: string } | null>(null);
  const activeBranch = branches.data?.find(b => b.id === branch) ?? branches.data?.[0];
  const selectedProvider = providers.data?.find(p => p.id === provider);
  const selectedService = services.data?.find(s => s.service.id === service);
  const finalAddress = location === 'AT_BRANCH' ? activeBranch?.address || '' : address.trim();
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    ? new Date(date + 'T' + time + ':00+07:00') : null;
  const validTime = parsed && Number.isFinite(parsed.getTime());
  const canSend = !!selectedProvider && !!selectedService && uuid.test(provider) && uuid.test(service)
    && finalAddress.length >= 12 && !!validTime && !busy;
  const requestPayload = {
    providerId: provider,
    serviceId: service,
    location,
    address: finalAddress,
    requestedAt: parsed && Number.isFinite(parsed.getTime()) ? parsed.toISOString() : '',
    notes: notes.trim().slice(0, 500),
  };

  async function submit() {
    if (status !== 'authenticated') { router.navigate('/(tabs)/account'); return; }
    if (!user?.permissions.includes('customer.portal')) { setError('Hãy dùng tài khoản khách hàng để đặt lịch.'); return; }
    if (!canSend || !parsed || parsed.getTime() <= Date.now() ||
      parsed.getTime() > Date.now() + 90 * 24 * 60 * 60 * 1000) {
      setError('Bạn vui lòng hoàn tất chuyên viên, dịch vụ, địa chỉ và thời gian trong tương lai (tối đa 90 ngày).');
      return;
    }
    setBusy(true); setError('');
    try {
      const signature = JSON.stringify(requestPayload);
      if (dedup.current?.signature !== signature) dedup.current = { signature, id: randomUUID() };
      await authorized('/appointment-inquiries', {
        method: 'POST', body: { ...requestPayload, idempotencyKey: dedup.current.id },
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chưa gửi được yêu cầu. Hãy kiểm tra và thử lại.');
    } finally { setBusy(false); }
  }
  if (submitted) return <Screen>
    <Title subtitle="Yêu cầu đã được chuyển đến hệ thống">Đã gửi thành công</Title>
    <Panel style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 44, color: c.green, marginBottom: 12 }}>✓</Text>
      <Body>Yêu cầu của bạn đang chờ phản hồi. Đây chưa phải lịch được xác nhận.</Body>
    </Panel>
    <Action onPress={() => { setSubmitted(false); router.navigate('/(tabs)/account'); }}>Về tài khoản</Action>
  </Screen>;
  return <Screen>
    <Title subtitle="Chọn dịch vụ và thời gian mong muốn. Mộc Maria sẽ phản hồi để xác nhận.">Gửi yêu cầu đặt lịch</Title>
    <Panel style={{ backgroundColor: c.roseLight }}>
      <Body>Thông tin dưới đây là yêu cầu tư vấn/đặt hẹn, chưa giữ chỗ hoặc xác nhận giá chính thức.</Body>
    </Panel>
    <Text style={{ color: c.ink, fontWeight: '800', fontSize: 16, marginBottom: 9 }}>1. Chọn chuyên viên</Text>
    {providers.isPending ? <Loading /> : providers.isError
      ? <StateMessage message="Chưa tải được chuyên viên." retry={() => void providers.refetch()} />
      : providers.data?.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
        {providers.data.map(p => <Pressable key={p.id} onPress={() => setProvider(p.id)} style={chip(provider === p.id)}>
          <Text style={{ color: c.ink, fontSize: 13, fontWeight: provider === p.id ? '800' : '500' }}>{p.publicName}</Text>
        </Pressable>)}
      </View> : <StateMessage message="Hiện chưa có chuyên viên có hồ sơ được công bố." />}
    <Text style={{ color: c.ink, fontWeight: '800', fontSize: 16, marginBottom: 9 }}>2. Chọn dịch vụ</Text>
    {services.isPending ? <Loading /> : services.isError
      ? <StateMessage message="Chưa tải được dịch vụ." retry={() => void services.refetch()} />
      : <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
        {services.data?.map(s => <Pressable key={s.service.id} style={chip(service === s.service.id)} onPress={() => setService(s.service.id)}>
          <Text style={{ color: c.ink, fontSize: 13, fontWeight: service === s.service.id ? '800' : '500' }}>{s.service.name}</Text>
        </Pressable>)}
      </View>}
    <Text style={{ color: c.ink, fontWeight: '800', fontSize: 16, marginBottom: 9 }}>3. Địa điểm phục vụ</Text>
    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
      <Pressable onPress={() => setLocation('AT_BRANCH')} style={chip(location === 'AT_BRANCH')}><Text>Tại cơ sở</Text></Pressable>
      <Pressable onPress={() => setLocation('AT_HOME')} style={chip(location === 'AT_HOME')}><Text>Tại nhà</Text></Pressable>
    </View>
    {location === 'AT_BRANCH'
      ? <View style={{ marginBottom: 12 }}>{branches.isPending ? <Loading /> : branches.data?.length
        ? branches.data.map(b => <Pressable key={b.id} onPress={() => setBranch(b.id)} style={chip(activeBranch?.id === b.id)}>
          <Text style={{ color: c.ink, fontWeight: '700' }}>{b.name}</Text><Text style={{ color: c.muted, fontSize: 12 }}>{b.address}</Text>
        </Pressable>) : <StateMessage message="Chưa có chi nhánh đang hoạt động." />}</View>
      : <Field label="Địa chỉ phục vụ tại nhà" value={address} onChangeText={setAddress} placeholder="Số nhà, đường, phường/xã, quận/huyện..." multiline />}
    <Text style={{ color: c.ink, fontWeight: '800', fontSize: 16, marginBottom: 9 }}>4. Thời gian mong muốn</Text>
    <Field label="Ngày (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-11-10" keyboardType="numbers-and-punctuation" />
    <Field label="Giờ (HH:mm)" value={time} onChangeText={setTime} placeholder="10:00" keyboardType="numbers-and-punctuation" />
    <Field label="Lời nhắn (không bắt buộc)" value={notes} onChangeText={setNotes} multiline maxLength={500} placeholder="Thông tin giúp chúng tôi chuẩn bị chu đáo..." />
    {!!error && <Panel style={{ backgroundColor: '#FFF1F1' }}><Text style={{ color: c.error }}>{error}</Text></Panel>}
    <Action disabled={!canSend && status === 'authenticated'} loading={busy} onPress={() => void submit()}
      icon="paper-plane-outline">{status !== 'authenticated' ? 'Đăng nhập để gửi' : 'Gửi yêu cầu'}</Action>
    <View style={{ height: 15 }} />
    <Body muted>Không thanh toán trong ứng dụng. Chỉ gửi một lần cho cùng yêu cầu; nếu mạng ngắt, vui lòng kiểm tra yêu cầu đã được ghi nhận trước khi gửi lại.</Body>
  </Screen>;
}
