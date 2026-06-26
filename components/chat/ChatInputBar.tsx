import React from 'react';
import { StyleSheet, View, Text, Pressable, TextInput, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ChatInputBarProps {
  replyingTo: any | null;
  onCancelReply: () => void;
  onPressAttach: () => void;
  isRecording: boolean;
  recordingDuration: number;
  liveWaveform: number[];
  onStopRecording: () => void;
  inputText: string;
  onChangeInputText: (text: string) => void;
  onSendMessage: () => void;
  onStartRecording: () => void;
}

export default function ChatInputBar({
  replyingTo,
  onCancelReply,
  onPressAttach,
  isRecording,
  recordingDuration,
  liveWaveform,
  onStopRecording,
  inputText,
  onChangeInputText,
  onSendMessage,
  onStartRecording,
}: ChatInputBarProps) {
  return (
    <View style={styles.container}>
      {replyingTo && (
        <View style={styles.replyBanner}>
          <Text style={styles.replyBannerText} numberOfLines={1}>
            ↩ Replying: {replyingTo.content}
          </Text>
          <Pressable onPress={onCancelReply}>
            <Text style={styles.replyBannerCancel}>✕</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.inputRow}>
        <Pressable onPress={onPressAttach} style={styles.attachBtn}>
          <MaterialCommunityIcons name="plus" size={26} color="#49C788" />
        </Pressable>
        {isRecording ? (
          <View style={styles.recordingBar}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Grabando... {recordingDuration}s</Text>
            
            <View style={styles.recordingWaveform}>
              {liveWaveform.map((activeHeight, i) => (
                <View
                  key={i}
                  style={[
                    styles.recordingWaveBar,
                    {
                      height: activeHeight,
                      backgroundColor: '#ff4444',
                    }
                  ]}
                />
              ))}
            </View>

            <Pressable onPress={onStopRecording} style={styles.stopBtn}>
              <MaterialCommunityIcons name="stop" size={18} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <TextInput
            value={inputText}
            onChangeText={onChangeInputText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#888"
            style={styles.input}
            multiline
            blurOnSubmit={false}
            onSubmitEditing={() => {
              if (Platform.OS !== 'web') {
                onSendMessage();
              }
            }}
            onKeyPress={(e: any) => {
              if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
          />
        )}
        {!isRecording && inputText.trim() === '' ? (
          <Pressable onPress={onStartRecording} style={styles.micBtn}>
            <MaterialCommunityIcons name="microphone" size={20} color="#fff" />
          </Pressable>
        ) : !isRecording ? (
          <Pressable onPress={onSendMessage} style={styles.sendBtn}>
            <MaterialCommunityIcons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d1117',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#49C788',
  },
  replyBannerText: { color: '#aaa', fontSize: 13, flex: 1 },
  replyBannerCancel: { color: '#ff4444', fontSize: 18, marginLeft: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#0d1117',
  },
  input: {
    flex: 1,
    backgroundColor: '#202c33',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  attachBtn: { padding: 8, marginRight: 8 },
  sendBtn: {
    marginLeft: 12,
    backgroundColor: '#00a884',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtn: {
    marginLeft: 12,
    backgroundColor: '#00a884',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202c33',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff4444',
  },
  recordingText: { color: '#fff', fontSize: 15, flex: 1 },
  stopBtn: {
    backgroundColor: '#ff4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
