import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function TermsScreen() {
  const sections = [
    {
      icon: '🏛️',
      title: 'Rol de la Plataforma',
      content:
        'RoommateFinder actúa ÚNICAMENTE como intermediario tecnológico. No somos parte de ningún contrato generado dentro de la aplicación. Los contratos creados son acuerdos directos entre los usuarios.',
    },
    {
      icon: '⚖️',
      title: 'Validez Legal',
      content:
        'Los contratos generados en esta app constituyen un registro de intención y acuerdo entre las partes. Sin embargo, NO sustituyen a un contrato redactado o revisado por un abogado certificado. Para mayor validez legal, se recomienda notarizar el documento ante un notario público.',
    },
    {
      icon: '🔏',
      title: 'Aceptación como Firma',
      content:
        'Al pulsar "Aceptar Contrato" o "Solicitar Autorización", el usuario reconoce haber leído, entendido y aceptado todos los términos del contrato. Esto queda registrado con sello de tiempo (timestamp) en nuestra base de datos.',
    },
    {
      icon: '🛡️',
      title: 'Limitación de Responsabilidad',
      content:
        'RoommateFinder no se hace responsable por:\n• Disputas entre arrendadores e inquilinos\n• Incumplimiento de cualquier cláusula del contrato\n• Daños, pérdidas o perjuicios derivados del uso de contratos generados en la app\n• Información falsa proporcionada por los usuarios\n• Cualquier acto ilegal realizado por alguna de las partes',
    },
    {
      icon: '🔒',
      title: 'Privacidad y Datos',
      content:
        'Los contratos y sus detalles son almacenados de forma segura en nuestros servidores (Supabase). Solo las partes involucradas tienen acceso a sus contratos. No compartimos información contractual con terceros sin consentimiento explícito, salvo requerimiento legal.',
    },
    {
      icon: '📧',
      title: 'Autorización por Correo',
      content:
        'Cuando un contrato entra en estado "Pendiente de autorización", ambas partes pueden revisarlo. La aceptación dentro de la app queda registrada como autorización válida según estos Términos de Servicio.',
    },
    {
      icon: '🚫',
      title: 'Uso Prohibido',
      content:
        'Queda estrictamente prohibido usar la plataforma para:\n• Contratos fraudulentos o engañosos\n• Subarrendamientos no autorizados\n• Discriminación por raza, género, religión u otras características protegidas\n• Cualquier actividad contraria a las leyes locales, estatales o federales',
    },
    {
      icon: '🔄',
      title: 'Modificaciones',
      content:
        'Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios serán notificados dentro de la aplicación. El uso continuo de la plataforma implica la aceptación de los términos actualizados.',
    },
    {
      icon: '📞',
      title: 'Contacto y Disputas',
      content:
        'Para reportar problemas o irregularidades en contratos, comunícate con nuestro equipo de soporte. Para disputas legales, recomendamos acudir a los mecanismos de mediación y arbitraje de tu jurisdicción local.',
    },
  ];

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#0d1117', '#000']} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Términos de Servicio</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIconWrap}>
            <MaterialCommunityIcons name="shield-check" size={40} color="#49C788" />
          </View>
          <Text style={s.heroTitle}>Acuerdo de Uso</Text>
          <Text style={s.heroSub}>
            Al usar las funciones legales de RoommateFinder, aceptas los siguientes términos.
            Última actualización: Mayo 2026
          </Text>
        </View>

        {/* Intermediary badge */}
        <View style={s.intermediaryCard}>
          <MaterialCommunityIcons name="information-outline" size={20} color="#49C788" />
          <Text style={s.intermediaryText}>
            <Text style={{ fontWeight: '800', color: '#49C788' }}>RoommateFinder es un intermediario.</Text>
            {' '}No somos parte de los contratos generados entre usuarios. Nuestra plataforma facilita el proceso, pero la responsabilidad contractual recae sobre las partes involucradas.
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
            Si tienes preguntas sobre estos términos, contáctanos antes de usar las funciones de contratos.
          </Text>
          <Text style={s.footerVersion}>RoommateFinder · Legal & Agreements v1.0 · Mayo 2026</Text>
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
