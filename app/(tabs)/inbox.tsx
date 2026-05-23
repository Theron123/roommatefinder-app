import { useRouter, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function InboxScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

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
      fetchInboxData();
    }, [])
  );

  const fetchInboxData = async () => {
    if (conversations.length === 0 && matches.length === 0) {
      setLoading(true);
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const myId = session.user.id;

    // Fetch matches and messages in parallel
    const [matchesRes, msgsRes] = await Promise.all([
      supabase.from('matches').select('user1, user2').or(`user1.eq.${myId},user2.eq.${myId}`),
      supabase.from('messages').select('*').or(`sender_id.eq.${myId},receiver_id.eq.${myId}`).order('created_at', { ascending: false })
    ]);

    const matchData = matchesRes.data || [];
    const msgs = msgsRes.data || [];

    // Find who we have messaged
    const messagedUsers = new Set<string>();
    const lastMsgs = new Map<string, any>();

    msgs.forEach(msg => {
      const otherId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
      if (!messagedUsers.has(otherId)) {
        messagedUsers.add(otherId);
        lastMsgs.set(otherId, msg);
      }
    });

    // Find "New Matches" (users we matched with, but haven't messaged yet)
    const newMatchIds = new Set<string>();
    matchData.forEach(m => {
      const otherId = m.user1 === myId ? m.user2 : m.user1;
      if (!messagedUsers.has(otherId)) {
        newMatchIds.add(otherId);
      }
    });

    // Combine all IDs we need to fetch profiles for
    const allProfileIdsToFetch = new Set([...messagedUsers, ...newMatchIds]);

    if (allProfileIdsToFetch.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, age, photoUrl')
        .in('id', Array.from(allProfileIdsToFetch));

      if (profiles) {
        const profileMap = new Map();
        profiles.forEach(p => profileMap.set(p.id, p));

        // Format New Matches
        const formattedMatches = Array.from(newMatchIds)
          .map(id => profileMap.get(id))
          .filter(Boolean);
        setMatches(formattedMatches);

        // Format Conversations
        const formattedConvos = Array.from(messagedUsers)
          .map(id => {
            const p = profileMap.get(id);
            if (!p) return null;
            const lastMsg = lastMsgs.get(id);
            const date = new Date(lastMsg.created_at);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return {
              id: p.id,
              name: p.name || 'Roommate',
              age: p.age,
              photoUrl: p.photoUrl,
              lastMessage: lastMsg.content || lastMsg.media_type || 'Message',
              time: timeStr,
              unread: false,
            };
          })
          .filter(Boolean);

        // Sort Conversations by latest message
        formattedConvos.sort((a: any, b: any) => {
          const timeA = new Date(lastMsgs.get(a.id).created_at).getTime();
          const timeB = new Date(lastMsgs.get(b.id).created_at).getTime();
          return timeB - timeA;
        });

        setConversations(formattedConvos);
      }
    } else {
      setMatches([]);
      setConversations([]);
    }
    
    setLoading(false);
  };

  const renderConversation = useCallback(({ item }: { item: any }) => (
    <Pressable
      onPress={() => router.push(`/chat/${item.id}`)}
      style={styles.row}
    >
      <Image source={{ uri: item.photoUrl }} style={styles.avatar} contentFit="cover" transition={200} cachePolicy="memory-disk" />
      
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
  ), [router]);

  const renderSearchItem = useCallback(({ item }: { item: any }) => (
    <Pressable onPress={() => router.push(`/profile/${item.id}`)} style={styles.row}>
      <Image source={{ uri: item.photoUrl }} style={styles.avatar} contentFit="cover" transition={200} cachePolicy="memory-disk" />
      <View style={styles.content}>
         <Text style={styles.name}>{item.name}, {item.age}</Text>
         <Text style={styles.lastMessage}>Tap to view profile</Text>
      </View>
    </Pressable>
  ), [router]);

  const renderMatchItem = useCallback(({ item }: { item: any }) => (
    <Pressable style={styles.matchItem} onPress={() => router.push(`/chat/${item.id}`)}>
      <View style={styles.matchAvatarContainer}>
        <Image source={{ uri: item.photoUrl }} style={styles.matchAvatar} contentFit="cover" cachePolicy="memory-disk" />
      </View>
      <Text style={styles.matchName} numberOfLines={1}>{item.name}</Text>
    </Pressable>
  ), [router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#1a1a24', '#000']} style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.title}>Messages</Text>
            <Text style={styles.subtitle}>{conversations.filter(c => c.unread).length} unread conversations</Text>
          </View>
          <Pressable onPress={() => router.push('/activity')} style={styles.followersIcon}>
             <MaterialCommunityIcons name="bell-outline" size={26} color="#49C788" />
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
        <FlashList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchItem}
          ListEmptyComponent={<Text style={{color: '#888', textAlign: 'center', marginTop: 40}}>No users found</Text>}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {matches.length > 0 && (
            <View style={styles.matchesSection}>
              <Text style={styles.matchesTitle}>New Matches</Text>
              <FlashList
                data={matches}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.matchesScroll}
                renderItem={renderMatchItem}
              />
            </View>
          )}
          
          <Text style={[styles.matchesTitle, { marginTop: 16 }]}>Messages</Text>
          {conversations.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }}>
              <MaterialCommunityIcons name="message-text-outline" size={60} color="#333" />
              <Text style={styles.emptyText}>No messages yet.</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <FlashList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={renderConversation}
                contentContainerStyle={styles.list}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>
          )}
        </View>
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
  matchesSection: {
    paddingVertical: 10,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginTop: 15,
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
    backgroundColor: '#49C788',
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
    backgroundColor: 'rgba(73, 199, 136, 0.12)',
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
    color: '#49C788',
  },
  matchesContainer: {
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a24',
  },
  matchesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#49C788',
    marginLeft: 20,
    marginBottom: 12,
  },
  matchesScroll: {
    paddingHorizontal: 16,
  },
  matchItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 70,
  },
  matchAvatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#49C788',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  matchAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  matchName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
