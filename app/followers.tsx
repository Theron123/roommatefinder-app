import { View, Text, StyleSheet, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function FollowersScreen() {
  const router = useRouter();
  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMockFollowers();
  }, []);

  const fetchMockFollowers = async () => {
    // We don't have a likes/followers table yet, so we return empty instead of mocking
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    setFollowers([]);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Recent Followers</Text>
        <View style={{ width: 32 }} />
      </View>

      <Text style={styles.subtitle}>These people liked your profile recently. Match with them to start chatting!</Text>

      {loading ? (
        <ActivityIndicator color="#49C788" size="large" style={{ marginTop: 50 }} />
      ) : followers.length === 0 ? (
        <Text style={{color: '#888', textAlign: 'center', marginTop: 40}}>No new followers yet.</Text>
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/profile/${item.id}`)} style={styles.row}>
              <Image source={{ uri: item.photoUrl || 'https://via.placeholder.com/150' }} style={styles.avatar} />
              <View style={styles.content}>
                 <Text style={styles.name}>{item.name}, {item.age}</Text>
                 <Text style={styles.time}>Liked you just now</Text>
              </View>
              <View style={styles.actionBtn}>
                 <MaterialCommunityIcons name="heart" size={20} color="#fff" />
              </View>
            </Pressable>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a24',
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    color: '#888',
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  list: {
    paddingTop: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: '#49C788',
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  time: {
    fontSize: 13,
    color: '#49C788',
  },
  actionBtn: {
    backgroundColor: '#49C788',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#1a1a24',
    marginLeft: 90,
  },
});
