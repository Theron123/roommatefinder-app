import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';

interface Props {
  apiKey: string;
  placeholder?: string;
  onSelect: (lat: number, lng: number, description: string) => void;
  style?: any;
}

export default function LocationAutocomplete({ apiKey, placeholder, onSelect, style }: Props) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const isSelecting = useRef(false);

  useEffect(() => {
    if (query.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    if (isSelecting.current) {
      isSelecting.current = false;
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchPredictions(query);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const fetchPredictions = async (text: string) => {
    try {
      setLoading(true);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5`;
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'RoommateFinderApp/1.0'
        }
      });
      const data = await response.json();
      
      if (data && data.length > 0) {
        setPredictions(data);
        setShowDropdown(true);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (latStr: string, lonStr: string, description: string) => {
    isSelecting.current = true;
    setQuery(description);
    setShowDropdown(false);
    setPredictions([]);
    onSelect(parseFloat(latStr), parseFloat(lonStr), description);
  };

  return (
    <View style={[{ zIndex: 999 }, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder || "Search location..."}
          placeholderTextColor="#888"
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setShowDropdown(true);
          }}
        />
        {loading && <ActivityIndicator color="#49C788" style={styles.loader} />}
      </View>

      {showDropdown && predictions.length > 0 && (
        <View style={styles.dropdown}>
          {predictions.map((item) => (
            <Pressable
              key={item.place_id}
              style={styles.item}
              onPress={() => handleSelect(item.lat, item.lon, item.display_name)}
            >
              <Text style={styles.itemText}>{item.display_name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
  },
  loader: {
    position: 'absolute',
    right: 14,
  },
  dropdown: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a24',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    maxHeight: 200,
    overflow: 'hidden',
    zIndex: 1000,
  },
  item: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  itemText: {
    color: '#fff',
    fontSize: 14,
  },
});
