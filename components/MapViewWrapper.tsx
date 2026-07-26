import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

// Stub out all exported names that explore.tsx uses
export const PROVIDER_GOOGLE = 'google';

let MapContainer: any = () => null;
let TileLayer: any = () => null;
let RMarker: any = () => null;
let Popup: any = () => null;
let useMap: any = () => null;
let L: any = null;

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RL = require('react-leaflet');
  MapContainer = RL.MapContainer;
  TileLayer = RL.TileLayer;
  RMarker = RL.Marker;
  Popup = RL.Popup;
  useMap = RL.useMap;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  L = require('leaflet');

  // Fix for default marker icons in leaflet
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

// Marcador equivalente a react-native-maps pero implementado sobre Leaflet para la versión web
export function Marker(props: any) {
  if (typeof window === 'undefined' || !props.coordinate) return null;
  const position = [props.coordinate.latitude, props.coordinate.longitude];
  
  let customIcon = undefined;
  if (L) {
    const iconUrl = props.iconUrl || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=100&w=200&auto=format&fit=crop';
    const borderColor = props.borderColor || '#34C759';
    const badgeIcon = props.badgeIcon || 'magnify';

    let badgeHtml = '';
    if (badgeIcon === 'heart') {
      badgeHtml = '❤️';
    } else if (badgeIcon === 'home-account') {
      badgeHtml = '🏠';
    } else if (badgeIcon === 'flag') {
      badgeHtml = '🚩';
    } else {
      badgeHtml = '🔍';
    }

    const htmlContent = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 48px; height: 56px; position: relative;">
        <div style="width: 44px; height: 44px; border-radius: 22px; border: 2.5px solid ${borderColor}; background-color: #1C1C1E; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.3); box-sizing: border-box; overflow: visible;">
          <img src="${iconUrl}" style="width: 39px; height: 39px; border-radius: 50%; object-fit: cover; display: block;" />
          <div style="position: absolute; bottom: -2px; right: -2px; background-color: ${borderColor}; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-size: 8px; border: 1px solid #1C1C1E; line-height: 14px; text-align: center;">
            ${badgeHtml}
          </div>
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${borderColor}; margin-top: -2px;"></div>
      </div>
    `;

    customIcon = L.divIcon({
      html: htmlContent,
      className: 'custom-leaflet-marker-div',
      iconSize: [48, 56],
      iconAnchor: [24, 56],
    });
  }

  return (
    <RMarker position={position} icon={customIcon} eventHandlers={props.onPress ? { click: props.onPress } : undefined}>
      {props.children}
    </RMarker>
  );
}

// Globo/callout equivalente al de react-native-maps, renderizado como un Popup de Leaflet
export function Callout(props: any) {
  if (typeof window === 'undefined') return null;
  return (
    <Popup>
      <View style={{ padding: 5 }}>{props.children}</View>
    </Popup>
  );
}

// Componente auxiliar que recentra y hace zoom en el mapa de Leaflet cuando cambian center/zoom
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

// Stub de MapView para web: monta un mapa de Leaflet/OpenStreetMap con la misma API que react-native-maps
export default function MapView(props: any) {
  const { style, children, region, initialRegion } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof window === 'undefined') {
    return <View style={[styles.container, style]} />;
  }

  const activeRegion = region || initialRegion;
  const center = activeRegion ? [activeRegion.latitude, activeRegion.longitude] : [19.4326, -99.1332];
  const zoom = activeRegion && activeRegion.latitudeDelta ? Math.round(Math.log(360 / activeRegion.latitudeDelta) / Math.LN2) : 12;

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
        <ChangeView center={center as [number, number]} zoom={zoom} />
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
