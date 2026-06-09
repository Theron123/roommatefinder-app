import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View, Pressable, TextInput, ActivityIndicator, Image, Platform, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '../../context/LanguageContext';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

// Top Universities in the Americas
const UNIVERSITIES = [
  // Canada
  { name: "University of Toronto", domain: "utoronto.ca", country: "Canada" },
  { name: "University of British Columbia", domain: "ubc.ca", country: "Canada" },
  { name: "McGill University", domain: "mcgill.ca", country: "Canada" },
  { name: "University of Waterloo", domain: "uwaterloo.ca", country: "Canada" },
  { name: "University of Alberta", domain: "ualberta.ca", country: "Canada" },
  { name: "McMaster University", domain: "mcmaster.ca", country: "Canada" },
  { name: "Université de Montréal", domain: "umontreal.ca", country: "Canada" },
  { name: "Western University", domain: "uwo.ca", country: "Canada" },
  { name: "Queen's University", domain: "queensu.ca", country: "Canada" },
  { name: "York University", domain: "yorku.ca", country: "Canada" },
  
  // United States
  { name: "Harvard University", domain: "harvard.edu", country: "USA" },
  { name: "Stanford University", domain: "stanford.edu", country: "USA" },
  { name: "Massachusetts Institute of Technology", domain: "mit.edu", country: "USA" },
  { name: "UC Berkeley", domain: "berkeley.edu", country: "USA" },
  { name: "Columbia University", domain: "columbia.edu", country: "USA" },
  { name: "New York University", domain: "nyu.edu", country: "USA" },
  
  // Latin America
  { name: "Universidad Nacional Autónoma de México", domain: "unam.mx", country: "Mexico" },
  { name: "Universidade de São Paulo", domain: "usp.br", country: "Brazil" },
  { name: "Universidad de Buenos Aires", domain: "uba.ar", country: "Argentina" },
  { name: "Universidad de los Andes", domain: "uniandes.edu.co", country: "Colombia" },
  { name: "Universidad de Costa Rica", domain: "ucr.ac.cr", country: "Costa Rica" }
];

export default function VerificationWizard() {
  const { t, locale } = useTranslation();
  const { type } = useLocalSearchParams<{ type: string }>();
  
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  // University States
  const [selectedUniversity, setSelectedUniversity] = useState<typeof UNIVERSITIES[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);

  // Instagram Mock OAuth States
  const [instagramModalVisible, setInstagramModalVisible] = useState(false);
  const [instagramUsername, setInstagramUsername] = useState('');
  const [instagramPassword, setInstagramPassword] = useState('');
  const [instagramStage, setInstagramStage] = useState<'login' | 'loading' | 'success'>('login');

  // Phone States
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState('');

  // Custom Alert Modal States
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [customAlertTitle, setCustomAlertTitle] = useState('');
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [customAlertButtons, setCustomAlertButtons] = useState<any[]>([]);

  const triggerAlert = (title: string, message: string, buttons?: { text: string; onPress?: () => void; style?: string }[]) => {
    setCustomAlertTitle(title);
    setCustomAlertMessage(message);
    setCustomAlertButtons(buttons || [{ text: 'OK', onPress: () => {} }]);
    setCustomAlertVisible(true);
  };

  const getVerifyConfig = (vType: string) => {
    switch (vType) {
      case 'identity':
        return {
          title: t('trust.verify_title'),
          icon: 'face-recognition',
          desc: t('trust.verify_desc'),
          btnLabel: t('trust.verify_btn_id'),
          color: '#0A84FF'
        };
      case 'university':
        return {
          title: t('trust.verify_title_edu'),
          icon: 'school',
          desc: t('trust.verify_desc_edu'),
          btnLabel: t('trust.verify_btn_edu'),
          color: '#34C759'
        };
      case 'workplace':
        return {
          title: t('trust.verify_title_work'),
          icon: 'briefcase',
          desc: t('trust.verify_desc_work'),
          btnLabel: t('trust.verify_btn_work'),
          color: '#5E5CE6'
        };
      case 'social':
        return {
          title: t('trust.verify_title_soc'),
          icon: 'instagram',
          desc: t('trust.verify_desc_soc'),
          btnLabel: t('trust.verify_btn_soc'),
          color: '#E1306C'
        };
      case 'phone':
        return {
          title: t('trust.verify_title_phone'),
          icon: 'phone-check',
          desc: t('trust.verify_desc_phone'),
          btnLabel: t('trust.verify_btn_phone'),
          color: '#FF9F0A'
        };
      default:
        return {
          title: t('trust.verify_title'),
          icon: 'face-recognition',
          desc: t('trust.verify_desc'),
          btnLabel: t('trust.verify_btn_id'),
          color: '#0A84FF'
        };
    }
  };

  const config = getVerifyConfig(type || 'identity');

  const getBtnLabel = () => {
    if (type === 'identity' && imageUri) {
      return locale === 'es' ? 'Enviar Verificación' : 'Submit Verification';
    }
    if (type === 'phone' && smsSent) {
      return locale === 'es' ? 'Verificar Código' : 'Verify Code';
    }
    return config.btnLabel;
  };

  const handleAction = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (type === 'identity') {
      if (!imageUri) {
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });

        if (!result.canceled) {
          setImageUri(result.assets[0].uri);
        }
      } else {
        submitVerification(imageUri);
      }
    } else if (type === 'university') {
      if (!selectedUniversity) {
        triggerAlert(
          t('general.error') || 'Error',
          locale === 'es' ? 'Por favor busca y selecciona una universidad.' : 'Please search and select a university.'
        );
        return;
      }
      if (!inputValue.trim() || !inputValue.includes('@') || !inputValue.includes('.')) {
        triggerAlert(t('general.error') || 'Error', t('trust.email_err'));
        return;
      }
      setLoading(true);
      setTimeout(() => {
        submitVerification();
      }, 1500);
    } else if (type === 'social') {
      // Instagram OAuth simulation modal
      setInstagramUsername('');
      setInstagramPassword('');
      setInstagramStage('login');
      setInstagramModalVisible(true);
    } else if (type === 'phone') {
      if (!smsSent) {
        if (!inputValue.trim() || inputValue.length < 8) {
          triggerAlert(
            t('general.error') || 'Error',
            locale === 'es' ? 'Por favor ingresa un número de teléfono válido.' : 'Please enter a valid phone number.'
          );
          return;
        }
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
          setSmsSent(true);
          triggerAlert(
            locale === 'es' ? 'Código Enviado' : 'Code Sent',
            locale === 'es' 
              ? 'Se ha enviado un código de verificación de 6 dígitos al número ingresado (usa 123456 para pruebas).'
              : 'A 6-digit verification code has been sent to your phone (use 123456 for testing).'
          );
        }, 1200);
      } else {
        if (!smsCode.trim() || smsCode.length < 6) {
          triggerAlert(
            t('general.error') || 'Error',
            locale === 'es' ? 'Ingresa el código de 6 dígitos.' : 'Enter the 6-digit code.'
          );
          return;
        }
        setLoading(true);
        setTimeout(() => {
          submitVerification();
        }, 1500);
      }
    } else {
      // Workplace Email
      if (!inputValue.trim() || !inputValue.includes('@') || !inputValue.includes('.')) {
        triggerAlert(t('general.error') || 'Error', t('trust.email_err'));
        return;
      }
      setLoading(true);
      setTimeout(() => {
        submitVerification();
      }, 1500);
    }
  };

  const submitVerification = async (imgUri?: string, customInput?: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const finalInput = customInput || inputValue;

      // Create verification request record
      await supabase.from('verifications').insert({
        user_id: session.user.id,
        type: type,
        status: 'pending',
        metadata: { 
          input: finalInput, 
          mock_image: imgUri || imageUri ? true : false,
          university: type === 'university' && selectedUniversity ? selectedUniversity.name : undefined
        }
      });

      // Simulate auto-approval for demo purposes
      const updateData: any = {};
      if (type === 'identity') updateData.is_identity_verified = true;
      if (type === 'university') updateData.is_university_verified = true;
      if (type === 'workplace') updateData.is_workplace_verified = true;
      if (type === 'social') updateData.is_social_verified = true;
      if (type === 'phone') updateData.is_phone_verified = true;

      // Calculate score dynamically to keep database in sync
      const { data: currentProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      let count = 0;
      if (type === 'identity' || currentProfile?.is_identity_verified) count++;
      if (type === 'university' || currentProfile?.is_university_verified) count++;
      if (type === 'workplace' || currentProfile?.is_workplace_verified) count++;
      if (type === 'social' || currentProfile?.is_social_verified) count++;
      if (type === 'phone' || currentProfile?.is_phone_verified) count++;
      const newScore = 20 + count * 16;
      updateData.trust_score = newScore;

      await supabase.from('profiles').update(updateData).eq('id', session.user.id);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      triggerAlert(
        t('trust.req_sent'),
        t('trust.demo_approved'),
        [{ 
          text: locale === 'es' ? 'Genial' : 'Awesome', 
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          } 
        }]
      );

    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerAlert(t('general.error') || 'Error', t('trust.req_err'));
    } finally {
      setLoading(false);
    }
  };

  const filteredUniversities = searchQuery.trim()
    ? UNIVERSITIES.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.country.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : UNIVERSITIES;

  const handleSelectUniversity = (uni: typeof UNIVERSITIES[0]) => {
    setSelectedUniversity(uni);
    setSearchQuery('');
    setShowUniversityDropdown(false);
    setInputValue(`student@${uni.domain}`);
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
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
          <MaterialCommunityIcons name="close" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Main Content */}
      <View style={s.content}>
        <View style={[s.iconBox, { backgroundColor: config.color + '1a', borderColor: config.color + '33', borderWidth: 1 }]}>
          <MaterialCommunityIcons name={config.icon} size={44} color={config.color} />
        </View>
        <Text style={s.title}>{config.title}</Text>
        <Text style={s.desc}>{config.desc}</Text>

        <View style={s.secureBadge}>
          <MaterialCommunityIcons name="lock" size={16} color="#34C759" />
          <Text style={s.secureText}>{t('trust.encryption_note')}</Text>
        </View>

        {/* 1. University Search and Email Section */}
        {type === 'university' && (
          <View style={s.inputWrapper}>
            <Text style={s.inputLabel}>
              {locale === 'es' ? 'Buscar Universidad' : 'Search University'}
            </Text>
            
            {!selectedUniversity ? (
              <View style={{ position: 'relative', zIndex: 50, width: '100%' }}>
                <View style={s.searchBarContainer}>
                  <MaterialCommunityIcons name="magnify" size={20} color="#888" style={s.searchIcon} />
                  <TextInput
                    style={s.searchInput}
                    placeholder={locale === 'es' ? "Escribe el nombre de tu universidad..." : "Type your university name..."}
                    placeholderTextColor="#555"
                    value={searchQuery}
                    onChangeText={(txt) => {
                      setSearchQuery(txt);
                      setShowUniversityDropdown(true);
                    }}
                    onFocus={() => setShowUniversityDropdown(true)}
                  />
                </View>

                {showUniversityDropdown && (
                  <View style={s.dropdownCard}>
                    <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                      {filteredUniversities.length > 0 ? (
                        filteredUniversities.map((uni, idx) => (
                          <Pressable
                            key={idx}
                            style={s.dropdownItem}
                            onPress={() => handleSelectUniversity(uni)}
                          >
                            <MaterialCommunityIcons name="school-outline" size={18} color="#999" />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={s.uniNameText}>{uni.name}</Text>
                              <Text style={s.uniCountryText}>{uni.country} · {uni.domain}</Text>
                            </View>
                          </Pressable>
                        ))
                      ) : (
                        <View style={s.dropdownEmpty}>
                          <Text style={s.dropdownEmptyText}>
                            {locale === 'es' ? 'No se encontraron resultados' : 'No results found'}
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            ) : (
              <View style={s.selectedUniCard}>
                <MaterialCommunityIcons name="school" size={24} color="#34C759" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.selectedUniName} numberOfLines={1}>{selectedUniversity.name}</Text>
                  <Text style={s.selectedUniCountry}>{selectedUniversity.country}</Text>
                </View>
                <Pressable onPress={() => setSelectedUniversity(null)} style={s.clearUniBtn}>
                  <MaterialCommunityIcons name="close-circle" size={20} color="#FF453A" />
                </Pressable>
              </View>
            )}

            {selectedUniversity && (
              <View style={{ marginTop: 20 }}>
                <Text style={s.inputLabel}>{t('trust.email_label')}</Text>
                <TextInput
                  style={s.input}
                  placeholder={t('trust.email_placeholder_edu')}
                  placeholderTextColor="#555"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={inputValue}
                  onChangeText={setInputValue}
                />
              </View>
            )}
          </View>
        )}

        {/* 2. Workplace Verification Section */}
        {type === 'workplace' && (
          <View style={s.inputWrapper}>
            <Text style={s.inputLabel}>{t('trust.email_label')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('trust.email_placeholder_work')}
              placeholderTextColor="#555"
              keyboardType="email-address"
              autoCapitalize="none"
              value={inputValue}
              onChangeText={setInputValue}
            />
          </View>
        )}

        {/* 3. Instagram Connection Section */}
        {type === 'social' && (
          <View style={s.socialContainer}>
            <Text style={s.socialHelpText}>
              {locale === 'es' 
                ? 'Vincula tu cuenta para verificar tu perfil de forma segura y subir tu nivel de confianza.'
                : 'Link your account to securely verify your profile and increase your trust level.'}
            </Text>
            
            <Pressable 
              style={({ pressed }) => [
                s.socialLinkBtn, 
                pressed && { opacity: 0.9 }
              ]} 
              onPress={handleAction}
            >
              <MaterialCommunityIcons name="instagram" size={24} color="#fff" style={{ marginRight: 10 }} />
              <Text style={s.socialLinkBtnText}>{t('trust.verify_btn_soc')}</Text>
            </Pressable>
          </View>
        )}

        {/* 4. Phone Verification Section */}
        {type === 'phone' && (
          <View style={s.inputWrapper}>
            {!smsSent ? (
              <>
                <Text style={s.inputLabel}>{t('trust.phone_label')}</Text>
                <TextInput
                  style={s.input}
                  placeholder={t('trust.phone_placeholder')}
                  placeholderTextColor="#555"
                  keyboardType="phone-pad"
                  value={inputValue}
                  onChangeText={setInputValue}
                />
              </>
            ) : (
              <>
                <Text style={s.inputLabel}>
                  {locale === 'es' ? 'Código SMS (6 dígitos)' : 'SMS Code (6 digits)'}
                </Text>
                <TextInput
                  style={s.input}
                  placeholder="123456"
                  placeholderTextColor="#555"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={smsCode}
                  onChangeText={setSmsCode}
                />
              </>
            )}
          </View>
        )}

        {/* 5. Identity Document Preview */}
        {type === 'identity' && imageUri && (
          <View style={s.previewContainer}>
            <Image source={{ uri: imageUri }} style={s.previewImage} />
            <Pressable 
              style={s.removeImageBtn} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setImageUri(null);
              }}
            >
              <MaterialCommunityIcons name="close-circle" size={24} color="#FF453A" />
            </Pressable>
          </View>
        )}
      </View>

      {/* Footer (Not shown for social as it has its own link button) */}
      {type !== 'social' && (
        <View style={s.footer}>
          <Pressable 
            style={({ pressed }) => [
              s.mainBtn, 
              { backgroundColor: config.color },
              pressed && { opacity: 0.8 }
            ]} 
            onPress={handleAction}
            disabled={loading}
          >
            {loading ? (
              <View style={s.loadingBtnContainer}>
                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.mainBtnText}>
                  {locale === 'es' ? 'Conectando...' : 'Connecting...'}
                </Text>
              </View>
            ) : (
              <Text style={s.mainBtnText}>{getBtnLabel()}</Text>
            )}
          </Pressable>
          <Text style={s.footerNote}>
            {t('trust.privacy_note')}
          </Text>
        </View>
      )}

      {/* Instagram Simulated Browser OAuth Modal */}
      <Modal
        visible={instagramModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInstagramModalVisible(false)}
      >
        <SafeAreaView style={s.browserOverlay}>
          <View style={s.browserContainer}>
            {/* Header / Address Bar */}
            <View style={s.browserHeader}>
              <Pressable onPress={() => setInstagramModalVisible(false)} style={s.browserCloseBtn}>
                <MaterialCommunityIcons name="close" size={22} color="#aaa" />
              </Pressable>
              <View style={s.addressBar}>
                <MaterialCommunityIcons name="lock" size={12} color="#34C759" style={{ marginRight: 4 }} />
                <Text style={s.addressText} numberOfLines={1}>api.instagram.com/oauth/authorize</Text>
              </View>
              <Pressable style={{ padding: 4 }}>
                <MaterialCommunityIcons name="refresh" size={18} color="#888" />
              </Pressable>
            </View>

            {/* Browser Content */}
            <View style={s.browserContent}>
              {instagramStage === 'login' && (
                <View style={s.instaLoginContainer}>
                  <Text style={s.instaLogoText}>Instagram</Text>
                  
                  <Text style={s.instaOAuthNote}>
                    {locale === 'es' 
                      ? 'RoommateFinder solicita permiso para acceder a tu nombre de usuario y fotos.'
                      : 'RoommateFinder requests permission to access your username and photos.'}
                  </Text>

                  <View style={s.instaInputWrap}>
                    <TextInput
                      style={s.instaInput}
                      placeholder={locale === 'es' ? "Usuario o correo electrónico" : "Username or email"}
                      placeholderTextColor="#555"
                      value={instagramUsername}
                      onChangeText={setInstagramUsername}
                      autoCapitalize="none"
                    />
                    <TextInput
                      style={s.instaInput}
                      placeholder={locale === 'es' ? "Contraseña" : "Password"}
                      placeholderTextColor="#555"
                      value={instagramPassword}
                      onChangeText={setInstagramPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  <Pressable 
                    style={s.instaBtn} 
                    onPress={() => {
                      if (!instagramUsername.trim()) {
                        triggerAlert('Error', locale === 'es' ? 'Por favor ingresa tu usuario.' : 'Please enter your username.');
                        return;
                      }
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setInstagramStage('loading');
                      setTimeout(() => {
                        setInstagramStage('success');
                        setTimeout(() => {
                          setInstagramModalVisible(false);
                          const finalUsername = instagramUsername.startsWith('@') ? instagramUsername : `@${instagramUsername}`;
                          setInputValue(finalUsername);
                          submitVerification(undefined, finalUsername);
                        }, 1500);
                      }, 2000);
                    }}
                  >
                    <Text style={s.instaBtnText}>{locale === 'es' ? 'Autorizar y Vincular' : 'Authorize & Link'}</Text>
                  </Pressable>

                  <Text style={s.instaFooterText}>Instagram © 2026</Text>
                </View>
              )}

              {instagramStage === 'loading' && (
                <View style={s.instaStatusContainer}>
                  <ActivityIndicator size="large" color="#E1306C" />
                  <Text style={s.instaStatusText}>
                    {locale === 'es' ? 'Conectando con Instagram...' : 'Connecting to Instagram...'}
                  </Text>
                  <Text style={s.instaStatusSub}>
                    {locale === 'es' ? 'Autorizando tokens y perfil seguro...' : 'Authorizing tokens and secure profile...'}
                  </Text>
                </View>
              )}

              {instagramStage === 'success' && (
                <View style={s.instaStatusContainer}>
                  <View style={s.instaSuccessCircle}>
                    <MaterialCommunityIcons name="check" size={38} color="#fff" />
                  </View>
                  <Text style={[s.instaStatusText, { color: '#34C759', fontWeight: '800' }]}>
                    {locale === 'es' ? '¡Vinculación Exitosa!' : 'Linking Successful!'}
                  </Text>
                  <Text style={s.instaStatusSub}>
                    {instagramUsername.startsWith('@') ? instagramUsername : `@${instagramUsername}`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

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
  header: { paddingHorizontal: 20, paddingVertical: 16, zIndex: 10, elevation: 10 },
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
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'center', paddingTop: 20 },
  iconBox: { width: 90, height: 90, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 },
  desc: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10, marginBottom: 24 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52, 199, 89, 0.05)', borderWidth: 1, borderColor: 'rgba(52, 199, 89, 0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 8, marginBottom: 30 },
  secureText: { color: '#34C759', fontSize: 12, fontWeight: '600' },
  
  inputWrapper: { width: '100%', marginBottom: 20 },
  inputLabel: { color: '#555', fontSize: 11, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.5, marginLeft: 4 },
  input: { width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: '#fff', padding: 16, borderRadius: 20, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },

  // University Search Styles
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 54,
    width: '100%'
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    height: '100%',
    outlineStyle: 'none'
  } as any,
  dropdownCard: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#0f121a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    overflow: 'hidden'
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)'
  },
  uniNameText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  uniCountryText: { color: '#666', fontSize: 11, marginTop: 2 },
  dropdownEmpty: { padding: 20, alignItems: 'center' },
  dropdownEmptyText: { color: '#555', fontSize: 13 },
  selectedUniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.15)',
    borderRadius: 20,
    padding: 16,
    width: '100%'
  },
  selectedUniName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  selectedUniCountry: { color: '#888', fontSize: 12, marginTop: 2 },
  clearUniBtn: { padding: 4 },

  // Social Styles
  socialContainer: { width: '100%', alignItems: 'center', paddingVertical: 10 },
  socialHelpText: { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 20 },
  socialLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1306C',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 30,
    width: '100%',
    shadowColor: '#E1306C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5
  },
  socialLinkBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  // Browser Mock OAuth Modal Styles
  browserOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  browserContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 0,
    overflow: 'hidden'
  },
  browserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#161616',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  browserCloseBtn: { padding: 4 },
  addressBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginHorizontal: 16,
    maxWidth: '70%'
  },
  addressText: { color: '#aaa', fontSize: 11, fontWeight: '500' },
  browserContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  
  // Instagram Mock Content
  instaLoginContainer: { width: '100%', maxWidth: 320, alignItems: 'center' },
  instaLogoText: { color: '#fff', fontSize: 36, fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif', fontWeight: 'bold', marginBottom: 20 },
  instaOAuthNote: { color: '#aaa', fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 24 },
  instaInputWrap: { width: '100%', gap: 12, marginBottom: 20 },
  instaInput: { backgroundColor: '#1c1c1e', color: '#fff', padding: 14, borderRadius: 10, fontSize: 14, borderWidth: 1, borderColor: '#2c2c2e' },
  instaBtn: { width: '100%', backgroundColor: '#0095f6', padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  instaBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  instaFooterText: { color: '#444', fontSize: 11, marginTop: 40 },
  
  // Simulated OAuth Loading and Success States
  instaStatusContainer: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  instaStatusText: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 10 },
  instaStatusSub: { color: '#666', fontSize: 13 },
  instaSuccessCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center', shadowColor: '#34C759', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 5 },

  loadingBtnContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  previewContainer: { width: '100%', height: 160, borderRadius: 20, overflow: 'hidden', marginTop: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', position: 'relative', backgroundColor: '#111' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImageBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12 },

  footer: { padding: 24, paddingBottom: 40, width: '100%' },
  mainBtn: { padding: 18, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footerNote: { color: '#555', fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 },

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
