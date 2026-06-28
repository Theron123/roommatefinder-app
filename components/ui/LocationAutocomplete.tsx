import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';

interface Props {
  apiKey: string;
  placeholder?: string;
  onSelect: (lat: number, lng: number, description: string) => void;
  style?: any;
}

const COSTA_RICA_CITIES = [
  // Provinces
  { display_name: 'San José, Costa Rica', lat: '9.9281', lon: '-84.0907', place_id: 'cr_sj' },
  { display_name: 'Alajuela, Costa Rica', lat: '10.0163', lon: '-84.2140', place_id: 'cr_al' },
  { display_name: 'Heredia, Costa Rica', lat: '9.9981', lon: '-84.1197', place_id: 'cr_he' },
  { display_name: 'Cartago, Costa Rica', lat: '9.8644', lon: '-83.9194', place_id: 'cr_ca' },
  { display_name: 'Liberia, Guanacaste, Costa Rica', lat: '10.6300', lon: '-85.4400', place_id: 'cr_li' },
  { display_name: 'Puntarenas, Costa Rica', lat: '9.9763', lon: '-84.8294', place_id: 'cr_pu' },
  { display_name: 'Limón, Costa Rica', lat: '9.9908', lon: '-83.0358', place_id: 'cr_lm' },

  // San José Cantons/Cities
  { display_name: 'Escazú, San José, Costa Rica', lat: '9.9200', lon: '-84.1400', place_id: 'cr_sj_esc' },
  { display_name: 'Santa Ana, San José, Costa Rica', lat: '9.9326', lon: '-84.1837', place_id: 'cr_sj_sa' },
  { display_name: 'San Pedro, Montes de Oca, San José, Costa Rica', lat: '9.9328', lon: '-84.0519', place_id: 'cr_sj_sp' },
  { display_name: 'Curridabat, San José, Costa Rica', lat: '9.9161', lon: '-84.0435', place_id: 'cr_sj_curr' },
  { display_name: 'Moravia, San José, Costa Rica', lat: '9.9681', lon: '-84.0489', place_id: 'cr_sj_mor' },
  { display_name: 'Coronado, San José, Costa Rica', lat: '9.9723', lon: '-84.0044', place_id: 'cr_sj_cor' },
  { display_name: 'Guadalupe, Goicoechea, San José, Costa Rica', lat: '9.9482', lon: '-84.0558', place_id: 'cr_sj_gua' },
  { display_name: 'Tibás, San José, Costa Rica', lat: '9.9572', lon: '-84.0811', place_id: 'cr_sj_tib' },
  { display_name: 'Pérez Zeledón, San José, Costa Rica', lat: '9.3732', lon: '-83.7028', place_id: 'cr_sj_pz' },
  { display_name: 'Desamparados, San José, Costa Rica', lat: '9.8978', lon: '-84.0628', place_id: 'cr_sj_des' },
  { display_name: 'Hatillo, San José, Costa Rica', lat: '9.9167', lon: '-84.0975', place_id: 'cr_sj_hat' },
  { display_name: 'San Sebastián, San José, Costa Rica', lat: '9.9125', lon: '-84.0858', place_id: 'cr_sj_ss' },
  { display_name: 'Pavas, San José, Costa Rica', lat: '9.9417', lon: '-84.1333', place_id: 'cr_sj_pav' },

  // Alajuela Cantons/Cities
  { display_name: 'Ciudad Quesada, San Carlos, Alajuela, Costa Rica', lat: '10.3238', lon: '-84.4352', place_id: 'cr_al_sc' },
  { display_name: 'Grecia, Alajuela, Costa Rica', lat: '10.0733', lon: '-84.3117', place_id: 'cr_al_gre' },
  { display_name: 'San Ramón, Alajuela, Costa Rica', lat: '10.0886', lon: '-84.4705', place_id: 'cr_al_sr' },
  { display_name: 'Naranjo, Alajuela, Costa Rica', lat: '10.0983', lon: '-84.3789', place_id: 'cr_al_nar' },
  { display_name: 'Palmares, Alajuela, Costa Rica', lat: '10.0594', lon: '-84.4344', place_id: 'cr_al_pal' },

  // Heredia Cantons/Cities
  { display_name: 'San Antonio, Belén, Heredia, Costa Rica', lat: '9.9806', lon: '-84.1750', place_id: 'cr_he_bel' },
  { display_name: 'San Joaquín, Flores, Heredia, Costa Rica', lat: '10.0039', lon: '-84.1539', place_id: 'cr_he_flo' },
  { display_name: 'Barva, Heredia, Costa Rica', lat: '10.0150', lon: '-84.1194', place_id: 'cr_he_barv' },
  { display_name: 'Santo Domingo, Heredia, Costa Rica', lat: '9.9792', lon: '-84.0872', place_id: 'cr_he_sd' },
  { display_name: 'San Francisco, Heredia, Costa Rica', lat: '9.9922', lon: '-84.1294', place_id: 'cr_he_sf' },

  // Cartago Cantons/Cities
  { display_name: 'Tres Ríos, La Unión, Cartago, Costa Rica', lat: '9.9056', lon: '-84.0108', place_id: 'cr_ca_lu' },
  { display_name: 'Paraíso, Cartago, Costa Rica', lat: '9.8378', lon: '-83.8653', place_id: 'cr_ca_par' },
  { display_name: 'Turrialba, Cartago, Costa Rica', lat: '9.9044', lon: '-83.6833', place_id: 'cr_ca_tur' },
  { display_name: 'Oreamuno, Cartago, Costa Rica', lat: '9.8700', lon: '-83.9000', place_id: 'cr_ca_or' },

  // Guanacaste Cantons/Cities
  { display_name: 'Tamarindo, Santa Cruz, Guanacaste, Costa Rica', lat: '10.2992', lon: '-85.8372', place_id: 'cr_gu_tam' },
  { display_name: 'Playas del Coco, Carrillo, Guanacaste, Costa Rica', lat: '10.5539', lon: '-85.6983', place_id: 'cr_gu_coco' },
  { display_name: 'Santa Cruz, Guanacaste, Costa Rica', lat: '10.2600', lon: '-85.5800', place_id: 'cr_gu_sc' },
  { display_name: 'Nicoya, Guanacaste, Costa Rica', lat: '10.1481', lon: '-85.4522', place_id: 'cr_gu_nic' },
  { display_name: 'Nosara, Nicoya, Guanacaste, Costa Rica', lat: '9.9792', lon: '-85.6797', place_id: 'cr_gu_nos' },

  // Puntarenas Cantons/Cities
  { display_name: 'Jacó, Garabito, Puntarenas, Costa Rica', lat: '9.6150', lon: '-84.6294', place_id: 'cr_pu_jac' },
  { display_name: 'Quepos, Manuel Antonio, Puntarenas, Costa Rica', lat: '9.4308', lon: '-84.1620', place_id: 'cr_pu_quep' },
  { display_name: 'Esparza, Puntarenas, Costa Rica', lat: '9.9939', lon: '-84.6644', place_id: 'cr_pu_esp' },

  // Limón Cantons/Cities
  { display_name: 'Guápiles, Pococí, Limón, Costa Rica', lat: '10.2167', lon: '-83.7833', place_id: 'cr_li_guap' },
  { display_name: 'Puerto Viejo, Talamanca, Limón, Costa Rica', lat: '9.6563', lon: '-82.7533', place_id: 'cr_li_pv' },
  { display_name: 'Cahuita, Talamanca, Limón, Costa Rica', lat: '9.7369', lon: '-82.8428', place_id: 'cr_li_cah' },
];

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

      // 1. Search local Costa Rica database
      const lowerQuery = text.toLowerCase().trim();
      const localMatches = COSTA_RICA_CITIES.filter(city => 
        city.display_name.toLowerCase().includes(lowerQuery)
      );

      // 2. Fetch from OpenStreetMap Nominatim (global search for all countries/cities)
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5`;
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'es,en;q=0.9',
          'User-Agent': 'RoommateFinderApp/1.0'
        }
      });
      const data = await response.json();
      
      // Combine results and remove duplicates
      const combined = [...localMatches];
      
      if (data && Array.isArray(data)) {
        data.forEach((remoteItem: any) => {
          // Avoid duplicate local matches by checking if display name is already matched
          const isDuplicate = localMatches.some(localItem => 
            remoteItem.display_name.toLowerCase().includes(localItem.display_name.toLowerCase().replace(', costa rica', '').trim())
          );
          if (!isDuplicate) {
            combined.push({
              display_name: remoteItem.display_name,
              lat: remoteItem.lat,
              lon: remoteItem.lon,
              place_id: String(remoteItem.place_id),
            });
          }
        });
      }
      
      if (combined.length > 0) {
        setPredictions(combined.slice(0, 8)); // Show up to 8 combined results
        setShowDropdown(true);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
      // Offline fallback: Use local matches only if API fails/offline
      const lowerQuery = text.toLowerCase().trim();
      const localMatches = COSTA_RICA_CITIES.filter(city => 
        city.display_name.toLowerCase().includes(lowerQuery)
      );
      if (localMatches.length > 0) {
        setPredictions(localMatches);
        setShowDropdown(true);
      } else {
        setPredictions([]);
      }
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
    maxHeight: 220,
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
