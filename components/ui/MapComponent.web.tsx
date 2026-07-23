import { View, Text, StyleSheet } from 'react-native';

// Versión web de MapComponent: como los mapas nativos no están disponibles, muestra solo las coordenadas en texto
export default function MapComponent({ lat, lng }: { lat: number, lng: number }) {
  return (
    <View style={styles.mapContainer}>
      <Text style={styles.webText}>🗺️ Interactive maps are optimized for the mobile app. Location: {lat.toFixed(4)}, {lng.toFixed(4)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 14,
  }
});
