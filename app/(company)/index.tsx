import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';

type MetricItem = {
  label: string;
  value: string | number;
  icon: string;
  color: string;
};

type ActivityItem = {
  id: string;
  type: 'application' | 'approval' | 'contract' | 'update';
  message: string;
  time: string;
  icon: string;
  color: string;
};

export default function CompanyDashboardHome() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, number>>({
    totalApartments: 0,
    activeListings: 0,
    occupiedApartments: 0,
    availableApartments: 0,
    pendingApps: 3,
    activeContracts: 0,
    monthlyViews: 1420,
    monthlyLeads: 48,
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const { locale } = useTranslation();
  const { accentColor } = useAdminTheme();

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;

      // 1. Fetch real listings from Supabase belonging to this company
      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, status, price')
        .eq('user_id', userId);

      const total = listingsData?.length || 0;
      const active = listingsData?.filter(l => l.status === 'active').length || 0;
      const occupied = listingsData?.filter(l => l.status === 'occupied').length || 0;
      const available = total - occupied;

      // 2. Fetch real contracts count from Supabase linked to these listings
      let contractsCount = 0;
      if (listingsData && listingsData.length > 0) {
        const listingIds = listingsData.map(l => l.id);
        const { count } = await supabase
          .from('contracts')
          .select('id', { count: 'exact', head: true })
          .in('listing_id', listingIds);
        contractsCount = count || 0;
      }

      // 3. Load applications count from simulated AsyncStorage list
      const appsKey = `company_apps:${userId}`;
      const savedApps = await AsyncStorage.getItem(appsKey);
      let pendingAppsCount = 3;
      if (savedApps) {
        const parsed = JSON.parse(savedApps);
        pendingAppsCount = parsed.filter((a: any) => a.status === 'pending').length;
      } else {
        // Initialize default mock apps
        const mockApps = [
          { id: '1', applicant: 'Carlos Mendoza', apartment: 'Premium Suite Condesa', status: 'pending', verifStatus: 'verified', date: '2026-07-11' },
          { id: '2', applicant: 'Sofía Vergara', apartment: 'Loft Duplex Roma', status: 'accepted', verifStatus: 'verified', date: '2026-07-10' },
          { id: '3', applicant: 'Mateo Díaz', apartment: 'Studio Flat Polanco', status: 'pending', verifStatus: 'unverified', date: '2026-07-12' },
        ];
        await AsyncStorage.setItem(appsKey, JSON.stringify(mockApps));
      }

      setMetrics({
        totalApartments: total,
        activeListings: active,
        occupiedApartments: occupied,
        availableApartments: available,
        pendingApps: pendingAppsCount,
        activeContracts: contractsCount,
        monthlyViews: 1420 + (total * 120),
        monthlyLeads: 48 + (total * 4),
      });

      // 4. Construct recent activities list
      setActivities([
        { id: '1', type: 'application', message: 'Nueva postulación recibida de Mateo Díaz para Studio Flat Polanco', time: 'Hace 2 horas', icon: 'clipboard-account', color: '#a855f7' },
        { id: '2', type: 'contract', message: 'Contrato firmado por Sofía Vergara para Loft Duplex Roma', time: 'Ayer', icon: 'file-check', color: '#49C788' },
        { id: '3', type: 'approval', message: 'Apartamento "Premium Suite Condesa" aprobado por el administrador', time: 'Hace 2 días', icon: 'check-decagram', color: '#3b82f6' },
        { id: '4', type: 'update', message: 'Actualizaste la disponibilidad de Loft Condesa Vista Parque', time: 'Hace 3 días', icon: 'refresh', color: '#888' },
      ]);

    } catch (e) {
      console.error('Error loading company dashboard home:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const dashboardMetrics: MetricItem[] = [
    { label: locale === 'es' ? 'Total Inmuebles' : 'Total Apartments', value: metrics.totalApartments, icon: 'office-building', color: accentColor },
    { label: locale === 'es' ? 'Anuncios Activos' : 'Active Listings', value: metrics.activeListings, icon: 'home-circle', color: '#3b82f6' },
    { label: locale === 'es' ? 'Inmuebles Ocupados' : 'Occupied Apartments', value: metrics.occupiedApartments, icon: 'home-lock', color: '#a855f7' },
    { label: locale === 'es' ? 'Inmuebles Disponibles' : 'Available Apartments', value: metrics.availableApartments, icon: 'home-export-outline', color: '#06b6d4' },
    { label: locale === 'es' ? 'Postulaciones Pendientes' : 'Pending Applications', value: metrics.pendingApps, icon: 'account-clock', color: '#ff9f0a' },
    { label: locale === 'es' ? 'Contratos Activos' : 'Active Contracts', value: metrics.activeContracts, icon: 'file-sign', color: '#49C788' },
    { label: locale === 'es' ? 'Visitas Mensuales' : 'Monthly Views', value: metrics.monthlyViews, icon: 'eye-outline', color: '#ec4899' },
    { label: locale === 'es' ? 'Contactos / Leads' : 'Monthly Leads', value: metrics.monthlyLeads, icon: 'comment-multiple-outline', color: '#eab308' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            {locale === 'es' ? 'Panel de Negocios' : 'Business Dashboard'}
          </Text>
          <Text style={styles.subtitleText}>
            {locale === 'es'
              ? 'Property Management System (PMS) — Gestiona tu portafolio inmobiliario.'
              : 'Property Management System (PMS) — Manage your real estate portfolio.'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <>
          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            {dashboardMetrics.map((item, idx) => (
              <View key={idx} style={styles.metricCard}>
                <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View>
                  <Text style={styles.metricValue}>{item.value}</Text>
                  <Text style={styles.metricLabel}>{item.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Performance Charts (Simulated Premium Visuals) */}
          <Text style={styles.sectionTitle}>{locale === 'es' ? 'Rendimiento Comercial' : 'Business Performance'}</Text>
          <View style={styles.chartsRow}>
            {/* Chart 1: Views & Leads */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{locale === 'es' ? 'Visitas vs Contactos' : 'Views vs Leads'}</Text>
              <View style={styles.chartVisual}>
                {/* Visual Bar Graph Simulation */}
                <View style={styles.barsContainer}>
                  {[
                    { label: 'Ene', views: 40, leads: 15 },
                    { label: 'Feb', views: 60, leads: 22 },
                    { label: 'Mar', views: 75, leads: 30 },
                    { label: 'Abr', views: 90, leads: 42 },
                    { label: 'May', views: 110, leads: 50 },
                  ].map((bar, i) => (
                    <View key={i} style={styles.barColumn}>
                      <View style={styles.barsStack}>
                        <View style={[styles.barValue, { height: bar.views, backgroundColor: accentColor }]} />
                        <View style={[styles.barValue, { height: bar.leads, backgroundColor: '#3b82f6', marginTop: 4 }]} />
                      </View>
                      <Text style={styles.barLabel}>{bar.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
                  <Text style={styles.legendText}>{locale === 'es' ? 'Visitas' : 'Views'}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                  <Text style={styles.legendText}>{locale === 'es' ? 'Leads' : 'Leads'}</Text>
                </View>
              </View>
            </View>

            {/* Chart 2: Occupancy Rate */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{locale === 'es' ? 'Ocupación de Portafolio' : 'Portfolio Occupancy'}</Text>
              <View style={styles.donutVisual}>
                <View style={[styles.donutCircle, { borderColor: accentColor }]}>
                  <Text style={[styles.donutValue, { color: accentColor }]}>
                    {metrics.totalApartments > 0
                      ? Math.round((metrics.occupiedApartments / metrics.totalApartments) * 100)
                      : 75}%
                  </Text>
                  <Text style={styles.donutLabel}>{locale === 'es' ? 'Ocupado' : 'Occupied'}</Text>
                </View>
              </View>
              <View style={styles.chartLegend}>
                <Text style={styles.legendText}>
                  {locale === 'es'
                    ? `${metrics.occupiedApartments} de ${metrics.totalApartments} apartamentos arrendados`
                    : `${metrics.occupiedApartments} of ${metrics.totalApartments} apartments rented`}
                </Text>
              </View>
            </View>
          </View>

          {/* Recent Activity */}
          <Text style={styles.sectionTitle}>{locale === 'es' ? 'Actividad Reciente' : 'Recent Activity'}</Text>
          <View style={styles.activityCard}>
            {activities.map((item) => (
              <View key={item.id} style={styles.activityRow}>
                <View style={[styles.activityIconBox, { backgroundColor: item.color + '15' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityMessage}>{item.message}</Text>
                  <Text style={styles.activityTime}>{item.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitleText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  loaderWrap: {
    flex: 1,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  metricCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12121a',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: '1.5%',
    marginVertical: 6,
    gap: 12,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  chartsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  chartCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#12121a',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  chartTitle: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartVisual: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    height: 120,
  },
  barColumn: {
    alignItems: 'center',
    gap: 8,
  },
  barsStack: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
  },
  barValue: {
    width: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barLabel: {
    color: '#444',
    fontSize: 9,
    fontWeight: '600',
  },
  donutVisual: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  donutLabel: {
    color: '#444',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
    paddingTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#555',
    fontSize: 10,
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: '#12121a',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  activityRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    gap: 12,
  },
  activityIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    gap: 2,
  },
  activityMessage: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 16,
  },
  activityTime: {
    color: '#555',
    fontSize: 10,
  },
});
