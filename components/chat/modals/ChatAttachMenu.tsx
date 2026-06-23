import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';

interface ChatAttachMenuProps {
  visible: boolean;
  onClose: () => void;
  onPickMedia: () => void;
  onPickDocument: () => void;
}

export default function ChatAttachMenu({ visible, onClose, onPickMedia, onPickDocument }: ChatAttachMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.actionMenuOverlay} onPress={onClose}>
        <View style={styles.actionMenu}>
          <Text style={styles.actionMenuTitle}>Attach File</Text>
          <Pressable style={styles.actionMenuItem} onPress={onPickMedia}>
            <Text style={styles.actionMenuItemText}>🖼  Photo or Video (Gallery)</Text>
          </Pressable>
          <Pressable style={styles.actionMenuItem} onPress={onPickDocument}>
            <Text style={styles.actionMenuItemText}>🎵  Audio or Document</Text>
          </Pressable>
          <Pressable style={[styles.actionMenuItem, styles.actionMenuCancel]} onPress={onClose}>
            <Text style={[styles.actionMenuItemText, { color: '#ff4444' }]}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionMenu: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    width: '100%',
    padding: 16,
  },
  actionMenuTitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  actionMenuItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  actionMenuItemText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  actionMenuCancel: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
});
