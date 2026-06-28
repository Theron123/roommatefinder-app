import React from 'react';
import { Modal, Pressable, View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MessageInfoModalProps {
  visible: boolean;
  message: any;
  myId: string | null;
  onClose: () => void;
}

export default function MessageInfoModal({
  visible,
  message,
  myId,
  onClose,
}: MessageInfoModalProps) {
  if (!message) return null;

  const isMine = message.sender_id === myId;
  
  // Format dates
  const date = new Date(message.created_at);
  const dateStr = date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

  const getMediaLabel = () => {
    if (!message.media_type) return null;
    switch (message.media_type) {
      case 'image': return '📸 Imagen';
      case 'video': return '🎥 Video';
      case 'audio': return '🎙️ Mensaje de voz';
      case 'file': return '📄 Archivo';
      default: return '📎 Multimedia';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="information" size={24} color="#49C788" />
            <Text style={styles.title}>Detalles del Mensaje</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color="#aaa" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Bubble Preview */}
            <View style={styles.previewSection}>
              <Text style={styles.sectionTitle}>Mensaje</Text>
              <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                {getMediaLabel() && (
                  <Text style={[styles.mediaLabel, isMine ? styles.myText : styles.theirText]}>
                    {getMediaLabel()}
                  </Text>
                )}
                {message.content && (
                  <Text style={[styles.bubbleText, isMine ? styles.myText : styles.theirText]}>
                    {message.content}
                  </Text>
                )}
              </View>
            </View>

            {/* Timing Info */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <View style={styles.iconWrapper}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#49C788" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Enviado</Text>
                  <Text style={styles.infoValue}>{dateStr}</Text>
                  <Text style={styles.infoSubValue}>{timeStr}</Text>
                </View>
              </View>

              {/* Read Receipt System */}
              <View style={[styles.infoRow, { marginTop: 16 }]}>
                <View style={styles.iconWrapper}>
                  <MaterialCommunityIcons 
                    name={message.is_read ? "check-all" : "check"} 
                    size={20} 
                    color={message.is_read ? "#34B7F1" : "#aaa"} 
                  />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Visto / Leído</Text>
                  <Text style={styles.infoValue}>
                    {message.is_read 
                      ? (isMine ? 'Leído por el destinatario' : 'Leído por ti') 
                      : 'Entregado (No visto aún)'}
                  </Text>
                  <Text style={styles.infoSubValue}>
                    {message.is_read 
                      ? 'Confirmación de lectura activa ✓' 
                      : 'Esperando confirmación...'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Button */}
          <Pressable style={styles.actionButton} onPress={onClose}>
            <Text style={styles.actionButtonText}>Entendido</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#1C2530',
    borderRadius: 16,
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  previewSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  myBubble: {
    backgroundColor: '#005c4b',
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  theirBubble: {
    backgroundColor: '#202c33',
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  mediaLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  myText: {
    color: '#fff',
  },
  theirText: {
    color: '#e9edef',
  },
  infoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 2,
  },
  infoSubValue: {
    color: '#777',
    fontSize: 11,
    marginTop: 1,
  },
  actionButton: {
    backgroundColor: '#49C788',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
