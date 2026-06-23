import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface BadgeConfig {
  id: string;
  type: string;
  title: string;
  desc: string;
  icon: any;
  color: string;
  metadata?: any;
}

interface TrustBadgeDetailModalProps {
  visible: boolean;
  selectedBadge: BadgeConfig | null;
  locale: string;
  benefitsEn: string[];
  benefitsEs: string[];
  onClose: () => void;
  onRevoke: (type: string) => void;
}

export default function TrustBadgeDetailModal({
  visible,
  selectedBadge,
  locale,
  benefitsEn,
  benefitsEs,
  onClose,
  onRevoke
}: TrustBadgeDetailModalProps) {
  const benefits = locale === 'es' ? benefitsEs : benefitsEn;

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={30} tint="dark" style={styles.modalBlur}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeaderLine, { backgroundColor: selectedBadge?.color }]} />
            
            <View style={styles.modalIconWrap}>
              <View style={[styles.modalIconCircle, { backgroundColor: selectedBadge?.color + '20' }]}>
                <MaterialCommunityIcons name={selectedBadge?.icon} size={48} color={selectedBadge?.color} />
              </View>
              <MaterialCommunityIcons 
                name="check-decagram" 
                size={24} 
                color={selectedBadge?.color} 
                style={styles.modalCheckBadge}
              />
            </View>

            <Text style={styles.modalTitle}>{selectedBadge?.title}</Text>
            
            <View style={styles.statusBadge}>
              <Text style={[styles.statusText, { color: selectedBadge?.color }]}>
                {locale === 'es' ? 'VERIFICACIÓN ACTIVA' : 'ACTIVE VERIFICATION'}
              </Text>
            </View>

            {/* Show Custom Metadata if available */}
            {selectedBadge?.type === 'social' && selectedBadge?.metadata?.input && (
              <View style={styles.metaDataBadge}>
                <MaterialCommunityIcons name="instagram" size={16} color="#E1306C" />
                <Text style={styles.metaDataText}>{selectedBadge.metadata.input}</Text>
              </View>
            )}

            {selectedBadge?.type === 'background' && selectedBadge?.metadata?.name && (
              <View style={styles.metaDataBadge}>
                <MaterialCommunityIcons name="shield-account" size={16} color="#34C759" />
                <Text style={styles.metaDataText}>
                  {selectedBadge.metadata.name}
                </Text>
              </View>
            )}
            {selectedBadge?.type === 'background' && selectedBadge?.metadata?.idNumber && (
              <Text style={styles.metaDataSubText}>
                {locale === 'es' ? 'ID de Antecedentes: ' : 'Background ID: '}
                {selectedBadge.metadata.idNumber}
              </Text>
            )}

            {selectedBadge?.type === 'phone' && selectedBadge?.metadata?.input && (
              <View style={styles.metaDataBadge}>
                <MaterialCommunityIcons name="phone" size={16} color="#FF9F0A" />
                <Text style={styles.metaDataText}>{selectedBadge.metadata.input}</Text>
              </View>
            )}

            <Text style={styles.modalDesc}>{selectedBadge?.desc}</Text>

            {/* Benefits list */}
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsHeader}>
                {locale === 'es' ? 'Beneficios Obtenidos:' : 'Benefits Achieved:'}
              </Text>
              
              {(benefits || []).map((benefit, i) => (
                  <View key={i} style={styles.benefitRow}>
                    <MaterialCommunityIcons name="check" size={16} color={selectedBadge?.color} style={{ marginTop: 2 }} />
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <Pressable 
                style={[styles.modalBtn, { backgroundColor: '#1c1c1e' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
              >
                <Text style={styles.modalBtnTextClose}>{locale === 'es' ? 'Cerrar' : 'Close'}</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.modalBtn, styles.revokeBtn]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (selectedBadge?.type) {
                    onRevoke(selectedBadge.type);
                  }
                }}
              >
                <MaterialCommunityIcons name="delete" size={16} color="#FF453A" style={{ marginRight: 6 }} />
                <Text style={styles.revokeBtnText}>{locale === 'es' ? 'Revocar' : 'Revoke'}</Text>
              </Pressable>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalBlur: { flex: 1, justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#0f121a', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderBottomWidth: 0 },
  modalHeaderLine: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  modalIconWrap: { alignSelf: 'center', marginBottom: 16, position: 'relative' },
  modalIconCircle: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
  modalCheckBadge: { position: 'absolute', bottom: 0, right: 0 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  statusBadge: { alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 20 },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  modalDesc: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16, marginBottom: 24 },
  
  benefitsContainer: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 18, marginBottom: 28 },
  benefitsHeader: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 12 },
  benefitRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  benefitText: { flex: 1, color: '#aaa', fontSize: 12, lineHeight: 18 },
  
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  modalBtnTextClose: { color: '#fff', fontSize: 15, fontWeight: '700' },
  revokeBtn: { backgroundColor: 'rgba(255,69,58,0.1)', borderWidth: 1, borderColor: 'rgba(255,69,58,0.2)' },
  revokeBtnText: { color: '#FF453A', fontSize: 15, fontWeight: '700' },

  metaDataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    alignSelf: 'center',
    marginBottom: 12
  },
  metaDataText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  metaDataSubText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: -4
  },
});
