import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Image } from 'expo-image';

type ActivityItem = {
  id: string;
  type: 'match' | 'message';
  userId: string;
  name: string;
  photoUrl: string;
  text: string;
  timestamp: Date;
};

export default function ActivityScreen() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const myId = session.user.id;

    const [matchesRes, msgsRes] = await Promise.all([
      supabase.from('matches').select('*').or(`user1.eq.${myId},user2.eq.${myId}`),
      supabase.from('messages').select('*').or(`sender_id.eq.${myId},receiver_id.eq.${myId}`).order('created_at', { ascending: false }).limit(100)
    ]);

    const matches = matchesRes.data || [];
    const messages = msgsRes.data || [];

    const userIds = new Set<string>();
    matches.forEach(m => userIds.add(m.user1 === myId ? m.user2 : m.user1));
    messages.forEach(m => userIds.add(m.sender_id === myId ? m.receiver_id : m.sender_id));

    if (userIds.size === 0) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, photoUrl')
      .in('id', Array.from(userIds));

    const profileMap = new Map();
    profiles?.forEach(p => profileMap.set(p.id, p));

    const newActivities: ActivityItem[] = [];

    // Process Matches
    matches.forEach(m => {
      const otherId = m.user1 === myId ? m.user2 : m.user1;
      const profile = profileMap.get(otherId);
      if (profile) {
        newActivities.push({
          id: `match_${m.id}`,
          type: 'match',
          userId: otherId,
          name: profile.name,
          photoUrl: profile.photoUrl,
          text: `You and ${profile.name} matched!`,
          timestamp: new Date(m.created_at)
        });
      }
    });

    // Process Messages (Only the latest per conversation to avoid flooding)
    const processedMsgUsers = new Set<string>();
    messages.forEach(m => {
      const otherId = m.sender_id === myId ? m.receiver_id : m.sender_id;
      if (!processedMsgUsers.has(otherId)) {
        processedMsgUsers.add(otherId);
        const profile = profileMap.get(otherId);
        if (profile) {
          const actionText = m.sender_id === myId ? `You sent ${profile.name} a message.` : `${profile.name} sent you a message.`;
          newActivities.push({
            id: `msg_${m.id}`,
            type: 'message',
            userId: otherId,
            name: profile.name,
            photoUrl: profile.photoUrl,
            text: actionText,
            timestamp: new Date(m.created_at)
          });
        }
      }
    });

    // Sort descending by timestamp
    newActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setActivities(newActivities);
    setLoading(false);
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' d';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' h';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' m';
    return 'now';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Activity</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <ActivityIndicator color="#49C788" size="large" style={{ marginTop: 50 }} />
      ) : activities.length === 0 ? (
        <Text style={{color: '#888', textAlign: 'center', marginTop: 40}}>No recent activity.</Text>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/chat/${item.userId}`)} style={styles.row}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: item.photoUrl || 'https://via.placeholder.com/150' }} style={styles.avatar} contentFit="cover" transition={200} cachePolicy="memory-disk" />
                <View style={[styles.typeBadge, { backgroundColor: item.type === 'match' ? '#FF4B4B' : '#2196F3' }]}>
                  <MaterialCommunityIcons name={item.type === 'match' ? 'heart' : 'message'} size={12} color="#fff" />
                </View>
              </View>
              
              <View style={styles.content}>
                 <Text style={styles.text} numberOfLines={2}>
                   {item.text}
                 </Text>
                 <Text style={styles.time}>{getTimeAgo(item.timestamp)}</Text>
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
  list: {
    paddingTop: 10,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#222',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
    lineHeight: 20,
  },
  time: {
    fontSize: 13,
    color: '#888',
  },
  separator: {
    height: 1,
    backgroundColor: '#1a1a24',
    marginLeft: 92,
  },
});
