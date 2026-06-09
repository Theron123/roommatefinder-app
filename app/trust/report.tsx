import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View, Pressable, TextInput, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../context/LanguageContext';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const CONFLICT_REASONS = [
  { id: 'noise', icon: 'volume-high' },
  { id: 'cleaning', icon: 'broom' },
  { id: 'payment', icon: 'cash-clock' },
  { id: 'damage', icon: 'home-alert' },
  { id: 'breach', icon: 'file-alert' },
  { id: 'other', icon: 'alert-circle-outline' }
];

export default function ConflictResolutionCenter() {
  const { t, locale } = useTranslation();
  const { userId, userName, contractId } = useLocalSearchParams<{ userId?: string, userName?: string, contractId?: string }>();
  
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [evidenceAttached, setEvidenceAttached] = useState(false);

  // Reusable custom alert modal states
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [customAlertTitle, setCustomAlertTitle] = useState('');
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [customAlertButtons, setCustomAlertButtons] = useState<any[]>([]);

  const getReasonLabel = (id: string) => {
    switch (id) {
      case 'noise': return t('report.reasons.noise');
      case 'cleaning': return t('report.reasons.cleaning');
      case 'payment': return t('report.reasons.payment');
      case 'damage': return t('report.reasons.damage');
      case 'breach': return t('report.reasons.breach');
      case 'other': return t('report.reasons.other');
      default: return '';
    }
  };

  // Premium Custom Alert trigger helper
  const triggerAlert = (title: string, message: string, buttons?: { text: string; onPress?: () => void; style?: string }[]) => {
    setCustomAlertTitle(title);
    setCustomAlertMessage(message);
    setCustomAlertButtons(buttons || [{ text: 'OK', onPress: () => {} }]);
    setCustomAlertVisible(true);
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      triggerAlert(t('general.error') || 'Error', t('report.category_err'));
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Insert dispute into user_reports table
      await supabase.from('user_reports').insert({
        reporter_id: session.user.id,
        reported_id: userId || null,
        reason: selectedReason,
        description: description,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show success modal
      triggerAlert(
        t('report.ticket_created_title'),
        t('report.ticket_created_desc'),
        [
          { 
            text: locale === 'es' ? 'Entendido' : 'Got it', 
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            } 
          }
        ]
      );

    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerAlert(t('general.error') || 'Error', t('report.ticket_err'));
    } finally {
      setLoading(false);
    }
  };

  const handleAttachEvidence = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEvidenceAttached(!evidenceAttached);
  };

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#1a0a0a', '#000']} style={s.headerGradient}>
        <View style={s.header}>
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
          <Text style={s.headerTitle}>{t('report.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <BlurView intensity={10} tint="dark" style={s.targetCard}>
          <MaterialCommunityIcons name="scale-balance" size={28} color="#E53935" />
          <View style={{ flex: 1 }}>
            <Text style={s.targetTitle}>{t('report.target_title')}</Text>
            {userName ? (
              <Text style={s.targetName}>{t('report.target_against').replace('{name}', userName)}</Text>
            ) : (
              <Text style={s.targetName}>{t('report.target_general')}</Text>
            )}
          </View>
        </BlurView>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>{t('report.what_happened')}</Text>
        <View style={s.reasonsGrid}>
          {CONFLICT_REASONS.map(reason => (
            <Pressable 
              key={reason.id} 
              style={({ pressed }) => [
                s.reasonBtn, 
                selectedReason === reason.id && s.reasonBtnActive,
                pressed && { opacity: 0.9 }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedReason(reason.id);
              }}
            >
              <View style={[s.iconWrap, selectedReason === reason.id && s.iconWrapActive]}>
                <MaterialCommunityIcons 
                  name={reason.icon as any} 
                  size={20} 
                  color={selectedReason === reason.id ? '#E53935' : '#888'} 
                />
              </View>
              <Text style={[s.reasonText, selectedReason === reason.id && s.reasonTextActive]}>
                {getReasonLabel(reason.id)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.sectionLabel}>{t('report.details')}</Text>
        <View style={s.inputContainer}>
          <TextInput
            style={s.input}
            placeholder={t('report.details_placeholder')}
            placeholderTextColor="#555"
            multiline
            numberOfLines={5}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <Text style={s.sectionLabel}>{t('report.evidence')}</Text>
        <Pressable 
          style={({ pressed }) => [
            s.evidenceBtn, 
            evidenceAttached && s.evidenceBtnActive,
            pressed && { opacity: 0.8 }
          ]} 
          onPress={handleAttachEvidence}
        >
          <MaterialCommunityIcons name={evidenceAttached ? "check-circle" : "camera-plus"} size={24} color={evidenceAttached ? "#34C759" : "#888"} />
          <View style={{ flex: 1 }}>
            <Text style={[s.evidenceTitle, evidenceAttached && { color: '#34C759' }]}>
              {evidenceAttached ? t('report.evidence_attached') : t('report.evidence_upload')}
            </Text>
            <Text style={s.evidenceSub}>
              {evidenceAttached ? t('report.evidence_ready') : t('report.evidence_sub')}
            </Text>
          </View>
        </Pressable>

        <BlurView intensity={5} tint="dark" style={s.safetyInfo}>
          <MaterialCommunityIcons name="shield-check" size={20} color="#34C759" />
          <View style={{ flex: 1 }}>
            <Text style={s.safetyTitle}>{t('report.fair_mediation')}</Text>
            <Text style={s.safetyText}>{t('report.fair_mediation_text')}</Text>
          </View>
        </BlurView>
      </ScrollView>

      <View style={s.footer}>
        <Pressable 
          style={({ pressed }) => [
            s.mainBtn, 
            !selectedReason && { opacity: 0.5 },
            pressed && selectedReason && { opacity: 0.8 }
          ]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleSubmit();
          }}
          disabled={loading || !selectedReason}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <MaterialCommunityIcons name="send" size={20} color="#000" />
              <Text style={s.mainBtnText}>{t('report.open_ticket')}</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Reusable Custom Premium Alert Modal */}
      <Modal
        visible={customAlertVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCustomAlertVisible(false)}
      >
        <View style={s.alertOverlay}>
          <BlurView intensity={25} tint="dark" style={s.alertBlur}>
            <View style={s.alertCard}>
              <Text style={s.alertCardTitle}>{customAlertTitle}</Text>
              <Text style={s.alertCardMsg}>{customAlertMessage}</Text>
              <View style={s.alertButtonsRow}>
                {customAlertButtons.map((btn, idx) => (
                  <Pressable
                    key={idx}
                    style={({ pressed }) => [
                      s.alertBtn,
                      btn.style === 'destructive' 
                        ? s.alertBtnDestructive 
                        : btn.style === 'cancel' 
                          ? s.alertBtnCancel 
                          : s.alertBtnPrimary,
                      pressed && { opacity: 0.8 }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCustomAlertVisible(false);
                      if (btn.onPress) btn.onPress();
                    }}
                  >
                    <Text style={[
                      s.alertBtnText,
                      btn.style === 'destructive' 
                        ? s.alertBtnTextDestructive 
                        : btn.style === 'cancel' 
                          ? s.alertBtnTextCancel 
                          : s.alertBtnTextPrimary
                     ]}>
                      {btn.text}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerGradient: { paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 8 },
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
  
  targetCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', marginHorizontal: 20, padding: 16, borderRadius: 20, gap: 14, borderWidth: 1, borderColor: 'rgba(229, 57, 53, 0.2)', overflow: 'hidden' },
  targetTitle: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  targetName: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },

  scroll: { padding: 20, paddingBottom: 120 },
  sectionLabel: { color: '#555', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12, marginTop: 16, textTransform: 'uppercase' },
  
  reasonsGrid: { gap: 10, marginBottom: 24 },
  reasonBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 20, gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  reasonBtnActive: { borderColor: '#E53935', backgroundColor: 'rgba(229, 57, 53, 0.04)' },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center' },
  iconWrapActive: { backgroundColor: 'rgba(229, 57, 53, 0.1)' },
  reasonText: { color: '#888', fontSize: 14, fontWeight: '600' },
  reasonTextActive: { color: '#fff', fontWeight: '700' },

  inputContainer: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 24 },
  input: { color: '#fff', padding: 16, fontSize: 15, minHeight: 120, textAlignVertical: 'top' },
  
  evidenceBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 20, gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'dashed', overflow: 'hidden' },
  evidenceBtnActive: { borderColor: '#34C759', borderStyle: 'solid', backgroundColor: 'rgba(52,199,89,0.02)' },
  evidenceTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  evidenceSub: { color: '#666', fontSize: 12 },

  safetyInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 32, padding: 16, backgroundColor: 'rgba(52,199,89,0.02)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(52,199,89,0.1)', overflow: 'hidden' },
  safetyTitle: { color: '#34C759', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  safetyText: { color: '#888', fontSize: 12, lineHeight: 18 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 40, backgroundColor: 'rgba(0,0,0,0.9)' },
  mainBtn: { flexDirection: 'row', gap: 10, backgroundColor: '#E53935', padding: 18, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#E53935', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  mainBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  
  // Custom Alert Modal Styles
  alertOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)' },
  alertBlur: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  alertCard: {
    width: '85%',
    maxWidth: 320,
    backgroundColor: '#0f121a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10
  },
  alertCardTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 10, textAlign: 'center', letterSpacing: -0.5 },
  alertCardMsg: { color: '#888', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  alertButtonsRow: { flexDirection: 'row', gap: 10, width: '100%' },
  alertBtn: { flex: 1, paddingVertical: 14, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  alertBtnPrimary: { backgroundColor: '#E53935' },
  alertBtnCancel: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  alertBtnDestructive: { backgroundColor: 'rgba(255,69,58,0.1)', borderWidth: 1, borderColor: 'rgba(255,69,58,0.2)' },
  alertBtnText: { fontSize: 14, fontWeight: '700' },
  alertBtnTextPrimary: { color: '#000' },
  alertBtnTextCancel: { color: '#aaa' },
  alertBtnTextDestructive: { color: '#FF453A' }
});
