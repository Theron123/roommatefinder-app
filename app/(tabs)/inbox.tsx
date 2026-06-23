import { useRouter, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View, ActivityIndicator, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useState, useCallback, useEffect } from 'react';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../../context/LanguageContext';

export default function InboxScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
      fetchData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  useEffect(() => {
    let inboxChannel: any = null;

    const setupInboxSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const myId = session.user.id;
      setCurrentUserId(myId);

      inboxChannel = supabase
        .channel('public:messages_inbox')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender_id === myId || newMsg.receiver_id === myId) {
            fetchData();
          }
        })
        .subscribe();
    };

    setupInboxSubscription();

    return () => {
      if (inboxChannel) {
        supabase.removeChannel(inboxChannel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    if (conversations.length === 0 && matches.length === 0) {
      setLoading(true);
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const myId = session.user.id;
    setCurrentUserId(myId);

    try {
      // 1. Fetch messages
      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order('created_at', { ascending: false });

      if (msgsError) console.error("Error fetching messages:", msgsError);

      // 2. Fetch matches
      const { data: matchData } = await supabase
        .from('matches')
        .select('user1, user2, created_at')
        .or(`user1.eq.${myId},user2.eq.${myId}`);

      // 3. Load local storage (deleted msgs + viewed matches)
      const deletedRaw = await AsyncStorage.getItem('@roommatefinder:deleted_msgs_for_me');
      const deletedMsgs = deletedRaw ? JSON.parse(deletedRaw) : [];
      
      const viewedRaw = await AsyncStorage.getItem('@roommatefinder:viewed_matches');
      const viewedMatches = viewedRaw ? JSON.parse(viewedRaw) : [];

      const validMsgs = (msgs || []).filter(m => !deletedMsgs.includes(m.id));
      const uniqueUserIdsWithMsgs = new Set<string>();
      const lastMsgs = new Map<string, any>();
      const unreadCounts = new Map<string, number>();

      validMsgs.forEach(msg => {
        const otherId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
        if (!uniqueUserIdsWithMsgs.has(otherId)) {
          uniqueUserIdsWithMsgs.add(otherId);
          lastMsgs.set(otherId, msg);
        }
        if (msg.receiver_id === myId && !msg.is_read) {
          unreadCounts.set(otherId, (unreadCounts.get(otherId) || 0) + 1);
        }
      });

      // Match logic
      const allMatchIds = matchData ? matchData.map(m => m.user1 === myId ? m.user2 : m.user1) : [];
      
      // Collect all user IDs we need profiles for (msgs + matches)
      const allUserIdsToFetch = new Set([...Array.from(uniqueUserIdsWithMsgs), ...allMatchIds]);

      if (allUserIdsToFetch.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, age, photoUrl')
          .in('id', Array.from(allUserIdsToFetch));

        if (profiles) {
          const formattedConvos: any[] = [];
          const newMatchesList: any[] = [];

          profiles.forEach(p => {
            const hasMessages = uniqueUserIdsWithMsgs.has(p.id);
            const isMatch = allMatchIds.includes(p.id);
            const isViewed = viewedMatches.includes(p.id);

            if (hasMessages) {
              // Has messages -> goes to conversations
              const lastMsg = lastMsgs.get(p.id);
              const date = new Date(lastMsg.created_at);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              formattedConvos.push({
                id: p.id,
                name: p.name || 'Roommate',
                age: p.age,
                photoUrl: p.photoUrl,
                lastMessage: lastMsg.content || lastMsg.media_type || 'Message',
                time: timeStr,
                unreadCount: unreadCounts.get(p.id) || 0,
                lastMsgSenderId: lastMsg.sender_id,
                lastMsgIsRead: lastMsg.is_read,
                timestamp: date.getTime()
              });
            } else if (isMatch) {
              if (isViewed) {
                // Viewed but no messages -> goes to conversations
                const matchObj = matchData?.find(m => (m.user1 === p.id && m.user2 === myId) || (m.user2 === p.id && m.user1 === myId));
                const matchDate = matchObj ? new Date(matchObj.created_at) : new Date();
                const timeStr = matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                formattedConvos.push({
                  id: p.id,
                  name: p.name || 'Roommate',
                  age: p.age,
                  photoUrl: p.photoUrl,
                  lastMessage: 'Tap to chat',
                  time: timeStr,
                  unreadCount: 0,
                  lastMsgSenderId: null,
                  lastMsgIsRead: true,
                  timestamp: matchDate.getTime()
                });
              } else {
                // Unviewed match without messages -> stays in New Matches
                newMatchesList.push(p);
              }
            }
          });

          // Sort formattedConvos
          formattedConvos.sort((a, b) => b.timestamp - a.timestamp);
          
          setConversations(formattedConvos);
          setMatches(newMatchesList);
        }
      } else {
        setConversations([]);
        setMatches([]);
      }
    } catch (e) {
      console.error('Error fetching inbox data', e);
    } finally {
      setLoading(false);
    }
  };

  const renderConversation = useCallback(({ item }: { item: any }) => {
    const isUnread = item.unreadCount > 0;
    const sentByMe = item.lastMsgSenderId === currentUserId;

    return (
      <Pressable
        onPress={() => router.push(`/chat/${item.id}`)}
        style={[styles.row, isUnread && styles.rowUnread]}
      >
        <Image source={{ uri: item.photoUrl }} style={styles.avatar} contentFit="cover" transition={200} cachePolicy="memory-disk" />
        
        {isUnread && <View style={styles.unreadDot} />}

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.name, isUnread && styles.nameUnread]}>{item.name}{item.age ? `, ${item.age}` : ''}</Text>
            <Text style={[styles.time, isUnread && styles.timeUnread]}>{item.time}</Text>
          </View>
          <View style={styles.messageRow}>
            {sentByMe && (
              <MaterialCommunityIcons 
                name={item.lastMsgIsRead ? "check-all" : "check"} 
                size={16} 
                color={item.lastMsgIsRead ? "#49C788" : "#888"} 
                style={{ marginRight: 4 }} 
              />
            )}
            <Text
              numberOfLines={1}
              style={[styles.lastMessage, isUnread && styles.lastMessageUnread]}
            >
              {item.lastMessage}
            </Text>
          </View>
        </View>

        {isUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
          </View>
        )}
      </Pressable>
    );
  }, [router, currentUserId]);

  const renderSearchItem = useCallback(({ item }: { item: any }) => (
    <Pressable onPress={() => router.push(`/profile/${item.id}`)} style={styles.row}>
      <Image source={{ uri: item.photoUrl }} style={styles.avatar} contentFit="cover" transition={200} cachePolicy="memory-disk" />
      <View style={styles.content}>
         <Text style={styles.name}>{item.name}{item.age ? `, ${item.age}` : ''}</Text>
         <Text style={styles.lastMessage}>{t('explore.tap_view')}</Text>
      </View>
    </Pressable>
  ), [router, t]);

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
      <View style={styles.responsiveContent}>
        <LinearGradient colors={['rgba(25, 25, 36, 0.5)', '#000']} style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.title}>{t('inbox.messages_title')}</Text>
              <Text style={styles.subtitle}>
                {conversations.filter(c => c.unreadCount > 0).length} {conversations.filter(c => c.unreadCount > 0).length === 1 ? t('inbox.unread_conversation') : t('inbox.unread_conversations')}
              </Text>
            </View>
            <Pressable onPress={() => router.push('/activity')} style={styles.activityIcon}>
               <MaterialCommunityIcons name="bell-outline" size={24} color="#49C788" />
               {matches.length > 0 && <View style={styles.activityDot} />}
            </Pressable>
          </View>
          
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchText}
              placeholder={t('inbox.search_placeholder')}
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
            ListEmptyComponent={<Text style={{color: '#888', textAlign: 'center', marginTop: 40}}>{t('inbox.no_users')}</Text>}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color="#49C788" size="large" />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {matches.length > 0 && (
              <View style={styles.matchesSection}>
                <Text style={styles.matchesTitle}>{t('explore.new_matches')}</Text>
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
            
            <Text style={[styles.matchesTitle, { marginTop: 16 }]}>{t('inbox.messages_title')}</Text>
            {conversations.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 }}>
                <MaterialCommunityIcons name="message-text-outline" size={60} color="#333" />
                <Text style={styles.emptyText}>{t('inbox.no_chats')}</Text>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  responsiveContent: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
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
    paddingVertical: 16,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.02)',
  },
  rowUnread: {
    backgroundColor: 'rgba(73, 199, 136, 0.02)',
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
    top: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#49C788',
    borderWidth: 2.5,
    borderColor: '#000',
    zIndex: 10,
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
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ccc',
  },
  nameUnread: {
    color: '#fff',
    fontWeight: '800',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  timeUnread: {
    color: '#49C788',
    fontWeight: '600',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  lastMessageUnread: {
    color: '#e0e0e0',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#49C788',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
  separator: {
    height: 0,
    backgroundColor: 'transparent',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityIcon: {
    position: 'relative',
    padding: 8,
    backgroundColor: 'rgba(73, 199, 136, 0.12)',
    borderRadius: 20,
  },
  activityDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#49C788',
    borderWidth: 1.5,
    borderColor: '#000',
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
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#49C788',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: 'rgba(73, 199, 136, 0.05)',
  },
  matchAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  matchName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
