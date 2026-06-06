import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function TermsScreen() {
  const sections = [
    {
      icon: '🏛️',
      title: 'Platform Role',
      content:
        'RoommateFinder acts ONLY as a technological intermediary. We are not a party to any contract generated within the application. The contracts created are direct agreements between the users.',
    },
    {
      icon: '⚖️',
      title: 'Legal Validity',
      content:
        'Contracts generated in this app constitute a record of intent and agreement between the parties. However, they DO NOT substitute a contract drafted or reviewed by a certified attorney. For greater legal validity, it is recommended to notarize the document before a public notary.',
    },
    {
      icon: '🔏',
      title: 'Acceptance as Signature',
      content:
        'By pressing "Accept Contract" or "Request Authorization", the user acknowledges having read, understood, and accepted all terms of the contract. This is recorded with a timestamp in our database.',
    },
    {
      icon: '🛡️',
      title: 'Limitation of Liability',
      content:
        'RoommateFinder is not responsible for:\n• Disputes between landlords and tenants\n• Breach of any contract clause\n• Damages, losses, or liabilities derived from using contracts generated in the app\n• False information provided by users\n• Any illegal acts committed by either party',
    },
    {
      icon: '🔒',
      title: 'Privacy and Data',
      content:
        'Contracts and their details are stored securely on our servers (Supabase). Only the parties involved have access to their contracts. We do not share contractual information with third parties without explicit consent, except under legal requirement.',
    },
    {
      icon: '📧',
      title: 'Email Authorization',
      content:
        'When a contract enters the "Pending authorization" state, both parties can review it. Acceptance within the app is recorded as a valid authorization under these Terms of Service.',
    },
    {
      icon: '🚫',
      title: 'Prohibited Use',
      content:
        'It is strictly prohibited to use the platform for:\n• Fraudulent or misleading contracts\n• Unauthorized subleases\n• Discrimination based on race, gender, religion, or other protected characteristics\n• Any activity contrary to local, state, or federal laws',
    },
    {
      icon: '🔄',
      title: 'Modifications',
      content:
        'We reserve the right to modify these Terms at any time. Changes will be notified within the application. Continued use of the platform implies acceptance of the updated terms.',
    },
    {
      icon: '📞',
      title: 'Contact and Disputes',
      content:
        'To report problems or irregularities in contracts, please contact our support team. For legal disputes, we recommend resorting to the mediation and arbitration mechanisms of your local jurisdiction.',
    },
  ];

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#0d1117', '#000']} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Terms of Service</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIconWrap}>
            <MaterialCommunityIcons name="shield-check" size={40} color="#49C788" />
          </View>
          <Text style={s.heroTitle}>Usage Agreement</Text>
          <Text style={s.heroSub}>
            By using RoommateFinder&apos;s legal features, you agree to the following terms.
            Last updated: May 2026
          </Text>
        </View>

        {/* Intermediary badge */}
        <View style={s.intermediaryCard}>
          <MaterialCommunityIcons name="information-outline" size={20} color="#49C788" />
          <Text style={s.intermediaryText}>
            <Text style={{ fontWeight: '800', color: '#49C788' }}>RoommateFinder is an intermediary.</Text>
            {' '}We are not a party to the contracts generated between users. Our platform facilitates the process, but contractual responsibility lies solely with the parties involved.
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
            If you have questions about these terms, contact us before using the contract features.
          </Text>
          <Text style={s.footerVersion}>RoommateFinder · Legal & Agreements v1.0 · May 2026</Text>
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
