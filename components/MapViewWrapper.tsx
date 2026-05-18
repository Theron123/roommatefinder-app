// Web fallback — react-native-maps is native-only.
// Render a placeholder card so the web bundle doesn't crash.
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Stub out all exported names that explore.tsx uses
export const PROVIDER_GOOGLE = 'google';

export function Marker(_props: any) { return null; }
export function Callout(_props: any) { return null; }

export default function MapView(props: any) {
  const { style, children } = props;
  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons name="map-outline" size={64} color="#333" />
      <Text style={styles.title}>Vista de Mapa</Text>
      <Text style={styles.sub}>El mapa interactivo solo está disponible{'\n'}en la app nativa (iOS / Android).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  sub: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
