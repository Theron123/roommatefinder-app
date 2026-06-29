import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView, Alert, Platform, Modal } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

export default function PrivacyScreen() {
  const router = useRouter();
  const { locale } = useTranslation();

  const [visibility, setVisibility] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [shareBadges, setShareBadges] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('is_public, read_receipts_enabled, share_badges_enabled, biometric_enabled')
          .eq('id', session.user.id)
          .single();
        if (data) {
          setVisibility(data.is_public ?? true);
          setReadReceipts(data.read_receipts_enabled ?? true);
          setShareBadges(data.share_badges_enabled ?? true);
          setBiometric(data.biometric_enabled ?? false);
        }
      }
    } catch (e) {
      console.log('Error loading privacy settings:', e);
    }
  };

  const updateSetting = async (key: string, val: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const payload: any = { [key]: val };
        await supabase
          .from('profiles')
          .update(payload)
          .eq('id', session.user.id);
      }
    } catch (e) {
      console.log('Error updating privacy setting:', e);
    }
  };

  const isEs = locale === 'es';

  const handleDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const ToggleItem = ({ 
    icon, 
    title, 
    description, 
    value, 
    onToggle,
    iconColor = '#49C788',
    bgColor = 'rgba(73,199,136,0.1)'
  }: { 
    icon: string; 
    title: string; 
    description: string; 
    value: boolean; 
    onToggle: () => void;
    iconColor?: string;
    bgColor?: string;
  }) => (
    <Pressable 
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]} 
      onPress={onToggle}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconWrap, { backgroundColor: bgColor }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.itemTitle}>{title}</Text>
          <Text style={styles.itemDesc}>{description}</Text>
        </View>
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
          {isEs ? "Privacidad y Seguridad" : "Privacy & Security"}
        </Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          {isEs ? "Privacidad del Perfil" : "Profile Privacy"}
        </Text>
        <View style={styles.glassCard}>
          <ToggleItem
            icon="eye-outline"
            title={isEs ? "Perfil Público" : "Public Profile"}
            description={isEs ? "Permitir que cualquier usuario encuentre tu perfil en el home." : "Allow anyone to find your profile on the home screen."}
            value={visibility}
            onToggle={() => {
              const newVal = !visibility;
              setVisibility(newVal);
              updateSetting('is_public', newVal);
            }}
            iconColor="#49C788"
            bgColor="rgba(73,199,136,0.1)"
          />
          <View style={styles.cardDivider} />
          <ToggleItem
            icon="check-all"
            title={isEs ? "Confirmación de Lectura" : "Read Receipts"}
            description={isEs ? "Mostrar cuándo has leído los mensajes de otros roommates." : "Show others when you have read their messages."}
            value={readReceipts}
            onToggle={() => {
              const newVal = !readReceipts;
              setReadReceipts(newVal);
              updateSetting('read_receipts_enabled', newVal);
            }}
            iconColor="#0A84FF"
            bgColor="rgba(10,132,255,0.1)"
          />
          <View style={styles.cardDivider} />
          <ToggleItem
            icon="badge-account-outline"
            title={isEs ? "Insignias de Verificación" : "Verification Badges"}
            description={isEs ? "Mostrar tus badges de confianza (ID, escuela, trabajo) en tu perfil público." : "Show trust verification badges on your public profile."}
            value={shareBadges}
            onToggle={() => {
              const newVal = !shareBadges;
              setShareBadges(newVal);
              updateSetting('share_badges_enabled', newVal);
            }}
            iconColor="#FFD60A"
            bgColor="rgba(255,214,10,0.1)"
          />
        </View>

        <Text style={styles.sectionTitle}>
          {isEs ? "Seguridad del Dispositivo" : "Device Security"}
        </Text>
        <View style={styles.glassCard}>
          <ToggleItem
            icon="fingerprint"
            title={isEs ? "Bloqueo Biométrico" : "Biometric Lock"}
            description={isEs ? "Requerir FaceID o huella digital al abrir la aplicación." : "Require FaceID or fingerprint when opening the app."}
            value={biometric}
            onToggle={() => {
              const newVal = !biometric;
              setBiometric(newVal);
              updateSetting('biometric_enabled', newVal);
            }}
            iconColor="#BF5AF2"
            bgColor="rgba(191,90,242,0.1)"
          />
          <View style={styles.cardDivider} />
          <Pressable 
            style={({ pressed }) => [styles.actionItem, pressed && styles.itemPressed]} 
            onPress={() => {
              router.push('/settings/blocked');
            }}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,159,10,0.1)' }]}>
                <MaterialCommunityIcons name="account-cancel-outline" size={20} color="#FF9F0A" />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.itemTitle}>{isEs ? "Usuarios Bloqueados" : "Blocked Users"}</Text>
                <Text style={styles.itemDesc}>{isEs ? "Administra a las personas que has bloqueado." : "Manage roommates you have previously blocked."}</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#555" />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>
          {isEs ? "Zona de Peligro" : "Danger Zone"}
        </Text>
        <View style={[styles.glassCard, { borderColor: 'rgba(255,59,48,0.2)' }]}>
          <Pressable 
            style={({ pressed }) => [styles.dangerItem, pressed && styles.dangerPressed]} 
            onPress={handleDeleteAccount}
          >
            <MaterialCommunityIcons name="delete-forever-outline" size={24} color="#FF453A" style={{ marginRight: 12 }} />
            <Text style={styles.dangerText}>
              {isEs ? "Eliminar mi Cuenta" : "Delete My Account"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footerNote}>
          {isEs 
            ? "Tus datos personales están protegidos con encriptación AES-256 de extremo a extremo conforme a nuestras Políticas de Privacidad."
            : "Your personal data is secured using AES-256 end-to-end encryption in compliance with our Privacy Policy."}
        </Text>
      </ScrollView>

      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(255,69,58,0.1)' }]}>
              <MaterialCommunityIcons name="alert-decagram-outline" size={32} color="#FF453A" />
            </View>
            <Text style={styles.modalTitle}>
              {isEs ? "Eliminar Cuenta" : "Delete Account"}
            </Text>
            <Text style={styles.modalMessage}>
              {isEs 
                ? "¿Estás completamente seguro de que deseas eliminar tu cuenta? Esta acción es irreversible y borrará todos tus datos, mensajes y contratos de forma permanente."
                : "Are you absolutely sure you want to delete your account? This action is irreversible and will permanently delete all your data, messages, and contracts."}
            </Text>
            <View style={styles.modalButtonsStack}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalBtnDestructive,
                  pressed && { opacity: 0.8 }
                ]}
                onPress={async () => {
                  setDeleteModalVisible(false);
                  try {
                    const { error } = await (supabase.rpc as any)('delete_user');
                    if (error) throw error;
                    
                    await supabase.auth.signOut();
                    if (Platform.OS === 'web') {
                      alert(isEs ? "Tu cuenta ha sido eliminada exitosamente." : "Your account has been successfully deleted.");
                      router.replace('/(auth)/login');
                    } else {
                      Alert.alert(
                        isEs ? "Cuenta Eliminada" : "Account Deleted",
                        isEs ? "Tu cuenta ha sido eliminada exitosamente." : "Your account has been successfully deleted.",
                        [{ text: "OK", onPress: () => router.replace('/(auth)/login') }]
                      );
                    }
                  } catch (err: any) {
                    const errMsg = err.message || err;
                    if (Platform.OS === 'web') {
                      alert(isEs ? `No se pudo eliminar la cuenta: ${errMsg}` : `Failed to delete account: ${errMsg}`);
                    } else {
                      Alert.alert(
                        isEs ? "Error" : "Error",
                        isEs ? `No se pudo eliminar la cuenta: ${errMsg}` : `Failed to delete account: ${errMsg}`
                      );
                    }
                  }
                }}
              >
                <Text style={styles.modalBtnTextDestructive}>
                  {isEs ? "Eliminar Definitivamente" : "Delete Permanently"}
                </Text>
              </Pressable>
              
              <Pressable
                style={({ pressed }) => [
                  styles.modalBtnCancel,
                  pressed && { opacity: 0.8 }
                ]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalBtnTextCancel}>
                  {isEs ? "Cancelar" : "Cancel"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  actionItem: {
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
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
    paddingRight: 10,
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
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  dangerPressed: {
    backgroundColor: 'rgba(255, 69, 58, 0.05)',
  },
  dangerText: {
    color: '#FF453A',
    fontSize: 15,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 66,
  },
  footerNote: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
    marginTop: 32,
    lineHeight: 18,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  modalCard: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: '#10141e',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  modalMessage: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtonsStack: {
    width: '100%',
    gap: 8,
  },
  modalBtnDestructive: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FF453A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnTextDestructive: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBtnTextCancel: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
});
