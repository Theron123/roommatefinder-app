import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { IconSymbol } from '@/components/ui/icon-symbol';

type Message = {
  id: string;
  text: string;
  from: 'me' | 'them';
  time: string;
};

const INITIAL_MESSAGES: Record<string, Message[]> = {
  'mock-1': [
    { id: '1', text: 'Hey! I saw we have a lot in common 👀', from: 'them', time: '2:41 PM' },
    { id: '2', text: 'For real! Video games and staying clean... perfect match haha', from: 'me', time: '2:42 PM' },
    { id: '3', text: 'Right? Are you looking for a place near downtown?', from: 'them', time: '2:43 PM' },
  ],
  'mock-2': [
    { id: '1', text: 'Are you still looking for a place?', from: 'them', time: '1:10 PM' },
    { id: '2', text: 'Yes! What area are you thinking?', from: 'me', time: '1:15 PM' },
  ],
  'mock-3': [
    { id: '1', text: 'That sounds great, when can we chat?', from: 'them', time: 'Yesterday' },
  ],
  'mock-4': [
    { id: '1', text: 'Let me know if you want to meet up!', from: 'them', time: 'Mon' },
  ],
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  
  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setProfile(data);
    });
  }, [id]);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES[id] || []);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const now = () => {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    const newMsg: Message = { id: String(Date.now()), text, from: 'me', time: now() };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    // Simulate a reply after 1.2s
    setTimeout(() => {
      const replies = [
        'Cool!',
        'Sounds good 👍',
        'Let me think about it...',
        'When would work for you?',
        "That's awesome!",
      ];
      const reply: Message = {
        id: String(Date.now() + 1),
        text: replies[Math.floor(Math.random() * replies.length)],
        from: 'them',
        time: now(),
      };
      setMessages((prev) => [...prev, reply]);
    }, 1200);
  };

  if (!profile) return null;

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.from === 'me';
    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <Image source={{ uri: profile.photoUrl }} style={styles.msgAvatar} />
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
        </View>
        <Text style={[styles.timeText, isMe && { textAlign: 'right' }]}>{item.time}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color="#fff" />
        </Pressable>
        <Image source={{ uri: profile.photoUrl }} style={styles.headerAvatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{profile.name}, {profile.age}</Text>
          <Text style={styles.headerStatus}>🟢 Online</Text>
        </View>
        <Pressable onPress={() => router.push(`/profile/${id}`)}>
          <IconSymbol name="person.circle" size={28} color="#888" />
        </Pressable>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={`Message ${profile.name}...`}
            placeholderTextColor="#555"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
          />
          <Pressable
            onPress={sendMessage}
            style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
            disabled={!input.trim()}
          >
            <IconSymbol name="paperplane.fill" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerStatus: {
    color: '#888',
    fontSize: 12,
    marginTop: 1,
  },
  messagesList: {
    padding: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  messageRowMe: {
    flexDirection: 'row-reverse',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#222',
  },
  bubble: {
    maxWidth: '74%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleThem: {
    backgroundColor: '#1a1a1a',
    borderBottomLeftRadius: 4,
  },
  bubbleMe: {
    backgroundColor: '#6C63FF',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextMe: {
    color: '#fff',
  },
  timeText: {
    color: '#555',
    fontSize: 10,
    marginTop: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    backgroundColor: '#0a0a0a',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
