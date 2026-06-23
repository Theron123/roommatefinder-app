import { Modal, Pressable, View, Text, StyleSheet, Platform } from 'react-native';
import { useState, useEffect } from 'react';

interface ChatActionMenuProps {
  visible: boolean;
  activeMessage: any;
  myId: string | null;
  onClose: () => void;
  onReply: (msg: any) => void;
  onForward: (payload: any) => void;
  onCopy: (content: string) => void;
  onInfo: (msg: any) => void;
  onDeleteForMe: (id: string) => void;
  onDeleteForEveryone: (id: string) => void;
}

export default function ChatActionMenu({
  visible,
  activeMessage,
  myId,
  onClose,
  onReply,
  onForward,
  onCopy,
  onInfo,
  onDeleteForMe,
  onDeleteForEveryone
}: ChatActionMenuProps) {
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);

  useEffect(() => {
    if (!visible) setShowDeleteOptions(false);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.actionMenuOverlay} onPress={onClose}>
        <View style={styles.actionMenu}>
          <Text style={styles.actionMenuTitle} numberOfLines={1}>
            &quot;{activeMessage?.content || 'Message'}&quot;
          </Text>

          {showDeleteOptions ? (
            <>
              <Text style={styles.deleteSubText}>¿Deseas eliminar este mensaje para ti o para todos?</Text>
              <Pressable style={styles.actionMenuItem} onPress={() => { onDeleteForMe(activeMessage!.id); onClose(); }}>
                <Text style={[styles.actionMenuItemText, { color: '#ff4444' }]}>🗑 Eliminar para mí</Text>
              </Pressable>
              <Pressable style={styles.actionMenuItem} onPress={() => { onDeleteForEveryone(activeMessage!.id); onClose(); }}>
                <Text style={[styles.actionMenuItemText, { color: '#ff4444' }]}>🗑 Eliminar para todos</Text>
              </Pressable>
              <Pressable style={[styles.actionMenuItem, styles.actionMenuCancel]} onPress={() => setShowDeleteOptions(false)}>
                <Text style={[styles.actionMenuItemText, { color: '#fff' }]}>Cancelar</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.actionMenuItem} onPress={() => { onReply(activeMessage); onClose(); }}>
                <Text style={styles.actionMenuItemText}>↩  Reply</Text>
              </Pressable>
              <Pressable style={styles.actionMenuItem} onPress={() => {
                onForward(activeMessage?.media_url ? { url: activeMessage.media_url } : { text: activeMessage?.content });
                onClose();
              }}>
                <Text style={styles.actionMenuItemText}>➡  Forward</Text>
              </Pressable>
              
              <Pressable style={styles.actionMenuItem} onPress={() => { onCopy(activeMessage?.content || ''); onClose(); }}>
                <Text style={styles.actionMenuItemText}>📄  Copy</Text>
              </Pressable>

              {activeMessage?.sender_id === myId && (
                <Pressable style={styles.actionMenuItem} onPress={() => { onInfo(activeMessage); onClose(); }}>
                  <Text style={styles.actionMenuItemText}>ℹ️  Info</Text>
                </Pressable>
              )}

              <Pressable style={styles.actionMenuItem} onPress={() => {
                if (activeMessage) {
                  if (myId === activeMessage.sender_id) {
                    setShowDeleteOptions(true);
                  } else {
                    if (Platform.OS === 'web') {
                      if (window.confirm('¿Eliminar este mensaje para ti?')) {
                        onDeleteForMe(activeMessage.id);
                        onClose();
                      } else {
                        onClose();
                      }
                    } else {
                      // Platform alert logic handles delete natively, so we just trigger it and let the callback handle UI
                      onDeleteForMe(activeMessage.id);
                      onClose();
                    }
                  }
                }
              }}>
                <Text style={[styles.actionMenuItemText, { color: '#ff4444' }]}>🗑  Delete</Text>
              </Pressable>

              <Pressable style={[styles.actionMenuItem, styles.actionMenuCancel]} onPress={onClose}>
                <Text style={[styles.actionMenuItemText, { color: '#ff4444' }]}>Cancel</Text>
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actionMenuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
  },
  actionMenu: { backgroundColor: '#2A2A2A', borderRadius: 12, width: '100%', padding: 16 },
  actionMenuTitle: { color: '#aaa', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  deleteSubText: { color: '#888', textAlign: 'center', marginBottom: 10, fontSize: 13, paddingHorizontal: 10 },
  actionMenuItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#333' },
  actionMenuItemText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  actionMenuCancel: { borderBottomWidth: 0, marginTop: 8 },
});
