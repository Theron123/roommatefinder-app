import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, StyleSheet,
  KeyboardAvoidingView, Platform, Image, Alert, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { uploadToSupabase } from '@/utils/file';
import { useEffect, useState, useRef, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { FlashList, FlashListRef } from '@shopify/flash-list';
const TypedFlashList = FlashList as any;
import { ChatMessageItem } from '@/components/chat/ChatMessageItem';
import { setActiveChatUserId } from '@/lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import ChatSettingsModal from '@/components/chat/modals/ChatSettingsModal';
import ChatAttachMenu from '@/components/chat/modals/ChatAttachMenu';
import ChatForwardModal from '@/components/chat/modals/ChatForwardModal';
import ChatActionMenu from '@/components/chat/modals/ChatActionMenu';
import ImageViewerModal from '@/components/chat/modals/ImageViewerModal';
import MessageInfoModal from '@/components/chat/modals/MessageInfoModal';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatInputBar from '@/components/chat/ChatInputBar';

export default function ChatScreen() {
  const { id: rawId } = useLocalSearchParams();
  const id = Array.isArray(rawId) ? rawId[0] : (rawId || '');
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [deletedMsgsForMe, setDeletedMsgsForMe] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const flatListRef = useRef<FlashListRef<any> | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  // Forward Modal
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardContent, setForwardContent] = useState<{ url?: string; text?: string } | null>(null);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<any | null>(null);

  // Message Action Menu
  const [activeMessage, setActiveMessage] = useState<any | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Attach Menu
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [micVolume, setMicVolume] = useState<number>(0);
  // Web MediaRecorder support
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webChunksRef = useRef<Blob[]>([]);

  const [wallpaper, setWallpaper] = useState<string>('default');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoMessage, setInfoMessage] = useState<any>(null);

  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const webAudioCtxRef = useRef<AudioContext | null>(null);
  const webAnalyserRef = useRef<AnalyserNode | null>(null);
  const micIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [liveWaveform, setLiveWaveform] = useState<number[]>(new Array(20).fill(4));

  useEffect(() => {
    const loadDeleted = async () => {
      try {
        const raw = await AsyncStorage.getItem('@roommatefinder:deleted_msgs_for_me');
        if (raw) setDeletedMsgsForMe(JSON.parse(raw));
      } catch {}
    };
    const markAsViewed = async () => {
      try {
        if (id && typeof id === 'string') {
          const raw = await AsyncStorage.getItem('@roommatefinder:viewed_matches');
          const viewed = raw ? JSON.parse(raw) : [];
          if (!viewed.includes(id)) {
            viewed.push(id);
            await AsyncStorage.setItem('@roommatefinder:viewed_matches', JSON.stringify(viewed));
          }
        }
      } catch {}
    };
    loadDeleted();
    markAsViewed();
  }, [id]);

  const visibleMessages = messages.filter(m => !deletedMsgsForMe.includes(m.id));

  useEffect(() => {
    const loadWallpaper = async () => {
      try {
        const storedWallpaper = await AsyncStorage.getItem('@roommatefinder:chat_wallpaper');
        if (storedWallpaper) {
          setWallpaper(storedWallpaper);
        }
      } catch (e) {
        console.error('loadWallpaper error', e);
      }
    };
    loadWallpaper();
  }, []);

  const pickCustomWallpaper = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const uri = result.assets[0].uri;
        setWallpaper(uri);
        await AsyncStorage.setItem('@roommatefinder:chat_wallpaper', uri);
        Alert.alert('✅ Fondo Actualizado', 'El fondo del chat se ha configurado con tu foto.');
        setShowSettingsModal(false);
      }
    } catch (e) {
      console.error('pickCustomWallpaper error', e);
      Alert.alert('Error', 'No se pudo seleccionar el fondo de la galería.');
    }
  };

  const selectPresetWallpaper = async (value: string) => {
    try {
      setWallpaper(value);
      await AsyncStorage.setItem('@roommatefinder:chat_wallpaper', value);
      setShowSettingsModal(false);
    } catch (e) {
      console.error('selectPresetWallpaper error', e);
    }
  };

  useEffect(() => {
    fetchData();
    setActiveChatUserId(id as string);
    return () => {
      setActiveChatUserId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!myId || messages.length === 0) return;

    const unreadMsgs = messages.filter(m => m.receiver_id === myId && !m.is_read);
    if (unreadMsgs.length > 0) {
      const unreadIds = unreadMsgs.map(m => m.id);
      
      setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, is_read: true } : m));

      supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadIds)
        .then(({ error }) => {
          if (error) console.error('Error marking messages as read', error);
        });
    }
  }, [messages, myId]);

  useEffect(() => {
    if (!myId) return;

    const channel = supabase
      .channel(`chat_room:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMsg = payload.new;
        if (
          (newMsg.sender_id === id && newMsg.receiver_id === myId) ||
          (newMsg.sender_id === myId && newMsg.receiver_id === id)
        ) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
        const updatedMsg = payload.new;
        if (
          (updatedMsg.sender_id === id && updatedMsg.receiver_id === myId) ||
          (updatedMsg.sender_id === myId && updatedMsg.receiver_id === id)
        ) {
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
        const deletedMsgId = payload.old.id;
        setMessages(prev => prev.filter(m => m.id !== deletedMsgId));
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

    const { data: profile } = await supabase.from('profiles').select('name, photoUrl').eq('id', id).single();
    if (profile) setOtherUser(profile);

    const { data: history } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${session.user.id})`)
      .order('created_at', { ascending: true });

    if (history) {
      setMessages(history.map(m => ({ ...m, status: 'sent' })));
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .neq('id', session.user.id);
    if (profiles) setAllProfiles(profiles);
  };

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

    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: myId, receiver_id: id,
        content: textToSend, reply_to_id: replyId,
      }).select().single();

      if (error) throw error;

      if (data) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...data, status: 'sent' } : m));
      }
    } catch (e) {
      console.error('sendMessage error', e);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
    }
  };

  const deleteForMe = async (msgId: string) => {
    try {
      const updated = [...deletedMsgsForMe, msgId];
      setDeletedMsgsForMe(updated);
      await AsyncStorage.setItem('@roommatefinder:deleted_msgs_for_me', JSON.stringify(updated));
      setShowActionMenu(false);
    } catch (e) {
      console.error('Error deleting for me', e);
    }
  };

  const deleteForEveryone = async (msgId: string) => {
    try {
      await supabase.from('messages').delete().eq('id', msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      setShowActionMenu(false);
    } catch (e) {
      console.error('Error deleting for everyone', e);
    }
  };

  const startRecording = async () => {
    try {
      setLiveWaveform(new Array(20).fill(4));
      if (Platform.OS === 'web') {
        if (!navigator.mediaDevices?.getUserMedia) {
          Alert.alert('No soportado', 'Tu navegador no soporta grabación de audio.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') {
              await ctx.resume();
            }
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            webAudioCtxRef.current = ctx;
            webAnalyserRef.current = analyser;
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            let lastUpdate = Date.now();
            const checkVolume = () => {
              if (webAnalyserRef.current) {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                const volume = average / 120;
                setMicVolume(volume);

                const now = Date.now();
                if (now - lastUpdate > 60) {
                  setLiveWaveform(prev => {
                    const next = [...prev];
                    next.shift();
                    const targetHeight = Math.max(4, Math.min(28, 4 + volume * 24));
                    next.push(targetHeight);
                    return next;
                  });
                  lastUpdate = now;
                }

                requestAnimationFrame(checkVolume);
              }
            };
            requestAnimationFrame(checkVolume);
          }
        } catch (audioErr) {
          console.log('Web audio context error', audioErr);
        }

        const mr = new MediaRecorder(stream);
        webChunksRef.current = [];
        mr.ondataavailable = (e) => { if (e.data.size > 0) webChunksRef.current.push(e.data); };
        webMediaRecorderRef.current = mr;
        mr.start();
      } else {
        const permission = await Audio.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert(
            'Permiso denegado',
            'Para poder grabar mensajes de voz, debes permitir el acceso al micrófono en los ajustes de tu dispositivo.'
          );
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;

        micIntervalRef.current = setInterval(async () => {
          if (recordingRef.current) {
            const status = await recordingRef.current.getStatusAsync();
            if (status.metering !== undefined) {
              const db = status.metering;
              const norm = Math.max(0, (db + 160) / 160);
              setMicVolume(norm);
              setLiveWaveform(prev => {
                const next = [...prev];
                next.shift();
                const targetHeight = Math.max(4, Math.min(28, 4 + norm * 24));
                next.push(targetHeight);
                return next;
              });
            }
          }
        }, 70);
      }
      setIsRecording(true);
      setRecordingDuration(0);
      durationTimerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch (e) {
      console.error('startRecording error', e);
      Alert.alert('Error', 'No se pudo iniciar la grabación. Revisa los permisos del micrófono.');
    }
  };

  const stopRecording = async () => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    setIsRecording(false);
    setRecordingDuration(0);
    
    if (micIntervalRef.current) {
      clearInterval(micIntervalRef.current);
      micIntervalRef.current = null;
    }
    if (webAnalyserRef.current) {
      webAnalyserRef.current = null;
    }
    if (webAudioCtxRef.current) {
      webAudioCtxRef.current.close();
      webAudioCtxRef.current = null;
    }
    setMicVolume(0);

    try {
      if (Platform.OS === 'web') {
        const mr = webMediaRecorderRef.current;
        if (!mr) return;
        mr.stop();
        mr.stream.getTracks().forEach(t => t.stop());
        await new Promise<void>(res => { mr.onstop = () => res(); });
        const blob = new Blob(webChunksRef.current, { type: 'audio/webm' });
        const blobUri = URL.createObjectURL(blob);
        await uploadAudioFile(blobUri, 'webm');
      } else {
        const rec = recordingRef.current;
        if (!rec) return;
        await rec.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const uri = rec.getURI();
        recordingRef.current = null;
        if (uri) await uploadAudioFile(uri);
      }
    } catch (e) {
      console.error('stopRecording error', e);
    }
  };

  const uploadAudioFile = async (uri: string, extensionOverride?: string) => {
    const tempId = `temp_${Date.now()}`;
    try {
      setMessages(prev => [...prev, {
        id: tempId, sender_id: myId, receiver_id: id,
        content: '🎙️ Mensaje de voz', media_type: 'audio', media_url: uri,
        created_at: new Date().toISOString(), status: 'pending',
      }]);

      const ext = extensionOverride || 'm4a';
      const filePath = `${myId}/audio_${Date.now()}.${ext}`;

      await uploadToSupabase('chat_media', filePath, uri, `audio/${ext}`);

      const { data: { publicUrl } } = supabase.storage.from('chat_media').getPublicUrl(filePath);

      const { data: dbData, error: dbError } = await supabase.from('messages').insert({
        sender_id: myId, receiver_id: id,
        content: '🎙️ Mensaje de voz', media_url: publicUrl, media_type: 'audio',
      }).select().single();

      if (dbError) throw dbError;
      setMessages(prev => prev.map(m => m.id === tempId ? { ...dbData, status: 'sent' } : m));
    } catch (e) {
      console.error('uploadAudioFile error', e);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
    }
  };

  const playAudio = async (url: string, msgId: string) => {
    try {
      if (playingId === msgId) {
        await soundRef.current?.stopAsync();
        await soundRef.current?.unloadAsync();
        soundRef.current = null;
        setPlayingId(null);
        setPlaybackProgress(0);
        return;
      }
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setPlayingId(msgId);
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
      setPlaybackProgress(0);
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded) {
          if (status.durationMillis) {
            setPlaybackProgress(status.positionMillis / status.durationMillis);
          }
          if (status.didJustFinish) {
            setPlayingId(null);
            setPlaybackProgress(0);
            sound.unloadAsync();
            soundRef.current = null;
          }
        }
      });
    } catch (e) { console.error('playAudio error', e); setPlayingId(null); }
  };

  const pickMedia = async () => {
    setShowAttachMenu(false);
    if (!myId) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'], allowsEditing: true, quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video' || asset.uri.endsWith('.mp4');
      uploadFile(asset.uri, isVideo ? 'video' : 'image', isVideo ? '🎥 Video' : '📸 Image');
    }
  };

  const pickDocument = async () => {
    setShowAttachMenu(false);
    if (!myId) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      let type = 'file';
      let content = '📄 Archivo';
      if (asset.mimeType?.startsWith('audio/') || asset.name.endsWith('.mp3')) {
        type = 'audio';
        content = '🎵 Audio';
      } else if (asset.mimeType?.startsWith('video/') || asset.name.endsWith('.mp4')) {
        type = 'video';
        content = '🎥 Video';
      } else if (asset.mimeType?.startsWith('image/')) {
        type = 'image';
        content = '📸 Image';
      }
      uploadFile(asset.uri, type, content, asset.name, asset.mimeType);
    }
  };

  const uploadFile = async (uri: string, mediaType: string, contentText: string, filename?: string, mimeType?: string) => {
    const tempId = `temp_${Date.now()}`;
    try {
      setMessages(prev => [...prev, {
        id: tempId, sender_id: myId, receiver_id: id,
        content: contentText, media_url: uri, media_type: mediaType,
        created_at: new Date().toISOString(), status: 'pending',
      }]);

      const fileExt = filename ? filename.split('.').pop() : uri.split('.').pop() || 'bin';
      const filePath = `${myId}/${Date.now()}.${fileExt}`;
      const resolvedMime = mimeType || `application/octet-stream`;

      await uploadToSupabase('chat_media', filePath, uri, resolvedMime);

      const { data: { publicUrl } } = supabase.storage.from('chat_media').getPublicUrl(filePath);

      const { data: dbData, error: dbError } = await supabase.from('messages').insert({
        sender_id: myId, receiver_id: id,
        content: contentText, media_url: publicUrl, media_type: mediaType,
      }).select().single();

      if (dbError) throw dbError;
      setMessages(prev => prev.map(m => m.id === tempId ? { ...dbData, status: 'sent' } : m));
    } catch (err) {
      console.error('Error uploading file:', err);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
    }
  };

  const downloadImage = async (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
      return;
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow media access to save photos.');
        return;
      }
      const destUri = (FileSystem.documentDirectory ?? '') + `chat_img_${Date.now()}.jpg`;
      const { uri } = await FileSystem.downloadAsync(url, destUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('✅ Saved!', 'The image was saved to your gallery.');
    } catch (err) {
      Alert.alert('Error', 'Could not save the image.');
      console.error(err);
    }
  };

  const openForward = (content: { url?: string; text?: string }) => {
    setForwardContent(content);
    setShowForwardModal(true);
    setShowActionMenu(false);
    setSelectedImage(null);
    setImageScale(1);
    setZoomOffset({ x: 0, y: 0 });
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

  const handleLongPress = useCallback((item: any) => {
    setActiveMessage(item);
    setShowDeleteOptions(false);
    setShowActionMenu(true);
  }, []);

  const getReplyPreview = useCallback((replyId: string) => {
    return messages.find(m => m.id === replyId);
  }, [messages]);

  const renderMessage = ({ item }: { item: any }) => {
    return (
      <ChatMessageItem
        item={item}
        myId={myId}
        playingId={playingId}
        playbackProgress={playbackProgress}
        getReplyPreview={getReplyPreview}
        handleLongPress={handleLongPress}
        downloadImage={downloadImage}
        playAudio={playAudio}
        setSelectedImage={setSelectedImage}
        setImageScale={setImageScale}
        setZoomOffset={setZoomOffset}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {wallpaper !== 'default' && (
        wallpaper.startsWith('http') || wallpaper.startsWith('file://') || wallpaper.includes('/') ? (
          <View style={StyleSheet.absoluteFillObject}>
            <Image source={{ uri: wallpaper }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.65)' }]} />
          </View>
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: wallpaper }]} />
        )
      )}
      {wallpaper === 'default' && (
        <View style={StyleSheet.absoluteFillObject}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0d1117' }]} />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
        </View>
      )}

      <ChatHeader
        otherUser={otherUser}
        onBack={() => router.back()}
        onPressUser={() => router.push(`/profile/${id}`)}
        onPressSettings={() => setShowSettingsModal(true)}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TypedFlashList
          ref={flatListRef}
          data={[...visibleMessages].reverse()}
          inverted
          estimatedItemSize={80}
          keyExtractor={(item: any) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          ListEmptyComponent={() => (
            <View style={{ transform: [{ scaleY: -1 }] }}>
              <Text style={styles.emptyText}>Send a message to say hi! 👋</Text>
            </View>
          )}
        />

        <ChatInputBar
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onPressAttach={() => setShowAttachMenu(true)}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          liveWaveform={liveWaveform}
          onStopRecording={stopRecording}
          inputText={inputText}
          onChangeInputText={setInputText}
          onSendMessage={sendMessage}
          onStartRecording={startRecording}
        />
      </KeyboardAvoidingView>

      {/* ─── Image Viewer Modal ─── */}
      <ImageViewerModal
        visible={!!selectedImage}
        selectedImage={selectedImage}
        imageScale={imageScale}
        zoomOffset={zoomOffset}
        onClose={() => setSelectedImage(null)}
        onForward={(url) => openForward({ url })}
        onDownload={(url) => downloadImage(url)}
        onZoomChange={(scale, offset) => {
          setImageScale(scale);
          setZoomOffset(offset);
        }}
      />

      <ChatActionMenu
        visible={showActionMenu}
        activeMessage={activeMessage}
        myId={myId}
        onClose={() => setShowActionMenu(false)}
        onReply={(msg) => setReplyingTo(msg)}
        onForward={(payload) => openForward(payload)}
        onCopy={(content) => {
          Clipboard.setStringAsync(content);
          Alert.alert('Copiado', 'Mensaje copiado al portapapeles');
        }}
        onInfo={(msg) => {
          setInfoMessage(msg);
          setShowInfoModal(true);
        }}
        onDeleteForMe={(id) => {
          if (Platform.OS === 'web') {
            if (window.confirm('¿Eliminar este mensaje para ti?')) deleteForMe(id);
          } else {
            Alert.alert('Eliminar mensaje', '¿Eliminar este mensaje para ti?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Eliminar para mí', style: 'destructive', onPress: () => deleteForMe(id) }
            ]);
          }
        }}
        onDeleteForEveryone={(id) => deleteForEveryone(id)}
      />

      {/* ─── Forward User Picker Modal ─── */}
      <ChatForwardModal
        visible={showForwardModal}
        profiles={allProfiles}
        onClose={() => setShowForwardModal(false)}
        onSendForward={sendForward}
      />

      {/* ─── Attach Menu Modal ─── */}
      <ChatAttachMenu
        visible={showAttachMenu}
        onClose={() => setShowAttachMenu(false)}
        onPickMedia={pickMedia}
        onPickDocument={pickDocument}
      />

      {/* ─── Chat Customization (Wallpaper) Modal ─── */}
      <ChatSettingsModal
        visible={showSettingsModal}
        wallpaper={wallpaper}
        onClose={() => setShowSettingsModal(false)}
        onPickCustom={pickCustomWallpaper}
        onSelectPreset={selectPresetWallpaper}
      />
      {/* ─── Message Info Modal ─── */}
      <MessageInfoModal
        visible={showInfoModal}
        message={infoMessage}
        myId={myId}
        onClose={() => {
          setShowInfoModal(false);
          setInfoMessage(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0d1117',
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerUserContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  headerName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  paletteBtn: { padding: 8 },
  list: { padding: 16, flexGrow: 1 },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40, fontSize: 16 },

  // Message Bubble (Minimalist, WhatsApp style)
  msgBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    paddingRight: 24, // make room for chevron
  },
  msgChevron: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  myMsg: {
    alignSelf: 'flex-end',
    backgroundColor: '#005c4b', // Classic WhatsApp Dark Green
    borderBottomRightRadius: 4,
  },
  theirMsg: {
    alignSelf: 'flex-start',
    backgroundColor: '#202c33', // Classic WhatsApp Dark Gray
    borderBottomLeftRadius: 4,
  },
  msgText: { fontSize: 16, lineHeight: 20 },
  myMsgText: { color: '#fff' },
  theirMsgText: { color: '#e9edef' },
  statusContainer: { marginLeft: 2 },
  messageImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 6, backgroundColor: '#333' },
  messageVideo: { width: 220, height: 220, borderRadius: 12, marginBottom: 6, backgroundColor: '#000' },
  audioContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, marginBottom: 6 },
  
  // Voice Note styles
  voiceNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 12,
    minWidth: 200,
    maxWidth: '100%',
  },
  voicePlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  voicePlayBtnMine: {
    backgroundColor: '#fff',
  },
  voicePlayBtnTheirs: {
    backgroundColor: '#2a3942',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    gap: 3,
    flex: 1,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  voiceNoteMeta: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Bubble meta inside bubble (WhatsApp style bottom-right)
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  msgTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  theirMsgTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.35)',
  },

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
    borderTopWidth: 1, borderTopColor: '#49C788',
  },
  replyBannerText: { color: '#aaa', fontSize: 13, flex: 1 },
  replyBannerCancel: { color: '#ff4444', fontSize: 18, marginLeft: 12 },

  // Input Row
  inputRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: '#0d1117',
  },
  input: {
    flex: 1, backgroundColor: '#202c33', color: '#fff',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 16, maxHeight: 100,
  },
  attachBtn: { padding: 8, marginRight: 8 },
  sendBtn: {
    marginLeft: 12, backgroundColor: '#00a884', // Beautiful WhatsApp Send Green
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  micBtn: {
    marginLeft: 12, backgroundColor: '#00a884',
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  recordingBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#202c33', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  recordingWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 6,
    height: 30,
  },
  recordingWaveBar: {
    width: 2.5,
    borderRadius: 1.25,
  },
  recordingDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff4444',
  },
  recordingText: { color: '#fff', fontSize: 15, flex: 1 },
  stopBtn: {
    backgroundColor: '#ff4444', width: 32, height: 32,
    borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  audioBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 4,
  },
  audioText: { fontSize: 14 },

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
  fullImage: { width: '100%', height: '100%' },
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
    backgroundColor: '#1f2c34', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 40, paddingTop: 16,
  },
  actionMenuTitle: {
    color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 16, paddingHorizontal: 24,
  },
  actionMenuItem: {
    paddingVertical: 16, paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: '#2a3942',
  },
  actionMenuCancel: { borderBottomWidth: 0 },
  actionMenuItemText: { color: '#fff', fontSize: 17, fontWeight: '500' },

  // Bottom Sheet (Wallpaper settings)
  bottomSheet: {
    backgroundColor: '#0d1117',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderWidth: 1,
    borderColor: '#1a1a2e',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sheetCloseBtn: {
    backgroundColor: '#1a1a24',
    padding: 6,
    borderRadius: 20,
  },
  sheetSub: {
    color: '#888',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 8,
  },
  galleryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a24',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a35',
  },
  galleryOptionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  galleryOptionSub: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetCard: {
    width: '31%',
    height: 70,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    borderWidth: 1,
    borderColor: '#222',
    position: 'relative',
    overflow: 'hidden',
  },
  presetCardActive: {
    borderColor: '#49C788',
    borderWidth: 2,
  },
  presetName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  activeCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#49C788',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 16,
  },
  resetBtnText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '700',
  },

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
    backgroundColor: '#49C788', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  forwardUserName: { color: '#fff', fontSize: 16 },
  forwardCancelBtn: {
    marginTop: 16, backgroundColor: '#2a2a34',
    padding: 14, borderRadius: 12, alignItems: 'center',
  },
});
