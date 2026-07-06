import { useEffect, useState } from 'react';
import { Slot, router, usePathname } from 'expo-router';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { AdminThemeProvider, useAdminTheme } from '../../context/AdminThemeContext';

const SIDEBAR_WIDTH = 220;

const NAV_ITEMS = [
  { key: 'overview',      icon: 'view-dashboard-outline' as const, path: '/(admin)' },
  { key: 'users',         icon: 'account-group-outline'  as const, path: '/(admin)/users' },
  { key: 'listings',      icon: 'home-city-outline'      as const, path: '/(admin)/listings' },
  { key: 'contracts',     icon: 'file-document-outline'  as const, path: '/(admin)/contracts' },
  { key: 'payments',      icon: 'credit-card-outline'    as const, path: '/(admin)/payments' },
  { key: 'reports',       icon: 'alert-circle-outline'   as const, path: '/(admin)/reports' },
  { key: 'verifications', icon: 'shield-check-outline'   as const, path: '/(admin)/verifications' },
  { key: 'settings',      icon: 'cog-outline'            as const, path: '/(admin)/settings' },
];

export default function AdminLayout() {
  return (
    <AdminThemeProvider>
      <AdminLayoutContent />
    </AdminThemeProvider>
  );
}

function AdminLayoutContent() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin]   = useState(false);
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const { accentColor } = useAdminTheme();

  useEffect(() => { verifyAdmin(); }, []);

  const verifyAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace('/(auth)/login' as any); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'admin') { router.replace('/(tabs)' as any); return; }

      setIsAdmin(true);
    } catch {
      router.replace('/(auth)/login' as any);
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login' as any);
  };

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={styles.loadingText}>{t('general.loading', 'Loading...')}</Text>
      </View>
    );
  }

  if (!isAdmin) return null;

  const isExpanded = Platform.OS === 'web';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.layout}>
        {/* Sidebar */}
        <View style={[styles.sidebar, isExpanded && styles.sidebarExpanded]}>
          {/* Brand */}
          <View style={[styles.brand, isExpanded && styles.brandExpanded]}>
            <MaterialCommunityIcons name="shield-crown" size={26} color={accentColor} />
            {isExpanded && <Text style={styles.brandText}>{t('admin.title', 'Admin Panel')}</Text>}
          </View>

          {/* Nav items */}
          <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.path ||
                (item.path !== '/(admin)' && pathname.startsWith(item.path));
              return (
                <TouchableOpacity
                  key={item.path}
                  style={[
                    styles.navItem, 
                    active && { backgroundColor: `${accentColor}15` }, 
                    isExpanded && styles.navItemExpanded
                  ]}
                  onPress={() => router.push(item.path as any)}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={22}
                    color={active ? accentColor : '#888'}
                  />
                  {isExpanded && (
                    <Text style={[styles.navLabel, active && { color: accentColor, fontWeight: '600' }]}>
                      {item.key === 'contracts' ? (locale === 'es' ? 'Contratos' : 'Contracts') : t(`admin.nav.${item.key}`)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Logout */}
          <TouchableOpacity
            style={[styles.logoutBtn, isExpanded && styles.navItemExpanded]}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons name="logout" size={22} color="#ff4444" />
            {isExpanded && <Text style={styles.logoutText}>{t('admin.nav.logout', 'Log out')}</Text>}
          </TouchableOpacity>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText:      { color: '#aaa', fontSize: 14 },
  container:        { flex: 1, backgroundColor: '#0a0a0a' },
  layout:           { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 64,
    backgroundColor: '#080808',
    borderRightWidth: 1,
    borderRightColor: '#1a1a1a',
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  sidebarExpanded:  { width: SIDEBAR_WIDTH },
  brand: {
    alignItems: 'center',
    paddingBottom: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    paddingHorizontal: 16,
  },
  brandExpanded:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandText:        { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  navList:          { flex: 1 },
  navItem: {
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 6,
    marginVertical: 2,
  },
  navItemExpanded:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navLabel:         { color: '#888', fontSize: 14, fontWeight: '500' },
  logoutBtn: {
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 6,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  logoutText:       { color: '#ff4444', fontSize: 14, fontWeight: '500' },
  content:          { flex: 1, backgroundColor: '#0a0a0a' },
});
