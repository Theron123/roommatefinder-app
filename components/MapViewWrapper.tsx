import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';

// Stub out all exported names that explore.tsx uses
export const PROVIDER_GOOGLE = 'google';

let MapContainer: any = () => null;
let TileLayer: any = () => null;
let RMarker: any = () => null;
let Popup: any = () => null;
let L: any = null;

if (typeof window !== 'undefined') {
  const RL = require('react-leaflet');
  MapContainer = RL.MapContainer;
  TileLayer = RL.TileLayer;
  RMarker = RL.Marker;
  Popup = RL.Popup;
  L = require('leaflet');

  // Fix for default marker icons in leaflet
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

export function Marker(props: any) {
  if (typeof window === 'undefined' || !props.coordinate) return null;
  const position = [props.coordinate.latitude, props.coordinate.longitude];
  return (
    <RMarker position={position}>
      {props.children}
    </RMarker>
  );
}

export function Callout(props: any) {
  if (typeof window === 'undefined') return null;
  return (
    <Popup>
      <View style={{ padding: 5 }}>{props.children}</View>
    </Popup>
  );
}

export default function MapView(props: any) {
  const { style, children, region } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof window === 'undefined') {
    return <View style={[styles.container, style]} />;
  }

  const center = region ? [region.latitude, region.longitude] : [19.4326, -99.1332];
  const zoom = region && region.latitudeDelta ? Math.round(Math.log(360 / region.latitudeDelta) / Math.LN2) : 12;

  return (
    <View style={[styles.container, style]}>
      <style type="text/css">{`
        .leaflet-container {
          width: 100%;
          height: 100%;
          z-index: 1;
        }
      `}</style>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
});
