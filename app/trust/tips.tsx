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
        <Text style={s.headerTitle}>Security Tips</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <MaterialCommunityIcons name="shield-star" size={50} color="#49C788" />
          <Text style={s.heroTitle}>Your safety comes first</Text>
          <Text style={s.heroDesc}>
            At RoommateFinder we work to maintain a safe community, but prevention starts with you. Follow these key tips.
          </Text>
        </View>

        <TipCard 
          icon="currency-usd-off"
          title="Never pay outside the app"
          desc="Keep all booking and deposit transactions within our platform or in person after signing. Never make international bank transfers or use postal money orders."
        />
        <TipCard 
          icon="account-search"
          title="Meet face-to-face"
          desc="Before signing a contract, schedule a video call or an in-person meeting in a safe public place to verify they are a real person."
        />
        <TipCard 
          icon="shield-check"
          title="Filter by verified profiles"
          desc="Priorize users who have official ID, university, social media, or work verification badges. They have a much higher Trust Score."
        />
        <TipCard 
          icon="alert-octagon"
          title="Beware of 'incredible offers'"
          desc="If the price of a room is unbelievably low for the area and the photos look like they are from a magazine, it could be a scam. Trust your gut."
        />
        <TipCard 
          icon="file-sign"
          title="Formalize agreements in the Legal Hub"
          desc="Don't rely solely on word of mouth. Use our Smart Contracts tool to get payment, guest, and cleaning policies in writing."
        />
        <TipCard 
          icon="map-marker-radius"
          title="Don't share the exact address immediately"
          desc="If you are listing a room, share only the general area initially. Give the exact address only after you have verified the interested person's profile and they are about to make a visit."
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
