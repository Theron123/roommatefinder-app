import { Modal, Pressable, View, Text, StyleSheet, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {showDeleteOptions ? 'Eliminar Mensaje' : 'Opciones de Mensaje'}
            </Text>
            <Pressable onPress={onClose} style={styles.sheetCloseBtn}>
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          {/* Active Message Preview text */}
          {!showDeleteOptions && activeMessage?.content && (
            <Text style={styles.messagePreview} numberOfLines={1}>
              &quot;{activeMessage.content}&quot;
            </Text>
          )}

          {showDeleteOptions ? (
            <View style={styles.optionsContainer}>
              <Text style={styles.deleteSubText}>¿Deseas eliminar este mensaje para ti o para todos?</Text>
              
              <Pressable style={styles.optionRow} onPress={() => { onDeleteForMe(activeMessage!.id); onClose(); }}>
                <View style={styles.optionLeft}>
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FF453A" />
                  <Text style={[styles.optionText, { color: '#FF453A' }]}>Eliminar para mí</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
              </Pressable>

              <Pressable style={[styles.optionRow, styles.lastOptionRow]} onPress={() => { onDeleteForEveryone(activeMessage!.id); onClose(); }}>
                <View style={styles.optionLeft}>
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FF453A" />
                  <Text style={[styles.optionText, { color: '#FF453A' }]}>Eliminar para todos</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
              </Pressable>

              <Pressable style={styles.backBtn} onPress={() => setShowDeleteOptions(false)}>
                <Text style={styles.backBtnText}>Volver</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.optionsContainer}>
              <Pressable style={styles.optionRow} onPress={() => { onReply(activeMessage); onClose(); }}>
                <View style={styles.optionLeft}>
                  <MaterialCommunityIcons name="reply" size={22} color="#49C788" />
                  <Text style={styles.optionText}>Responder</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
              </Pressable>

              <Pressable style={styles.optionRow} onPress={() => {
                onForward(activeMessage?.media_url ? { url: activeMessage.media_url } : { text: activeMessage?.content });
                onClose();
              }}>
                <View style={styles.optionLeft}>
                  <MaterialCommunityIcons name="share-outline" size={22} color="#49C788" />
                  <Text style={styles.optionText}>Reenviar</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
              </Pressable>
              
              {activeMessage?.content && (
                <Pressable style={styles.optionRow} onPress={() => { onCopy(activeMessage?.content || ''); onClose(); }}>
                  <View style={styles.optionLeft}>
                    <MaterialCommunityIcons name="content-copy" size={22} color="#49C788" />
                    <Text style={styles.optionText}>Copiar texto</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
                </Pressable>
              )}

              <Pressable style={styles.optionRow} onPress={() => { onInfo(activeMessage); onClose(); }}>
                <View style={styles.optionLeft}>
                  <MaterialCommunityIcons name="information-outline" size={22} color="#34B7F1" />
                  <Text style={styles.optionText}>Info del mensaje</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
              </Pressable>

              <Pressable style={[styles.optionRow, styles.lastOptionRow]} onPress={() => {
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
                      onDeleteForMe(activeMessage.id);
                      onClose();
                    }
                  }
                }
              }}>
                <View style={styles.optionLeft}>
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FF453A" />
                  <Text style={[styles.optionText, { color: '#FF453A' }]}>Eliminar</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#1C2530',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sheetCloseBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
  },
  messagePreview: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  deleteSubText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  optionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  lastOptionRow: {
    borderBottomWidth: 0,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
