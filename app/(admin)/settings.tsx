import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation, Locale } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const THEME_COLORS = [
  { name: 'emerald', value: '#49C788' },
  { name: 'ocean',   value: '#0084FF' },
  { name: 'ruby',    value: '#FF453A' },
  { name: 'sunset',  value: '#FF9F0A' },
  { name: 'amethyst',value: '#BF5AF2' },
  { name: 'gold',    value: '#FFD60A' },
];

export default function AdminSettings() {
  const { locale, setLocale, t } = useTranslation();
  const { accentColor, changeAccentColor } = useAdminTheme();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileAge, setProfileAge] = useState('');
  const [profileBio, setProfileBio] = useState('');

  // System Configs State
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoVerify, setAutoVerify]           = useState(false);
  const [commissionRate, setCommissionRate]   = useState('5.0');
  
  // Integration Configs State
  const [yardiEndpoint, setYardiEndpoint]     = useState('');
  const [yardiClient, setYardiClient]         = useState('');
  const [testingYardi, setTestingYardi]       = useState(false);
  const [yardiTestLogs, setYardiTestLogs]     = useState<string[] | null>(null);

  const handleTestYardi = async () => {
    setTestingYardi(true);
    setYardiTestLogs([]);
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(msg);
      setYardiTestLogs([...logs]);
    };

    try {
      addLog('🔄 Cargando configuración local de Yardi...');
      await new Promise(resolve => setTimeout(resolve, 600));

      const { loadConfigFromEnv } = require('../../lib/integrations/yardi/config');
      const { YardiApiClient } = require('../../lib/integrations/yardi/client');
      
      const config = loadConfigFromEnv();
      config.simulationMode = true; // Forzar simulación para pruebas en app
      
      addLog(`📡 Endpoint: ${yardiEndpoint || config.apiEndpoint}`);
      addLog('🔑 Solicitando token de acceso (OAuth2)...');
      await new Promise(resolve => setTimeout(resolve, 800));
      addLog('✅ Token obtenido: simulated_oauth2_token_12345');

      const client = new YardiApiClient(config);
      
      addLog('🔍 Listando propiedades de Yardi (REST)...');
      await new Promise(resolve => setTimeout(resolve, 900));
      const properties = await client.get('/properties');
      addLog(`✅ Recibidas ${properties.length} propiedades.`);
      properties.forEach((p: any) => {
        addLog(`   • [${p.PropertyCode}] ${p.PropertyName}`);
      });

      addLog('📨 Solicitando GetResidentDetails (SOAP)...');
      await new Promise(resolve => setTimeout(resolve, 800));
      await client.soapRequest('GetResidentDetails', '<ResidentID>123</ResidentID>');
      addLog('✅ SOAP exitoso. Inquilino actual: t001842');

      addLog('🎉 ¡Sincronización simulada completada con éxito!');
    } catch (e: any) {
      addLog(`❌ Error en la prueba: ${e.message}`);
    } finally {
      setTestingYardi(false);
    }
  };

  useEffect(() => {
    loadSystemConfigs();
  }, []);

  const loadSystemConfigs = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const currentUserId = session.user.id;
        setUserId(currentUserId);
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, age, bio, role')
          .eq('id', currentUserId)
          .single();
        
        if (profile) {
          setUserRole(profile.role);
          setProfileName(profile.name || '');
          setProfileAge(profile.age ? String(profile.age) : '');
          setProfileBio(profile.bio || '');
        }
      }

      const cached = await AsyncStorage.getItem('@admin_system_configs');
      if (cached) {
        const parsed = JSON.parse(cached);
        setMaintenanceMode(parsed.maintenanceMode ?? false);
        setAutoVerify(parsed.autoVerify ?? false);
        setCommissionRate(parsed.commissionRate ?? '5.0');
        setYardiEndpoint(parsed.yardiEndpoint ?? '');
        setYardiClient(parsed.yardiClient ?? '');
      }
    } catch (e) {
      console.log('Failed to load system configs:', e);
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

  const handleSaveConfigs = async () => {
    setSaving(true);
    try {
      if (userRole === 'admin') {
        const payload = {
          maintenanceMode,
          autoVerify,
          commissionRate,
          yardiEndpoint,
          yardiClient,
        };
        await AsyncStorage.setItem('@admin_system_configs', JSON.stringify(payload));
      } else if (userId) {
        const { error } = await supabase
          .from('profiles')
          .update({
            name: profileName.trim(),
            age: profileAge ? Number(profileAge) : null,
            bio: profileBio.trim(),
          })
          .eq('id', userId);
        
        if (error) throw error;
      }
      
      Alert.alert(
        t('general.success', 'Success'),
        locale === 'es' ? 'Ajustes actualizados correctamente.' : 'Settings updated successfully!'
      );
    } catch (e: any) {
      console.error('Failed to save config:', e);
      Alert.alert(t('general.error', 'Error'), e.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={accentColor} size="large" />
          <Text style={styles.loaderText}>{t('general.loading')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('admin.settings.title')}</Text>
            <Text style={styles.subtitle}>{t('admin.settings.subtitle')}</Text>
          </View>

          {/* Language Selector */}
          <Text style={styles.sectionTitle}>{t('admin.settings.language_section')}</Text>
          <Text style={styles.sectionSubtitle}>{t('admin.settings.language_sub')}</Text>
          <View style={styles.glassCard}>
            <Pressable
              style={({ pressed }) => [
                styles.cardOption,
                locale === 'en' && { backgroundColor: `${accentColor}0a` },
                pressed && styles.itemPressed,
              ]}
              onPress={() => handleLanguageChange('en')}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.iconWrap, { backgroundColor: locale === 'en' ? `${accentColor}15` : 'rgba(255,255,255,0.04)' }]}>
                  <MaterialCommunityIcons name="translate" size={18} color={locale === 'en' ? accentColor : '#888'} />
                </View>
                <Text style={[styles.optionText, locale === 'en' && { color: '#fff', fontWeight: '700' }]}>
                  {t('settings.english')}
                </Text>
              </View>
              {locale === 'en' && <MaterialCommunityIcons name="check-decagram" size={20} color={accentColor} />}
            </Pressable>

            <View style={styles.cardDivider} />

            <Pressable
              style={({ pressed }) => [
                styles.cardOption,
                locale === 'es' && { backgroundColor: `${accentColor}0a` },
                pressed && styles.itemPressed,
              ]}
              onPress={() => handleLanguageChange('es')}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.iconWrap, { backgroundColor: locale === 'es' ? `${accentColor}15` : 'rgba(255,255,255,0.04)' }]}>
                  <MaterialCommunityIcons name="translate" size={18} color={locale === 'es' ? accentColor : '#888'} />
                </View>
                <Text style={[styles.optionText, locale === 'es' && { color: '#fff', fontWeight: '700' }]}>
                  {t('settings.spanish')}
                </Text>
              </View>
              {locale === 'es' && <MaterialCommunityIcons name="check-decagram" size={20} color={accentColor} />}
            </Pressable>
          </View>

          {/* Theme Color Selector */}
          <Text style={styles.sectionTitle}>{t('admin.settings.theme_section')}</Text>
          <Text style={styles.sectionSubtitle}>{t('admin.settings.theme_sub')}</Text>
          <View style={[styles.glassCard, styles.colorsCard]}>
            <View style={styles.colorsGrid}>
              {THEME_COLORS.map((color) => {
                const active = accentColor.toLowerCase() === color.value.toLowerCase();
                return (
                  <Pressable
                    key={color.name}
                    style={({ pressed }) => [
                      styles.colorBubbleWrap,
                      pressed && { transform: [{ scale: 0.95 }] },
                    ]}
                    onPress={() => changeAccentColor(color.value)}
                  >
                    <View style={[styles.colorBubble, { backgroundColor: color.value }]}>
                      {active && <MaterialCommunityIcons name="check" size={20} color="#000" />}
                    </View>
                    <Text style={[styles.colorBubbleLabel, active && { color: '#fff', fontWeight: '700' }]}>
                      {t(`admin.settings.${color.name}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {userRole === 'admin' ? (
            <>
              {/* System Configuration */}
              <Text style={styles.sectionTitle}>{t('admin.settings.system_section')}</Text>
              <View style={styles.glassCard}>
                {/* Maintenance Mode */}
                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>{t('admin.settings.maintenance_mode')}</Text>
                    <Text style={styles.toggleDesc}>{t('admin.settings.maintenance_desc')}</Text>
                  </View>
                  <Switch
                    value={maintenanceMode}
                    onValueChange={setMaintenanceMode}
                    trackColor={{ false: '#333', true: `${accentColor}80` }}
                    thumbColor={maintenanceMode ? accentColor : '#f4f3f4'}
                  />
                </View>

                <View style={styles.cardDivider} />

                {/* Auto-verify */}
                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>{t('admin.settings.auto_verify')}</Text>
                    <Text style={styles.toggleDesc}>{t('admin.settings.auto_verify_desc')}</Text>
                  </View>
                  <Switch
                    value={autoVerify}
                    onValueChange={setAutoVerify}
                    trackColor={{ false: '#333', true: `${accentColor}80` }}
                    thumbColor={autoVerify ? accentColor : '#f4f3f4'}
                  />
                </View>

                <View style={styles.cardDivider} />

                {/* Commission Rate */}
                <View style={styles.inputRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>{t('admin.settings.commission_rate')}</Text>
                  </View>
                  <TextInput
                    style={[styles.rateInput, { borderColor: 'rgba(255,255,255,0.08)' }]}
                    value={commissionRate}
                    onChangeText={setCommissionRate}
                    keyboardType="decimal-pad"
                    placeholder="5.0"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>

              {/* Third Party Integrations */}
              <Text style={styles.sectionTitle}>{t('admin.settings.integrations', 'Third Party Integrations')}</Text>
              <Text style={styles.sectionSubtitle}>{t('admin.settings.integrations_sub', 'Connect Yardi Voyager and Zumper')}</Text>
              <View style={styles.glassCard}>
                
                {/* Yardi Config */}
                <View style={styles.integrationRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Yardi Voyager Endpoint</Text>
                    <Text style={styles.toggleDesc}>URL to the SOAP/REST interface</Text>
                  </View>
                  <TextInput
                    style={[styles.rateInput, { width: 140, borderColor: 'rgba(255,255,255,0.08)' }]}
                    value={yardiEndpoint}
                    onChangeText={setYardiEndpoint}
                    placeholder="https://api..."
                    placeholderTextColor="#666"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.cardDivider} />
                <View style={styles.integrationRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Yardi Client ID</Text>
                    <Text style={styles.toggleDesc}>Client identifier for Oni</Text>
                  </View>
                  <TextInput
                    style={[styles.rateInput, { width: 140, borderColor: 'rgba(255,255,255,0.08)' }]}
                    value={yardiClient}
                    onChangeText={setYardiClient}
                    placeholder="ONI-1234"
                    placeholderTextColor="#666"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.cardDivider} />

                {/* Yardi Test Connection Button */}
                <View style={styles.integrationRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Probar Conexión Yardi</Text>
                    <Text style={styles.toggleDesc}>Ejecuta una simulación completa de API y SOAP</Text>
                  </View>
                  <Pressable
                    style={[styles.copyBtn, { backgroundColor: `${accentColor}20` }]}
                    onPress={handleTestYardi}
                    disabled={testingYardi}
                  >
                    {testingYardi ? (
                      <ActivityIndicator color={accentColor} size="small" />
                    ) : (
                      <Text style={[styles.copyBtnText, { color: accentColor }]}>Probar</Text>
                    )}
                  </Pressable>
                </View>

                {yardiTestLogs && (
                  <View style={{ padding: 16, backgroundColor: 'rgba(0,0,0,0.3)', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Consola de Pruebas Yardi</Text>
                      <Pressable onPress={() => setYardiTestLogs(null)}>
                        <Text style={{ color: '#888', fontSize: 12 }}>Limpiar</Text>
                      </Pressable>
                    </View>
                    {yardiTestLogs.map((log, index) => (
                      <Text key={index} style={{ color: log.startsWith('❌') ? '#ff453a' : log.startsWith('✅') || log.startsWith('🎉') ? '#49C788' : '#aaa', fontSize: 12, fontFamily: 'monospace', marginVertical: 2 }}>
                        {log}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={styles.cardDivider} />

                {/* Zumper Config */}
                <View style={styles.integrationRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>Zumper XML Feed URL</Text>
                    <Text style={styles.toggleDesc}>Send this URL to feeds@zumper.com</Text>
                  </View>
                  <Pressable 
                    style={[styles.copyBtn, { backgroundColor: `${accentColor}20` }]}
                    onPress={() => Alert.alert('Copied', 'URL: https://api.roommatefinder.com/api/zumper-feed')}
                  >
                    <Text style={[styles.copyBtnText, { color: accentColor }]}>Copy URL</Text>
                  </Pressable>
                </View>
              </View>
            </>
          ) : (
            <>
              {/* Profile Config for Company & Landlords */}
              <Text style={styles.sectionTitle}>
                {userRole === 'company' 
                  ? (locale === 'es' ? 'Perfil de la Empresa' : 'Company Profile') 
                  : (locale === 'es' ? 'Perfil del Propietario' : 'Landlord Profile')}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {locale === 'es' 
                  ? 'Actualiza los datos públicos de tu cuenta administrativa' 
                  : 'Update public information for your administrative account'}
              </Text>
              <View style={styles.glassCard}>
                <View style={{ padding: 16, gap: 16 }}>
                  {/* Name */}
                  <View style={{ gap: 6 }}>
                    <Text style={{ color: '#aaa', fontSize: 13, fontWeight: '600' }}>
                      {locale === 'es' ? 'Nombre Comercial / Propietario' : 'Display Name'}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 1,
                        borderRadius: 8,
                        padding: 12,
                        color: '#fff',
                        fontSize: 14,
                      }}
                      value={profileName}
                      onChangeText={setProfileName}
                      placeholder={locale === 'es' ? 'Escribe el nombre...' : 'Enter name...'}
                      placeholderTextColor="#555"
                    />
                  </View>

                  {/* Age (Only for Landlord) */}
                  {userRole === 'landlord' && (
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: '#aaa', fontSize: 13, fontWeight: '600' }}>
                        {locale === 'es' ? 'Edad' : 'Age'}
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          borderColor: 'rgba(255,255,255,0.08)',
                          borderWidth: 1,
                          borderRadius: 8,
                          padding: 12,
                          color: '#fff',
                          fontSize: 14,
                        }}
                        value={profileAge}
                        onChangeText={setProfileAge}
                        keyboardType="numeric"
                        placeholder="25"
                        placeholderTextColor="#555"
                      />
                    </View>
                  )}

                  {/* Bio */}
                  <View style={{ gap: 6 }}>
                    <Text style={{ color: '#aaa', fontSize: 13, fontWeight: '600' }}>
                      {locale === 'es' ? 'Descripción / Biografía' : 'Description / Bio'}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 1,
                        borderRadius: 8,
                        padding: 12,
                        color: '#fff',
                        fontSize: 14,
                        minHeight: 80,
                        textAlignVertical: 'top',
                      }}
                      value={profileBio}
                      onChangeText={setProfileBio}
                      multiline
                      numberOfLines={4}
                      placeholder={locale === 'es' ? 'Escribe una breve descripción...' : 'Write a short description...'}
                      placeholderTextColor="#555"
                    />
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Save Button */}
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: accentColor },
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleSaveConfigs}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>{t('admin.settings.save_btn')}</Text>
            )}
          </Pressable>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#555',
    marginBottom: 8,
    marginTop: 20,
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
  colorsCard: {
    padding: 16,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  optionLeft: {
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
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 66,
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  colorBubbleWrap: {
    width: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  colorBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  colorBubbleLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  toggleDesc: {
    color: '#666',
    fontSize: 12,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  integrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  copyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  rateInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderRadius: 10,
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    width: 80,
    textAlign: 'center',
  },
  saveBtn: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
});
