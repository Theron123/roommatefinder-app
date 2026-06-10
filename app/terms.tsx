import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../context/LanguageContext';
import { translations } from '../constants/translations';

export default function TermsScreen() {
  const { t, locale } = useTranslation();

  const icons = ['🏛️', '⚖️', '🔏', '🛡️', '🔒', '📧', '🚫', '🔄', '📞'];
  const sections = (translations[locale]?.terms?.sections || []).map((sec: any, idx: number) => ({
    ...sec,
    icon: icons[idx] || '📄'
  }));

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#0d1117', '#000']} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>{t('terms.title')}</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIconWrap}>
            <MaterialCommunityIcons name="shield-check" size={40} color="#49C788" />
          </View>
          <Text style={s.heroTitle}>{t('terms.hero_title')}</Text>
          <Text style={s.heroSub}>
            {t('terms.hero_sub')}
          </Text>
        </View>

        {/* Intermediary badge */}
        <View style={s.intermediaryCard}>
          <MaterialCommunityIcons name="information-outline" size={20} color="#49C788" />
          <Text style={s.intermediaryText}>
            <Text style={{ fontWeight: '800', color: '#49C788' }}>{t('terms.intermediary_title')}</Text>
            {' '}{t('terms.intermediary_desc')}
          </Text>
        </View>

        {/* Sections */}
        {sections.map((sec, i) => (
          <View key={i} style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionIcon}>{sec.icon}</Text>
              <Text style={s.sectionTitle}>{sec.title}</Text>
            </View>
            <Text style={s.sectionContent}>{sec.content}</Text>
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            {t('terms.questions_note')}
          </Text>
          <Text style={s.footerVersion}>{t('terms.footer_version')}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#000' },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 8 },
  backBtn:          { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  headerTitle:      { flex: 1, color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  scroll:           { paddingHorizontal: 20 },
  hero:             { alignItems: 'center', paddingVertical: 28, gap: 10 },
  heroIconWrap:     { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(73,199,136,0.12)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(73,199,136,0.3)' },
  heroTitle:        { color: '#fff', fontSize: 24, fontWeight: '800' },
  heroSub:          { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },
  intermediaryCard: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(73,199,136,0.06)', borderWidth: 1, borderColor: 'rgba(73,199,136,0.25)', borderRadius: 14, padding: 16, marginBottom: 24, alignItems: 'flex-start' },
  intermediaryText: { color: '#aaa', fontSize: 13, lineHeight: 20, flex: 1 },
  section:          { backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#1a1a2e', borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionIcon:      { fontSize: 20 },
  sectionTitle:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionContent:   { color: '#888', fontSize: 13, lineHeight: 22 },
  footer:           { alignItems: 'center', paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#111', gap: 6, marginTop: 12 },
  footerText:       { color: '#555', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  footerVersion:    { color: '#333', fontSize: 11 },
});
