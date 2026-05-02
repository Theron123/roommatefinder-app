import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import * as Location from 'expo-location';

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HOBBIES = [
  '🎮 Video Games', '📚 Reading', '🏋️ Fitness', '🍳 Cooking', 
  '📸 Photography', '🎵 Music', '✈️ Traveling', '🐶 Pets', 
  '🎨 Art', '⚽ Sports'
];

const LIFESTYLE = [
  '🧹 Clean daily', '🗑️ Clean weekly', '🌅 Early bird', '🦉 Night owl', 
  '🎉 Guests allowed', '🛑 No guests', '🤫 Quiet evenings', '🍷 Social drinker'
];

const DEALBREAKERS = [
  '🚬 Smoking indoors', '🔊 Loud music', '🗑️ Messy areas', 
  '🥳 Late parties', '🐈 Pets', '💸 Unpaid bills'
];

export default function PreferencesScreen() {
  const [selectedLikes, setSelectedLikes] = useState<Set<string>>(new Set());
  const [selectedPrefs, setSelectedPrefs] = useState<Set<string>>(new Set());
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  
  const [otherLikes, setOtherLikes] = useState('');
  const [otherPrefs, setOtherPrefs] = useState('');
  const [otherDeals, setOtherDeals] = useState('');
  
  const [loading, setLoading] = useState(false);

  const toggleSelection = (item: string, setObj: Set<string>, setFn: (val: Set<string>) => void) => {
    const newSet = new Set(setObj);
    if (newSet.has(item)) {
      newSet.delete(item);
    } else {
      newSet.add(item);
    }
    setFn(newSet);
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

  const handleSave = async () => {
    setLoading(true);
    let locationProps = {};
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        locationProps = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      } else {
        Alert.alert('Permission Required', 'Location access is strictly required to find roommates near you.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.log('Location error:', err);
      Alert.alert('Error', 'An error occurred while fetching your location.');
      setLoading(false);
      return;
    }

    const likes = [Array.from(selectedLikes).join(', '), otherLikes.trim()].filter(Boolean).join(', ');
    const preferences = [Array.from(selectedPrefs).join(', '), otherPrefs.trim()].filter(Boolean).join(', ');
    const dealbreakers = [Array.from(selectedDeals).join(', '), otherDeals.trim()].filter(Boolean).join(', ');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      Alert.alert('Error', 'Not authenticated');
      setLoading(false);
      return;
    }

    const updates: any = {
      id: session.user.id,
      likes,
      preferences,
      dealbreakers,
    };

    if ('latitude' in locationProps) {
      updates.latOffset = (locationProps as any).latitude;
      updates.lngOffset = (locationProps as any).longitude;
    }

    const { data: existing } = await supabase.from('profiles').select('name').eq('id', session.user.id).single();
    if (!existing?.name) {
      updates.name = 'New Roommate';
      updates.age = 20;
    }

    const { error } = await supabase.from('profiles').upsert(updates);

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Your Preferences</Text>
        <Text style={styles.subtitle}>Tap the tags that best describe you to help us find the perfect roommate match.</Text>

        <Text style={styles.sectionTitle}>Hobbies & Interests</Text>
        <ChipGroup items={HOBBIES} selectedSet={selectedLikes} setFn={setSelectedLikes} />
        <TextInput 
          style={styles.otherInput} 
          placeholder="Other hobbies... (e.g. Skiing)" 
          placeholderTextColor="#555"
          value={otherLikes}
          onChangeText={setOtherLikes}
        />

        <Text style={styles.sectionTitle}>Lifestyle & Habits</Text>
        <ChipGroup items={LIFESTYLE} selectedSet={selectedPrefs} setFn={setSelectedPrefs} />
        <TextInput 
          style={styles.otherInput} 
          placeholder="Other habits... (e.g. Vegan, Work from home)" 
          placeholderTextColor="#555"
          value={otherPrefs}
          onChangeText={setOtherPrefs}
        />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    padding: 24,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  chipSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  chipText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
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
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
