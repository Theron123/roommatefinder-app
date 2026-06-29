import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';

export default function AdminPayments() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { locale, t } = useTranslation();
  const { accentColor } = useAdminTheme();

  const fetchStats = async () => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    setTotalUsers(count || 0);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchStats(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  const PLAN_FEATURES = locale === 'es' ? [
    'Swipes ilimitados',
    'Ver todos los perfiles (sin desenfoque)',
    'Algoritmo de prioridad de búsqueda',
    'Generación de contratos digitales',
    'Insignia de verificación de identidad',
    'Filtros avanzados de búsqueda',
  ] : [
    'Unlimited swipes',
    'See all profiles (no blur)',
    'Priority matching algorithm',
    'Contract generation',
    'Trust verification badge',
    'Advanced filters',
  ];

  const ROADMAP = locale === 'es' ? [
    { num: '1', text: 'Crear una tabla `subscriptions` en Supabase (user_id, plan, started_at, expires_at, status).' },
    { num: '2', text: 'Integrar Stripe o un proveedor local de pagos (e.g. MercadoPago) para procesar cobros.' },
    { num: '3', text: 'Crear una Edge Function de Supabase para escuchar los webhooks y actualizar el estado.' },
    { num: '4', text: 'Reemplazar la lógica de AsyncStorage en `subscriptions.tsx` con consultas directas a Supabase.' },
  ] : [
    { num: '1', text: 'Create a `subscriptions` table in Supabase (user_id, plan, started_at, expires_at, status).' },
    { num: '2', text: 'Integrate Stripe or a LATAM provider (e.g. PayU, MercadoPago) for payment processing.' },
    { num: '3', text: 'Create a Supabase Edge Function to handle payment webhooks and update subscription status.' },
    { num: '4', text: 'Replace AsyncStorage subscription logic in `subscriptions.tsx` with Supabase real-time queries.' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >
        <View style={styles.header}>
          <Text style={styles.pageTitle}>{t('admin.payments.title', 'Payments & Subscriptions')}</Text>
          <Text style={styles.pageSubtitle}>{t('admin.payments.subtitle', 'Revenue overview and subscription management')}</Text>
        </View>

        {/* Migration notice */}
        <View style={styles.notice}>
          <MaterialCommunityIcons name="information" size={18} color="#f97316" />
          <View style={styles.noticeBody}>
            <Text style={styles.noticeTitle}>{locale === 'es' ? "Suscripciones pendientes de migración" : "Subscriptions pending migration"}</Text>
            <Text style={styles.noticeText}>
              {locale === 'es'
                ? "El estado de las suscripciones se almacena localmente en cada dispositivo (AsyncStorage). Sigue la guía a continuación para migrar a pagos reales."
                : "Subscription status is currently stored locally on each device (AsyncStorage). Follow the roadmap below to enable real payment tracking."}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color={accentColor} />
          </View>
        ) : (
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              {[
                { label: t('admin.overview.total_users', 'Total Users'),  value: totalUsers, color: '#fff',    icon: 'account-group' as const },
                { label: 'Premium',      value: 0,          color: '#f97316', icon: 'crown'          as const },
                { label: locale === 'es' ? 'Gratis' : 'Free', value: totalUsers, color: accentColor, icon: 'account'        as const },
                { label: locale === 'es' ? 'Conversión' : 'Conversion',   value: '0%',       color: '#3b82f6', icon: 'trending-up'    as const },
              ].map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <MaterialCommunityIcons name={s.icon} size={22} color={s.color} />
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Premium plan card */}
            <View style={styles.planCard}>
              <View style={styles.planHeader}>
                <MaterialCommunityIcons name="crown" size={22} color="#f97316" />
                <Text style={styles.planName}>{locale === 'es' ? 'Plan Premium' : 'Premium Plan'}</Text>
                <View style={[styles.planBadge, { backgroundColor: `${accentColor}20` }]}>
                  <Text style={[styles.planBadgeText, { color: accentColor }]}>{locale === 'es' ? 'Configurado' : 'Configured'}</Text>
                </View>
              </View>
              <View style={styles.planFeatures}>
                {PLAN_FEATURES.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <MaterialCommunityIcons name="check-circle" size={15} color={accentColor} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Roadmap */}
            <View style={styles.roadmapCard}>
              <Text style={styles.roadmapTitle}>{locale === 'es' ? "Ruta hacia Pagos Reales" : "Roadmap to Real Payments"}</Text>
              {ROADMAP.map((step) => (
                <View key={step.num} style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}55` }]}>
                    <Text style={[styles.stepNumText, { color: accentColor }]}>{step.num}</Text>
                  </View>
                  <Text style={styles.stepText}>{step.text}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0a0a0a' },
  scroll:         { flex: 1 },
  content:        { padding: 24, gap: 20 },
  header:         { gap: 4 },
  pageTitle:      { fontSize: 22, fontWeight: '700', color: '#fff' },
  pageSubtitle:   { fontSize: 13, color: '#888' },
  notice:         { flexDirection: 'row', gap: 12, backgroundColor: '#1a0f00', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#3d2200', alignItems: 'flex-start' },
  noticeBody:     { flex: 1, gap: 4 },
  noticeTitle:    { color: '#f97316', fontWeight: '600', fontSize: 14 },
  noticeText:     { color: '#888', fontSize: 13, lineHeight: 18 },
  centerLoader:   { paddingTop: 60, alignItems: 'center' },
  statsRow:       { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  statCard:       { flex: 1, minWidth: 80, backgroundColor: '#111', borderRadius: 12, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#1a1a1a' },
  statValue:      { fontSize: 22, fontWeight: '700' },
  statLabel:      { color: '#666', fontSize: 11, textAlign: 'center' },
  planCard:       { backgroundColor: '#111', borderRadius: 14, padding: 20, gap: 14, borderWidth: 1, borderColor: '#f97316' + '44' },
  planHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planName:       { color: '#fff', fontWeight: '700', fontSize: 17, flex: 1 },
  planBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  planBadgeText:  { fontSize: 11, fontWeight: '600' },
  planFeatures:   { gap: 10 },
  featureRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText:    { color: '#ccc', fontSize: 14 },
  roadmapCard:    { backgroundColor: '#111', borderRadius: 14, padding: 20, gap: 14, borderWidth: 1, borderColor: '#1a1a1a' },
  roadmapTitle:   { color: '#fff', fontWeight: '600', fontSize: 15 },
  stepRow:        { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum:        { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  stepNumText:    { fontWeight: '700', fontSize: 13 },
  stepText:       { color: '#888', fontSize: 13, lineHeight: 19, flex: 1 },
});
