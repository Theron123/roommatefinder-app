import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_PROFILES } from '@/lib/mockData';

// Simulate that the current user has had conversations with all mock roommates
const MOCK_CONVERSATIONS = MOCK_PROFILES.map((p, index) => ({
  id: p.id,
  name: p.name,
  age: p.age,
  photoUrl: p.photoUrl,
  lastMessage: index === 0
    ? 'Hey! I saw we have a lot in common 👀'
    : index === 1
    ? 'Are you still looking for a place?'
    : index === 2
    ? 'That sounds great, when can we chat?'
    : 'Let me know if you want to meet up!',
  time: ['2m ago', '1h ago', 'Yesterday', 'Mon'][index],
  unread: index === 0 || index === 2,
}));

export default function InboxScreen() {
  const router = useRouter();

  const renderConversation = ({ item }: { item: typeof MOCK_CONVERSATIONS[0] }) => (
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>{MOCK_CONVERSATIONS.filter(c => c.unread).length} unread conversations</Text>
      </View>

      <FlatList
        data={MOCK_CONVERSATIONS}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
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
    width: 56,
    height: 56,
    borderRadius: 28,
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
});
