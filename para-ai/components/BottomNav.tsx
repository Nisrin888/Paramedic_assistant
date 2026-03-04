import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

const PRIMARY = '#0a6fbd';

const TABS = [
  { key: 'home', label: 'Home', icon: 'home' as const, route: '/(app)' },
  { key: 'forms', label: 'Forms', icon: 'assignment' as const, route: '/(app)/forms' },
  { key: 'recent', label: 'Recent', icon: 'history' as const, route: '/(app)/recent' },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const activeKey = pathname === '/' || pathname === '/(app)'
    ? 'home'
    : pathname.includes('forms') ? 'forms'
    : pathname.includes('recent') ? 'recent'
    : '';

  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map(tab => {
        const isActive = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.navItem}
            onPress={() => router.replace(tab.route as any)}
          >
            <MaterialIcons name={tab.icon} size={24} color={isActive ? PRIMARY : '#94a3b8'} />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
    paddingTop: 10, paddingHorizontal: 24,
  },
  navItem: { alignItems: 'center', gap: 3 },
  navLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  navLabelActive: { color: PRIMARY },
});
