import { Modal, Pressable, View, Text, StyleSheet, FlatList } from 'react-native';
import { Profile } from '@/lib/types';

interface ChatForwardModalProps {
  visible: boolean;
  profiles: Profile[];
  onClose: () => void;
  onSendForward: (userId: string) => void;
}

export default function ChatForwardModal({
  visible,
  profiles,
  onClose,
  onSendForward
}: ChatForwardModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.forwardModalContainer}>
        <View style={styles.forwardModal}>
          <Text style={styles.forwardTitle}>Forward to...</Text>
          <FlatList
            data={profiles}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
              <Pressable style={styles.forwardUser} onPress={() => onSendForward(item.id)}>
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
          <Pressable style={styles.forwardCancelBtn} onPress={onClose}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
