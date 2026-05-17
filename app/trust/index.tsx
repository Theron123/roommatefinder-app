import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

export default function TrustAndSafetyHub() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!profile) setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const { data } = await supabase
        .from('profiles')
        .select('trust_score, is_identity_verified, is_university_verified, is_workplace_verified, is_income_verified')
        .eq('id', session.user.id)
        .single();
      setProfile(data);
    }
    setLoading(false);
  };

  if (loading) {
    return <SafeAreaView style={s.container}><ActivityIndicator color="#0A84FF" style={{ marginTop: 100 }} /></SafeAreaView>;
  }

  const score = profile?.trust_score || 20;
  const scoreColor = score > 75 ? '#34C759' : score > 40 ? '#FFD60A' : '#FF453A';

  const VerificationItem = ({ icon, title, desc, verified, type }: any) => (
    <Pressable 
      style={[s.verifyCard, verified && s.verifyCardActive]}
      onPress={() => !verified && router.push({ pathname: '/trust/verify', params: { type } })}
    >
      <View style={[s.iconWrap, verified && { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
        <MaterialCommunityIcons name={icon} size={24} color={verified ? '#34C759' : '#888'} />
      </View>
      <View style={s.verifyInfo}>
        <Text style={[s.verifyTitle, verified && { color: '#fff' }]}>{title}</Text>
        <Text style={s.verifyDesc}>{verified ? 'Verificado exitosamente' : desc}</Text>
      </View>
      <MaterialCommunityIcons 
        name={verified ? "check-circle" : "chevron-right"} 
        size={24} 
        color={verified ? '#34C759' : '#444'} 
      />
    </Pressable>
  );

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#0d1117', '#000']} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Trust & Safety</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Trust Score Hero */}
        <View style={s.scoreHero}>
          <Text style={s.heroSubtitle}>TU TRUST SCORE</Text>
          <View style={s.scoreCircleWrapper}>
            <View style={[s.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={[s.scoreValue, { color: scoreColor }]}>{score}</Text>
            </View>
          </View>
          <Text style={s.heroDesc}>
            Completa verificaciones para subir tu puntaje. Los perfiles con +80 puntos reciben 3x más respuestas.
          </Text>
        </View>

        {/* Protection Badge */}
        <View style={s.shieldCard}>
          <MaterialCommunityIcons name="shield-lock-outline" size={24} color="#0A84FF" />
          <View style={{ flex: 1 }}>
            <Text style={s.shieldTitle}>Protección Anti-Fraude Activa</Text>
            <Text style={s.shieldDesc}>
              Nuestro sistema analiza y filtra automáticamente comportamientos sospechosos para mantener la comunidad segura.
            </Text>
          </View>
        </View>

        <Text style={s.sectionHeader}>VERIFICACIONES DE PERFIL</Text>

        <VerificationItem 
          icon="face-recognition" 
          title="Identidad Oficial" 
          desc="Sube una selfie y tu ID gubernamental" 
          verified={profile?.is_identity_verified}
          type="identity"
        />
        <VerificationItem 
          icon="school" 
          title="Educación" 
          desc="Verifica tu correo .edu universitario" 
          verified={profile?.is_university_verified}
          type="university"
        />
        <VerificationItem 
          icon="briefcase" 
          title="Trabajo" 
          desc="Verifica tu correo corporativo" 
          verified={profile?.is_workplace_verified}
          type="workplace"
        />
        <VerificationItem 
          icon="cash-multiple" 
          title="Ingresos (Opcional)" 
          desc="Prueba de solvencia para rentas" 
          verified={profile?.is_income_verified}
          type="income"
        />

        <View style={s.footerLinks}>
          <Pressable style={s.footerBtn}>
            <MaterialCommunityIcons name="book-open-outline" size={18} color="#888" />
            <Text style={s.footerBtnText}>Consejos de Seguridad</Text>
          </Pressable>
          <Pressable style={s.footerBtn}>
            <MaterialCommunityIcons name="gavel" size={18} color="#888" />
            <Text style={s.footerBtnText}>Políticas de Moderación</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  
  scoreHero: { alignItems: 'center', marginBottom: 30 },
  heroSubtitle: { color: '#888', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 15 },
  scoreCircleWrapper: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  scoreCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  scoreValue: { fontSize: 48, fontWeight: '900' },
  heroDesc: { color: '#666', fontSize: 13, textAlign: 'center', marginTop: 15, lineHeight: 20, paddingHorizontal: 20 },
  
  shieldCard: { flexDirection: 'row', backgroundColor: 'rgba(10, 132, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.2)', borderRadius: 16, padding: 16, gap: 14, marginBottom: 30, alignItems: 'center' },
  shieldTitle: { color: '#0A84FF', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  shieldDesc: { color: '#888', fontSize: 12, lineHeight: 18 },
  
  sectionHeader: { color: '#555', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  verifyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#1a1a2e', borderRadius: 16, padding: 16, marginBottom: 12, gap: 14 },
  verifyCardActive: { borderColor: 'rgba(52, 199, 89, 0.3)' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  verifyInfo: { flex: 1 },
  verifyTitle: { color: '#ccc', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  verifyDesc: { color: '#666', fontSize: 12 },

  footerLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 10 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerBtnText: { color: '#888', fontSize: 13, fontWeight: '600' }
});
