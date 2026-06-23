import { Modal, Pressable, View, Text, StyleSheet, Image, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerModalProps {
  visible: boolean;
  selectedImage: string | null;
  imageScale: number;
  zoomOffset: { x: number; y: number };
  onClose: () => void;
  onForward: (url: string) => void;
  onDownload: (url: string) => void;
  onZoomChange: (scale: number, offset: { x: number; y: number }) => void;
}

export default function ImageViewerModal({
  visible,
  selectedImage,
  imageScale,
  zoomOffset,
  onClose,
  onForward,
  onDownload,
  onZoomChange
}: ImageViewerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.imageViewerContainer}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={{ padding: 8 }}>
            <Text style={styles.closeBtn}>✕ Cerrar</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable style={styles.modalActionBtn}
              onPress={() => selectedImage && onForward(selectedImage)}>
              <Text style={styles.modalActionText}>➡ Forward</Text>
            </Pressable>
            <Pressable style={styles.modalActionBtn}
              onPress={() => selectedImage && onDownload(selectedImage)}>
              <Text style={styles.modalActionText}>📥 Save</Text>
            </Pressable>
          </View>
        </View>

        {selectedImage && (
          <Pressable onPress={(e) => {
            if (imageScale > 1) {
              onZoomChange(1, { x: 0, y: 0 });
            } else {
              const { pageX, pageY } = e.nativeEvent;
              const cx = pageX - (SCREEN_WIDTH / 2);
              const cy = pageY - (SCREEN_HEIGHT / 2);
              const S = 2.5;
              
              onZoomChange(S, { x: -cx, y: -cy });
            }
          }}>
            <Image
              source={{ uri: selectedImage }}
              style={[
                styles.fullImage, 
                { 
                  transform: [
                    { translateX: zoomOffset.x },
                    { translateY: zoomOffset.y },
                    { scale: imageScale }
                  ] 
                }
              ]}
              resizeMode="contain"
            />
          </Pressable>
        )}

        <View style={styles.zoomBadge}>
          <Text style={styles.zoomBadgeText}>{Math.round(imageScale * 100)}%</Text>
          {imageScale !== 1 && (
            <Pressable onPress={() => { onZoomChange(1, { x: 0, y: 0 }); }} style={styles.resetZoomBtn}>
              <Text style={styles.modalActionText}>Reset</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  imageViewerContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, alignSelf: 'center' },
  modalHeader: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  closeBtn: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalActionBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  modalActionText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  zoomBadge: { position: 'absolute', bottom: 40, left: 20, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
  zoomBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  resetZoomBtn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
});
