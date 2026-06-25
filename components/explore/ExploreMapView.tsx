import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from '@/components/MapViewWrapper';
import { Profile } from '@/lib/types';

interface ExploreMapViewProps {
  profiles: Profile[];
  matchedProfiles: Profile[];
  currentUser: Profile | null;
  userLocation: { latitude: number; longitude: number } | null;
  STATUS_MAP: Record<string, { label: string; color: string; icon: string }>;
  t: (key: string) => string;
}

export default function ExploreMapView({
  profiles,
  matchedProfiles,
  currentUser,
  userLocation,
  STATUS_MAP,
  t,
}: ExploreMapViewProps) {
  const router = useRouter();

  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={{
        latitude: currentUser?.latOffset || userLocation?.latitude || 19.4326,
        longitude: currentUser?.lngOffset || userLocation?.longitude || -99.1332,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }}
      showsUserLocation={true}
      userInterfaceStyle="dark"
    >
      {/* Marcador del Usuario Actual (Bandera Verde) */}
      {currentUser && (
        <Marker
          key="current_user_marker"
          coordinate={{
            latitude: currentUser.latOffset || userLocation?.latitude || 19.4326,
            longitude: currentUser.lngOffset || userLocation?.longitude || -99.1332
          }}
        >
          <View style={styles.currentUserMarkerContainer}>
            <Image 
              source={{ uri: currentUser.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=100&w=200&auto=format&fit=crop' }} 
              style={styles.currentUserMarkerImage} 
            />
            <View style={styles.currentUserMarkerBadge}>
              <MaterialCommunityIcons name="flag" size={10} color="#fff" />
            </View>
          </View>
          <Callout>
            <View style={styles.calloutContainer}>
              <Text style={styles.calloutName}>{currentUser.name || 'Tú'} (Tú)</Text>
              <Text style={styles.calloutRole}>
                {currentUser.availability_status 
                  ? (STATUS_MAP[currentUser.availability_status]?.label || currentUser.availability_status) 
                  : 'Disponible'}
              </Text>
            </View>
          </Callout>
        </Marker>
      )}

      {/* Perfiles de Candidatos de Explore */}
      {profiles.map(profile => {
        if (!profile.latitude || !profile.longitude) return null;
        return (
          <Marker
            key={`explore_${profile.id}`}
            coordinate={{ latitude: profile.latitude, longitude: profile.longitude }}
          >
            <View style={styles.markerContainer}>
              <Image 
                source={{ uri: profile.photoUrl || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=100&w=200&auto=format&fit=crop' }} 
                style={styles.markerImage} 
              />
              <View style={styles.markerBadge}>
                <MaterialCommunityIcons name="account-search" size={10} color="#000" />
              </View>
            </View>
            <Callout onPress={() => router.push(`/profile/${profile.id}`)}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutName}>{profile.name}, {profile.age}</Text>
                <Text style={styles.calloutRole}>{profile.role === 'host' ? t('explore.role_host') : t('explore.role_seeker')}</Text>
                <Text style={styles.calloutAction}>{t('explore.view_profile')}</Text>
              </View>
            </Callout>
          </Marker>
        );
      })}

      {/* Perfiles de Matches */}
      {matchedProfiles.map(profile => {
        if (!profile.latitude || !profile.longitude) return null;
        return (
          <Marker
            key={`match_${profile.id}`}
            coordinate={{ latitude: profile.latitude, longitude: profile.longitude }}
          >
            <View style={[styles.markerContainer, { borderColor: '#FFCC00' }]}>
              <Image 
                source={{ uri: profile.photoUrl || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=100&w=200&auto=format&fit=crop' }} 
                style={styles.markerImage} 
              />
              <View style={[styles.markerBadge, { backgroundColor: '#FFCC00' }]}>
                <MaterialCommunityIcons name="heart" size={10} color="#000" />
              </View>
            </View>
            <Callout onPress={() => router.push(`/profile/${profile.id}`)}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutName}>{profile.name}, {profile.age} (Match!)</Text>
                <Text style={styles.calloutRole}>{profile.role === 'host' ? t('explore.role_host') : t('explore.role_seeker')}</Text>
                <Text style={styles.calloutAction}>{t('explore.view_profile')}</Text>
              </View>
            </Callout>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#49C788',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  markerImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  markerBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#49C788',
    borderRadius: 6,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  currentUserMarkerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#0A84FF',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  currentUserMarkerImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  currentUserMarkerBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0A84FF',
    borderRadius: 6,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  calloutContainer: {
    padding: 6,
    maxWidth: 160,
    backgroundColor: '#000',
  },
  calloutName: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#fff',
  },
  calloutRole: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  calloutAction: {
    fontSize: 10,
    color: '#49C788',
    fontWeight: 'bold',
    marginTop: 4,
  },
});
