import MapView, { Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';

export default function MapComponent({ lat, lng }: { lat: number, lng: number }) {
  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        userInterfaceStyle="dark"
      >
        <Circle
          center={{ latitude: lat, longitude: lng }}
          radius={1500}
          fillColor="rgba(108, 99, 255, 0.3)"
          strokeColor="rgba(108, 99, 255, 0.8)"
          strokeWidth={2}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
