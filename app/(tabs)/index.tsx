import { supabase } from '@/lib/supabase';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MOCK_PROFILES, mockCurrentUserConfig } from '@/lib/mockData';

// Helper to calculate distance using Haversine formula in KM
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Helper for basic text similarity (word overlap)
const getSimilarityScore = (text1: string, text2: string) => {
  if (!text1 || !text2) return 0;
  const words1 = text1.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
  const words2 = text2.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
  const set1 = new Set(words1);
  const overlap = words2.filter((word) => set1.has(word));
  return overlap.length;
};

type Profile = {
  id: string;
  likes: string;
  preferences: string;
  dealbreakers: string;
  latitude: number | null;
  longitude: number | null;
  distance?: number;
  similarityScore?: number;
};

export default function HomeScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    setLoading(true);

    // [MOCK] Using local mock profile
    const currentUserProfile = mockCurrentUserConfig.profile;

    if (!currentUserProfile) {
      setLoading(false);
      return;
    }

    // [MOCK] Generate coords for fake profiles based on user's current location
    const baseLat = currentUserProfile.latitude || 0;
    const baseLng = currentUserProfile.longitude || 0;

    const _profiles = MOCK_PROFILES.map((p) => ({
      ...p,
      latitude: baseLat + p.latOffset,
      longitude: baseLng + p.lngOffset,
    }));

    if (_profiles) {
      let scoredProfiles = _profiles.map((p: Profile) => {
        let distance = null;
        let pLat = p.latitude;
        let pLng = p.longitude;
        let cLat = currentUserProfile.latitude;
        let cLng = currentUserProfile.longitude;

        if (pLat && pLng && cLat && cLng) {
          distance = getDistanceFromLatLonInKm(cLat, cLng, pLat, pLng);
        }

        const simLikes = getSimilarityScore(currentUserProfile.likes, p.likes);
        const simPrefs = getSimilarityScore(currentUserProfile.preferences, p.preferences);
        const similarityScore = simLikes + simPrefs;

        return { ...p, distance, similarityScore };
      });

      // 3. Sort: First by similarity (high to low), then by distance (low to high)
      scoredProfiles.sort((a, b) => {
        if (b.similarityScore !== a.similarityScore) {
          return (b.similarityScore || 0) - (a.similarityScore || 0); // Higher similarity first
        }
        if (a.distance != null && b.distance != null) {
           return a.distance - b.distance; // Closer distance first
        }
        if (a.distance != null) return -1;
        if (b.distance != null) return 1;
        return 0;
      });

      setProfiles(scoredProfiles);
    }
    
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [])
  );

  const renderProfile = ({ item }: { item: Profile }) => {
    const distanceText = item.distance != null ? `${item.distance.toFixed(1)} km away` : 'Location unknown';
    const matchTag = (item.similarityScore && item.similarityScore > 0) ? `${item.similarityScore} matching keywords` : '';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <IconSymbol size={24} name="person.circle.fill" color="#fff" />
          <Text style={styles.cardTitle}>Nearby Roommate</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{distanceText}</Text>
          </View>
          {matchTag ? (
            <View style={[styles.badge, styles.badgeMatch]}>
              <Text style={[styles.badgeText, {color: '#d4edda'}]}>{matchTag}</Text>
            </View>
          ) : null}
        </View>
        
        <Text style={styles.label}>Likes & Hobbies</Text>
        <Text style={styles.content}>{item.likes || 'Not specified'}</Text>

        <Text style={styles.label}>Preferences</Text>
        <Text style={styles.content}>{item.preferences || 'Not specified'}</Text>

        <Text style={styles.label}>Dealbreakers</Text>
        <Text style={styles.contentDealbreaker}>{item.dealbreakers || 'None mentioned'}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>Home match feed</Text>
        <Text style={styles.subTitle}>People nearby with similar preferences.</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : profiles.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No matches found nearby.</Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={renderProfile}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subTitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeMatch: {
    backgroundColor: '#155724',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  badgeText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
  },
  content: {
    fontSize: 15,
    color: '#ddd',
  },
  contentDealbreaker: {
    fontSize: 15,
    color: '#ff6b6b',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});
