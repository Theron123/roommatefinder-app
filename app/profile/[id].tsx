import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useEffect, useState } from 'react';
import { getSimilarityScore, getDistanceFromLatLonInKm } from '@/utils/mathHelpers';
import MapComponent from '@/components/ui/MapComponent';

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const [profileRes, currentUserRes, listingRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('listings').select('*').eq('user_id', id).single()
      ]);
      
      if (profileRes.data) setProfile(profileRes.data);
      if (currentUserRes.data) setCurrentUser(currentUserRes.data);
      if (listingRes.data) setListing(listingRes.data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>Profile not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Calculate Match Percentage and Distance
  let matchPercentage = 0;
  let distanceText = 'Location unknown';

  if (currentUser) {
    const simLikes = getSimilarityScore(currentUser.likes, profile.likes);
    const simPrefs = getSimilarityScore(currentUser.preferences, profile.preferences);
    const simDeals = getSimilarityScore(currentUser.dealbreakers, profile.dealbreakers);
    
    // Simple mock logic: Assume 15 max possible keyword matches is 100%
    const totalScore = simLikes + simPrefs + simDeals;
    matchPercentage = Math.min(Math.round((totalScore / 10) * 100), 99);
    if (matchPercentage < 20) matchPercentage = 25; // Floor it for realism

    if (currentUser.latOffset != null && currentUser.lngOffset != null && profile.latOffset != null && profile.lngOffset != null) {
      const dist = getDistanceFromLatLonInKm(currentUser.latOffset, currentUser.lngOffset, profile.latOffset, profile.lngOffset);
      distanceText = `${dist.toFixed(1)} km away`;
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: profile.photoUrl }} style={styles.headerImage} />
          
          {/* Close button overlay */}
          <Pressable onPress={() => router.back()} style={styles.closeIcon}>
            <IconSymbol name="chevron.down.circle.fill" size={32} color="#fff" />
          </Pressable>
        </View>

        {/* Info Box */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.name}>{profile.name}, {profile.age}</Text>
              <Text style={styles.distanceBadge}>{distanceText}</Text>
            </View>

            {/* Match Circle */}
            <View style={styles.matchCircle}>
              <Text style={styles.matchPercent}>{matchPercentage}%</Text>
              <Text style={styles.matchLabel}>Match</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.bioText}>{profile.bio || 'This user has not written a bio yet.'}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Hobbies & Interests</Text>
          <Text style={styles.tagsText}>{profile.likes}</Text>

          <Text style={styles.sectionTitle}>Lifestyle</Text>
          <Text style={styles.tagsText}>{profile.preferences}</Text>

          <Text style={styles.sectionTitle}>Dealbreakers</Text>
          <Text style={[styles.tagsText, { color: '#49C788' }]}>{profile.dealbreakers}</Text>
          
          {profile.latOffset && profile.lngOffset && (
            <>
              <Text style={styles.sectionTitle}>Approximate Location</Text>
              <MapComponent lat={profile.latOffset} lng={profile.lngOffset} />
            </>
          )}

          {listing && (
            <View style={styles.apartmentSection}>
              <Text style={styles.sectionTitle}>Room / Apartment Available</Text>
              <View style={styles.listingCard}>
                {listing.images && listing.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageCarousel}>
                    {listing.images.map((url: string, idx: number) => (
                      <Image key={idx} source={{ uri: url }} style={styles.carouselImage} />
                    ))}
                  </ScrollView>
                )}
                <View style={styles.listingDetails}>
                  <Text style={styles.listingTitle}>{listing.title || 'Untitled Room'}</Text>
                  <Text style={styles.listingPrice}>${listing.price}/month {listing.utilities_included && '(Utilities Included)'}</Text>
                  {listing.description && <Text style={styles.listingDesc}>{listing.description}</Text>}
                  {listing.address && <Text style={styles.listingAddress}>📍 {listing.address}</Text>}
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Floating Action Button for Chat */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.primaryButton} onPress={() => router.push(`/chat/${profile.id}`)}>
          <IconSymbol name="paperplane.fill" size={20} color="#000" />
          <Text style={styles.primaryButtonText}>Message {profile.name}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
  },
  backBtn: {
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  imageContainer: {
    width: '100%',
    height: 450,
    backgroundColor: '#111',
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  closeIcon: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  content: {
    padding: 24,
    backgroundColor: '#000',
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
  },
  distanceBadge: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
    fontWeight: '500',
  },
  matchCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#49C788',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a3a28',
  },
  matchPercent: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  matchLabel: {
    color: '#49C788',
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    marginTop: 10,
  },
  bioText: {
    fontSize: 16,
    color: '#ddd',
    lineHeight: 24,
  },
  tagsText: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  primaryButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  apartmentSection: {
    marginTop: 20,
  },
  listingCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
    marginTop: 8,
  },
  imageCarousel: {
    flexDirection: 'row',
  },
  carouselImage: {
    width: 250,
    height: 180,
    marginRight: 2,
  },
  listingDetails: {
    padding: 16,
  },
  listingTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listingPrice: {
    color: '#49C788',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  listingDesc: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  listingAddress: {
    color: '#888',
    fontSize: 14,
  },
});
