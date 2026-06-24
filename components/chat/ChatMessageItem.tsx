import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface ChatMessageItemProps {
  item: any;
  myId: string | null;
  playingId: string | null;
  playbackProgress: number;
  getReplyPreview: (replyId: string) => any;
  handleLongPress: (item: any) => void;
  downloadImage: (url: string) => void;
  playAudio: (url: string, id: string) => void;
  setSelectedImage: (url: string) => void;
  setImageScale: (scale: number) => void;
  setZoomOffset: (offset: { x: number; y: number }) => void;
}

const ChatMessageItemComponent = ({
  item,
  myId,
  playingId,
  playbackProgress,
  getReplyPreview,
  handleLongPress,
  downloadImage,
  playAudio,
  setSelectedImage,
  setImageScale,
  setZoomOffset,
}: ChatMessageItemProps) => {
  const isMine = item.sender_id === myId;
  const repliedMsg = item.reply_to_id ? getReplyPreview(item.reply_to_id) : null;

  const date = new Date(item.created_at);
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <Pressable
      onLongPress={() => handleLongPress(item)}
      delayLongPress={400}
    >
      <View style={[styles.msgBubble, isMine ? styles.myMsg : styles.theirMsg]}>
        <Pressable 
          style={styles.msgChevron} 
          onPress={() => handleLongPress(item)}
        >
          <MaterialCommunityIcons name="chevron-down" size={16} color="rgba(255,255,255,0.5)" />
        </Pressable>

        {repliedMsg && (
          <View style={styles.replyPreview}>
            <Text style={styles.replyPreviewText} numberOfLines={1}>
              ↩ {repliedMsg.content}
            </Text>
          </View>
        )}
        {item.media_type === 'video' && item.media_url ? (
          <Video
            source={{ uri: item.media_url }}
            style={styles.messageVideo}
            useNativeControls
            resizeMode={ResizeMode.COVER}
            isLooping={false}
          />
        ) : item.media_type === 'file' && item.media_url ? (
          <Pressable onPress={() => downloadImage(item.media_url)} style={styles.audioContainer}>
            <IconSymbol name="doc.fill" size={24} color={isMine ? '#fff' : '#49C788'} />
            <Text style={[styles.audioText, isMine ? {color: '#fff'} : {color: '#ccc'}]}>Archivo Adjunto</Text>
          </Pressable>
        ) : item.media_type === 'audio' && item.media_url ? (
          (() => {
            const getMessageWaveform = (msgId: string) => {
              const wave: number[] = [];
              const idStr = msgId || 'default';
              for (let i = 0; i < 16; i++) {
                const charCode = idStr.charCodeAt(i % idStr.length) || 60;
                const h = 6 + ((charCode * (i + 1)) % 22);
                wave.push(h);
              }
              return wave;
            };
            const waveHeights = getMessageWaveform(item.id);

            return (
              <View style={styles.voiceNoteContainer}>
                <Pressable onPress={() => playAudio(item.media_url, item.id)} style={[styles.voicePlayBtn, isMine ? styles.voicePlayBtnMine : styles.voicePlayBtnTheirs]}>
                  <MaterialCommunityIcons
                    name={playingId === item.id ? 'pause' : 'play'}
                    size={22}
                    color={isMine ? '#005c4b' : '#49C788'}
                  />
                </Pressable>
                
                <View style={styles.waveformContainer}>
                  {waveHeights.map((h, i) => {
                    const isPlayed = playingId === item.id && (i / waveHeights.length) <= playbackProgress;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.waveBar,
                          {
                            height: h,
                            backgroundColor: isPlayed 
                              ? '#49C788'
                              : (playingId === item.id 
                                  ? (isMine ? 'rgba(255,255,255,0.7)' : 'rgba(73,199,136,0.6)')
                                  : (isMine ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.25)')
                                )
                          }
                        ]}
                      />
                    );
                  })}
                </View>

                <View style={styles.voiceNoteMeta}>
                  <MaterialCommunityIcons name="microphone" size={18} color={isMine ? 'rgba(255,255,255,0.6)' : '#49C788'} />
                </View>
              </View>
            );
          })()
        ) : item.media_type === 'image' && item.media_url ? (
          <Pressable onPress={() => { setSelectedImage(item.media_url); setImageScale(1); setZoomOffset({ x: 0, y: 0 }); }}>
            <Image source={{ uri: item.media_url }} style={styles.messageImage} />
          </Pressable>
        ) : null}
        {!(item.media_url && (item.content === '📸 Image' || item.content === '🎥 Video' || item.content === '🎵 Audio' || item.content === '📄 Archivo' || item.content === '🎙️ Mensaje de voz')) && (
          <Text style={[styles.msgText, isMine ? styles.myMsgText : styles.theirMsgText]}>
            {item.content}
          </Text>
        )}
        <View style={styles.bubbleMeta}>
          <Text style={[styles.msgTime, !isMine && styles.theirMsgTime]}>{timeStr}</Text>
          {isMine && (
            <View style={styles.statusContainer}>
              {item.status === 'pending' && <MaterialCommunityIcons name="clock-outline" size={12} color="rgba(255,255,255,0.4)" />}
              {item.status === 'sent' && !item.is_read && <MaterialCommunityIcons name="check-all" size={14} color="rgba(255,255,255,0.4)" />}
              {item.is_read && <MaterialCommunityIcons name="check-all" size={14} color="#34B7F1" />}
              {item.status === 'error' && <MaterialCommunityIcons name="alert-circle-outline" size={12} color="#ff4444" />}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export const ChatMessageItem = memo(ChatMessageItemComponent, (prevProps, nextProps) => {
  // Check if item reference or internal state changed
  if (prevProps.item.status !== nextProps.item.status) return false;
  if (prevProps.item.is_read !== nextProps.item.is_read) return false;
  if (prevProps.item.id !== nextProps.item.id) return false;

  const wasPlaying = prevProps.playingId === prevProps.item.id;
  const isPlaying = nextProps.playingId === nextProps.item.id;

  if (wasPlaying !== isPlaying) return false;
  if (isPlaying && prevProps.playbackProgress !== nextProps.playbackProgress) return false;

  return true;
});

const styles = StyleSheet.create({
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
  audioText: { fontSize: 14 },
  
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
});
