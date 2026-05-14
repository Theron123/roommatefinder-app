import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import LocationAutocomplete from '@/components/ui/LocationAutocomplete';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'TU_CLAVE_AQUI';

import { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

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
  { key: 'sleep', title: 'Horario de sueño', options: ['Madrugador', 'Nocturno', 'Flexible'] },
  { key: 'cleanliness', title: 'Limpieza', options: ['Relajado', 'Normal', 'Muy ordenado'] },
  { key: 'social', title: 'Personalidad', options: ['Introvertido', 'Extrovertido', 'Ambivertido'] },
  { key: 'parties', title: 'Fiestas', options: ['Nunca', 'A veces', 'Frecuentes'] },
  { key: 'pets', title: 'Mascotas', options: ['Ninguna', 'Tengo mascotas', 'Amo las mascotas', 'Alérgico'] },
  { key: 'smoking', title: 'Fumar', options: ['No', 'Sí', 'Solo afuera'] },
  { key: 'music', title: 'Música alta', options: ['No', 'Sí'] },
  { key: 'work', title: 'Trabajo', options: ['En oficina', 'Híbrido', 'Remoto'] },
  { key: 'occupation', title: 'Ocupación', options: ['Estudiante', 'Trabajador', 'Ambos'] },
  { key: 'budget', title: 'Presupuesto Mensual', options: ['< $500', '$500 - $1000', '$1000 - $1500', '> $1500'] },
  { key: 'cooking', title: 'Cocina', options: ['Rara vez', 'A veces', 'Frecuente'] },
];

const LANGUAGES = ['Español', 'Inglés', 'Francés', 'Alemán', 'Portugués', 'Italiano'];

export default function PreferencesScreen() {
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

  useEffect(() => {
    loadExistingPreferences();
  }, []);

  const loadExistingPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('profiles')
        .select('likes, dealbreakers, latOffset, lngOffset, lifestyle')
        .eq('id', session.user.id)
        .single();

      if (data) {
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
          setLocationName('Loading location...');
          
          try {
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${data.latOffset}&lon=${data.lngOffset}&format=json`;
            const res = await fetch(url, {
              headers: {
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'RoommateFinderApp/1.0'
              }
            });
            const json = await res.json();
            if (json && json.display_name) {
              const parts = json.display_name.split(',');
              const shortName = parts.slice(0, 3).join(',').trim();
              setLocationName(shortName);
            } else {
              setLocationName('Saved Location');
            }
          } catch (e) {
            setLocationName('Saved Location');
          }
        }
      }
    } catch (err) {
      console.log('Error loading preferences', err);
    } finally {
      setInitialLoad(false);
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

  const ChipGroup = ({ items, selectedSet, setFn }: { items: string[], selectedSet: Set<string>, setFn: any }) => (
    <View style={styles.chipContainer}>
      {items.map(item => {
        const isSelected = selectedSet.has(item);
        return (
          <Pressable 
            key={item} 
            onPress={() => toggleSelection(item, selectedSet, setFn)}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {item}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const SingleChoiceGroup = ({ options, selectedValue, onSelect }: { options: string[], selectedValue: string, onSelect: (val: string) => void }) => (
    <View style={styles.chipContainer}>
      {options.map(item => {
        const isSelected = selectedValue === item;
        return (
          <Pressable 
            key={item} 
            onPress={() => onSelect(item)}
            style={[styles.chip, isSelected && { borderColor: '#00C9A7', backgroundColor: 'rgba(0, 201, 167, 0.1)' }]}
          >
            <Text style={[styles.chipText, isSelected && { color: '#00C9A7', fontWeight: 'bold' }]}>
              {item}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const handleSave = async () => {
    setLoading(true);

    if (!selectedLocation) {
      Alert.alert('Location Required', 'Please search and select your city to continue.');
      setLoading(false);
      return;
    }

    const likes = [Array.from(selectedLikes).join(', '), otherLikes.trim()].filter(Boolean).join(', ');
    const dealbreakers = [Array.from(selectedDeals).join(', '), otherDeals.trim()].filter(Boolean).join(', ');

    const finalLifestyle = {
      ...lifestyleData,
      languages: Array.from(selectedLanguages),
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      Alert.alert('Error', 'Not authenticated');
      setLoading(false);
      return;
    }

    const updates: any = {
      id: session.user.id,
      likes,
      dealbreakers,
      lifestyle: finalLifestyle,
    };

    if (selectedLocation) {
      updates.latOffset = selectedLocation.lat;
      updates.lngOffset = selectedLocation.lng;
    }

    const { data: existing } = await supabase.from('profiles').select('name, age').eq('id', session.user.id).single();
    if (existing && !existing.age) {
      updates.age = 20;
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id);

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/(tabs)/myprofile')} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#6C63FF" />
          <Text style={styles.backText}>Cancel</Text>
        </Pressable>
      </View>

      {initialLoad ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#6C63FF" size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Your Preferences</Text>
          <Text style={styles.subtitle}>Fill out your lifestyle to find your perfect match.</Text>

          <Text style={styles.sectionTitle}>Where do you live?</Text>
          <View style={{ zIndex: 999, marginBottom: 16 }}>
            {locationName ? <Text style={styles.locationSavedText}>Saved: {locationName}</Text> : null}
            <LocationAutocomplete
              apiKey={GOOGLE_API_KEY}
              placeholder="Search city, neighborhood, or zip..."
              onSelect={(lat, lng, description) => {
                setSelectedLocation({ lat, lng });
                setLocationName(description);
              }}
              style={{ marginBottom: 16 }}
            />
          </View>

          <Text style={styles.sectionTitle}>Hobbies & Interests</Text>
          <ChipGroup items={HOBBIES} selectedSet={selectedLikes} setFn={setSelectedLikes} />
          <TextInput 
            style={styles.otherInput} 
            placeholder="Other hobbies... (e.g. Skiing)" 
            placeholderTextColor="#555"
            value={otherLikes}
            onChangeText={setOtherLikes}
          />

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Lifestyle & Habits</Text>
          
          {LIFESTYLE_OPTIONS.map(opt => (
            <View key={opt.key} style={styles.lifestyleGroup}>
              <Text style={styles.lifestyleLabel}>{opt.title}</Text>
              <SingleChoiceGroup 
                options={opt.options} 
                selectedValue={lifestyleData[opt.key] || ''} 
                onSelect={(val) => setLifestyleField(opt.key, val)} 
              />
            </View>
          ))}

          <View style={styles.lifestyleGroup}>
            <Text style={styles.lifestyleLabel}>Idiomas</Text>
            <ChipGroup items={LANGUAGES} selectedSet={selectedLanguages} setFn={setSelectedLanguages} />
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Dealbreakers</Text>
          <ChipGroup items={DEALBREAKERS} selectedSet={selectedDeals} setFn={setSelectedDeals} />
          <TextInput 
            style={styles.otherInput} 
            placeholder="Other dealbreakers... (e.g. Allergies)" 
            placeholderTextColor="#555"
            value={otherDeals}
            onChangeText={setOtherDeals}
          />

          <Pressable
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Save and Continue</Text>
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
  backText: { color: '#6C63FF', fontSize: 16, fontWeight: '600', marginLeft: 4 },
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
  locationSavedText: { color: '#4ade80', marginBottom: 8, fontWeight: '600' },
});
