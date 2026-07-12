import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname, useRouter, Slot } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { AdminThemeProvider, useAdminTheme } from '../../context/AdminThemeContext';

const SIDEBAR_WIDTH = 220;

const COMPANY_NAV_ITEMS = [
  { key: 'dashboard',    icon: 'view-dashboard-outline' as const, path: '/(company)' },
  { key: 'apartments',   icon: 'office-building-cog'    as const, path: '/(company)/apartments' },
  { key: 'applications', icon: 'clipboard-text-outline' as const, path: '/(company)/applications' },
  { key: 'contracts',    icon: 'file-sign'              as const, path: '/(company)/contracts' },
  { key: 'calendar',     icon: 'calendar-month-outline' as const, path: '/(company)/calendar' },
  { key: 'analytics',    icon: 'chart-box-outline'      as const, path: '/(company)/analytics' },
  { key: 'messages',     icon: 'message-text-outline'   as const, path: '/(company)/messages' },
  { key: 'profile',      icon: 'store-outline'          as const, path: '/(company)/profile' },
  { key: 'notifications',icon: 'bell-ring-outline'      as const, path: '/(company)/notifications' },
];

function CompanyLayoutContent() {
  const [checking, setChecking] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useTranslation();
  const { accentColor } = useAdminTheme();

  useEffect(() => { verifyCompanyRole(); }, []);

  const verifyCompanyRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace('/(auth)/login' as any); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      const role = profile?.role;
      if (role !== 'company') {
        // Redirigir a su lugar correspondiente si no es empresa
        if (role === 'admin' || role === 'landlord') {
          router.replace('/(admin)' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
        return;
      }

      setUserRole(role);
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
        <Text style={styles.loadingText}>Cargando espacio de trabajo...</Text>
      </View>
    );
  }

  if (!userRole) return null;

  const isExpanded = Platform.OS === 'web';

  const translateKey = (key: string) => {
    const dict: Record<string, { es: string; en: string }> = {
      dashboard: { es: 'Dashboard', en: 'Dashboard' },
      apartments: { es: 'Mis Departamentos', en: 'My Apartments' },
      applications: { es: 'Postulaciones', en: 'Applications' },
      contracts: { es: 'Contratos', en: 'Contracts' },
      calendar: { es: 'Agenda / Visitas', en: 'Calendar / Visits' },
      analytics: { es: 'Analíticas', en: 'Analytics' },
      messages: { es: 'Mensajes', en: 'Messages' },
      profile: { es: 'Perfil de Empresa', en: 'Company Profile' },
      notifications: { es: 'Notificaciones', en: 'Notifications' },
    };
    return dict[key] ? (locale === 'es' ? dict[key].es : dict[key].en) : key;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.layout}>
        {/* Sidebar */}
        <View style={[styles.sidebar, isExpanded && styles.sidebarExpanded]}>
          {/* Brand */}
          <View style={[styles.brand, isExpanded && styles.brandExpanded]}>
            <View style={[styles.logoCircle, { backgroundColor: accentColor }]}>
              <MaterialCommunityIcons name="office-building" size={20} color="#000" />
            </View>
            {isExpanded && (
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.brandTitle}>Roommates</Text>
                <Text style={styles.brandSubtitle}>PMS Hub</Text>
              </View>
            )}
          </View>

          {/* Navigation */}
          <ScrollView contentContainerStyle={styles.navScroll} showsVerticalScrollIndicator={false}>
            {COMPANY_NAV_ITEMS.map((item) => {
              const active = 
                pathname === item.path || 
                (item.path !== '/(company)' && pathname.startsWith(item.path));
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.navItem, 
                    active && { backgroundColor: `${accentColor}15` }, 
                    isExpanded && styles.navItemExpanded
                  ]}
                  onPress={() => router.push(item.path as any)}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={22}
                    color={active ? accentColor : '#888'}
                  />
                  {isExpanded && (
                    <Text style={[styles.navLabel, active && { color: accentColor, fontWeight: '600' }]}>
                      {translateKey(item.key)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Logout */}
          <View style={[styles.footer, isExpanded && styles.footerExpanded]}>
            <TouchableOpacity 
              style={[styles.logoutBtn, isExpanded && styles.logoutBtnExpanded]} 
              onPress={handleLogout}
            >
              <MaterialCommunityIcons name="logout" size={20} color="#ff4444" />
              {isExpanded && (
                <Text style={styles.logoutLabel}>Cerrar Sesión</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Area */}
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function CompanyLayout() {
  return (
    <AdminThemeProvider>
      <CompanyLayoutContent />
    </AdminThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 60,
    backgroundColor: '#0c0c14',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    paddingVertical: 16,
  },
  sidebarExpanded: {
    width: SIDEBAR_WIDTH,
    alignItems: 'stretch',
  },
  brand: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
  },
  navScroll: {
    flex: 1,
    alignItems: 'center',
  },
  navItem: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  navItemExpanded: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    height: 42,
    alignSelf: 'center',
  },
  navLabel: {
    color: '#888',
    fontSize: 13,
    marginLeft: 12,
    fontWeight: '500',
  },
  footer: {
    marginTop: 'auto',
    width: '100%',
    alignItems: 'center',
  },
  footerExpanded: {
    paddingHorizontal: 20,
    alignItems: 'stretch',
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,68,68,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnExpanded: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    height: 42,
  },
  logoutLabel: {
    color: '#ff4444',
    fontSize: 13,
    marginLeft: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
});
