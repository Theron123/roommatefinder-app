import { useRouter, useFocusEffect } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useState, useCallback, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function InboxScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      searchProfiles(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchProfiles = async (query: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, age, photoUrl')
      .ilike('name', `%${query}%`)
      .limit(15);
    if (data) {
      setSearchResults(data);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  const fetchConversations = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const myId = session.user.id;

      // 1. Fetch messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order('created_at', { ascending: false });

      if (msgs && msgs.length > 0) {
        const uniqueUserIds = new Set<string>();
        const lastMsgs = new Map<string, any>();

        msgs.forEach(msg => {
          const otherId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
          if (!uniqueUserIds.has(otherId)) {
            uniqueUserIds.add(otherId);
            lastMsgs.set(otherId, msg);
          }
        });

        // 2. Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, age, photoUrl')
          .in('id', Array.from(uniqueUserIds));

        if (profiles) {
          const formattedConvos = profiles.map(p => {
            const lastMsg = lastMsgs.get(p.id);
            const date = new Date(lastMsg.created_at);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return {
              id: p.id,
              name: p.name || 'Roommate',
              age: p.age,
              photoUrl: p.photoUrl,
              lastMessage: lastMsg.content,
              time: timeStr,
              unread: false,
            };
          });

          // Sort formattedConvos by lastMsg created_at DESC
          formattedConvos.sort((a, b) => {
            const timeA = new Date(lastMsgs.get(a.id).created_at).getTime();
            const timeB = new Date(lastMsgs.get(b.id).created_at).getTime();
            return timeB - timeA;
          });

          setConversations(formattedConvos);
        }
      } else {
        setConversations([]);
      }
    }
    setLoading(false);
  };

  const renderConversation = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => router.push(`/chat/${item.id}`)}
      style={styles.row}
    >
      <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
      
      {item.unread && <View style={styles.unreadDot} />}

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name}>{item.name}, {item.age}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.lastMessage, item.unread && styles.lastMessageUnread]}
        >
          {item.lastMessage}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1a1a24', '#000']} style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.title}>Messages</Text>
            <Text style={styles.subtitle}>{conversations.filter(c => c.unread).length} unread conversations</Text>
          </View>
          <Pressable onPress={() => router.push('/followers')} style={styles.followersIcon}>
             <MaterialCommunityIcons name="heart-multiple" size={26} color="#ff4b4b" />
             <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
          </Pressable>
        </View>
        
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchText}
            placeholder="Search users by name..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
        </View>
      </LinearGradient>

      {searchQuery.trim().length > 1 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/chat/${item.id}`)} style={styles.row}>
              <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
              <View style={styles.content}>
                 <Text style={styles.name}>{item.name}, {item.age}</Text>
                 <Text style={styles.lastMessage}>Tap to start chat</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={{color: '#888', textAlign: 'center', marginTop: 40}}>No users found</Text>}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#888', fontSize: 16 }}>No messages yet.</Text>
          <Text style={{ color: '#555', fontSize: 14, marginTop: 8 }}>Go to Home and start chatting!</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a24',
  },
  searchBar: {
    backgroundColor: '#0a0a0f',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a35',
  },
  searchText: {
    color: '#fff',
    fontSize: 14,
    padding: 0,
    margin: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  list: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#222',
  },
  unreadDot: {
    position: 'absolute',
    left: 62,
    top: 14,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6C63FF',
    borderWidth: 2,
    borderColor: '#000',
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  lastMessageUnread: {
    color: '#bbb',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#111',
    marginLeft: 90,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  followersIcon: {
    position: 'relative',
    padding: 8,
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    borderRadius: 20,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#fff',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a24',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ff4b4b',
  },
});
