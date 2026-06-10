import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function AboutScreen() {
  const router = useRouter();
  const { locale } = useTranslation();
  const isEs = locale === 'es';

  const handleShowLicensing = () => {
    Alert.alert(
      isEs ? "Licencias de Código Abierto" : "Open Source Licenses",
      isEs
        ? "RoommateFinder depende de bibliotecas de código abierto:\n\n• React Native (MIT)\n• Expo (MIT)\n• Supabase (MIT)\n• Shopify FlashList (MIT)\n• OpenStreetMap Nominatim (ODbL)\n\n¡Gracias a todos los desarrolladores que construyen la web abierta!"
        : "RoommateFinder relies on open-source libraries:\n\n• React Native (MIT)\n• Expo (MIT)\n• Supabase (MIT)\n• Shopify FlashList (MIT)\n• OpenStreetMap Nominatim (ODbL)\n\nThank you to all developers who build the open web!",
      [{ text: "OK" }]
    );
  };

  const OptionRow = ({ icon, title, onPress }: { icon: string; title: string; onPress: () => void }) => (
    <Pressable 
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]} 
      onPress={onPress}
    >
      <View style={styles.itemLeft}>
        <MaterialCommunityIcons name={icon as any} size={20} color="#888" style={{ marginRight: 14 }} />
        <Text style={styles.itemText}>{title}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#555" />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#131824', '#000']} style={styles.header}>
        <Pressable 
          onPress={() => router.back()} 
          style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.title}>
          {isEs ? "Acerca de" : "About"}
        </Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* App Branding Header */}
        <LinearGradient colors={['#181a24', '#05070a']} style={styles.brandHero}>
          <View style={styles.logoWrap}>
            <MaterialCommunityIcons name="home-group" size={40} color="#49C788" />
          </View>
          <Text style={styles.brandName}>RoommateFinder</Text>
          <Text style={styles.brandVersion}>v2.1.0</Text>
          <Text style={styles.brandDesc}>
            {isEs 
              ? "Diseñado con ❤️ para ayudar a roommates a convivir en armonía mediante contratos inteligentes, confianza verificada y búsquedas geolocalizadas."
              : "Designed with ❤️ to help roommates co-live in harmony using smart contracts, verified trust, and geolocalized roommate searching."}
          </Text>
        </LinearGradient>

        <Text style={styles.sectionTitle}>
          {isEs ? "Información Legal" : "Legal Information"}
        </Text>
        <View style={styles.glassCard}>
          <OptionRow
            icon="file-document-outline"
            title={isEs ? "Términos de Servicio" : "Terms of Service"}
            onPress={() => router.push('/terms')}
          />
          <View style={styles.cardDivider} />
          <OptionRow
            icon="shield-check-outline"
            title={isEs ? "Política de Privacidad" : "Privacy Policy"}
            onPress={() => {
              Alert.alert(
                isEs ? "Política de Privacidad" : "Privacy Policy",
                isEs 
                  ? "Tus datos personales y biometricos están encriptados y protegidos. No compartimos información con terceros sin tu consentimiento explícito."
                  : "Your personal and biometric data is fully encrypted and protected. We never share your details with third parties without your explicit consent.",
                [{ text: "OK" }]
              );
            }}
          />
          <View style={styles.cardDivider} />
          <OptionRow
            icon="license"
            title={isEs ? "Licencias de Código Abierto" : "Open Source Licenses"}
            onPress={handleShowLicensing}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.copyright}>© 2026 RoommateFinder Inc.</Text>
          <Text style={styles.allRights}>{isEs ? "Todos los derechos reservados." : "All rights reserved."}</Text>
        </View>
      </ScrollView>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btnPressed: {
    opacity: 0.8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  brandHero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(73,199,136,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(73,199,136,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#49C788',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  brandVersion: {
    fontSize: 13,
    color: '#49C788',
    fontWeight: '700',
    marginTop: 4,
  },
  brandDesc: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 14,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#555',
    marginBottom: 8,
    marginTop: 24,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 50,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 4,
  },
  copyright: {
    color: '#333',
    fontSize: 12,
    fontWeight: '700',
  },
  allRights: {
    color: '#222',
    fontSize: 11,
    fontWeight: '600',
  },
});
