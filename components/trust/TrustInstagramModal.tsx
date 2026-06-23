import { Modal, Pressable, View, Text, StyleSheet, SafeAreaView, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface TrustInstagramModalProps {
  visible: boolean;
  locale: string;
  onClose: () => void;
  onSuccess: (username: string) => void;
  triggerAlert: (title: string, message: string) => void;
}

export default function TrustInstagramModal({
  visible,
  locale,
  onClose,
  onSuccess,
  triggerAlert
}: TrustInstagramModalProps) {
  const [stage, setStage] = useState<'login' | 'loading' | 'success'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Reset state when opened
  const handleClose = () => {
    setStage('login');
    setUsername('');
    setPassword('');
    onClose();
  };

  const handleLogin = () => {
    if (!username.trim()) {
      triggerAlert('Error', locale === 'es' ? 'Por favor ingresa tu usuario.' : 'Please enter your username.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStage('loading');
    setTimeout(() => {
      setStage('success');
      setTimeout(() => {
        const finalUsername = username.startsWith('@') ? username : `@${username}`;
        onSuccess(finalUsername);
        handleClose();
      }, 1500);
    }, 2000);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <SafeAreaView style={styles.browserOverlay}>
        <View style={styles.browserContainer}>
          {/* Header / Address Bar */}
          <View style={styles.browserHeader}>
            <Pressable onPress={handleClose} style={styles.browserCloseBtn}>
              <MaterialCommunityIcons name="close" size={22} color="#aaa" />
            </Pressable>
            <View style={styles.addressBar}>
              <MaterialCommunityIcons name="lock" size={12} color="#34C759" style={{ marginRight: 4 }} />
              <Text style={styles.addressText} numberOfLines={1}>api.instagram.com/oauth/authorize</Text>
            </View>
            <Pressable style={{ padding: 4 }}>
              <MaterialCommunityIcons name="refresh" size={18} color="#888" />
            </Pressable>
          </View>

          {/* Browser Content */}
          <View style={styles.browserContent}>
            {stage === 'login' && (
              <View style={styles.instaLoginContainer}>
                <Text style={styles.instaLogoText}>Instagram</Text>
                
                <Text style={styles.instaOAuthNote}>
                  {locale === 'es' 
                    ? 'RoommateFinder solicita permiso para acceder a tu nombre de usuario y fotos.'
                    : 'RoommateFinder requests permission to access your username and photos.'}
                </Text>

                <View style={styles.instaInputWrap}>
                  <TextInput
                    style={styles.instaInput}
                    placeholder={locale === 'es' ? "Usuario o correo electrónico" : "Username or email"}
                    placeholderTextColor="#555"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={styles.instaInput}
                    placeholder={locale === 'es' ? "Contraseña" : "Password"}
                    placeholderTextColor="#555"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <Pressable style={styles.instaBtn} onPress={handleLogin}>
                  <Text style={styles.instaBtnText}>{locale === 'es' ? 'Autorizar y Vincular' : 'Authorize & Link'}</Text>
                </Pressable>

                <Text style={styles.instaFooterText}>Instagram © 2026</Text>
              </View>
            )}

            {stage === 'loading' && (
              <View style={styles.instaStatusContainer}>
                <ActivityIndicator size="large" color="#E1306C" />
                <Text style={styles.instaStatusText}>
                  {locale === 'es' ? 'Conectando con Instagram...' : 'Connecting to Instagram...'}
                </Text>
                <Text style={styles.instaStatusSub}>
                  {locale === 'es' ? 'Autorizando tokens y perfil seguro...' : 'Authorizing tokens and secure profile...'}
                </Text>
              </View>
            )}

            {stage === 'success' && (
              <View style={styles.instaStatusContainer}>
                <View style={styles.instaSuccessCircle}>
                  <MaterialCommunityIcons name="check" size={38} color="#fff" />
                </View>
                <Text style={[styles.instaStatusText, { color: '#34C759', fontWeight: '800' }]}>
                  {locale === 'es' ? '¡Vinculación Exitosa!' : 'Linking Successful!'}
                </Text>
                <Text style={styles.instaStatusSub}>
                  {username.startsWith('@') ? username : `@${username}`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
});
