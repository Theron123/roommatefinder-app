import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const PRESET_WALLPAPERS = [
  { id: 'default', name: 'Original', value: 'default', color: '#090d14' },
  { id: 'emerald', name: 'Mint Green', value: '#063f35', color: '#063f35' },
  { id: 'midnight', name: 'Midnight', value: '#05070A', color: '#05070A' },
  { id: 'classic_dark', name: 'Classic Green', value: '#0b141a', color: '#0b141a' },
  { id: 'aurora', name: 'Deep Purple', value: '#120d1c', color: '#120d1c' },
  { id: 'chocolate', name: 'Deep Brown', value: '#1a1412', color: '#1a1412' },
];

interface ChatSettingsModalProps {
  visible: boolean;
  wallpaper: string | null;
  onClose: () => void;
  onPickCustom: () => void;
  onSelectPreset: (value: string) => void;
}

export default function ChatSettingsModal({
  visible,
  wallpaper,
  onClose,
  onPickCustom,
  onSelectPreset
}: ChatSettingsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.actionMenuOverlay} onPress={onClose}>
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Personalizar Fondo</Text>
            <Pressable onPress={onClose} style={styles.sheetCloseBtn}>
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          <Text style={styles.sheetSub}>Elige un estilo para el fondo del chat:</Text>

          {/* Custom Gallery Option */}
          <Pressable style={styles.galleryOption} onPress={onPickCustom}>
            <MaterialCommunityIcons name="image-multiple-outline" size={24} color="#49C788" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.galleryOptionText}>Seleccionar de Galería</Text>
              <Text style={styles.galleryOptionSub}>Elige una foto de tu dispositivo</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
          </Pressable>

          <Text style={styles.sheetSub}>O elige un color sólido:</Text>
          
          <View style={styles.presetsGrid}>
            {PRESET_WALLPAPERS.map((preset) => (
              <Pressable
                key={preset.id}
                style={[
                  styles.presetCard,
                  { backgroundColor: preset.color },
                  wallpaper === preset.value && styles.presetCardActive
                ]}
                onPress={() => onSelectPreset(preset.value)}
              >
                <Text style={styles.presetName} numberOfLines={1}>{preset.name}</Text>
                {wallpaper === preset.value && (
                  <View style={styles.activeCheck}>
                    <MaterialCommunityIcons name="check" size={12} color="#000" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          <Pressable 
            style={styles.resetBtn} 
            onPress={() => onSelectPreset('default')}
          >
            <Text style={styles.resetBtnText}>Restablecer fondo por defecto</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sheetCloseBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  sheetSub: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
    marginTop: 8,
  },
  galleryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(73, 199, 136, 0.1)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(73, 199, 136, 0.3)',
    marginBottom: 24,
  },
  galleryOptionText: {
    color: '#49C788',
    fontSize: 16,
    fontWeight: '600',
  },
  galleryOptionSub: {
    color: '#rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  presetCard: {
    width: '30%',
    height: 80,
    borderRadius: 16,
    justifyContent: 'flex-end',
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  presetCardActive: {
    borderColor: '#49C788',
  },
  presetName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  activeCheck: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#49C788',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1c1c1e',
  },
  resetBtn: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(255,69,58,0.1)',
    borderRadius: 16,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#FF453A',
    fontSize: 16,
    fontWeight: '600',
  },
});
