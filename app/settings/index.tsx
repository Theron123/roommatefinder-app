import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView, ActivityIndicator, Alert, Platform, Modal } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useTranslation, Locale } from '../../context/LanguageContext';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const router = useRouter();
  const { locale, setLocale, t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [userRole, setUserRole] = useState<string>('seeker');
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalTitle, setSuccessModalTitle] = useState('');
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const [successModalIcon, setSuccessModalIcon] = useState('check-decagram');
  const [successModalIconColor, setSuccessModalIconColor] = useState('#49C788');

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (data?.role) {
          setUserRole(data.role);
        }
      }
    };
    fetchProfile();
  }, []);

  const handleRoleChange = async (newRole: 'seeker' | 'host' | 'landlord') => {
    if (userRole === newRole) {
      setRoleModalVisible(false);
      return;
    }
    
    if (userRole === 'admin' || userRole === 'company') {
      Alert.alert(
        locale === 'es' ? 'Acción no permitida' : 'Not Allowed',
        locale === 'es' ? 'Los roles administrativos no pueden ser modificados.' : 'Administrative roles cannot be modified.'
      );
      setRoleModalVisible(false);
      return;
    }

    setLoading(true);
    setRoleModalVisible(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No session');

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', session.user.id);

      if (error) throw error;

      // Si se cambia a buscador o anfitrión, asegurar que el viewMode sea 'seeker'
      if (newRole === 'seeker' || newRole === 'host') {
        await AsyncStorage.setItem('viewMode', 'seeker');
      } else {
        await AsyncStorage.setItem('viewMode', 'owner');
      }

      setUserRole(newRole);
      
      let roleExpl = '';
      let roleTitle = '';
      if (newRole === 'seeker') {
        roleTitle = locale === 'es' ? 'Buscador' : 'Seeker';
        roleExpl = locale === 'es'
          ? 'Este rol es ideal si no tienes un lugar físico y buscas alquilar una habitación o encontrar compañeros para buscar un nuevo apartamento juntos. Verás recomendaciones de perfiles de personas y apartamentos disponibles.'
          : 'This role is ideal if you do not have a place and are looking to rent a room or find roommates to search for a new apartment together. You will see roommate profiles and available apartments.';
      } else if (newRole === 'host') {
        roleTitle = locale === 'es' ? 'Anfitrión' : 'Host';
        roleExpl = locale === 'es'
          ? 'Este rol es para quienes ya tienen un apartamento donde viven y buscan a un roommate para compartir los gastos de renta y servicios. Podrás subir tu habitación y buscar perfiles de inquilinos compatibles.'
          : 'This role is for those who already live in an apartment and are looking for a roommate to split rent and bills. You can list your room and search for compatible tenant profiles.';
      } else if (newRole === 'landlord') {
        roleTitle = locale === 'es' ? 'Propietario' : 'Landlord';
        roleExpl = locale === 'es'
          ? 'Este rol es exclusivo para dueños de propiedades o administradores de inmuebles que no viven en ellos y solo buscan rentar. Tendrás acceso rápido al Panel/Dashboard de Propietario para gestionar contratos y listings.'
          : 'This role is exclusive to property owners or managers who do not live in the property and only want to rent it out. You will have quick access to the Owner Dashboard to manage leases and listings.';
      }

      let roleIcon = 'account-switch-outline';
      let roleColor = '#FFB800';
      if (newRole === 'seeker') {
        roleIcon = 'account-search';
        roleColor = '#34C759';
      } else if (newRole === 'host') {
        roleIcon = 'home-account';
        roleColor = '#0A84FF';
      } else if (newRole === 'landlord') {
        roleIcon = 'home-city';
        roleColor = '#FFB800';
      }

      setSuccessModalTitle(roleTitle);
      setSuccessModalMessage(roleExpl);
      setSuccessModalIcon(roleIcon);
      setSuccessModalIconColor(roleColor);
      setSuccessModalVisible(true);
    } catch (err: any) {
      const errMsg = err.message || 'No se pudo actualizar el rol';
      setSuccessModalTitle('Error');
      setSuccessModalMessage(errMsg);
      setSuccessModalIcon('alert-circle-outline');
      setSuccessModalIconColor('#FF453A');
      setSuccessModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (newLocale: Locale) => {
    if (locale === newLocale) return;
    setLoading(true);
    setTimeout(async () => {
      await setLocale(newLocale);
      setLoading(false);
    }, 400);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const handleDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const SettingsItem = ({ 
    icon, 
    title, 
    onPress, 
    color = '#fff', 
    bgColor = 'rgba(255,255,255,0.08)',
    iconColor = '#49C788'
  }: { 
    icon: string; 
    title: string; 
    onPress: () => void; 
    color?: string;
    bgColor?: string;
    iconColor?: string;
  }) => (
    <Pressable 
      style={({ pressed }) => [
        styles.item, 
        pressed && styles.itemPressed
      ]} 
      onPress={onPress}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconWrap, { backgroundColor: bgColor }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
        </View>
        <Text style={[styles.itemText, { color }]}>{title}</Text>
      </View>
      {title !== t('settings.logout') && title !== t('settings.delete_account') && (
        <MaterialCommunityIcons name="chevron-right" size={20} color="#555" />
      )}
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
        <Text style={styles.title}>{t('settings.title')}</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color="#49C788" size="large" />
          <Text style={styles.loaderText}>{t('general.loading')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Language Selector Section */}
          <Text style={styles.sectionTitle}>{t('settings.language_section')}</Text>
          <Text style={styles.sectionSubtitle}>{t('settings.language_sub')}</Text>
          
          <View style={styles.glassCard}>
            <Pressable 
              style={({ pressed }) => [
                styles.langOption, 
                locale === 'en' && styles.langOptionActive,
                pressed && styles.itemPressed
              ]} 
              onPress={() => handleLanguageChange('en')}
            >
              <View style={styles.langLeft}>
                <View style={[styles.iconWrap, { backgroundColor: locale === 'en' ? 'rgba(73,199,136,0.12)' : 'rgba(255,255,255,0.04)' }]}>
                  <MaterialCommunityIcons name="translate" size={18} color={locale === 'en' ? '#49C788' : '#888'} />
                </View>
                <Text style={[styles.langText, locale === 'en' && styles.langTextActive]}>{t('settings.english')}</Text>
              </View>
              {locale === 'en' && <MaterialCommunityIcons name="check-decagram" size={20} color="#49C788" />}
            </Pressable>
            
            <View style={styles.cardDivider} />

            <Pressable 
              style={({ pressed }) => [
                styles.langOption, 
                locale === 'es' && styles.langOptionActive,
                pressed && styles.itemPressed
              ]} 
              onPress={() => handleLanguageChange('es')}
            >
              <View style={styles.langLeft}>
                <View style={[styles.iconWrap, { backgroundColor: locale === 'es' ? 'rgba(73,199,136,0.12)' : 'rgba(255,255,255,0.04)' }]}>
                  <MaterialCommunityIcons name="translate" size={18} color={locale === 'es' ? '#49C788' : '#888'} />
                </View>
                <Text style={[styles.langText, locale === 'es' && styles.langTextActive]}>{t('settings.spanish')}</Text>
              </View>
              {locale === 'es' && <MaterialCommunityIcons name="check-decagram" size={20} color="#49C788" />}
            </Pressable>
          </View>

          {/* Account Section */}
          <Text style={styles.sectionTitle}>{t('settings.account_section')}</Text>
          <View style={styles.glassCard}>
            <SettingsItem 
              icon="account-circle-outline" 
              title={t('settings.edit_profile')} 
              bgColor="rgba(73,199,136,0.1)" 
              iconColor="#49C788" 
              onPress={() => router.push('/preferences')} 
            />
            <View style={styles.cardDivider} />
            <SettingsItem 
              icon="shield-lock-outline" 
              title={t('settings.privacy_security')} 
              bgColor="rgba(10,132,255,0.1)" 
              iconColor="#0A84FF" 
              onPress={() => router.push('/settings/privacy' as any)} 
            />
            <View style={styles.cardDivider} />
            <SettingsItem 
              icon="bell-outline" 
              title={t('settings.notifications')} 
              bgColor="rgba(255,159,10,0.1)" 
              iconColor="#FF9F0A" 
              onPress={() => router.push('/settings/notifications' as any)} 
            />
            <View style={styles.cardDivider} />
            <SettingsItem 
              icon="star-outline" 
              title={t('settings.subscriptions_payments')} 
              bgColor="rgba(191,90,242,0.1)" 
              iconColor="#BF5AF2" 
              onPress={() => router.push('/subscriptions')} 
            />
            <View style={styles.cardDivider} />
            <SettingsItem 
              icon="account-switch-outline" 
              title={(locale === 'es' ? "Rol de Usuario: " : "User Role: ") + (userRole === 'seeker' ? (locale === 'es' ? 'Buscador' : 'Seeker') : userRole === 'host' ? (locale === 'es' ? 'Anfitrión' : 'Host') : userRole === 'landlord' ? (locale === 'es' ? 'Propietario' : 'Landlord') : userRole)} 
              bgColor="rgba(255,184,0,0.1)" 
              iconColor="#FFB800" 
              onPress={() => setRoleModalVisible(true)} 
            />
          </View>

          {/* Support & About Section */}
          <Text style={styles.sectionTitle}>{t('settings.support_about')}</Text>
          <View style={styles.glassCard}>
            <SettingsItem 
              icon="presentation-play" 
              title={t('settings.view_onboarding')} 
              bgColor="rgba(73,199,136,0.1)" 
              iconColor="#49C788" 
              onPress={() => router.push('/onboarding?force=true')} 
            />
            <View style={styles.cardDivider} />
            <SettingsItem 
              icon="help-circle-outline" 
              title={t('settings.help_support')} 
              bgColor="rgba(0,199,190,0.1)" 
              iconColor="#00C7BE" 
              onPress={() => router.push('/settings/help' as any)} 
            />
            <View style={styles.cardDivider} />
            <SettingsItem 
              icon="information-outline" 
              title={t('settings.about')} 
              bgColor="rgba(255,214,10,0.1)" 
              iconColor="#FFD60A" 
              onPress={() => router.push('/settings/about' as any)} 
            />
            <View style={styles.cardDivider} />
            <SettingsItem 
              icon="file-document-outline" 
              title={t('settings.terms_policies')} 
              bgColor="rgba(142,142,147,0.15)" 
              iconColor="#8E8E93" 
              onPress={() => router.push('/terms')} 
            />
          </View>

          {/* Login/Logout Section */}
          <Text style={styles.sectionTitle}>{t('settings.login_section')}</Text>
          <View style={[styles.glassCard, { borderColor: 'rgba(255,59,48,0.2)' }]}>
            <SettingsItem 
              icon="logout" 
              title={t('settings.logout')} 
              color="#FF453A" 
              bgColor="rgba(255,69,58,0.1)" 
              iconColor="#FF453A" 
              onPress={handleLogout} 
            />
            <View style={styles.cardDivider} />
            <SettingsItem 
              icon="delete-forever-outline" 
              title={t('settings.delete_account')} 
              color="#FF453A" 
              bgColor="rgba(255,59,48,0.1)" 
              iconColor="#FF453A" 
              onPress={handleDeleteAccount} 
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerVersion}>{t('settings.version')} 2.1.0 · RoommateFinder</Text>
          </View>

        </ScrollView>
      )}

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
              {locale === 'es' ? "Eliminar Cuenta" : "Delete Account"}
            </Text>
            <Text style={styles.modalMessage}>
              {locale === 'es' 
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
                  setLoading(true);
                  try {
                    const { error } = await (supabase.rpc as any)('delete_user');
                    if (error) throw error;
                    
                    await supabase.auth.signOut();
                    if (Platform.OS === 'web') {
                      alert(locale === 'es' ? "Tu cuenta ha sido eliminada exitosamente." : "Your account has been successfully deleted.");
                      router.replace('/(auth)/login');
                    } else {
                      Alert.alert(
                        locale === 'es' ? "Cuenta Eliminada" : "Account Deleted",
                        locale === 'es' ? "Tu cuenta ha sido eliminada exitosamente." : "Your account has been successfully deleted.",
                        [{ text: "OK", onPress: () => router.replace('/(auth)/login') }]
                      );
                    }
                  } catch (err: any) {
                    const errMsg = err.message || err;
                    if (Platform.OS === 'web') {
                      alert(locale === 'es' ? `No se pudo eliminar la cuenta: ${errMsg}` : `Failed to delete account: ${errMsg}`);
                    } else {
                      Alert.alert(
                        locale === 'es' ? "Error" : "Error",
                        locale === 'es' ? `No se pudo eliminar la cuenta: ${errMsg}` : `Failed to delete account: ${errMsg}`
                      );
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <Text style={styles.modalBtnTextDestructive}>
                  {locale === 'es' ? "Eliminar Definitivamente" : "Delete Permanently"}
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
                  {locale === 'es' ? "Cancelar" : "Cancel"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={roleModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(255,184,0,0.1)' }]}>
              <MaterialCommunityIcons name="account-switch-outline" size={32} color="#FFB800" />
            </View>
            <Text style={styles.modalTitle}>
              {locale === 'es' ? "Cambiar Rol de Usuario" : "Change User Role"}
            </Text>
            <Text style={styles.modalMessage}>
              {locale === 'es' 
                ? "Selecciona tu nuevo rol. Recuerda que esto cambiará tus permisos y las secciones visibles de la aplicación."
                : "Select your new role. Remember that this will change your permissions and the visible sections of the application."}
            </Text>
            
            <View style={[styles.modalButtonsStack, { gap: 12 }]}>
              {/* Opción Seeker */}
              <Pressable
                style={({ pressed }) => [
                  styles.modalBtnCancel,
                  userRole === 'seeker' && { borderColor: '#49C788', backgroundColor: 'rgba(73,199,136,0.05)' },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={() => handleRoleChange('seeker')}
              >
                <Text style={[styles.modalBtnTextCancel, userRole === 'seeker' && { color: '#49C788' }]}>
                  {locale === 'es' ? "Buscador" : "Seeker"}
                </Text>
              </Pressable>

              {/* Opción Host */}
              <Pressable
                style={({ pressed }) => [
                  styles.modalBtnCancel,
                  userRole === 'host' && { borderColor: '#0A84FF', backgroundColor: 'rgba(10,132,255,0.05)' },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={() => handleRoleChange('host')}
              >
                <Text style={[styles.modalBtnTextCancel, userRole === 'host' && { color: '#0A84FF' }]}>
                  {locale === 'es' ? "Anfitrión" : "Host"}
                </Text>
              </Pressable>

              {/* Opción Landlord */}
              <Pressable
                style={({ pressed }) => [
                  styles.modalBtnCancel,
                  userRole === 'landlord' && { borderColor: '#FFB800', backgroundColor: 'rgba(255,184,0,0.05)' },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={() => handleRoleChange('landlord')}
              >
                <Text style={[styles.modalBtnTextCancel, userRole === 'landlord' && { color: '#FFB800' }]}>
                  {locale === 'es' ? "Propietario" : "Landlord"}
                </Text>
              </Pressable>

              <View style={{ height: 8 }} />

              <Pressable
                style={({ pressed }) => [
                  styles.modalBtnCancel,
                  pressed && { opacity: 0.8 },
                  { backgroundColor: 'transparent', borderColor: 'transparent' }
                ]}
                onPress={() => setRoleModalVisible(false)}
              >
                <Text style={[styles.modalBtnTextCancel, { color: '#ff4444' }]}>
                  {locale === 'es' ? "Cancelar" : "Cancel"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: '90%', maxWidth: 440, padding: 28 }]}>
            <View style={[styles.modalIconWrap, { backgroundColor: `${successModalIconColor}15`, width: 72, height: 72, borderRadius: 36, marginBottom: 20 }]}>
              <MaterialCommunityIcons name={successModalIcon as any} size={38} color={successModalIconColor} />
            </View>
            <Text style={[styles.modalTitle, { fontSize: 24, marginBottom: 12 }]}>{successModalTitle}</Text>
            <Text style={[styles.modalMessage, { fontSize: 16, lineHeight: 24, color: '#e0e0e0', marginBottom: 28 }]}>{successModalMessage}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.modalBtnCancel,
                { borderColor: successModalIconColor, backgroundColor: `${successModalIconColor}10`, width: '100%', paddingVertical: 14, borderRadius: 16 },
                pressed && { opacity: 0.8 }
              ]}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={[styles.modalBtnTextCancel, { color: successModalIconColor, fontSize: 16, fontWeight: '700' }]}>
                {locale === 'es' ? 'Entendido' : 'Got it'}
              </Text>
            </Pressable>
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
  sectionSubtitle: {
    color: '#888',
    fontSize: 13,
    marginBottom: 12,
    marginTop: -4,
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
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  itemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  langOptionActive: {
    backgroundColor: 'rgba(73, 199, 136, 0.03)',
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  langTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 66,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerVersion: {
    color: '#444',
    fontSize: 12,
    fontWeight: '600',
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
