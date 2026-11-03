import { type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { palette as c, round, spacing } from '@/theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  if (!scroll) return <SafeAreaView edges={['top']} style={styles.screen}>{children}</SafeAreaView>;
  return <SafeAreaView edges={['top']} style={styles.screen}><ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView>;
}
export function Title({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return <View style={{ marginBottom: 19 }}>
    <Text style={styles.title}>{children}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>;
}
export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && { color: c.muted }]}>{children}</Text>;
}
export function Panel({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}
export function Action({ children, onPress, disabled, secondary = false, loading, icon }: {
  children: ReactNode; onPress: () => void; disabled?: boolean; secondary?: boolean; loading?: boolean; icon?: keyof typeof Ionicons.glyphMap;
}) {
  return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [styles.action, secondary && styles.actionSecondary, (disabled || loading) && { opacity: .55 }, pressed && { opacity: .75 }]}>
    {loading ? <ActivityIndicator color={secondary ? c.rose : c.white} /> : icon ? <Ionicons name={icon} color={secondary ? c.rose : c.white} size={18} /> : null}
    <Text style={[styles.actionText, secondary && { color: c.rose }]}>{children}</Text>
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ marginBottom: spacing.md }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput placeholderTextColor={c.muted} style={[styles.input, props.multiline && { minHeight: 86, textAlignVertical: 'top' }]} {...props} />
  </View>;
}
export function StateMessage({ message, retry }: { message: string; retry?: () => void }) {
  return <Panel style={{ alignItems: 'center', gap: 12 }}>
    <Ionicons name="information-circle-outline" size={28} color={c.gold} />
    <Body muted>{message}</Body>
    {retry && <Action secondary onPress={retry}>Thử lại</Action>}
  </Panel>;
}
export function Loading({ message = 'Đang tải dữ liệu...' }: { message?: string }) {
  return <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
    <ActivityIndicator color={c.rose} size="large" />
    <Text style={{ color: c.muted }}>{message}</Text>
  </View>;
}
export function BrandHeader() {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 }}>
    <Image source={require('../../assets/images/moc-maria-logo.png')} style={{ width: 51, height: 51, borderRadius: 15 }} resizeMode="contain" />
    <View>
      <Text style={{ color: c.roseDark, fontSize: 21, fontWeight: '800', letterSpacing: .3 }}>MỘC MARIA</Text>
      <Text style={{ color: c.muted, fontSize: 11, letterSpacing: 1.6 }}>CHĂM SÓC BẰNG SỰ TẬN TÂM</Text>
    </View>
  </View>;
}
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  scroll: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 42, flexGrow: 1 },
  title: { fontSize: 27, fontWeight: '800', color: c.ink, lineHeight: 34 },
  subtitle: { fontSize: 14, color: c.muted, marginTop: 7, lineHeight: 21 },
  body: { fontSize: 14, color: c.ink, lineHeight: 22 },
  panel: { padding: 17, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: round.lg, marginBottom: 12 },
  action: { minHeight: 48, paddingHorizontal: 16, borderRadius: round.md, backgroundColor: c.rose, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  actionSecondary: { backgroundColor: c.roseLight, borderColor: '#EECAD4', borderWidth: 1 },
  actionText: { color: c.white, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: c.ink, marginBottom: 7 },
  input: { backgroundColor: c.white, borderColor: c.line, borderWidth: 1, borderRadius: round.md, fontSize: 15, color: c.ink, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
});
