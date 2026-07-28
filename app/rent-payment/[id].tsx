import { View, Text, StyleSheet, Pressable, SafeAreaView, ActivityIndicator, Linking } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Formato 'YYYY-MM' del mes en curso — hoy solo se puede pagar el mes actual,
// no hay selector de periodo todavía.
function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Pantalla de pago manual de renta de un listing puntual. A diferencia de
// Premium (app/subscriptions.tsx, mode: subscription), esto es un cobro único
// por mes (mode: payment) — el usuario vuelve a pagar cada mes a mano. El
// registro real vive en `rent_payments`, escrito únicamente por
// stripe-webhook cuando Stripe confirma el pago.
export default function RentPaymentScreen() {
  const { id: rawId } = useLocalSearchParams();
  const listingId = Array.isArray(rawId) ? rawId[0] : rawId || '';
  const router = useRouter();
  const period = currentPeriod();

  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<{ title: string | null; price: number | null } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  // Carga el listing (título/precio) y el estado real del pago de este mes desde rent_payments
  const fetchData = async () => {
    try {
      const [{ data: listingData }, { data: { session } }] = await Promise.all([
        supabase.from('listings').select('title, price').eq('id', listingId).maybeSingle(),
        supabase.auth.getSession(),
      ]);
      setListing(listingData);

      if (session?.user?.id) {
        const { data: paymentData } = await supabase
          .from('rent_payments')
          .select('status')
          .eq('user_id', session.user.id)
          .eq('listing_id', listingId)
          .eq('period', period)
          .maybeSingle();
        setPaymentStatus(paymentData?.status ?? null);
      }
    } catch (e) {
      console.error('Error cargando datos de pago de renta:', e);
    }
    setLoading(false);
  };

  // Llama a la Edge Function compartida con Premium (create-checkout-session)
  // pero con type:'rent' — crea un Checkout Session de pago único por el
  // monto exacto de este listing.
  const startCheckout = async () => {
    if (!listing?.price) return;
    setCheckingOut(true);
    setNotConfigured(false);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          type: 'rent',
          amountCents: Math.round(listing.price * 100),
          listingId,
          period,
        },
      });

      if (error || !data?.url) {
        setNotConfigured(true);
        return;
      }

      await Linking.openURL(data.url);
    } catch (e) {
      console.error('Error iniciando checkout de renta:', e);
      setNotConfigured(true);
    } finally {
      setCheckingOut(false);
    }
  };

  const isPaid = paymentStatus === 'paid';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Pago de Renta</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.section}>
        {loading ? (
          <ActivityIndicator color="#49C788" size="large" style={{ marginTop: 20 }} />
        ) : !listing ? (
          <Text style={styles.errorText}>No se encontró la propiedad.</Text>
        ) : (
          <>
            <Text style={styles.listingTitle}>{listing.title || 'Propiedad'}</Text>
            <Text style={styles.periodText}>Renta correspondiente a {period}</Text>

            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Monto a pagar</Text>
              <Text style={styles.amount}>${listing.price?.toFixed(2)}</Text>
            </View>

            {isPaid ? (
              <View style={styles.paidCard}>
                <MaterialCommunityIcons name="check-circle" size={22} color="#49C788" />
                <Text style={styles.paidText}>Ya pagaste la renta de este mes.</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.checkoutBtn, checkingOut && { opacity: 0.6 }]}
                onPress={startCheckout}
                disabled={checkingOut}
              >
                {checkingOut ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.checkoutBtnText}>Pagar renta</Text>
                )}
              </Pressable>
            )}

            {notConfigured && (
              <Text style={styles.errorText}>
                Los pagos todavía no están disponibles. Inténtalo más tarde.
              </Text>
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
  section: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  listingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  periodText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 24,
  },
  amountCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  amountLabel: {
    color: '#888',
    fontSize: 13,
    marginBottom: 6,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#49C788',
  },
  paidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0f1f16',
    borderWidth: 1,
    borderColor: '#1e3a2a',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  paidText: {
    color: '#49C788',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
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
});
