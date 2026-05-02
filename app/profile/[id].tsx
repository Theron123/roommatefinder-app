import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useEffect, useState } from 'react';

const getSimilarityScore = (text1: string, text2: string) => {
  if (!text1 || !text2) return 0;
  const words1 = text1.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
  const words2 = text2.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
  const set1 = new Set(words1);
  const overlap = words2.filter((word) => set1.has(word));
  return overlap.length;
};

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const [profileRes, currentUserRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
      ]);
      
      if (profileRes.data) setProfile(profileRes.data);
      if (currentUserRes.data) setCurrentUser(currentUserRes.data);
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

  // Calculate Match Percentage
  let matchPercentage = 0;
  if (currentUser) {
    const simLikes = getSimilarityScore(currentUser.likes, profile.likes);
    const simPrefs = getSimilarityScore(currentUser.preferences, profile.preferences);
    const simDeals = getSimilarityScore(currentUser.dealbreakers, profile.dealbreakers);
    
    // Simple mock logic: Assume 15 max possible keyword matches is 100%
    const totalScore = simLikes + simPrefs + simDeals;
    matchPercentage = Math.min(Math.round((totalScore / 10) * 100), 99);
    if (matchPercentage < 20) matchPercentage = 25; // Floor it for realism
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
              <Text style={styles.distanceBadge}>Nearby Roommate</Text>
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
          <Text style={[styles.tagsText, { color: '#ff6b6b' }]}>{profile.dealbreakers}</Text>
          
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Floating Action Button for Chat */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.primaryButton}>
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
    borderColor: '#4ade80',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#155724',
  },
  matchPercent: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  matchLabel: {
    color: '#4ade80',
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
});
