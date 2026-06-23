import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '../../context/LanguageContext';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import TrustBadgeDetailModal from '@/components/trust/TrustBadgeDetailModal';
import TrustAlertModal from '@/components/trust/TrustAlertModal';
import { VERIFY_CONFIG } from '@/constants/verifyConfig';

export default function TrustAndSafetyHub() {
  const { t, locale } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [verifications, setVerifications] = useState<any[]>([]);

  // Reusable custom alert modal states
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [customAlertTitle, setCustomAlertTitle] = useState('');
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [customAlertButtons, setCustomAlertButtons] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const fetchData = async () => {
    if (!profile) setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const { data } = await supabase
        .from('profiles')
        .select('trust_score, is_identity_verified, is_background_verified, is_social_verified, is_phone_verified')
        .eq('id', session.user.id)
        .single();

      if (data) {
        // Calculate progressive trust score dynamically: 20 base + 20 per verified option (max 100)
        let count = 0;
        if (data.is_identity_verified) count++;
        if (data.is_background_verified) count++;
        if (data.is_social_verified) count++;
        if (data.is_phone_verified) count++;
        const calculatedScore = 20 + count * 20;
        
        const finalProfile = { ...data, trust_score: calculatedScore };
        setProfile(finalProfile);

        // Sync score with Supabase if it differs
        if (data.trust_score !== calculatedScore) {
          await supabase.from('profiles').update({ trust_score: calculatedScore }).eq('id', session.user.id);
        }
      }

      const { data: verifs } = await supabase
        .from('verifications')
        .select('type, status, metadata')
        .eq('user_id', session.user.id);
      if (verifs) setVerifications(verifs);
    }
    setLoading(false);
  };

  // Premium Custom Alert trigger helper
  const triggerAlert = (title: string, message: string, buttons?: { text: string; onPress?: () => void; style?: string }[]) => {
    setCustomAlertTitle(title);
    setCustomAlertMessage(message);
    setCustomAlertButtons(buttons || [{ text: 'OK', onPress: () => {} }]);
    setCustomAlertVisible(true);
  };

  const handleRevoke = async (type: string) => {
    triggerAlert(
      t('general.confirm') || 'Confirmar',
      locale === 'es' 
        ? `¿Seguro que deseas revocar esta verificación? Tu Trust Score disminuirá.`
        : `Are you sure you want to revoke this verification? Your Trust Score will decrease.`,
      [
        { text: t('general.cancel') || 'Cancelar', style: 'cancel' },
        { 
          text: locale === 'es' ? 'Revocar' : 'Revoke', 
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setLoading(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.id) {
                // Delete verification record
                await supabase.from('verifications').delete().eq('user_id', session.user.id).eq('type', type);
                
                // Prepare profile update
                const updateData: any = {};
                if (type === 'identity') updateData.is_identity_verified = false;
                if (type === 'background') updateData.is_background_verified = false;
                if (type === 'social') updateData.is_social_verified = false;
                if (type === 'phone') updateData.is_phone_verified = false;

                // Recalculate score dynamically
                let count = 0;
                if (type !== 'identity' && profile.is_identity_verified) count++;
                if (type !== 'background' && profile.is_background_verified) count++;
                if (type !== 'social' && profile.is_social_verified) count++;
                if (type !== 'phone' && profile.is_phone_verified) count++;
                const newScore = 20 + count * 20;
                updateData.trust_score = newScore;

                await supabase.from('profiles').update(updateData).eq('id', session.user.id);
                setDetailModalVisible(false);
                fetchData();
              }
            } catch {
              triggerAlert('Error', 'Could not revoke verification.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleResetAll = async () => {
    triggerAlert(
      locale === 'es' ? 'Restablecer Todas las Verificaciones' : 'Reset All Verifications',
      locale === 'es'
        ? 'Esto eliminará todos tus estados de verificación y devolverá tu Trust Score a 20. ¿Proceder?'
        : 'This will clear all verified statuses and set your Trust Score back to 20. Proceed?',
      [
        { text: t('general.cancel') || 'Cancelar', style: 'cancel' },
        {
          text: locale === 'es' ? 'Restablecer Todo' : 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setLoading(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.id) {
                await supabase.from('verifications').delete().eq('user_id', session.user.id);
                await supabase.from('profiles').update({
                  is_identity_verified: false,
                  is_background_verified: false,
                  is_references_verified: false,
                  is_social_verified: false,
                  is_phone_verified: false,
                  trust_score: 20
                }).eq('id', session.user.id);
                
                fetchData();
                triggerAlert(
                  locale === 'es' ? 'Completado' : 'Success',
                  locale === 'es' ? 'Todos los parámetros de confianza han sido reiniciados.' : 'All trust metrics reset to defaults.'
                );
              }
            } catch {
              triggerAlert('Error', 'Reset failed.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator color="#0A84FF" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  const score = profile?.trust_score || 20;
  const scoreColor = score >= 80 ? '#34C759' : score >= 40 ? '#FFD60A' : '#FF453A';

  const VerificationItem = ({ icon, title, desc, verified, type }: any) => {
    const activeColor = VERIFY_CONFIG[type]?.color || '#34C759';
    return (
      <Pressable 
        style={({ pressed }) => [
          s.verifyCard, 
          verified && s.verifyCardActive,
          pressed && s.cardPressed
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (verified) {
            const verif = verifications.find(v => v.type === type);
            const extraData = verif ? verif.metadata : null;
            setSelectedBadge({ type, title, desc, icon, color: activeColor, metadata: extraData });
            setDetailModalVisible(true);
          } else {
            router.push({ pathname: '/trust/verify', params: { type } });
          }
        }}
      >
        <View style={[
          s.iconWrap, 
          { backgroundColor: activeColor + '15', borderColor: activeColor + '30', borderWidth: 1 }
        ]}>
          <MaterialCommunityIcons name={icon} size={22} color={activeColor} />
        </View>
        <View style={s.verifyInfo}>
          <Text style={[s.verifyTitle, verified && { color: '#fff', fontWeight: '800' }]}>{title}</Text>
          <Text style={s.verifyDesc}>
            {verified 
              ? (locale === 'es' ? '✓ Verificado · Ver detalles' : '✓ Verified · View details') 
              : desc}
          </Text>
        </View>
        <MaterialCommunityIcons 
          name={verified ? "check-decagram" : "chevron-right"} 
          size={20} 
          color={verified ? activeColor : '#444'} 
        />
      </Pressable>
    );
  };

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
              router.replace('/(tabs)/myprofile');
            }
          }}
          style={({ pressed }) => [s.backBtn, pressed && s.backBtnPressed]}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>{t('trust.title')}</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Glassmorphic Trust Score Dashboard */}
        <BlurView intensity={20} tint="dark" style={s.dashboardCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']}
            style={s.dashboardGradient}
          >
            <Text style={s.heroSubtitle}>{t('trust.your_score')}</Text>
            
            <View style={s.scoreContainer}>
              <View style={s.radialProgressContainer}>
                {/* Glow Ring representing current score */}
                <View style={[s.glowRing, { borderColor: scoreColor, shadowColor: scoreColor }]} />
                <View style={s.scoreInnerCircle}>
                  <Text style={[s.scoreValue, { color: scoreColor }]}>{score}</Text>
                  <Text style={s.scoreMax}>/ 100</Text>
                </View>
              </View>
              
              <View style={s.scoreInfoContainer}>
                <View style={[s.badgeLabel, { backgroundColor: scoreColor + '20' }]}>
                  <Text style={[s.badgeLabelText, { color: scoreColor }]}>
                    {score >= 80 
                      ? (locale === 'es' ? 'EXCELENTE' : 'EXCELLENT') 
                      : score >= 60 
                        ? (locale === 'es' ? 'ALTO' : 'HIGH') 
                        : score >= 40 
                          ? (locale === 'es' ? 'MEDIO' : 'MEDIUM') 
                          : (locale === 'es' ? 'BÁSICO' : 'BASIC')}
                  </Text>
                </View>
                <Text style={s.scoreLevelDesc}>
                  {score >= 80 
                    ? (locale === 'es' ? 'Perfil prioritario, máximo nivel de seguridad y confianza.' : 'Priority profile, maximum trust and safety level.') 
                    : score >= 40 
                      ? (locale === 'es' ? 'Buen nivel de confianza. Verifica más datos para destacar.' : 'Good trust level. Verify more fields to stand out.') 
                      : (locale === 'es' ? 'Nivel básico. Completa verificaciones para obtener 3x matches.' : 'Basic level. Complete verifications to get 3x more matches.')}
                </Text>
              </View>
            </View>
            
            <View style={s.divider} />
            <Text style={s.heroDesc}>{t('trust.score_desc')}</Text>
          </LinearGradient>
        </BlurView>

        {/* Protection Badge */}
        <BlurView intensity={10} tint="dark" style={s.shieldCard}>
          <MaterialCommunityIcons name="shield-lock-outline" size={24} color="#0A84FF" />
          <View style={{ flex: 1 }}>
            <Text style={s.shieldTitle}>{t('trust.anti_fraud')}</Text>
            <Text style={s.shieldDesc}>{t('trust.anti_fraud_desc')}</Text>
          </View>
        </BlurView>

        <Text style={s.sectionHeader}>{t('trust.profile_verifications')}</Text>

        <VerificationItem 
          icon="face-recognition" 
          title={t('trust.official_id')} 
          desc={t('trust.id_desc')} 
          verified={profile?.is_identity_verified}
          type="identity"
        />
        <VerificationItem 
          icon="shield-account" 
          title={t('trust.background')} 
          desc={t('trust.background_desc')} 
          verified={profile?.is_background_verified}
          type="background"
        />

        <VerificationItem 
          icon="instagram" 
          title={t('trust.social')} 
          desc={t('trust.social_desc')} 
          verified={profile?.is_social_verified}
          type="social"
        />
        <VerificationItem 
          icon="phone-check" 
          title={t('trust.phone')} 
          desc={t('trust.phone_desc')} 
          verified={profile?.is_phone_verified}
          type="phone"
        />

        <View style={s.footerLinks}>
          <Pressable 
            style={({ pressed }) => [s.footerBtn, pressed && s.footerBtnPressed]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/trust/tips');
            }}
          >
            <MaterialCommunityIcons name="book-open-outline" size={18} color="#888" />
            <View style={{ height: 1 }} />
            <Text style={s.footerBtnText}>{t('trust.security_tips')}</Text>
          </Pressable>
          
          <Pressable 
            style={({ pressed }) => [s.footerBtn, pressed && s.footerBtnPressed]} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/terms');
            }}
          >
            <MaterialCommunityIcons name="gavel" size={18} color="#888" />
            <Text style={s.footerBtnText}>{t('trust.moderation_policies')}</Text>
          </Pressable>
        </View>

        {/* Demo Tools: Reset All */}
        <View style={s.demoSection}>
          <Pressable 
            style={({ pressed }) => [s.resetBtn, pressed && s.resetBtnPressed]} 
            onPress={handleResetAll}
          >
            <MaterialCommunityIcons name="refresh" size={16} color="#FF453A" />
            <Text style={s.resetBtnText}>
              {locale === 'es' ? 'Reiniciar Datos de Prueba' : 'Reset Test Data'}
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Badge Detail Modal */}
      <TrustBadgeDetailModal
        visible={detailModalVisible}
        selectedBadge={selectedBadge}
        locale={locale}
        benefitsEn={VERIFY_CONFIG[selectedBadge?.type]?.benefits_en || []}
        benefitsEs={VERIFY_CONFIG[selectedBadge?.type]?.benefits_es || []}
        onClose={() => setDetailModalVisible(false)}
        onRevoke={handleRevoke}
      />

      {/* Reusable Custom Premium Alert Modal */}
      <TrustAlertModal
        visible={customAlertVisible}
        title={customAlertTitle}
        message={customAlertMessage}
        buttons={customAlertButtons}
        onClose={() => setCustomAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

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
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  
  dashboardCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  dashboardGradient: {
    padding: 24,
  },
  heroSubtitle: { color: '#888', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 15, textTransform: 'uppercase' },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginVertical: 12,
  },
  radialProgressContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  scoreInnerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a0d14',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  scoreMax: {
    color: '#555',
    fontSize: 10,
    fontWeight: '700',
    marginTop: -2,
  },
  scoreInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  badgeLabelText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoreLevelDesc: {
    color: '#aaa',
    fontSize: 12,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 14,
  },
  heroDesc: { color: '#666', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  
  shieldCard: { flexDirection: 'row', backgroundColor: 'rgba(10, 132, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.15)', borderRadius: 20, padding: 16, gap: 14, marginBottom: 30, alignItems: 'center', overflow: 'hidden' },
  shieldTitle: { color: '#0A84FF', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  shieldDesc: { color: '#888', fontSize: 12, lineHeight: 18 },
  
  sectionHeader: { color: '#555', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 14, marginLeft: 4, textTransform: 'uppercase' },
  verifyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 20, padding: 16, marginBottom: 12, gap: 14 },
  verifyCardActive: { borderColor: 'rgba(52, 199, 89, 0.25)', backgroundColor: 'rgba(52, 199, 89, 0.02)' },
  cardPressed: { opacity: 0.8, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  iconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  verifyInfo: { flex: 1 },
  verifyTitle: { color: '#bbb', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  verifyDesc: { color: '#666', fontSize: 12, lineHeight: 16 },
 
  footerLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingHorizontal: 10, gap: 10 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  footerBtnPressed: { opacity: 0.6 },
  footerBtnText: { color: '#888', fontSize: 13, fontWeight: '600' },
 
  demoSection: { marginTop: 40, alignItems: 'center', paddingBottom: 20 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,69,58,0.08)', borderWidth: 1, borderColor: 'rgba(255,69,58,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  resetBtnPressed: { opacity: 0.7, backgroundColor: 'rgba(255,69,58,0.15)' },
  resetBtnText: { color: '#FF453A', fontSize: 12, fontWeight: '700' },
 
  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalBlur: { flex: 1, justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#0f121a', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderBottomWidth: 0 },
  modalHeaderLine: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalIconWrap: { alignSelf: 'center', marginBottom: 16, position: 'relative' },
  modalIconCircle: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
  modalCheckBadge: { position: 'absolute', bottom: 0, right: 0 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  statusBadge: { alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 20 },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  modalDesc: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16, marginBottom: 24 },
  
  benefitsContainer: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 18, marginBottom: 28 },
  benefitsHeader: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 12 },
  benefitRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  benefitText: { flex: 1, color: '#aaa', fontSize: 12, lineHeight: 18 },
  
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  modalBtnTextClose: { color: '#fff', fontSize: 15, fontWeight: '700' },
  revokeBtn: { backgroundColor: 'rgba(255,69,58,0.1)', borderWidth: 1, borderColor: 'rgba(255,69,58,0.2)' },
  revokeBtnText: { color: '#FF453A', fontSize: 15, fontWeight: '700' },

  metaDataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    alignSelf: 'center',
    marginBottom: 12
  },
  metaDataText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  metaDataSubText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: -4
  },
  
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
  alertBtnPrimary: { backgroundColor: '#0A84FF' },
  alertBtnCancel: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  alertBtnDestructive: { backgroundColor: 'rgba(255,69,58,0.1)', borderWidth: 1, borderColor: 'rgba(255,69,58,0.2)' },
  alertBtnText: { fontSize: 14, fontWeight: '700' },
  alertBtnTextPrimary: { color: '#fff' },
  alertBtnTextCancel: { color: '#aaa' },
  alertBtnTextDestructive: { color: '#FF453A' }
});
