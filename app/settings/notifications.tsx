import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function NotificationsScreen() {
  const router = useRouter();
  const { locale } = useTranslation();

  const [matchesPush, setMatchesPush] = useState(true);
  const [matchesEmail, setMatchesEmail] = useState(true);
  const [messagesPush, setMessagesPush] = useState(true);
  const [contractsPush, setContractsPush] = useState(true);
  const [contractsEmail, setContractsEmail] = useState(true);
  const [verifyPush, setVerifyPush] = useState(true);
  const [sound, setSound] = useState(true);

  const isEs = locale === 'es';

  const ToggleItem = ({ 
    title, 
    description, 
    value, 
    onToggle 
  }: { 
    title: string; 
    description: string; 
    value: boolean; 
    onToggle: () => void 
  }) => (
    <Pressable 
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]} 
      onPress={onToggle}
    >
      <View style={styles.textWrap}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemDesc}>{description}</Text>
      </View>
      <View style={[styles.switch, value ? styles.switchOn : styles.switchOff]}>
        <View style={[styles.switchThumb, value ? styles.switchThumbOn : styles.switchThumbOff]} />
      </View>
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
          {isEs ? "Notificaciones" : "Notifications"}
        </Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          {isEs ? "Nuevas Coincidencias (Matches)" : "New Matches"}
        </Text>
        <View style={styles.glassCard}>
          <ToggleItem
            title={isEs ? "Notificaciones Push" : "Push Notifications"}
            description={isEs ? "Avisarme al instante cuando alguien me dé un match." : "Notify me instantly when I get a new match."}
            value={matchesPush}
            onToggle={() => setMatchesPush(!matchesPush)}
          />
          <View style={styles.cardDivider} />
          <ToggleItem
            title={isEs ? "Correo Electrónico" : "Email Updates"}
            description={isEs ? "Recibir un resumen por correo sobre mis matches pendientes." : "Receive email roundups of pending matches."}
            value={matchesEmail}
            onToggle={() => setMatchesEmail(!matchesEmail)}
          />
        </View>

        <Text style={styles.sectionTitle}>
          {isEs ? "Mensajes de Chat" : "Chat Messages"}
        </Text>
        <View style={styles.glassCard}>
          <ToggleItem
            title={isEs ? "Mensajes Nuevos" : "New Messages"}
            description={isEs ? "Notificar cuando reciba un mensaje en mis chats activos." : "Notify me when I receive a message in active chats."}
            value={messagesPush}
            onToggle={() => setMessagesPush(!messagesPush)}
          />
        </View>

        <Text style={styles.sectionTitle}>
          {isEs ? "Contratos y Trámites Legales" : "Contracts & Agreements"}
        </Text>
        <View style={styles.glassCard}>
          <ToggleItem
            title={isEs ? "Alertas de Firma" : "Signing Alerts"}
            description={isEs ? "Avisar cuando un roommate proponga o firme un contrato." : "Notify when a roommate proposes or signs a contract."}
            value={contractsPush}
            onToggle={() => setContractsPush(!contractsPush)}
          />
          <View style={styles.cardDivider} />
          <ToggleItem
            title={isEs ? "Copias por Correo" : "Email Copies"}
            description={isEs ? "Recibir copias PDF de los contratos finalizados por correo." : "Receive PDF copies of completed contracts via email."}
            value={contractsEmail}
            onToggle={() => setContractsEmail(!contractsEmail)}
          />
        </View>

        <Text style={styles.sectionTitle}>
          {isEs ? "Seguridad y Cuenta" : "Security & Account"}
        </Text>
        <View style={styles.glassCard}>
          <ToggleItem
            title={isEs ? "Insignias aprobadas" : "Approved Verifications"}
            description={isEs ? "Avisar cuando se apruebe una verificación (cédula, universidad, etc)." : "Notify when a verification request is approved."}
            value={verifyPush}
            onToggle={() => setVerifyPush(!verifyPush)}
          />
        </View>

        <Text style={styles.sectionTitle}>
          {isEs ? "Ajustes de Sonido" : "System Sounds"}
        </Text>
        <View style={styles.glassCard}>
          <ToggleItem
            title={isEs ? "Sonido y Vibración" : "Sound & Vibration"}
            description={isEs ? "Emitir alertas sonoras y vibración al recibir notificaciones." : "Play alert sounds and vibrate on receiving alerts."}
            value={sound}
            onToggle={() => setSound(!sound)}
          />
        </View>

        <View style={{ height: 40 }} />
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
  textWrap: {
    flex: 1,
    paddingRight: 20,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  itemDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    lineHeight: 16,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  switchOn: {
    backgroundColor: '#49C788',
    borderColor: 'rgba(73, 199, 136, 0.2)',
  },
  switchOff: {
    backgroundColor: '#16161a',
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  switchThumbOff: {
    alignSelf: 'flex-start',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 16,
  },
});
