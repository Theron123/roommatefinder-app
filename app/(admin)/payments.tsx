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

const ACTIVE_STATUSES = ['active', 'trialing'];

// Pantalla admin de pagos/suscripciones: métricas reales calculadas desde la
// tabla `subscriptions` (fuente de verdad = webhook de Stripe) y el estado
// real de configuración de Stripe en este entorno.
export default function AdminPayments() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [premiumCount, setPremiumCount] = useState(0);
  const [testCount, setTestCount] = useState(0);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { locale, t } = useTranslation();
  const { accentColor } = useAdminTheme();

  // Carga usuarios totales, suscripciones premium reales (activas/en trial) y
  // si Stripe está configurado en este entorno
  const fetchStats = async () => {
    const [{ count: usersCount }, { data: subs }, { data: statusData }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('status, stripe_subscription_id').in('status', ACTIVE_STATUSES),
      supabase.functions.invoke('stripe-status', { body: {} }),
    ]);

    setTotalUsers(usersCount || 0);
    setPremiumCount(subs?.length || 0);
    setTestCount((subs || []).filter((s) => s.stripe_subscription_id === 'test_simulated').length);
    setStripeConfigured(Boolean(statusData?.data?.configured));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchStats(); }, []);
  // Refresca las estadísticas (pull-to-refresh)
  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  const freeCount = Math.max(totalUsers - premiumCount, 0);
  const conversionPct = totalUsers > 0 ? `${((premiumCount / totalUsers) * 100).toFixed(1)}%` : '0%';

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

        {/* Aviso de estado real de Stripe */}
        {!loading && (
          <View style={styles.notice}>
            <MaterialCommunityIcons name={stripeConfigured ? 'check-circle' : 'information'} size={18} color={stripeConfigured ? accentColor : '#f97316'} />
            <View style={styles.noticeBody}>
              <Text style={[styles.noticeTitle, stripeConfigured && { color: accentColor }]}>
                {stripeConfigured
                  ? (locale === 'es' ? 'Stripe configurado' : 'Stripe configured')
                  : (locale === 'es' ? 'Stripe aún no configurado' : 'Stripe not configured yet')}
              </Text>
              <Text style={styles.noticeText}>
                {stripeConfigured
                  ? (locale === 'es'
                      ? 'Los cobros y el estado de suscripción se procesan en vivo vía Stripe (tabla `subscriptions`, actualizada por su webhook).'
                      : 'Charges and subscription status are processed live via Stripe (the `subscriptions` table, updated by its webhook).')
                  : (locale === 'es'
                      ? `Faltan las claves de Stripe en este entorno. Mientras tanto, los usuarios pueden simular premium en modo de prueba${testCount > 0 ? ` (${testCount} activa${testCount === 1 ? '' : 's'} ahora mismo)` : ''}.`
                      : `Stripe keys are missing in this environment. Meanwhile, users can simulate premium via test mode${testCount > 0 ? ` (${testCount} active right now)` : ''}.`)}
              </Text>
            </View>
          </View>
        )}

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
                { label: 'Premium',      value: premiumCount, color: '#f97316', icon: 'crown'          as const },
                { label: locale === 'es' ? 'Gratis' : 'Free', value: freeCount, color: accentColor, icon: 'account'        as const },
                { label: locale === 'es' ? 'Conversión' : 'Conversion',   value: conversionPct,       color: '#3b82f6', icon: 'trending-up'    as const },
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
                <View style={[styles.planBadge, { backgroundColor: stripeConfigured ? `${accentColor}20` : '#f9731620' }]}>
                  <Text style={[styles.planBadgeText, { color: stripeConfigured ? accentColor : '#f97316' }]}>
                    {stripeConfigured
                      ? (locale === 'es' ? 'Configurado' : 'Configured')
                      : (locale === 'es' ? 'Modo de prueba' : 'Test mode')}
                  </Text>
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

            {/* Estado real de la integración */}
            <View style={styles.roadmapCard}>
              <Text style={styles.roadmapTitle}>{locale === 'es' ? 'Estado de la integración' : 'Integration status'}</Text>
              {[
                locale === 'es' ? 'Tabla `subscriptions` en Supabase (RLS: solo lectura propia/admin, escritura solo vía service role)' : '`subscriptions` table in Supabase (RLS: read own/admin only, writes only via service role)',
                locale === 'es' ? 'Edge Function `create-checkout-session` (Stripe Checkout real)' : '`create-checkout-session` Edge Function (real Stripe Checkout)',
                locale === 'es' ? 'Edge Function `stripe-webhook` (actualiza el estado desde Stripe)' : '`stripe-webhook` Edge Function (updates status from Stripe)',
                stripeConfigured
                  ? (locale === 'es' ? 'Claves de Stripe configuradas — pagos en vivo' : 'Stripe keys configured — live payments')
                  : (locale === 'es' ? 'Pendiente: claves reales de Stripe (STRIPE_SECRET_KEY / STRIPE_PRICE_ID)' : 'Pending: real Stripe keys (STRIPE_SECRET_KEY / STRIPE_PRICE_ID)'),
              ].map((text, i) => (
                <View key={i} style={styles.stepRow}>
                  <MaterialCommunityIcons
                    name={i < 3 || stripeConfigured ? 'check-circle' : 'clock-outline'}
                    size={18}
                    color={i < 3 ? accentColor : stripeConfigured ? accentColor : '#888'}
                  />
                  <Text style={styles.stepText}>{text}</Text>
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
