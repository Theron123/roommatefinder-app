import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';

export default function CompanyProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // Marketing states
  const [qualityScore, setQualityScore] = useState(85);
  const [completionPercent, setCompletionPercent] = useState(70);

  const { locale } = useTranslation();
  const { accentColor } = useAdminTheme();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const currentUserId = session.user.id;
        setUserId(currentUserId);

        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, bio')
          .eq('id', currentUserId)
          .single();

        if (profile) {
          setName(profile.name || '');
          setDescription(profile.bio || '');
        }

        // Fetch ext meta (address, phone, website, scores)
        const extKey = `pms_company_profile:${currentUserId}`;
        const cached = await AsyncStorage.getItem(extKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          setAddress(parsed.address || '');
          setPhone(parsed.phone || '');
          setWebsite(parsed.website || '');
          setLogoUrl(parsed.logoUrl || '');
          setBannerUrl(parsed.bannerUrl || '');
          setQualityScore(parsed.qualityScore ?? 85);
          setCompletionPercent(parsed.completionPercent ?? 70);
        }
      } catch (e) {
        console.error('Error loading company profile:', e);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(locale === 'es' ? 'Error' : 'Error', locale === 'es' ? 'El nombre es obligatorio.' : 'Name is required.');
      return;
    }

    try {
      setSaving(true);
      if (userId) {
        // Save to profiles
        const { error } = await supabase
          .from('profiles')
          .update({
            name: name.trim(),
            bio: description.trim(),
          })
          .eq('id', userId);

        if (error) throw error;

        // Save to ext storage
        const payload = {
          address: address.trim(),
          phone: phone.trim(),
          website: website.trim(),
          logoUrl: logoUrl.trim(),
          bannerUrl: bannerUrl.trim(),
          qualityScore,
          completionPercent: 100, // Once saved, mark 100% complete
        };
        await AsyncStorage.setItem(`pms_company_profile:${userId}`, JSON.stringify(payload));
        setCompletionPercent(100);
      }

      Alert.alert(
        locale === 'es' ? 'Perfil Actualizado' : 'Profile Updated',
        locale === 'es' ? 'Los datos de tu inmobiliaria han sido guardados.' : 'Company details saved successfully.'
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{locale === 'es' ? 'Perfil Corporativo' : 'Company Profile'}</Text>
        <Text style={styles.pageSubtitle}>
          {locale === 'es' ? 'Configura tu marca comercial, logotipos, enlaces y sugerencias de calidad.' : 'Manage your business branding, logos, links, and listing quality score.'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
          
          {/* Quality & Score Panels */}
          <Text style={styles.sectionLabel}>{locale === 'es' ? 'Marketing e Impacto de Anuncio' : 'Marketing & Listing Impact'}</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <View style={styles.scoreTop}>
                <Text style={styles.scoreVal}>{qualityScore}/100</Text>
                <MaterialCommunityIcons name="star-circle" size={24} color="#eab308" />
              </View>
              <Text style={styles.scoreLabel}>{locale === 'es' ? 'Calidad del Portafolio' : 'Portfolio Quality Score'}</Text>
              <Text style={styles.scoreSub}>Basado en descripciones e imágenes</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.scoreTop}>
                <Text style={styles.scoreVal}>{completionPercent}%</Text>
                <MaterialCommunityIcons name="check-circle" size={24} color="#49C788" />
              </View>
              <Text style={styles.scoreLabel}>{locale === 'es' ? 'Perfil Completado' : 'Profile Completion'}</Text>
              <Text style={styles.scoreSub}>Llena tus datos de contacto</Text>
            </View>
          </View>

          {/* Suggestions panel */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>{locale === 'es' ? 'Sugerencias para mejorar visibilidad' : 'Tips to increase conversion'}</Text>
            
            <View style={styles.tipRow}>
              <MaterialCommunityIcons name="alert-outline" size={16} color="#ff9f0a" />
              <Text style={styles.tipText}>
                {locale === 'es'
                  ? 'Faltan planos de planta en 1 de tus departamentos. Subir planos aumenta interés 1.8x.'
                  : 'Floorplans are missing from 1 apartment. Uploading floorplans increases conversion 1.8x.'}
              </Text>
            </View>

            <View style={styles.tipRow}>
              <MaterialCommunityIcons name="image-outline" size={16} color={accentColor} />
              <Text style={styles.tipText}>
                {locale === 'es'
                  ? 'Te sugerimos usar fotos horizontales de 1920x1080px para una mejor visualización móvil.'
                  : 'Use 1920x1080px landscape photos for premium display presentation on mobile screens.'}
              </Text>
            </View>
          </View>

          {/* Main Edit Form */}
          <Text style={styles.sectionLabel}>{locale === 'es' ? 'Datos de la Inmobiliaria' : 'Business Information'}</Text>
          
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{locale === 'es' ? 'Nombre Comercial' : 'Company Name'}</Text>
              <TextInput
                style={styles.formInput}
                value={name}
                onChangeText={setName}
                placeholder="Ej. Inmobiliaria Escazú S.A."
                placeholderTextColor="#555"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{locale === 'es' ? 'Descripción Corporativa' : 'Corporate Description'}</Text>
              <TextInput
                style={[styles.formInput, { minHeight: 80, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholder="Escribe la biografía o detalles sobre tu empresa..."
                placeholderTextColor="#555"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{locale === 'es' ? 'Dirección Física' : 'Office Address'}</Text>
              <TextInput
                style={styles.formInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Av. Central, San José..."
                placeholderTextColor="#555"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{locale === 'es' ? 'Teléfono de Contacto' : 'Contact Phone'}</Text>
              <TextInput
                style={styles.formInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="+506 8888-8888"
                placeholderTextColor="#555"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{locale === 'es' ? 'Sitio Web' : 'Business Website'}</Text>
              <TextInput
                style={styles.formInput}
                value={website}
                onChangeText={setWebsite}
                placeholder="www.inmobiliaria.com"
                placeholderTextColor="#555"
                autoCapitalize="none"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: accentColor }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>{locale === 'es' ? 'Guardar Cambios' : 'Save Profile'}</Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sectionLabel: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#12121a',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  scoreTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreVal: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  scoreLabel: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  scoreSub: {
    color: '#555',
    fontSize: 9,
    fontWeight: '600',
  },
  tipsCard: {
    backgroundColor: '#12121a',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  tipsTitle: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    color: '#888',
    fontSize: 11,
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: '#12121a',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 16,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  formInput: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 14,
  },
  saveBtn: {
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
