import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, StyleSheet, TextInput, Pressable, FlatList,
  KeyboardAvoidingView, Platform, Image, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useRef } from 'react';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Image Viewer Modal
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);

  // Forward Modal
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardContent, setForwardContent] = useState<{ url?: string; text?: string } | null>(null);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<any | null>(null);

  // Message Action Menu
  const [activeMessage, setActiveMessage] = useState<any | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMsg = payload.new;
        if (newMsg.sender_id === id && newMsg.receiver_id === myId) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, myId]);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setMyId(session.user.id);

    const { data: profile } = await supabase.from('profiles').select('name').eq('id', id).single();
    if (profile) setOtherUser(profile);

    const { data: history } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${session.user.id})`)
      .order('created_at', { ascending: true });

    if (history) {
      setMessages(history.map(m => ({ ...m, status: 'sent' })));
    }

    // Load profiles for forward
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .neq('id', session.user.id);
    if (profiles) setAllProfiles(profiles);
  };

  // ─── Send Text ───────────────────────────────────────────────
  const sendMessage = async () => {
    if (!inputText.trim() || !myId) return;
    const textToSend = inputText.trim();
    setInputText('');
    const replyId = replyingTo?.id ?? null;
    setReplyingTo(null);

    const tempId = `temp_${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId, sender_id: myId, receiver_id: id,
      content: textToSend, reply_to_id: replyId,
      created_at: new Date().toISOString(), status: 'pending',
    }]);

    const { data, error } = await supabase.from('messages').insert({
      sender_id: myId, receiver_id: id,
      content: textToSend, reply_to_id: replyId,
    }).select().single();

    if (error) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...data, status: 'sent' } : m));
    }
  };

  // ─── Image Picker & Upload ───────────────────────────────────
  const pickImage = async () => {
    if (!myId) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const tempId = `temp_${Date.now()}`;
      setMessages(prev => [...prev, {
        id: tempId, sender_id: myId, receiver_id: id,
        content: '📸 Image', media_url: uri, media_type: 'image',
        created_at: new Date().toISOString(), status: 'pending',
      }]);

      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop() || 'jpg';
      const filePath = `${myId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat_media').upload(filePath, blob, { contentType: blob.type || 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('chat_media').getPublicUrl(filePath);

      const { data: dbData, error: dbError } = await supabase.from('messages').insert({
        sender_id: myId, receiver_id: id,
        content: '📸 Image', media_url: publicUrl, media_type: 'image',
      }).select().single();

      if (dbError) throw dbError;
      setMessages(prev => prev.map(m => m.id === tempId ? { ...dbData, status: 'sent' } : m));
    } catch (err) {
      console.error('Error uploading image:', err);
    }
  };

  // ─── Download Image ───────────────────────────────────────────
  const downloadImage = async (url: string) => {
    // Web: open in new tab so user can save manually
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
      return;
    }

    // Native (iOS / Android)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow media access to save photos.');
        return;
      }
      // Use documentDirectory which is guaranteed to exist
      const destUri = (FileSystem.documentDirectory ?? '') + `chat_img_${Date.now()}.jpg`;
      const { uri } = await FileSystem.downloadAsync(url, destUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('✅ Saved!', 'The image was saved to your gallery.');
    } catch (err) {
      Alert.alert('Error', 'Could not save the image.');
      console.error(err);
    }
  };

  // ─── Forward ─────────────────────────────────────────────────
  const openForward = (content: { url?: string; text?: string }) => {
    setForwardContent(content);
    setShowForwardModal(true);
    setShowActionMenu(false);
    setSelectedImage(null);
  };

  const sendForward = async (targetUserId: string) => {
    if (!myId || !forwardContent) return;
    setShowForwardModal(false);
    const payload: any = {
      sender_id: myId,
      receiver_id: targetUserId,
      content: forwardContent.text || '📸 Image',
    };
    if (forwardContent.url) {
      payload.media_url = forwardContent.url;
      payload.media_type = 'image';
    }
    await supabase.from('messages').insert(payload);
    Alert.alert('✅ Forwarded!', 'Message forwarded successfully.');
  };

  // ─── Long Press Action Menu ───────────────────────────────────
  const handleLongPress = (item: any) => {
    setActiveMessage(item);
    setShowActionMenu(true);
  };

  // ─── Render Helpers ──────────────────────────────────────────
  const getReplyPreview = (replyId: string) => {
    return messages.find(m => m.id === replyId);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.sender_id === myId;
    const repliedMsg = item.reply_to_id ? getReplyPreview(item.reply_to_id) : null;

    return (
      <Pressable
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
      >
        <View style={[styles.msgBubble, isMine ? styles.myMsg : styles.theirMsg]}>
          {/* Reply preview */}
          {repliedMsg && (
            <View style={styles.replyPreview}>
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                ↩ {repliedMsg.content}
              </Text>
            </View>
          )}
          {/* Image */}
          {item.media_url ? (
            <Pressable onPress={() => { setSelectedImage(item.media_url); setImageScale(1); }}>
              <Image source={{ uri: item.media_url }} style={styles.messageImage} />
            </Pressable>
          ) : null}
          {/* Text */}
          {!(item.media_url && item.content === '📸 Image') && (
            <Text style={[styles.msgText, isMine ? styles.myMsgText : styles.theirMsgText]}>
              {item.content}
            </Text>
          )}
          {/* Status */}
          {isMine && (
            <View style={styles.statusContainer}>
              {item.status === 'pending' && <IconSymbol name="clock" size={12} color="#aaa" />}
              {item.status === 'sent' && <IconSymbol name="checkmark" size={12} color="#aaa" />}
              {item.status === 'error' && <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#ff4444" />}
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color="#6C63FF" />
        </Pressable>
        <Text style={styles.headerName}>{otherUser ? otherUser.name : 'Loading...'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

        {/* Reply Banner */}
        {replyingTo && (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerText} numberOfLines={1}>
              ↩ Replying: {replyingTo.content}
            </Text>
            <Pressable onPress={() => setReplyingTo(null)}>
              <Text style={styles.replyBannerCancel}>✕</Text>
            </Pressable>
          </View>
        )}

        {/* Input Row */}
        <View style={styles.inputRow}>
          <Pressable onPress={pickImage} style={styles.attachBtn}>
            <IconSymbol name="plus" size={24} color="#6C63FF" />
          </Pressable>
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

      {/* ─── Image Viewer Modal ─── */}
      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalContainer}>
          {/* Close area */}
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSelectedImage(null)} />

          {/* Top Controls */}
          <View style={styles.imageModalTopBar}>
            <Pressable style={styles.modalActionBtn} onPress={() => setSelectedImage(null)}>
              <Text style={styles.modalActionText}>✕ Close</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable style={styles.modalActionBtn}
                onPress={() => selectedImage && openForward({ url: selectedImage })}>
                <Text style={styles.modalActionText}>➡ Forward</Text>
              </Pressable>
              <Pressable style={styles.modalActionBtn}
                onPress={() => selectedImage && downloadImage(selectedImage)}>
                <Text style={styles.modalActionText}>📥 Save</Text>
              </Pressable>
            </View>
          </View>

          {/* Image with tap-to-zoom */}
          {selectedImage && (
            <Pressable onPress={() => setImageScale(s => s >= 3 ? 1 : +(s + 0.2).toFixed(1))}>
              <Image
                source={{ uri: selectedImage }}
                style={[styles.fullImage, { transform: [{ scale: imageScale }] }]}
                resizeMode="contain"
              />
            </Pressable>
          )}

          {/* Zoom indicator */}
          <View style={styles.zoomBadge}>
            <Text style={styles.zoomBadgeText}>{Math.round(imageScale * 100)}%</Text>
            {imageScale !== 1 && (
              <Pressable onPress={() => setImageScale(1)} style={styles.resetZoomBtn}>
                <Text style={styles.modalActionText}>Reset</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Message Action Menu ─── */}
      <Modal visible={showActionMenu} transparent animationType="fade" onRequestClose={() => setShowActionMenu(false)}>
        <Pressable style={styles.actionMenuOverlay} onPress={() => setShowActionMenu(false)}>
          <View style={styles.actionMenu}>
            <Text style={styles.actionMenuTitle} numberOfLines={1}>
              "{activeMessage?.content}"
            </Text>
            <Pressable style={styles.actionMenuItem} onPress={() => {
              setReplyingTo(activeMessage);
              setShowActionMenu(false);
            }}>
              <Text style={styles.actionMenuItemText}>↩  Reply</Text>
            </Pressable>
            <Pressable style={styles.actionMenuItem} onPress={() => {
              openForward(
                activeMessage?.media_url
                  ? { url: activeMessage.media_url }
                  : { text: activeMessage?.content }
              );
            }}>
              <Text style={styles.actionMenuItemText}>➡  Forward</Text>
            </Pressable>
            <Pressable style={[styles.actionMenuItem, styles.actionMenuCancel]}
              onPress={() => setShowActionMenu(false)}>
              <Text style={[styles.actionMenuItemText, { color: '#ff4444' }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ─── Forward User Picker Modal ─── */}
      <Modal visible={showForwardModal} transparent animationType="slide" onRequestClose={() => setShowForwardModal(false)}>
        <View style={styles.forwardModalContainer}>
          <View style={styles.forwardModal}>
            <Text style={styles.forwardTitle}>Forward to...</Text>
            <FlatList
              data={allProfiles}
              keyExtractor={p => p.id}
              renderItem={({ item }) => (
                <Pressable style={styles.forwardUser} onPress={() => sendForward(item.id)}>
                  <View style={styles.forwardUserAvatar}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                      {item.name?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={styles.forwardUserName}>{item.name}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No users found</Text>}
            />
            <Pressable style={styles.forwardCancelBtn} onPress={() => setShowForwardModal(false)}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1a1a24',
  },
  backBtn: { padding: 4 },
  headerName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  list: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40, fontSize: 16 },

  // Message Bubble
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 20, marginBottom: 10 },
  myMsg: { alignSelf: 'flex-end', backgroundColor: '#6C63FF', borderBottomRightRadius: 4 },
  theirMsg: { alignSelf: 'flex-start', backgroundColor: '#1a1a24', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 16 },
  myMsgText: { color: '#fff' },
  theirMsgText: { color: '#ccc' },
  statusContainer: { alignSelf: 'flex-end', marginTop: 4 },
  messageImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 6, backgroundColor: '#333' },

  // Reply preview inside bubble
  replyPreview: {
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8,
    padding: 6, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#fff',
  },
  replyPreviewText: { color: '#ddd', fontSize: 12 },

  // Reply Banner above input
  replyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a1a2e', paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#6C63FF',
  },
  replyBannerText: { color: '#aaa', fontSize: 13, flex: 1 },
  replyBannerCancel: { color: '#ff4444', fontSize: 18, marginLeft: 12 },

  // Input Row
  inputRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderTopWidth: 1, borderTopColor: '#1a1a24', backgroundColor: '#0a0a0f',
  },
  input: {
    flex: 1, backgroundColor: '#1a1a24', color: '#fff',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 16, maxHeight: 100,
  },
  attachBtn: { padding: 8, marginRight: 8 },
  sendBtn: {
    marginLeft: 12, backgroundColor: '#6C63FF',
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },

  // Image Viewer Modal
  modalContainer: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center', alignItems: 'center',
  },
  imageModalTopBar: {
    position: 'absolute', top: 50, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10,
  },
  modalActionBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  modalActionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  fullImage: { width: 340, height: 400 },
  zoomBadge: {
    position: 'absolute', bottom: 50,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  zoomBadgeText: {
    color: '#fff', fontSize: 14, fontWeight: 'bold',
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  resetZoomBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },

  // Action Menu Modal
  actionMenuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  actionMenu: {
    backgroundColor: '#1a1a24', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 40, paddingTop: 16,
  },
  actionMenuTitle: {
    color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 16, paddingHorizontal: 24,
  },
  actionMenuItem: {
    paddingVertical: 16, paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: '#2a2a34',
  },
  actionMenuCancel: { borderBottomWidth: 0 },
  actionMenuItemText: { color: '#fff', fontSize: 17, fontWeight: '500' },

  // Forward Modal
  forwardModalContainer: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  forwardModal: {
    backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '70%',
  },
  forwardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  forwardUser: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a24',
  },
  forwardUserAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  forwardUserName: { color: '#fff', fontSize: 16 },
  forwardCancelBtn: {
    marginTop: 16, backgroundColor: '#2a2a34',
    padding: 14, borderRadius: 12, alignItems: 'center',
  },
});
