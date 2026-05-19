import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SecurityTipsScreen() {
  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#0d1117', '#000']} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Consejos de Seguridad</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <MaterialCommunityIcons name="shield-star" size={50} color="#49C788" />
          <Text style={s.heroTitle}>Tu seguridad es primero</Text>
          <Text style={s.heroDesc}>
            En RoommateFinder trabajamos para mantener una comunidad segura, pero la prevención empieza contigo. Sigue estos consejos clave.
          </Text>
        </View>

        <TipCard 
          icon="currency-usd-off"
          title="Nunca pagues fuera de la app"
          desc="Mantén todas las transacciones de reservas y depósitos dentro de nuestra plataforma o de manera presencial tras firmar. Nunca hagas transferencias bancarias internacionales ni uses giros postales."
        />
        <TipCard 
          icon="account-search"
          title="Conoce a la persona cara a cara"
          desc="Antes de firmar un contrato, agenda una videollamada o una reunión presencial en un lugar público seguro para verificar que sea una persona real."
        />
        <TipCard 
          icon="shield-check"
          title="Filtra por perfiles verificados"
          desc="Prioriza usuarios que tienen badges de identidad oficial, universidad, redes sociales o trabajo verificado. Tienen un Trust Score mucho más alto."
        />
        <TipCard 
          icon="alert-octagon"
          title="Cuidado con las 'ofertas increíbles'"
          desc="Si el precio de una habitación es increíblemente bajo para la zona y las fotos parecen de revista, podría ser una estafa. Confía en tu instinto."
        />
        <TipCard 
          icon="file-sign"
          title="Formaliza acuerdos en el Legal Hub"
          desc="No te bases solo en la palabra. Usa nuestra herramienta de Contratos Inteligentes para dejar por escrito las políticas de pagos, visitas y limpieza."
        />
        <TipCard 
          icon="map-marker-radius"
          title="No compartas la dirección exacta de inmediato"
          desc="Si estás publicando un cuarto, comparte solo la zona general inicialmente. Da la dirección exacta solo cuando hayas validado el perfil del interesado y vayan a hacer una visita."
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const TipCard = ({ icon, title, desc }: any) => (
  <View style={s.card}>
    <View style={s.iconWrap}>
      <MaterialCommunityIcons name={icon} size={24} color="#49C788" />
    </View>
    <View style={s.cardContent}>
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.cardDesc}>{desc}</Text>
    </View>
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 10 },
  hero: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  heroDesc: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  card: { backgroundColor: '#0d1117', borderRadius: 16, padding: 18, marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#1a1a2e' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(73,199,136,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardDesc: { color: '#888', fontSize: 13, lineHeight: 20 }
});
