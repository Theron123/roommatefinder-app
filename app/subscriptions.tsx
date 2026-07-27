import { View, Text, StyleSheet, Pressable, SafeAreaView, ActivityIndicator, Linking, Switch } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Estados de Stripe que consideramos "premium activo" para desbloquear el paywall
const ACTIVE_STATUSES = ['active', 'trialing'];

// Pantalla de suscripción real: lee el estado desde `subscriptions` (fuente de
// verdad = webhook de Stripe, nunca el cliente) y, si no hay una activa,
// ofrece iniciar un Stripe Checkout real. Mientras Stripe no esté configurado
// en el entorno, además ofrece un slider de "modo prueba" (toggle-test-subscription)
// para simular premium en QA sin necesitar claves reales.
export default function SubscriptionsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [togglingTest, setTogglingTest] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
    fetchStripeStatus();
  }, []);

  // Lee el estado real de la suscripción del usuario desde Supabase (tabla subscriptions)
  const fetchSubscriptionStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data } = await supabase
          .from('subscriptions')
          .select('status, current_period_end')
          .eq('user_id', session.user.id)
          .maybeSingle();
        setStatus(data?.status ?? null);
        setCurrentPeriodEnd(data?.current_period_end ?? null);
      }
    } catch (e) {
      console.error('Error cargando estado de suscripción:', e);
    }
    setLoading(false);
  };

  // Verifica si Stripe ya está configurado en este entorno (sin exponer la clave)
  // para decidir si mostrar el slider de modo prueba
  const fetchStripeStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-status', { body: {} });
      if (!error && data?.success) {
        setStripeConfigured(Boolean(data.configured));
      }
    } catch (e) {
      console.error('Error verificando estado de Stripe:', e);
    }
  };

  // Simula (o quita) premium vía toggle-test-subscription — solo funciona
  // mientras Stripe no esté configurado, la función se autodesactiva sola
  const handleTestToggle = async (active: boolean) => {
    setTogglingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('toggle-test-subscription', {
        body: { active },
      });
      if (error || !data?.success) {
        console.error('Error alternando modo prueba:', error || data?.message);
        return;
      }
      await fetchSubscriptionStatus();
    } catch (e) {
      console.error('Error alternando modo prueba:', e);
    } finally {
      setTogglingTest(false);
    }
  };

  // Llama a la Edge Function que crea la Stripe Checkout Session y abre esa URL real
  const startCheckout = async () => {
    setCheckingOut(true);
    setNotConfigured(false);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {},
      });

      if (error || !data?.url) {
        // 501 = Stripe aún no configurado (sin STRIPE_SECRET_KEY/STRIPE_PRICE_ID)
        setNotConfigured(true);
        return;
      }

      await Linking.openURL(data.url);
    } catch (e) {
      console.error('Error iniciando checkout de Stripe:', e);
      setNotConfigured(true);
    } finally {
      setCheckingOut(false);
    }
  };

  const isPremium = status ? ACTIVE_STATUSES.includes(status) : false;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Premium Plans</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.premiumSection}>
        <View style={styles.premiumHeader}>
          <IconSymbol name="star.fill" size={24} color="#49C788" />
          <Text style={styles.premiumTitle}>Premium</Text>
        </View>

        <Text style={styles.infoText}>
          Desbloquea todos los perfiles del feed y otras funciones premium.
        </Text>

        {loading ? (
          <ActivityIndicator color="#49C788" size="large" style={{ marginTop: 20 }} />
        ) : (
          <>
            <View style={styles.subCard}>
              <View>
                <Text style={styles.subDuration}>Acceso Premium</Text>
                <Text style={styles.subDesc}>
                  {isPremium
                    ? `Activo${currentPeriodEnd ? ` · renueva ${new Date(currentPeriodEnd).toLocaleDateString()}` : ''}`
                    : status === 'past_due'
                    ? 'Pago pendiente'
                    : status === 'canceled'
                    ? 'Cancelado'
                    : 'Plan gratuito'}
                </Text>
              </View>
            </View>

            {!isPremium && (
              <Pressable
                style={[styles.checkoutBtn, checkingOut && { opacity: 0.6 }]}
                onPress={startCheckout}
                disabled={checkingOut}
              >
                {checkingOut ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.checkoutBtnText}>Suscribirme</Text>
                )}
              </Pressable>
            )}

            {notConfigured && (
              <Text style={styles.errorText}>
                Los pagos todavía no están disponibles. Inténtalo más tarde.
              </Text>
            )}

            {!stripeConfigured && (
              <View style={styles.testModeCard}>
                <View style={styles.testModeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.testModeTitle}>Modo de prueba</Text>
                    <Text style={styles.testModeDesc}>
                      Simula acceso premium para pruebas. Solo visible mientras Stripe no
                      esté configurado en este entorno.
                    </Text>
                  </View>
                  {togglingTest ? (
                    <ActivityIndicator color="#49C788" size="small" />
                  ) : (
                    <Switch
                      value={isPremium}
                      onValueChange={handleTestToggle}
                      trackColor={{ false: '#333', true: '#2f6b4f' }}
                      thumbColor={isPremium ? '#49C788' : '#888'}
                    />
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a24',
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  premiumSection: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#49C788',
  },
  infoText: {
    color: '#aaa',
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 20,
  },
  subCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subDuration: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subDesc: {
    color: '#888',
    marginTop: 4,
  },
  checkoutBtn: {
    backgroundColor: '#49C788',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  checkoutBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff6b6b',
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
  },
  testModeCard: {
    backgroundColor: '#1a1a10',
    borderWidth: 1,
    borderColor: '#3a3520',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  testModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  testModeTitle: {
    color: '#e0c94a',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  testModeDesc: {
    color: '#a89f6e',
    fontSize: 12,
    lineHeight: 16,
  },
});
