import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../context/LanguageContext';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

export default function SecurityTipsScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#131824', '#000']} style={s.header}>
        <Pressable 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/trust');
            }
          }}
          style={({ pressed }) => [s.backBtn, pressed && s.backBtnPressed]}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>{t('trust.security_tips')}</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.shieldHeroCircle}>
            <MaterialCommunityIcons name="shield-star" size={44} color="#34C759" />
          </View>
          <Text style={s.heroTitle}>{t('trust.tips_hero_title')}</Text>
          <Text style={s.heroDesc}>{t('trust.tips_hero_desc')}</Text>
        </View>

        <TipCard 
          icon="currency-usd-off"
          title={t('trust.tip1_title')}
          desc={t('trust.tip1_desc')}
        />
        <TipCard 
          icon="account-search"
          title={t('trust.tip2_title')}
          desc={t('trust.tip2_desc')}
        />
        <TipCard 
          icon="shield-check"
          title={t('trust.tip3_title')}
          desc={t('trust.tip3_desc')}
        />
        <TipCard 
          icon="alert-octagon"
          title={t('trust.tip4_title')}
          desc={t('trust.tip4_desc')}
        />
        <TipCard 
          icon="file-sign"
          title={t('trust.tip5_title')}
          desc={t('trust.tip5_desc')}
        />
        <TipCard 
          icon="map-marker-radius"
          title={t('trust.tip6_title')}
          desc={t('trust.tip6_desc')}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const TipCard = ({ icon, title, desc }: any) => (
  <BlurView intensity={10} tint="dark" style={s.card}>
    <View style={s.iconWrap}>
      <MaterialCommunityIcons name={icon} size={22} color="#34C759" />
    </View>
    <View style={s.cardContent}>
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.cardDesc}>{desc}</Text>
    </View>
  </BlurView>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backBtnPressed: {
    opacity: 0.7,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginRight: 8, letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 20, paddingTop: 10 },
  
  hero: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  shieldHeroCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(52, 199, 89, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center', letterSpacing: -0.5 },
  heroDesc: { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
  
  card: { backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: 20, padding: 18, marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(52,199,89,0.08)', borderWidth: 1, borderColor: 'rgba(52,199,89,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  cardDesc: { color: '#888', fontSize: 12, lineHeight: 18 }
});
