import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

interface TrustAlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface TrustAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: TrustAlertButton[];
  onClose: () => void;
}

export default function TrustAlertModal({
  visible,
  title,
  message,
  buttons,
  onClose
}: TrustAlertModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.alertOverlay}>
        <BlurView intensity={25} tint="dark" style={styles.alertBlur}>
          <View style={styles.alertCard}>
            <Text style={styles.alertCardTitle}>{title}</Text>
            <Text style={styles.alertCardMsg}>{message}</Text>
            <View style={styles.alertButtonsRow}>
              {buttons.map((btn, idx) => (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [
                    styles.alertBtn,
                    btn.style === 'destructive' 
                      ? styles.alertBtnDestructive 
                      : btn.style === 'cancel' 
                        ? styles.alertBtnCancel 
                        : styles.alertBtnPrimary,
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClose();
                    if (btn.onPress) btn.onPress();
                  }}
                >
                  <Text style={[
                    styles.alertBtnText,
                    btn.style === 'destructive' 
                      ? styles.alertBtnTextDestructive 
                      : btn.style === 'cancel' 
                        ? styles.alertBtnTextCancel 
                        : styles.alertBtnTextPrimary
                   ]}>
                    {btn.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  alertOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)' },
  alertBlur: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  alertCard: {
    width: '85%',
    maxWidth: 320,
    backgroundColor: '#0f121a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  alertCardTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  alertCardMsg: { color: '#aaa', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  alertButtonsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  alertBtn: { flex: 1, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  alertBtnPrimary: { backgroundColor: '#49C788' },
  alertBtnDestructive: { backgroundColor: 'rgba(255,69,58,0.1)', borderWidth: 1, borderColor: 'rgba(255,69,58,0.2)' },
  alertBtnCancel: { backgroundColor: 'transparent' },
  alertBtnText: { fontSize: 14, fontWeight: '700' },
  alertBtnTextPrimary: { color: '#000' },
  alertBtnTextDestructive: { color: '#FF453A' },
  alertBtnTextCancel: { color: '#888' },
});
