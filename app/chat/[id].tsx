import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useRef } from 'react';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMsg = payload.new;
        if (
          (newMsg.sender_id === myId && newMsg.receiver_id === id) ||
          (newMsg.sender_id === id && newMsg.receiver_id === myId)
        ) {
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, myId]);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setMyId(session.user.id);

    // Info del otro usuario
    const { data: profile } = await supabase.from('profiles').select('name').eq('id', id).single();
    if (profile) setOtherUser(profile);

    // Historial de mensajes (usamos select con OR en Supabase postgrest)
    const { data: history } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${session.user.id})`)
      .order('created_at', { ascending: true });

    if (history) setMessages(history);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !myId) return;
    
    const textToSend = inputText.trim();
    setInputText('');

    const { error } = await supabase.from('messages').insert({
      sender_id: myId,
      receiver_id: id,
      content: textToSend,
    });
    
    if (error) console.error("Error sending message:", error);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.sender_id === myId;
    return (
      <View style={[styles.msgBubble, isMine ? styles.myMsg : styles.theirMsg]}>
        <Text style={[styles.msgText, isMine ? styles.myMsgText : styles.theirMsgText]}>{item.content}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color="#6C63FF" />
        </Pressable>
        <Text style={styles.headerName}>{otherUser ? otherUser.name : 'Loading...'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>Send a message to say hi! 👋</Text>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#888"
            style={styles.input}
            multiline
          />
          <Pressable onPress={sendMessage} style={styles.sendBtn}>
            <IconSymbol name="paperplane.fill" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a24',
  },
  backBtn: { padding: 4 },
  headerName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  list: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 16 },
  msgBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  myMsg: {
    alignSelf: 'flex-end',
    backgroundColor: '#6C63FF',
    borderBottomRightRadius: 4,
  },
  theirMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a24',
    borderBottomLeftRadius: 4,
  },
  msgText: { fontSize: 16 },
  myMsgText: { color: '#fff' },
  theirMsgText: { color: '#ccc' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a24',
    backgroundColor: '#0a0a0f',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a24',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendBtn: {
    marginLeft: 12,
    backgroundColor: '#6C63FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
