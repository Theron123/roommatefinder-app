import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';

type Stats = {
  totalUsers: number;
  seekerUsers: number;
  companyUsers: number;
  landlordUsers: number;
  newUsersToday: number;
  activeListings: number;
  totalListings: number;
  avgPrice: number;
  totalContracts: number;
  activeContracts: number;
  pendingContracts: number;
  pendingReports: number;
  pendingVerifications: number;
};

type RecentUser = { id: string; name: string; role: string; created_at: string };

type RecentContract = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  initiator: { name: string } | null;
};

export default function AdminOverview() {
  const [stats, setStats]                 = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentContracts, setRecentContracts] = useState<RecentContract[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [userRole, setUserRole]       = useState<string | null>(null);
  const [userId, setUserId]           = useState<string | null>(null);

  const { locale, t } = useTranslation();
  const { accentColor } = useAdminTheme();

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const currentUserId = session.user.id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUserId)
        .single();
      
      const currentRole = profile?.role || 'seeker';
      setUserRole(currentRole);
      setUserId(currentUserId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (currentRole === 'admin') {
        const [
          { count: totalUsers },
          { count: seekerUsers },
          { count: companyUsers },
          { count: landlordUsers },
          { count: newUsersToday },
          { count: activeListings },
          { count: totalListings },
          { data: listingsData },
          { count: totalContracts },
          { count: activeContracts },
          { count: pendingContracts },
          { count: pendingReports },
          { count: pendingVerifications },
          { data: recent },
          { data: recentConts }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seeker'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'company'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'landlord'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
          supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('listings').select('*', { count: 'exact', head: true }),
          supabase.from('listings').select('price'),
          supabase.from('contracts').select('*', { count: 'exact', head: true }),
          supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'pending_authorization'),
          supabase.from('user_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('profiles').select('id, name, role, created_at').order('created_at', { ascending: false }).limit(4),
          supabase.from('contracts').select('id, type, status, created_at, initiator:initiator_id(name)').order('created_at', { ascending: false }).limit(3),
        ]);

        let avgPrice = 0;
        if (listingsData && listingsData.length > 0) {
          const prices = listingsData.map(l => Number(l.price) || 0);
          const totalSum = prices.reduce((a, b) => a + b, 0);
          avgPrice = Math.round(totalSum / prices.length);
        }

        setStats({
          totalUsers: totalUsers || 0,
          seekerUsers: seekerUsers || 0,
          companyUsers: companyUsers || 0,
          landlordUsers: landlordUsers || 0,
          newUsersToday: newUsersToday || 0,
          activeListings: activeListings || 0,
          totalListings: totalListings || 0,
          avgPrice: avgPrice || 0,
          totalContracts: totalContracts || 0,
          activeContracts: activeContracts || 0,
          pendingContracts: pendingContracts || 0,
          pendingReports: pendingReports || 0,
          pendingVerifications: pendingVerifications || 0,
        });

        setRecentUsers((recent as unknown as RecentUser[]) || []);
        setRecentContracts((recentConts as unknown as RecentContract[]) || []);
      } else {
        const { data: userListings } = await supabase
          .from('listings')
          .select('id, price, status')
          .eq('user_id', currentUserId);

        const listingIds = userListings?.map(l => l.id) || [];
        const totalListings = userListings?.length || 0;
        const activeListings = userListings?.filter(l => l.status === 'active' || l.status === 'available').length || 0;

        let avgPrice = 0;
        if (userListings && userListings.length > 0) {
          const prices = userListings.map(l => Number(l.price) || 0);
          const totalSum = prices.reduce((a, b) => a + b, 0);
          avgPrice = Math.round(totalSum / userListings.length);
        }

        let totalContracts = 0;
        let activeContracts = 0;
        let pendingContracts = 0;
        let recentConts: any[] = [];

        if (listingIds.length > 0) {
          const [
            { count: totConts },
            { count: actConts },
            { count: pendConts },
            { data: recConts }
          ] = await Promise.all([
            supabase.from('contracts').select('*', { count: 'exact', head: true }).in('listing_id', listingIds),
            supabase.from('contracts').select('*', { count: 'exact', head: true }).in('listing_id', listingIds).eq('status', 'active'),
            supabase.from('contracts').select('*', { count: 'exact', head: true }).in('listing_id', listingIds).eq('status', 'pending_authorization'),
            supabase.from('contracts').select('id, type, status, created_at, initiator:initiator_id(name)').in('listing_id', listingIds).order('created_at', { ascending: false }).limit(3)
          ]);

          totalContracts = totConts || 0;
          activeContracts = actConts || 0;
          pendingContracts = pendConts || 0;
          recentConts = recConts || [];
        }

        setStats({
          totalUsers: 0,
          seekerUsers: 0,
          companyUsers: 0,
          landlordUsers: 0,
          newUsersToday: 0,
          activeListings,
          totalListings,
          avgPrice,
          totalContracts,
          activeContracts,
          pendingContracts,
          pendingReports: 0,
          pendingVerifications: 0,
        });

        setRecentContracts((recentConts as unknown as RecentContract[]) || []);
        setRecentUsers([]);
      }
    } catch (e) {
      console.error('Error al cargar datos del resumen:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const ROLE_COLOR: Record<string, string> = {
    admin: '#f97316',
    seeker: accentColor,
    company: '#3b82f6',
    landlord: '#a855f7',
  };

  const CONTRACT_STATUS_COLOR: Record<string, string> = {
    draft: '#888',
    pending_authorization: '#FFB800',
    active: '#49C788',
    terminated: '#FF4B4B',
  };

  const translateContractType = (type: string) => {
    if (type === 'roommate_agreement') return locale === 'es' ? 'Acuerdo Roommate' : 'Roommate Agreement';
    if (type === 'rental_agreement') return locale === 'es' ? 'Contrato Renta' : 'Rental Agreement';
    return type;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>
            {userRole === 'admin' 
              ? (locale === 'es' ? 'Panel de Administración' : 'Admin Panel') 
              : userRole === 'company' 
                ? (locale === 'es' ? 'Panel de Empresa' : 'Company Dashboard') 
                : (locale === 'es' ? 'Panel de Propietario' : 'Property Owner Dashboard')}
          </Text>
          <Text style={styles.pageSubtitle}>
            {userRole === 'admin' 
              ? (locale === 'es' ? 'Resumen general y métricas clave del sistema' : 'System overview and key performance metrics') 
              : (locale === 'es' ? 'Gestiona tus apartamentos, contratos e inquilinos' : 'Manage your apartments, leases and tenants')}
          </Text>
        </View>

        {loading || !stats ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color={accentColor} />
          </View>
        ) : (
          <>
            {/* KPI STATS GRID */}
            <View style={styles.statsGrid}>
              
              {userRole === 'admin' ? (
                <>
                  {/* Card 1: Usuarios */}
                  <TouchableOpacity style={styles.kpiCard} onPress={() => router.push('/(admin)/users' as any)}>
                    <View style={styles.kpiHeader}>
                      <View style={[styles.kpiIconBox, { backgroundColor: accentColor + '18' }]}>
                        <MaterialCommunityIcons name="account-group" size={20} color={accentColor} />
                      </View>
                      <Text style={styles.kpiTrend}>+{stats.newUsersToday} {locale === 'es' ? 'hoy' : 'today'}</Text>
                    </View>
                    <Text style={styles.kpiValue}>{stats.totalUsers.toLocaleString()}</Text>
                    <Text style={styles.kpiLabel}>{locale === 'es' ? 'Usuarios Registrados' : 'Registered Users'}</Text>
                    <View style={styles.kpiFooter}>
                      <Text style={styles.kpiFooterText}>
                        👥 {stats.seekerUsers} Roommates | 🏢 {stats.companyUsers} {locale === 'es' ? 'Empresas' : 'Companies'} | 🏡 {stats.landlordUsers} {locale === 'es' ? 'Prop.' : 'Prop.'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Card 2: Alojamientos */}
                  <TouchableOpacity style={styles.kpiCard} onPress={() => router.push('/(admin)/listings' as any)}>
                    <View style={styles.kpiHeader}>
                      <View style={[styles.kpiIconBox, { backgroundColor: '#3b82f618' }]}>
                        <MaterialCommunityIcons name="home-city" size={20} color="#3b82f6" />
                      </View>
                      <Text style={[styles.kpiTrend, { color: '#3b82f6' }]}>{stats.activeListings} {locale === 'es' ? 'activos' : 'live'}</Text>
                    </View>
                    <Text style={styles.kpiValue}>{stats.totalListings.toLocaleString()}</Text>
                    <Text style={styles.kpiLabel}>{locale === 'es' ? 'Alojamientos Totales' : 'Total Properties'}</Text>
                    <View style={styles.kpiFooter}>
                      <Text style={styles.kpiFooterText}>
                        💵 {locale === 'es' ? 'Renta Promedio' : 'Avg Rent'}: ${stats.avgPrice}/m
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Card 3: Contratos */}
                  <TouchableOpacity style={styles.kpiCard} onPress={() => router.push('/(admin)/contracts' as any)}>
                    <View style={styles.kpiHeader}>
                      <View style={[styles.kpiIconBox, { backgroundColor: '#49c78818' }]}>
                        <MaterialCommunityIcons name="file-document-multiple" size={20} color="#49c788" />
                      </View>
                      <Text style={[styles.kpiTrend, { color: '#49c788' }]}>{stats.activeContracts} {locale === 'es' ? 'activos' : 'active'}</Text>
                    </View>
                    <Text style={styles.kpiValue}>{stats.totalContracts.toLocaleString()}</Text>
                    <Text style={styles.kpiLabel}>{locale === 'es' ? 'Contratos Firmados' : 'Signed Agreements'}</Text>
                    <View style={styles.kpiFooter}>
                      <Text style={[styles.kpiFooterText, { color: '#FFB800' }]}>
                        ⏳ {stats.pendingContracts} {locale === 'es' ? 'por moderar' : 'pending'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Card 4: Seguridad */}
                  <TouchableOpacity style={styles.kpiCard} onPress={() => router.push('/(admin)/reports' as any)}>
                    <View style={styles.kpiHeader}>
                      <View style={[styles.kpiIconBox, { backgroundColor: '#f9731618' }]}>
                        <MaterialCommunityIcons name="shield-alert" size={20} color="#f97316" />
                      </View>
                      <Text style={[styles.kpiTrend, { color: '#f97316' }]}>{stats.pendingReports} {locale === 'es' ? 'reportes' : 'reports'}</Text>
                    </View>
                    <Text style={styles.kpiValue}>{(stats.pendingReports + stats.pendingVerifications).toLocaleString()}</Text>
                    <Text style={styles.kpiLabel}>{locale === 'es' ? 'Casos de Moderación' : 'Pending Cases'}</Text>
                    <View style={styles.kpiFooter}>
                      <Text style={styles.kpiFooterText}>
                        🪪 {stats.pendingVerifications} {locale === 'es' ? 'verif. pendientes' : 'pending verifs'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Card 1: Mis Alojamientos */}
                  <TouchableOpacity style={styles.kpiCard} onPress={() => router.push('/(admin)/listings' as any)}>
                    <View style={styles.kpiHeader}>
                      <View style={[styles.kpiIconBox, { backgroundColor: '#3b82f618' }]}>
                        <MaterialCommunityIcons name="home-city" size={20} color="#3b82f6" />
                      </View>
                      <Text style={[styles.kpiTrend, { color: '#3b82f6' }]}>{stats.activeListings} {locale === 'es' ? 'activos' : 'live'}</Text>
                    </View>
                    <Text style={styles.kpiValue}>{stats.totalListings.toLocaleString()}</Text>
                    <Text style={styles.kpiLabel}>{locale === 'es' ? 'Mis Alojamientos' : 'My Properties'}</Text>
                    <View style={styles.kpiFooter}>
                      <Text style={styles.kpiFooterText}>
                        🏠 {locale === 'es' ? 'Total publicados' : 'Total published'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Card 2: Renta Promedio */}
                  <View style={styles.kpiCard}>
                    <View style={styles.kpiHeader}>
                      <View style={[styles.kpiIconBox, { backgroundColor: accentColor + '18' }]}>
                        <MaterialCommunityIcons name="currency-usd" size={20} color={accentColor} />
                      </View>
                    </View>
                    <Text style={styles.kpiValue}>${stats.avgPrice.toLocaleString()}</Text>
                    <Text style={styles.kpiLabel}>{locale === 'es' ? 'Renta Promedio' : 'Average Rent'}</Text>
                    <View style={styles.kpiFooter}>
                      <Text style={styles.kpiFooterText}>
                        💵 {locale === 'es' ? 'De tus propiedades' : 'For your listings'}
                      </Text>
                    </View>
                  </View>

                  {/* Card 3: Contratos de Alquiler */}
                  <TouchableOpacity style={styles.kpiCard} onPress={() => router.push('/(admin)/contracts' as any)}>
                    <View style={styles.kpiHeader}>
                      <View style={[styles.kpiIconBox, { backgroundColor: '#49c78818' }]}>
                        <MaterialCommunityIcons name="file-document-multiple" size={20} color="#49c788" />
                      </View>
                      <Text style={[styles.kpiTrend, { color: '#49c788' }]}>{stats.activeContracts} {locale === 'es' ? 'activos' : 'active'}</Text>
                    </View>
                    <Text style={styles.kpiValue}>{stats.totalContracts.toLocaleString()}</Text>
                    <Text style={styles.kpiLabel}>{locale === 'es' ? 'Contratos de Alquiler' : 'Rental Agreements'}</Text>
                    <View style={styles.kpiFooter}>
                      <Text style={[styles.kpiFooterText, { color: '#FFB800' }]}>
                        ⏳ {stats.pendingContracts} {locale === 'es' ? 'pendientes' : 'pending'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}

            </View>

            {/* SECCIÓN: REGISTROS RECIENTES (Solo Admins) */}
            {userRole === 'admin' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{locale === 'es' ? 'Últimos Usuarios Registrados' : 'Recent Signups'}</Text>
                  <TouchableOpacity onPress={() => router.push('/(admin)/users' as any)}>
                    <Text style={[styles.seeAll, { color: accentColor }]}>{t('admin.overview.see_all')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.sectionBody}>
                  {recentUsers.map((u) => (
                    <View key={u.id} style={styles.activityRow}>
                      <View style={[styles.userAvatar, { borderColor: accentColor + '20' }]}>
                        <Text style={[styles.userAvatarText, { color: accentColor }]}>{(u.name || '?')[0].toUpperCase()}</Text>
                      </View>
                      <View style={styles.activityDetails}>
                        <Text style={styles.activityName} numberOfLines={1}>{u.name || 'Unknown'}</Text>
                        <Text style={styles.activityTime}>{formatDate(u.created_at)}</Text>
                      </View>
                      <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLOR[u.role] || '#888') + '15', borderColor: (ROLE_COLOR[u.role] || '#888') + '30' }]}>
                        <Text style={[styles.roleText, { color: ROLE_COLOR[u.role] || '#888' }]}>
                          {u.role || 'none'}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {recentUsers.length === 0 && (
                    <Text style={styles.emptyText}>{t('admin.overview.no_users')}</Text>
                  )}
                </View>
              </View>
            )}

            {/* SECCIÓN: CONTRATOS RECIENTES */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {userRole === 'admin' 
                    ? (locale === 'es' ? 'Contratos Recientes del Sistema' : 'Recent System Leases') 
                    : (locale === 'es' ? 'Mis Contratos de Renta' : 'My Active Leases')}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(admin)/contracts' as any)}>
                  <Text style={[styles.seeAll, { color: accentColor }]}>{t('admin.overview.see_all')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sectionBody}>
                {recentContracts.map((c) => (
                  <TouchableOpacity key={c.id} style={styles.activityRow} onPress={() => router.push('/(admin)/contracts' as any)}>
                    <View style={[styles.kpiIconBox, { backgroundColor: '#111', width: 38, height: 38, borderRadius: 19 }]}>
                      <MaterialCommunityIcons name="file-document-outline" size={18} color="#fff" />
                    </View>
                    <View style={styles.activityDetails}>
                      <Text style={styles.activityName} numberOfLines={1}>{translateContractType(c.type)}</Text>
                      <Text style={styles.activityTime}>{locale === 'es' ? 'Por' : 'By'}: {c.initiator?.name || '—'} · {formatDate(c.created_at)}</Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: (CONTRACT_STATUS_COLOR[c.status] || '#888') + '15', borderColor: (CONTRACT_STATUS_COLOR[c.status] || '#888') + '30' }]}>
                      <Text style={[styles.roleText, { color: CONTRACT_STATUS_COLOR[c.status] || '#888', fontSize: 9 }]}>
                        {c.status === 'pending_authorization' ? (locale === 'es' ? 'Pendiente' : 'Pending') : c.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {recentContracts.length === 0 && (
                  <Text style={styles.emptyText}>{locale === 'es' ? 'No hay contratos registrados' : 'No agreements found'}</Text>
                )}
              </View>
            </View>

            {/* ACCIONES RÁPIDAS */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{locale === 'es' ? 'Accesos Rápidos' : 'Quick Actions'}</Text>
              <View style={styles.actionsGrid}>
                {[
                  { key: 'users', label: locale === 'es' ? 'Gestionar Usuarios' : 'Users Admin', icon: 'account-cog' as const, color: accentColor, route: '/(admin)/users', roles: ['admin'] },
                  { key: 'listings', label: locale === 'es' ? 'Gestionar Alojamientos' : 'Listings Admin', icon: 'home-cog' as const, color: '#3b82f6', route: '/(admin)/listings', roles: ['admin', 'company', 'landlord'] },
                  { key: 'contracts', label: locale === 'es' ? 'Moderar Contratos' : 'Contracts Hub', icon: 'file-cog' as const, color: '#49c788', route: '/(admin)/contracts', roles: ['admin', 'company', 'landlord'] },
                  { key: 'reports', label: locale === 'es' ? 'Reportes de Seguridad' : 'Reports Hub', icon: 'alert-cog' as const, color: '#f97316', route: '/(admin)/reports', roles: ['admin', 'company', 'landlord'] },
                  { key: 'verifications', label: locale === 'es' ? 'Verificación de Identidad' : 'Verifications', icon: 'shield-cog' as const, color: '#06b6d4', route: '/(admin)/verifications', roles: ['admin'] },
                  { key: 'settings', label: locale === 'es' ? 'Ajustes del Panel' : 'Settings', icon: 'cog-outline' as const, color: '#888', route: '/(admin)/settings', roles: ['admin', 'company', 'landlord'] },
                ].filter(a => userRole && a.roles.includes(userRole)).map((a) => (
                  <TouchableOpacity
                    key={a.key}
                    style={styles.actionBtn}
                    onPress={() => router.push(a.route as any)}
                  >
                    <MaterialCommunityIcons name={a.icon as any} size={20} color={a.color} />
                    <Text style={styles.actionLabel} numberOfLines={1}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#050505' },
  scroll:        { flex: 1 },
  scrollContent: { padding: 20, gap: 20 },
  header:        { gap: 4 },
  pageTitle:     { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  pageSubtitle:  { fontSize: 13, color: '#666', lineHeight: 18 },
  centerLoader:  { paddingTop: 100, alignItems: 'center' },
  
  // KPI stats grid
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: {
    backgroundColor: '#0c0c0c',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#161616',
    padding: 16,
    width: '48%',
    gap: 8,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiTrend: {
    fontSize: 10,
    fontWeight: '700',
    color: '#49c788',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: '500',
  },
  kpiFooter: {
    borderTopWidth: 1,
    borderTopColor: '#161616',
    paddingTop: 8,
    marginTop: 4,
  },
  kpiFooterText: {
    fontSize: 10,
    color: '#555',
    fontWeight: '600',
  },

  // Sections
  section: {
    backgroundColor: '#0c0c0c',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#161616',
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionBody: {
    gap: 10,
  },

  // Activity Rows
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#070707',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#111',
    padding: 10,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  userAvatarText: {
    fontWeight: '800',
    fontSize: 14,
  },
  activityDetails: {
    flex: 1,
    gap: 2,
  },
  activityName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activityTime: {
    color: '#555',
    fontSize: 11,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyText: {
    color: '#444',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },

  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#070707',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#111',
    width: '48%',
  },
  actionLabel: {
    color: '#bbb',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
