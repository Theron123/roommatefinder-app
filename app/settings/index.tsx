import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useTranslation, Locale } from '../../context/LanguageContext';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

export default function SettingsScreen() {
  const router = useRouter();
  const { locale, setLocale, t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = async (newLocale: Locale) => {
    if (locale === newLocale) return;
    setLoading(true);
    // Simulate a minor visual transition to give a polished feel
    setTimeout(async () => {
      await setLocale(newLocale);
      setLoading(false);
    }, 400);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const SettingsItem = ({ icon, title, onPress, color = '#fff' }: { icon: string; title: string; onPress: () => void; color?: string }) => (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={styles.itemLeft}>
        <MaterialCommunityIcons name={icon as any} size={24} color={color} style={styles.icon} />
        <Text style={[styles.itemText, { color }]}>{title}</Text>
      </View>
      {title !== t('settings.logout') && (
        <MaterialCommunityIcons name="chevron-right" size={24} color="#444" />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color="#49C788" size="large" />
          <Text style={styles.loaderText}>{t('general.loading')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* Language Selector Section */}
          <Text style={styles.sectionTitle}>{t('settings.language_section')}</Text>
          <Text style={styles.sectionSubtitle}>{t('settings.language_sub')}</Text>
          <View style={styles.languageGroup}>
            <Pressable 
              style={[styles.langOption, locale === 'en' && styles.langOptionActive]} 
              onPress={() => handleLanguageChange('en')}
            >
              <View style={styles.langLeft}>
                <MaterialCommunityIcons name="translate" size={20} color={locale === 'en' ? '#49C788' : '#888'} style={{ marginRight: 10 }} />
                <Text style={[styles.langText, locale === 'en' && styles.langTextActive]}>{t('settings.english')}</Text>
              </View>
              {locale === 'en' && <MaterialCommunityIcons name="check-circle" size={20} color="#49C788" />}
            </Pressable>
            
            <View style={styles.optionDivider} />

            <Pressable 
              style={[styles.langOption, locale === 'es' && styles.langOptionActive]} 
              onPress={() => handleLanguageChange('es')}
            >
              <View style={styles.langLeft}>
                <MaterialCommunityIcons name="translate" size={20} color={locale === 'es' ? '#49C788' : '#888'} style={{ marginRight: 10 }} />
                <Text style={[styles.langText, locale === 'es' && styles.langTextActive]}>{t('settings.spanish')}</Text>
              </View>
              {locale === 'es' && <MaterialCommunityIcons name="check-circle" size={20} color="#49C788" />}
            </Pressable>
          </View>

          {/* Account Section */}
          <Text style={styles.sectionTitle}>{t('settings.account_section')}</Text>
          <View style={styles.sectionGroup}>
            <SettingsItem icon="account-circle-outline" title={t('settings.edit_profile')} onPress={() => router.push('/preferences')} />
            <SettingsItem icon="shield-lock-outline" title={t('settings.privacy_security')} onPress={() => {}} />
            <SettingsItem icon="bell-outline" title={t('settings.notifications')} onPress={() => {}} />
            <SettingsItem icon="star-outline" title={t('settings.subscriptions_payments')} onPress={() => router.push('/subscriptions')} />
          </View>

          {/* Support & About Section */}
          <Text style={styles.sectionTitle}>{t('settings.support_about')}</Text>
          <View style={styles.sectionGroup}>
            <SettingsItem icon="help-circle-outline" title={t('settings.help_support')} onPress={() => {}} />
            <SettingsItem icon="information-outline" title={t('settings.about')} onPress={() => {}} />
            <SettingsItem icon="file-document-outline" title={t('settings.terms_policies')} onPress={() => router.push('/terms')} />
          </View>

          {/* Login/Logout Section */}
          <Text style={styles.sectionTitle}>{t('settings.login_section')}</Text>
          <View style={styles.sectionGroup}>
            <SettingsItem icon="logout" title={t('settings.logout')} color="#FF3B30" onPress={handleLogout} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerVersion}>{t('settings.version')} 2.1.0 · RoommateFinder</Text>
          </View>

        </ScrollView>
      )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a24',
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginLeft: 20,
    marginBottom: 6,
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sectionSubtitle: {
    color: '#888',
    fontSize: 13,
    marginLeft: 20,
    marginBottom: 12,
  },
  sectionGroup: {
    backgroundColor: '#0d1117',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1a1a2e',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 16,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  languageGroup: {
    backgroundColor: '#0d1117',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1a1a2e',
    marginBottom: 10,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  langOptionActive: {
    backgroundColor: 'rgba(73, 199, 136, 0.03)',
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#888',
  },
  langTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#1a1a2e',
    marginLeft: 50,
  },
  footer: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: 'center',
  },
  footerVersion: {
    color: '#444',
    fontSize: 11,
    fontWeight: '500',
  },
});
