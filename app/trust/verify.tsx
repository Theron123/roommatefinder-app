import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View, Pressable, TextInput, ActivityIndicator, Image, Platform, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '../../context/LanguageContext';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import TrustAlertModal from '@/components/trust/TrustAlertModal';
import TrustInstagramModal from '@/components/trust/TrustInstagramModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom string tag helper components to render raw HTML elements on Web
// without causing compilation or runtime crashes on native (iOS/Android)
const WebVideo = (props: any) => {
  if (Platform.OS !== 'web') return null;
  const VideoTag = 'video' as any;
  return <VideoTag {...props} />;
};

const WebCanvas = (props: any) => {
  if (Platform.OS !== 'web') return null;
  const CanvasTag = 'canvas' as any;
  return <CanvasTag {...props} />;
};

export default function VerificationWizard() {
  const { t, locale } = useTranslation();
  const { type } = useLocalSearchParams<{ type: string }>();
  
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Background Check States
  const [bgIdNumber, setBgIdNumber] = useState('');

  // Instagram Mock OAuth States
  const [instagramModalVisible, setInstagramModalVisible] = useState(false);
  const [instagramUsername, setInstagramUsername] = useState('');
  const [instagramPassword, setInstagramPassword] = useState('');
  const [instagramStage, setInstagramStage] = useState<'login' | 'loading' | 'success'>('login');

  // Phone States
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState('');

  // Web/PC Live Camera States
  const [streamActive, setStreamActive] = useState(false);
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);

  // Custom Alert Modal States
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [customAlertTitle, setCustomAlertTitle] = useState('');
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [customAlertButtons, setCustomAlertButtons] = useState<any[]>([]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  const triggerAlert = (title: string, message: string, buttons?: { text: string; onPress?: () => void; style?: string }[]) => {
    setCustomAlertTitle(title);
    setCustomAlertMessage(message);
    setCustomAlertButtons(buttons || [{ text: 'OK', onPress: () => {} }]);
    setCustomAlertVisible(true);
  };

  const startWebcam = async () => {
    if (Platform.OS !== 'web') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      console.log("Error starting webcam:", err);
      triggerAlert(
        locale === 'es' ? 'Error de Cámara' : 'Camera Error',
        locale === 'es' 
          ? 'No se pudo acceder a la cámara web. Revisa los permisos de tu navegador.'
          : 'Could not access the webcam. Please review your browser permissions.'
      );
    }
  };

  const stopWebcam = () => {
    if (Platform.OS !== 'web' || !videoRef.current) return;
    const stream = videoRef.current.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  };

  const captureWebcam = () => {
    if (Platform.OS !== 'web' || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (context) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImageUri(dataUrl);
      stopWebcam();
    }
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
      case 'background':
        return {
          title: t('trust.verify_title_bg'),
          icon: 'shield-account',
          desc: t('trust.verify_desc_bg'),
          btnLabel: t('trust.verify_btn_bg'),
          color: '#34C759'
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
        if (Platform.OS === 'web') {
          // Trigger browser image library upload if not streaming
          let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });

          if (!result.canceled) {
            setImageUri(result.assets[0].uri);
          }
        } else {
          // Native mobile photo capture
          let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });

          if (!result.canceled) {
            setImageUri(result.assets[0].uri);
          }
        }
      } else {
        submitVerification(imageUri);
      }
    } else if (type === 'background') {
      if (!inputValue.trim() || !bgIdNumber.trim()) {
        triggerAlert(
          t('general.error') || 'Error',
          locale === 'es' ? 'Por favor completa todos los campos del formulario.' : 'Please complete all form fields.'
        );
        return;
      }
      setLoading(true);
      setTimeout(() => {
        submitVerification();
      }, 1500);

    } else if (type === 'social') {
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
    }
  };

  const submitVerification = async (imgUri?: string, customInput?: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const finalInput = customInput || inputValue;

      let meta: any = { input: finalInput, mock_image: imgUri || imageUri ? true : false };
      if (type === 'background') {
        meta = { name: inputValue, idNumber: bgIdNumber };
      }

      // Read autoVerify setting from admin configuration
      const cached = await AsyncStorage.getItem('@admin_system_configs');
      let autoVerify = false; // default to false (requires manual admin approval)
      if (cached) {
        const parsed = JSON.parse(cached);
        autoVerify = parsed.autoVerify ?? false;
      }

      if (autoVerify) {
        // Create verification request record (approved)
        await supabase.from('verifications').insert({
          user_id: session.user.id,
          type: type,
          status: 'approved',
          metadata: meta
        });

        // Simulate auto-approval
        const updateData: any = {};
        if (type === 'identity') updateData.is_identity_verified = true;
        if (type === 'background') updateData.is_background_verified = true;
        if (type === 'social') updateData.is_social_verified = true;
        if (type === 'phone') updateData.is_phone_verified = true;

        // Calculate score dynamically to keep database in sync
        const { data: currentProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        let count = 0;
        if (type === 'identity' || currentProfile?.is_identity_verified) count++;
        if (type === 'background' || currentProfile?.is_background_verified) count++;
        if (type === 'social' || currentProfile?.is_social_verified) count++;
        if (type === 'phone' || currentProfile?.is_phone_verified) count++;
        const newScore = 20 + count * 20;
        updateData.trust_score = newScore;

        await supabase.from('profiles').update(updateData).eq('id', session.user.id);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        triggerAlert(
          t('trust.req_sent'),
          locale === 'es' ? '¡Tu verificación ha sido aprobada automáticamente!' : t('trust.demo_approved'),
          [{ 
            text: locale === 'es' ? 'Genial' : 'Awesome', 
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            } 
          }]
        );
      } else {
        // Create verification request record (pending)
        await supabase.from('verifications').insert({
          user_id: session.user.id,
          type: type,
          status: 'pending',
          metadata: meta
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        triggerAlert(
          locale === 'es' ? 'Solicitud Enviada' : 'Request Submitted',
          locale === 'es' 
            ? 'Tu solicitud ha sido enviada para revisión. Un administrador la revisará pronto.' 
            : 'Your request has been submitted for review. An administrator will review it shortly.',
          [{ 
            text: locale === 'es' ? 'Entendido' : 'Got it', 
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            } 
          }]
        );
      }

    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerAlert(t('general.error') || 'Error', t('trust.req_err'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            stopWebcam();
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
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={s.content}>
          <View style={[s.iconBox, { backgroundColor: config.color + '1a', borderColor: config.color + '33', borderWidth: 1 }]}>
            <MaterialCommunityIcons name={config.icon as any} size={44} color={config.color} />
          </View>
          <Text style={s.title}>{config.title}</Text>
          <Text style={s.desc}>{config.desc}</Text>

          <View style={s.secureBadge}>
            <MaterialCommunityIcons name="lock" size={16} color="#34C759" />
            <Text style={s.secureText}>{t('trust.encryption_note')}</Text>
          </View>

          {/* 1. Background Check Section */}
          {type === 'background' && (
            <View style={s.inputWrapper}>
              <Text style={s.inputLabel}>{locale === 'es' ? 'Nombre completo legal' : 'Legal Full Name'}</Text>
              <TextInput
                style={s.input}
                placeholder={locale === 'es' ? "John Doe" : "John Doe"}
                placeholderTextColor="#555"
                value={inputValue}
                onChangeText={setInputValue}
              />
              
              <View style={{ height: 16 }} />
              
              <Text style={s.inputLabel}>{locale === 'es' ? 'Número de Identificación o SSN' : 'ID or SSN Number'}</Text>
              <TextInput
                style={s.input}
                placeholder="XXX-XX-XXXX"
                placeholderTextColor="#555"
                value={bgIdNumber}
                onChangeText={setBgIdNumber}
                secureTextEntry
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

          {/* 5. Face Recognition / Identity Section (Web Camera Flow) */}
          {type === 'identity' && (
            <View style={{ width: '100%', alignItems: 'center' }}>
              {Platform.OS === 'web' && !imageUri && (
                <View style={s.webCameraWrapper}>
                  {!streamActive ? (
                    <View style={s.cameraFallbackCard}>
                      <MaterialCommunityIcons name="webcam" size={48} color="#555" />
                      <Text style={s.cameraFallbackText}>
                        {locale === 'es' 
                          ? 'Puedes usar la cámara web de tu PC para tomar la selfie en tiempo real.'
                          : 'You can use your PC webcam to capture your real-time verification selfie.'}
                      </Text>
                      <Pressable 
                        style={({ pressed }) => [s.cameraBtn, pressed && { opacity: 0.9 }]}
                        onPress={startWebcam}
                      >
                        <MaterialCommunityIcons name="camera" size={18} color="#000" style={{ marginRight: 8 }} />
                        <Text style={s.cameraBtnText}>{locale === 'es' ? 'Activar Cámara' : 'Activate Camera'}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={s.videoContainer}>
                      <WebVideo 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                      <WebCanvas ref={canvasRef} style={{ display: 'none' }} />
                      <View style={s.cameraMask} />
                      
                      <Pressable 
                        style={({ pressed }) => [s.captureCircleBtn, pressed && { transform: [{ scale: 0.95 }] }]}
                        onPress={captureWebcam}
                      >
                        <View style={s.captureCircleInner} />
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {/* Document File Uploader Fallback */}
              {!imageUri && (!streamActive || Platform.OS !== 'web') && (
                <Pressable 
                  style={({ pressed }) => [s.uploadPlaceholderBtn, pressed && { opacity: 0.8 }]}
                  onPress={async () => {
                    let result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      quality: 0.8,
                    });
                    if (!result.canceled) {
                      setImageUri(result.assets[0].uri);
                    }
                  }}
                >
                  <MaterialCommunityIcons name="file-image-plus-outline" size={36} color="#0A84FF" />
                  <Text style={s.uploadPlaceholderText}>
                    {locale === 'es' ? 'Selecciona una foto de tu ID' : 'Select a photo of your ID'}
                  </Text>
                </Pressable>
              )}

              {imageUri && (
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
          )}
        </View>
      </ScrollView>

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
      <TrustInstagramModal
        visible={instagramModalVisible}
        locale={locale}
        onClose={() => setInstagramModalVisible(false)}
        onSuccess={(finalUsername) => {
          setInputValue(finalUsername);
          submitVerification(undefined, finalUsername);
        }}
        triggerAlert={triggerAlert}
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
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'center', paddingTop: 20, width: '100%' },
  iconBox: { width: 90, height: 90, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 },
  desc: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10, marginBottom: 24 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52, 199, 89, 0.05)', borderWidth: 1, borderColor: 'rgba(52, 199, 89, 0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 8, marginBottom: 30 },
  secureText: { color: '#34C759', fontSize: 12, fontWeight: '600' },
  
  inputWrapper: { width: '100%', marginBottom: 20 },
  inputLabel: { color: '#555', fontSize: 11, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.5, marginLeft: 4 },
  input: { width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.02)', color: '#fff', padding: 16, borderRadius: 20, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },

  // PC/Web Camera VISOR styles
  webCameraWrapper: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#0A84FF',
    backgroundColor: '#07090e',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20
  },
  cameraFallbackCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cameraFallbackText: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginVertical: 14
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20
  },
  cameraBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800'
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cameraMask: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(10, 132, 255, 0.4)',
    borderRadius: 105,
    width: 210,
    height: 210,
    borderStyle: 'dashed'
  },
  captureCircleBtn: {
    position: 'absolute',
    bottom: 15,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  captureCircleInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff'
  },
  uploadPlaceholderBtn: {
    width: '100%',
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.25)',
    borderStyle: 'dashed',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.02)',
    gap: 12
  },
  uploadPlaceholderText: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '700'
  },

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
