import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Screen, Title, Loading, StateMessage } from '@/components/kit';
import { ServiceTile } from '@/components/tiles';
import { useServices } from '@/lib/queries';
import { palette as c } from '@/theme';

const searchText = (value: string) => value.toLocaleLowerCase('vi').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

export default function ServicesScreen() {
  const [keyword, setKeyword] = useState('');
  const query = useServices();
  const list = useMemo(() => query.data?.filter(row => searchText(row.service.name).includes(searchText(keyword))) ?? [], [query.data, keyword]);
  return <Screen>
    <Title subtitle="Khám phá dịch vụ chăm sóc sức khỏe và thư giãn">Dịch vụ Mộc Maria</Title>
    <View style={{ backgroundColor: c.white, borderColor: c.line, borderWidth: 1, borderRadius: 15, marginBottom: 16, paddingHorizontal: 15 }}>
      <TextInput placeholder="Tìm theo tên dịch vụ..." placeholderTextColor={c.muted} value={keyword}
        onChangeText={setKeyword} style={{ height: 49, color: c.ink, fontSize: 15 }}/>
    </View>
    {query.isPending ? <Loading /> : query.isError
      ? <StateMessage message="Không tải được danh sách dịch vụ." retry={() => void query.refetch()} />
      : list.length === 0
        ? <StateMessage message="Chưa có dịch vụ phù hợp với tìm kiếm." />
        : list.map(item => <ServiceTile key={item.service.id} item={item} />)}
  </Screen>;
}
