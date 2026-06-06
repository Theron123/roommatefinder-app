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
    setTimeout(async () => {
      await setLocale(newLocale);
      setLoading(false);
    }, 400);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
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
      {title !== t('settings.logout') && (
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
});
