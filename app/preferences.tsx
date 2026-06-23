import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import LocationAutocomplete from '@/components/ui/LocationAutocomplete';
import * as ImagePicker from 'expo-image-picker';
import { uploadToSupabase, getCleanExtension } from '@/utils/file';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from '../context/LanguageContext';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'TU_CLAVE_AQUI';

const HOBBIES = [
  '🎮 Video Games', '📚 Reading', '🏋️ Fitness', '🍳 Cooking', 
  '📸 Photography', '🎵 Music', '✈️ Traveling', '🐶 Pets', 
  '🎨 Art', '⚽ Sports'
];

const DEALBREAKERS = [
  '🚬 Smoking indoors', '🔊 Loud music', '🗑️ Messy areas', 
  '🥳 Late parties', '🐈 Pets', '💸 Unpaid bills'
];

const LIFESTYLE_OPTIONS = [
  { key: 'sleep', title: 'Sleep Schedule', options: ['Early bird', 'Night owl', 'Flexible'] },
  { key: 'cleanliness', title: 'Cleanliness', options: ['Relaxed', 'Normal', 'Very tidy'] },
  { key: 'social', title: 'Personality', options: ['Introvert', 'Extrovert', 'Ambivert'] },
  { key: 'parties', title: 'Parties', options: ['Never', 'Sometimes', 'Frequent'] },
  { key: 'pets', title: 'Pets', options: ['None', 'I have pets', 'Love pets', 'Allergic'] },
  { key: 'smoking', title: 'Smoking', options: ['No', 'Yes', 'Outdoors only'] },
  { key: 'music', title: 'Loud Music', options: ['No', 'Yes'] },
  { key: 'work', title: 'Work Style', options: ['In office', 'Hybrid', 'Remote'] },
  { key: 'occupation', title: 'Occupation', options: ['Student', 'Working', 'Both'] },
  { key: 'budget', title: 'Monthly Budget', options: ['< $500', '$500 - $1000', '$1000 - $1500', '> $1500'] },
  { key: 'cooking', title: 'Cooking', options: ['Rarely', 'Sometimes', 'Frequently'] },
];

const LANGUAGES = ['Spanish', 'English', 'French', 'German', 'Portuguese', 'Italian'];

export default function PreferencesScreen() {
  const { t, locale, translateHobby, translateDealbreaker, translateLifestyleKey, translateLifestyleVal, translateLanguage } = useTranslation();

  const [selectedLikes, setSelectedLikes] = useState<Set<string>>(new Set());
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  
  const [otherLikes, setOtherLikes] = useState('');
  const [otherDeals, setOtherDeals] = useState('');
  
  const [lifestyleData, setLifestyleData] = useState<Record<string, string>>({});
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationName, setLocationName] = useState('');

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { focus, firstTime } = useLocalSearchParams<{ focus?: string; firstTime?: string }>();

  useEffect(() => {
    loadExistingPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExistingPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('profiles')
        .select('likes, dealbreakers, latOffset, lngOffset, lifestyle, photos')
        .eq('id', session.user.id)
        .single();

      if (data) {
        if (data.photos) {
          setPhotos(Array.isArray(data.photos) ? data.photos : []);
        }
        if (data.likes) {
          const likesArr = data.likes.split(',').map((s: string) => s.trim()).filter(Boolean);
          const known = likesArr.filter((l: string) => HOBBIES.includes(l));
          const unknown = likesArr.filter((l: string) => !HOBBIES.includes(l)).join(', ');
          setSelectedLikes(new Set(known));
          setOtherLikes(unknown);
        }
        if (data.dealbreakers) {
          const dealsArr = data.dealbreakers.split(',').map((s: string) => s.trim()).filter(Boolean);
          const known = dealsArr.filter((l: string) => DEALBREAKERS.includes(l));
          const unknown = dealsArr.filter((l: string) => !DEALBREAKERS.includes(l)).join(', ');
          setSelectedDeals(new Set(known));
          setOtherDeals(unknown);
        }
        
        if (data.lifestyle) {
           const parsed = typeof data.lifestyle === 'string' ? JSON.parse(data.lifestyle) : data.lifestyle;
           setLifestyleData(parsed || {});
           if (parsed?.languages) {
             setSelectedLanguages(new Set(parsed.languages));
           }
        }
        
        if (data.latOffset && data.lngOffset) {
          setSelectedLocation({ lat: data.latOffset, lng: data.lngOffset });
          setLocationName(locale === 'es' ? 'Cargando ubicación...' : 'Loading location...');
          
          try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${data.latOffset}&lon=${data.lngOffset}&format=json`;
            const res = await fetch(url, {
              headers: {
                'Accept-Language': locale === 'es' ? 'es-MX,es;q=0.9' : 'en-US,en;q=0.9',
                'User-Agent': 'RoommateFinderApp/1.0'
              }
            });
            const json = await res.json();
            if (json && json.display_name) {
              const parts = json.display_name.split(',');
              const shortName = parts.slice(0, 3).join(',').trim();
              setLocationName(shortName);
            } else {
              setLocationName(t('preferences.saved_loc'));
            }
          } catch {
            setLocationName(t('preferences.saved_loc'));
          }
        }
      }
    } catch (err) {
      console.log('Error loading preferences', err);
    } finally {
      setInitialLoad(false);
    }
  };

  const pickImage = async (slotIndex: number) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 1,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        setUploading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const photoUri = result.assets[0].uri;
        const fileExt = getCleanExtension(photoUri, result.assets[0].mimeType);
        const fileName = `${session.user.id}-${Date.now()}-${slotIndex}.${fileExt}`;

        await uploadToSupabase('Roommate', fileName, photoUri, `image/${fileExt}`);

        const { data } = supabase.storage.from('Roommate').getPublicUrl(fileName);
        const publicUrl = data.publicUrl;

        // Fetch current profile to get latest photos array
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('photos')
          .eq('id', session.user.id)
          .single();

        let updatedPhotos = Array.isArray(currentProfile?.photos) ? [...currentProfile.photos] : [...photos];
        while (updatedPhotos.length < 5) {
          updatedPhotos.push('');
        }
        updatedPhotos[slotIndex] = publicUrl;

        const updatePayload: any = { photos: updatedPhotos };
        if (slotIndex === 0) {
          updatePayload.photoUrl = publicUrl;
        }

        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (existingProfile) {
          await supabase.from('profiles').update(updatePayload).eq('id', session.user.id);
        } else {
          const nameFromMeta = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';
          await supabase.from('profiles').insert({
            id: session.user.id,
            name: nameFromMeta,
            age: 20,
            ...updatePayload
          });
        }

        setPhotos(updatedPhotos);
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert(
          locale === 'es' ? 'Error de Carga' : 'Upload Failed',
          locale === 'es' ? 'Hubo un error al subir tu foto de perfil.' : 'There was an error uploading your profile picture.'
        );
      } finally {
        setUploading(false);
      }
    }
  };

  const toggleSelection = (item: string, setObj: Set<string>, setFn: (val: Set<string>) => void) => {
    const newSet = new Set(setObj);
    if (newSet.has(item)) {
      newSet.delete(item);
    } else {
      newSet.add(item);
    }
    setFn(newSet);
  };

  const setLifestyleField = (key: string, value: string) => {
    setLifestyleData(prev => ({ ...prev, [key]: value }));
  };

  const ChipGroup = ({ 
    items, 
    selectedSet, 
    setFn, 
    translateFn 
  }: { 
    items: string[], 
    selectedSet: Set<string>, 
    setFn: any, 
    translateFn?: (val: string) => string 
  }) => (
    <View style={styles.chipContainer}>
      {items.map(item => {
        const isSelected = selectedSet.has(item);
        const displayLabel = translateFn ? translateFn(item) : item;
        return (
          <Pressable 
            key={item} 
            onPress={() => toggleSelection(item, selectedSet, setFn)}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {displayLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const SingleChoiceGroup = ({ 
    options, 
    selectedValue, 
    onSelect, 
    translateFn 
  }: { 
    options: string[], 
    selectedValue: string, 
    onSelect: (val: string) => void, 
    translateFn?: (val: string) => string 
  }) => (
    <View style={styles.chipContainer}>
      {options.map(item => {
        const isSelected = selectedValue === item;
        const displayLabel = translateFn ? translateFn(item) : item;
        return (
          <Pressable 
            key={item} 
            onPress={() => onSelect(item)}
            style={[styles.chip, isSelected && { borderColor: '#00C9A7', backgroundColor: 'rgba(0, 201, 167, 0.1)' }]}
          >
            <Text style={[styles.chipText, isSelected && { color: '#00C9A7', fontWeight: 'bold' }]}>
              {displayLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const handleSave = async () => {
    setLoading(true);

    if (!focus && !selectedLocation) {
      Alert.alert(t('preferences.loc_req'), t('preferences.loc_req_desc'));
      setLoading(false);
      return;
    }

    if (!focus && (!photos || photos.filter(Boolean).length === 0)) {
      Alert.alert(
        locale === 'es' ? 'Foto Requerida' : 'Photo Required',
        locale === 'es' ? 'Por favor sube al menos una foto de perfil para identificarte.' : 'Please upload at least one profile photo to identify yourself.'
      );
      setLoading(false);
      return;
    }

    const likes = [Array.from(selectedLikes).join(', '), otherLikes.trim()].filter(Boolean).join(', ');
    const dealbreakers = [Array.from(selectedDeals).join(', '), otherDeals.trim()].filter(Boolean).join(', ');

    const finalLifestyle = {
      ...lifestyleData,
      languages: Array.from(selectedLanguages),
    };

    // Construct comma-separated lifestyle string for legacy/matching preferences column
    const selectedLifestyleVals = Object.entries(lifestyleData)
      .filter(([k, v]) => k !== 'languages' && v)
      .map(([_, v]) => v);
    const preferences = selectedLifestyleVals.join(', ');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      Alert.alert(t('general.error'), t('preferences.not_auth'));
      setLoading(false);
      return;
    }

    const updates: any = {
      id: session.user.id,
      likes,
      dealbreakers,
      lifestyle: finalLifestyle,
      preferences,
    };

    if (selectedLocation) {
      updates.latOffset = selectedLocation.lat;
      updates.lngOffset = selectedLocation.lng;
    }

    const { data: existing } = await supabase.from('profiles').select('name, age').eq('id', session.user.id).single();
    
    let error;
    if (existing) {
      if (!existing.age) {
        updates.age = 20;
      }
      const res = await supabase.from('profiles').update(updates).eq('id', session.user.id);
      error = res.error;
    } else {
      const nameFromMeta = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';
      const res = await supabase.from('profiles').insert({
        ...updates,
        name: nameFromMeta,
        age: 20,
      });
      error = res.error;
    }

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      if (firstTime === 'true') {
        router.replace('/(tabs)');
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/myprofile')} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#49C788" />
          <Text style={styles.backText}>{t('general.cancel')}</Text>
        </Pressable>
      </View>

      {initialLoad ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#49C788" size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>
            {focus === 'hobbies' 
              ? t('preferences.hobbies_title') 
              : focus === 'lifestyle' 
                ? t('preferences.lifestyle_title') 
                : focus === 'dealbreakers' 
                  ? t('preferences.deals_title') 
                  : t('preferences.general_title')
            }
          </Text>
          <Text style={styles.subtitle}>
            {focus ? t('preferences.add_specs') : t('preferences.fill_lifestyle')}
          </Text>

          {(!focus) && (
            <>
              <Text style={styles.sectionTitle}>{t('preferences.where_live')}</Text>
              <View style={{ zIndex: 999, marginBottom: 16 }}>
                {locationName ? <Text style={styles.locationSavedText}>{locale === 'es' ? 'Guardada: ' : 'Saved: '}{locationName}</Text> : null}
                <LocationAutocomplete
                  apiKey={GOOGLE_API_KEY}
                  placeholder={t('preferences.search_city')}
                  onSelect={(lat, lng, description) => {
                    setSelectedLocation({ lat, lng });
                    setLocationName(description);
                  }}
                  style={{ marginBottom: 16 }}
                />
              </View>
            </>
          )}

          {(!focus) && (
            <>
              <Text style={styles.sectionTitle}>{locale === 'es' ? 'Fotos de Perfil *' : 'Profile Photos *'}</Text>
              <Text style={{ color: '#888', fontSize: 13, marginBottom: 16, marginTop: -8 }}>
                {locale === 'es' 
                  ? 'Sube al menos 1 foto para verificar tu identidad. Formato vertical 3:4 recomendado.' 
                  : 'Upload at least 1 photo to verify your identity. 3:4 portrait works best.'}
              </Text>
              <View style={styles.photosManagerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScrollContent}>
                  {(() => {
                    const slots = Array.from({ length: 5 }, (_, i) => photos[i] || null);
                    return slots.map((uri, index) => (
                      <Pressable
                        key={index}
                        style={[styles.photoSlot, !uri && styles.emptyPhotoSlot]}
                        onPress={() => pickImage(index)}
                        disabled={uploading}
                      >
                        {uri ? (
                          <>
                            <Image source={{ uri }} style={styles.slotImage} />
                            <View style={styles.slotBadge}>
                              <Text style={styles.slotBadgeText}>{index + 1}</Text>
                            </View>
                            <View style={styles.editCameraOverlay}>
                              <MaterialCommunityIcons name="camera" size={12} color="#fff" />
                            </View>
                          </>
                        ) : (
                          <View style={styles.emptySlotContent}>
                            <View style={styles.emptySlotPlusCircle}>
                              <MaterialCommunityIcons name="plus" size={16} color="#49C788" />
                            </View>
                            <Text style={styles.emptySlotText}>{locale === 'es' ? `Espacio ${index + 1}` : `Slot ${index + 1}`}</Text>
                          </View>
                        )}
                      </Pressable>
                    ));
                  })()}
                </ScrollView>
              </View>
              {uploading && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 4 }}>
                  <ActivityIndicator color="#49C788" size="small" />
                  <Text style={{ color: '#49C788', fontSize: 13, fontWeight: '600' }}>{locale === 'es' ? 'Subiendo foto...' : 'Uploading photo...'}</Text>
                </View>
              )}
            </>
          )}

          {(!focus || focus === 'hobbies') && (
            <>
              {!focus && <Text style={styles.sectionTitle}>{t('preferences.hobbies_title')}</Text>}
              <ChipGroup items={HOBBIES} selectedSet={selectedLikes} setFn={setSelectedLikes} translateFn={translateHobby} />
              <TextInput 
                style={styles.otherInput} 
                placeholder={t('preferences.other_hobbies')} 
                placeholderTextColor="#555"
                value={otherLikes}
                onChangeText={setOtherLikes}
              />
            </>
          )}

          {!focus && <View style={styles.divider} />}
          
          {(!focus || focus === 'lifestyle') && (
            <>
              {!focus && <Text style={styles.sectionTitle}>{t('preferences.lifestyle_title')}</Text>}
              {LIFESTYLE_OPTIONS.map(opt => (
                <View key={opt.key} style={styles.lifestyleGroup}>
                  <Text style={styles.lifestyleLabel}>{translateLifestyleKey(opt.key)}</Text>
                  <SingleChoiceGroup 
                    options={opt.options} 
                    selectedValue={lifestyleData[opt.key] || ''} 
                    onSelect={(val) => setLifestyleField(opt.key, val)} 
                    translateFn={translateLifestyleVal}
                  />
                </View>
              ))}

              <View style={styles.lifestyleGroup}>
                <Text style={styles.lifestyleLabel}>{locale === 'es' ? 'Idiomas' : 'Languages'}</Text>
                <ChipGroup items={LANGUAGES} selectedSet={selectedLanguages} setFn={setSelectedLanguages} translateFn={translateLanguage} />
              </View>
            </>
          )}

          {!focus && <View style={styles.divider} />}

          {(!focus || focus === 'dealbreakers') && (
            <>
              {!focus && <Text style={styles.sectionTitle}>{t('preferences.deals_title')}</Text>}
              <ChipGroup items={DEALBREAKERS} selectedSet={selectedDeals} setFn={setSelectedDeals} translateFn={translateDealbreaker} />
              <TextInput 
                style={styles.otherInput} 
                placeholder={t('preferences.other_deals')} 
                placeholderTextColor="#555"
                value={otherDeals}
                onChangeText={setOtherDeals}
              />
            </>
          )}

          <Pressable
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>{t('preferences.save_cont')}</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#49C788', fontSize: 16, fontWeight: '600', marginLeft: 4 },
  container: { padding: 24, backgroundColor: '#000' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#aaa', marginBottom: 24 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 16, marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#222', marginVertical: 24 },
  lifestyleGroup: { marginBottom: 16 },
  lifestyleLabel: { fontSize: 16, fontWeight: '600', color: '#ccc', marginBottom: 8 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  chip: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  chipSelected: { backgroundColor: '#fff', borderColor: '#fff' },
  chipText: { color: '#ccc', fontSize: 14, fontWeight: '500' },
  chipTextSelected: { color: '#000', fontWeight: 'bold' },
  otherInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    marginTop: -4,
    marginBottom: 16,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  buttonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  locationSavedText: { color: '#49C788', marginBottom: 8, fontWeight: '600' },
  photosManagerContainer: {
    marginBottom: 20,
  },
  photosScrollContent: {
    gap: 12,
  },
  photoSlot: {
    width: 100,
    height: 133,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  emptyPhotoSlot: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#333',
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotImage: {
    width: 100,
    height: 133,
  },
  slotBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  editCameraOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(73,199,136,0.9)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptySlotPlusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(73,199,136,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotText: {
    color: '#666',
    fontSize: 11,
  },
});
