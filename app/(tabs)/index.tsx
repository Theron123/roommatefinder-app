import { supabase } from '@/lib/supabase';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { getSimilarityScore, getDistanceFromLatLonInKm } from '@/utils/mathHelpers';

type Profile = {
  id: string;
  likes: string;
  preferences: string;
  dealbreakers: string;
  latitude: number | null;
  longitude: number | null;
  name?: string;
  age?: number;
  bio?: string;
  photoUrl?: string;
  latOffset?: number;
  lngOffset?: number;
  distance?: number | null;
  similarityScore?: number;
  hasListing?: boolean;
  role?: 'landlord' | 'host' | 'seeker';
};

export default function HomeScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedMode, setFeedMode] = useState<'people' | 'apartments'>('people');
  const router = useRouter();

  const fetchMatches = async () => {
    if (profiles.length === 0) {
      setLoading(true);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    const { data: currentUserProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    
    if (!currentUserProfile) {
      setLoading(false);
      return;
    }

    // Fetch profiles without the listings join since the foreign key is missing
    const { data: otherProfiles } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', session.user.id)
      .neq('role', 'landlord')
      .limit(50);

    if (otherProfiles) {
      let scoredProfiles = otherProfiles.map((p: any) => {
        let distance = null;
        let pLat = p.latOffset;
        let pLng = p.lngOffset;
        let cLat = currentUserProfile.latOffset;
        let cLng = currentUserProfile.lngOffset;

        if (pLat != null && pLng != null && cLat != null && cLng != null) {
          distance = getDistanceFromLatLonInKm(cLat, cLng, pLat, pLng);
        }

        const simLikes = getSimilarityScore(currentUserProfile.likes, p.likes);
        const simPrefs = getSimilarityScore(currentUserProfile.preferences, p.preferences);
        const similarityScore = simLikes + simPrefs;
        const hasListing = p.listings && Array.isArray(p.listings) ? p.listings.length > 0 : !!p.listings;

        return { ...p, distance, similarityScore, hasListing };
      });

      // 3. Sort: First by distance (low to high), then by similarity (high to low)
      scoredProfiles.sort((a, b) => {
        // If both have distance, prioritize closer distance
        if (a.distance != null && b.distance != null) {
           // Only sort by distance if the difference is more than 1km
           if (Math.abs(a.distance - b.distance) > 1) {
             return a.distance - b.distance;
           }
        }
        
        // If one has distance and the other doesn't, prioritize the one with distance
        if (a.distance != null && b.distance == null) return -1;
        if (b.distance != null && a.distance == null) return 1;

        // Fallback to similarity
        return (b.similarityScore || 0) - (a.similarityScore || 0);
      });

      setProfiles(scoredProfiles as Profile[]);
    }
    
    setLoading(false);
  };

  const fetchListings = async () => {
    if (listings.length === 0) setLoading(true);
    const { data } = await supabase.from('listings').select('*').limit(50);
    if (data) setListings(data);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (feedMode === 'people') {
        fetchMatches();
      } else {
        fetchListings();
      }
    }, [feedMode])
  );

  const renderProfile = ({ item }: { item: Profile }) => {
    const distanceText = item.distance != null ? `${item.distance.toFixed(1)} km away` : 'Location unknown';
    const matchTag = (item.similarityScore && item.similarityScore > 0) ? `${item.similarityScore} matching keywords` : '';

    return (
      <Pressable onPress={() => router.push(`/profile/${item.id}`)} style={styles.cardContainer}>
        <LinearGradient
          colors={['#1a1a24', '#0a0a0f']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.cardAvatar} contentFit="cover" transition={200} />
          ) : (
            <IconSymbol size={40} name="person.circle.fill" color="#fff" />
          )}
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>{item.name || 'Roommate'}, {item.age || '?'}</Text>
            <Text style={styles.cardSubtitle}>Tap to view profile</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{distanceText}</Text>
          </View>
          {matchTag ? (
            <View style={[styles.badge, styles.badgeMatch]}>
              <Text style={[styles.badgeText, {color: '#daf5e8'}]}>{matchTag}</Text>
            </View>
          ) : null}
          {item.hasListing ? (
            <View style={[styles.badge, { backgroundColor: '#ff9f1c', borderColor: '#49C788', borderWidth: 1 }]}>
              <Text style={[styles.badgeText, {color: '#000', fontWeight: 'bold'}]}>🏠 Has Room</Text>
            </View>
          ) : null}
        </View>
        
        <Text style={styles.label}>Likes & Hobbies</Text>
        <Text style={styles.content} numberOfLines={2}>{item.likes || 'Not specified'}</Text>

        <Text style={styles.label}>Preferences</Text>
        <Text style={styles.content} numberOfLines={2}>{item.preferences || 'Not specified'}</Text>
        </LinearGradient>
      </Pressable>
    );
  };

  const renderListing = ({ item }: { item: any }) => (
    <Pressable style={styles.cardContainer}>
      <LinearGradient
        colors={['#1a1a24', '#0a0a0f']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={{width: '100%', height: 150, borderRadius: 12, marginBottom: 12}} contentFit="cover" />
        ) : (
          <View style={{width: '100%', height: 150, borderRadius: 12, marginBottom: 12, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center'}}>
            <IconSymbol name="house.fill" size={40} color="#666" />
          </View>
        )}
        <Text style={styles.cardTitle}>{item.title || 'Apartment'}</Text>
        <Text style={styles.cardSubtitle}>${item.price}/month • {item.address}</Text>
      </LinearGradient>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>Home feed</Text>
        <Text style={styles.subTitle}>Discover people or apartments nearby.</Text>
      </View>

      <View style={styles.toggleContainer}>
        <Pressable 
          style={[styles.toggleBtn, feedMode === 'people' && styles.toggleBtnActive]}
          onPress={() => setFeedMode('people')}
        >
          <Text style={[styles.toggleText, feedMode === 'people' && styles.toggleTextActive]}>People</Text>
        </Pressable>
        <Pressable 
          style={[styles.toggleBtn, feedMode === 'apartments' && styles.toggleBtnActive]}
          onPress={() => setFeedMode('apartments')}
        >
          <Text style={[styles.toggleText, feedMode === 'apartments' && styles.toggleTextActive]}>Apartments</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#49C788" size="large" />
        </View>
      ) : feedMode === 'people' ? (
        profiles.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No matches found.</Text>
          </View>
        ) : (
          <FlatList
            data={profiles}
            keyExtractor={(item) => item.id}
            renderItem={renderProfile}
            contentContainerStyle={styles.listContent}
          />
        )
      ) : (
        listings.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No apartments found.</Text>
          </View>
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            renderItem={renderListing}
            contentContainerStyle={styles.listContent}
          />
        )
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a24',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#49C788',
  },
  toggleText: {
    color: '#888',
    fontWeight: 'bold',
  },
  toggleTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  cardContainer: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2a35',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#49C788',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
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
    backgroundColor: '#1a3a28',
    borderColor: '#49C788',
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
    color: '#FF4B4B',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});
