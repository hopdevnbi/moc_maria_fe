import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/theme';

const tabIcon = (name: keyof typeof Ionicons.glyphMap) => {
  function MobileTabIcon({ color, size }: { color: import('react-native').ColorValue; size: number }) {
    return <Ionicons name={name} color={typeof color === 'number' ? palette.muted : (color || palette.muted)} size={size} />;
  }
  return MobileTabIcon;
};

export default function MobileTabs() {
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: palette.rose,
    tabBarInactiveTintColor: palette.muted,
    tabBarStyle: { backgroundColor: '#fff', height: 64, paddingTop: 6, borderTopColor: palette.line },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Trang chủ', tabBarIcon: tabIcon('home-outline') }} />
    <Tabs.Screen name="services" options={{ title: 'Dịch vụ', tabBarIcon: tabIcon('flower-outline') }} />
    <Tabs.Screen name="booking" options={{ title: 'Đặt lịch', tabBarIcon: tabIcon('calendar-outline') }} />
    <Tabs.Screen name="messages" options={{ title: 'Tin nhắn', tabBarIcon: tabIcon('chatbubbles-outline') }} />
    <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: tabIcon('person-circle-outline') }} />
  </Tabs>;
}
