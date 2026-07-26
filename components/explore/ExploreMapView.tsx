import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from '@/components/MapViewWrapper';
import { Profile } from '@/lib/types';

interface ExploreMapViewProps {
  profiles: Profile[];
  matchedProfiles: Profile[];
  currentUser: Profile | null;
  userLocation: { latitude: number; longitude: number } | null;
  STATUS_MAP: Record<string, { label: string; color: string; icon: string }>;
  t: (key: string) => string;
}

// Vista de mapa de Explore con pines de foto personalizados y tarjeta flotante estilo Instagram
export default function ExploreMapView({
  profiles,
  matchedProfiles,
  currentUser,
  userLocation,
  STATUS_MAP,
  t,
}: ExploreMapViewProps) {
  const router = useRouter();
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  // A dynamic key based on whether we have coordinates for the user.
  // This forces MapView to remount and center on the user's location once it is resolved.
  const hasLocation = !!(currentUser?.latOffset || userLocation?.latitude);
  const mapKey = hasLocation ? 'map-located' : 'map-default';

  const isMatch = (profileId: string) => {
    return matchedProfiles.some(m => m.id === profileId);
  };

  return (
    <View style={styles.container}>
      <MapView
        key={mapKey}
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
        onPress={() => setSelectedProfile(null)}
      >
        {/* Marcador del Usuario Actual (Pin Azul/Morado) */}
        {currentUser && (
          <Marker
            key="current_user_marker"
            coordinate={{
              latitude: currentUser.latOffset || userLocation?.latitude || 19.4326,
              longitude: currentUser.lngOffset || userLocation?.longitude || -99.1332
            }}
            onPress={() => setSelectedProfile(currentUser)}
            iconUrl={currentUser.photoUrl}
            borderColor="#0A84FF"
            badgeIcon="flag"
          >
            <View style={styles.markerWrapper}>
              <View style={styles.currentUserMarkerContainer}>
                <Image 
                  source={{ uri: currentUser.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=100&w=200&auto=format&fit=crop' }} 
                  style={styles.currentUserMarkerImage} 
                />
                <View style={styles.currentUserMarkerBadge}>
                  <MaterialCommunityIcons name="flag" size={10} color="#fff" />
                </View>
              </View>
              <View style={[styles.markerTriangle, { borderTopColor: '#0A84FF' }]} />
            </View>
          </Marker>
        )}

        {/* Perfiles de Candidatos de Explore */}
        {profiles.map(profile => {
          if (!profile.latitude || !profile.longitude) return null;
          const userIsMatch = isMatch(profile.id);
          const pinColor = userIsMatch 
            ? '#FFCC00' 
            : (profile.role === 'host' ? '#0A84FF' : '#34C759');
          const badgeIcon = userIsMatch 
            ? 'heart' 
            : (profile.role === 'host' ? 'home-account' : 'magnify');

          return (
            <Marker
              key={`explore_${profile.id}`}
              coordinate={{ latitude: profile.latitude, longitude: profile.longitude }}
              onPress={() => setSelectedProfile(profile)}
              iconUrl={profile.photoUrl}
              borderColor={pinColor}
              badgeIcon={badgeIcon}
            >
              <View style={styles.markerWrapper}>
                <View style={[styles.markerContainer, { borderColor: pinColor }]}>
                  <Image 
                    source={{ uri: profile.photoUrl || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=100&w=200&auto=format&fit=crop' }} 
                    style={styles.markerImage} 
                  />
                  <View style={[styles.markerBadge, { backgroundColor: pinColor }]}>
                    <MaterialCommunityIcons name={badgeIcon} size={10} color="#000" />
                  </View>
                </View>
                <View style={[styles.markerTriangle, { borderTopColor: pinColor }]} />
              </View>
            </Marker>
          );
        })}

        {/* Perfiles de Matches */}
        {matchedProfiles.map(profile => {
          if (!profile.latitude || !profile.longitude) return null;
          // Evitamos duplicar marcadores si ya están en profiles
          if (profiles.some(p => p.id === profile.id)) return null;

          return (
            <Marker
              key={`match_${profile.id}`}
              coordinate={{ latitude: profile.latitude, longitude: profile.longitude }}
              onPress={() => setSelectedProfile(profile)}
              iconUrl={profile.photoUrl}
              borderColor="#FFCC00"
              badgeIcon="heart"
            >
              <View style={styles.markerWrapper}>
                <View style={[styles.markerContainer, { borderColor: '#FFCC00' }]}>
                  <Image 
                    source={{ uri: profile.photoUrl || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=100&w=200&auto=format&fit=crop' }} 
                    style={styles.markerImage} 
                  />
                  <View style={[styles.markerBadge, { backgroundColor: '#FFCC00' }]}>
                    <MaterialCommunityIcons name="heart" size={10} color="#000" />
                  </View>
                </View>
                <View style={[styles.markerTriangle, { borderTopColor: '#FFCC00' }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Tarjeta flotante inferior estilo Instagram */}
      {selectedProfile && (
        <View style={styles.cardContainer} pointerEvents="box-none">
          <View style={[
            styles.detailCard,
            isMatch(selectedProfile.id) && styles.matchedCardBorder,
            selectedProfile.id === currentUser?.id && styles.currentUserCardBorder
          ]}>
            <View style={styles.dragIndicator} />
            
            <View style={styles.cardHeader}>
              <Image 
                source={{ uri: selectedProfile.photoUrl || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=100&w=200&auto=format&fit=crop' }} 
                style={styles.cardAvatar} 
              />
              <View style={styles.cardHeaderInfo}>
                <View style={styles.cardNameRow}>
                  <Text style={styles.cardNameText}>
                    {selectedProfile.name}
                    {selectedProfile.age ? `, ${selectedProfile.age}` : ''}
                  </Text>
                  {selectedProfile.is_identity_verified && (
                    <MaterialCommunityIcons name="check-decagram" size={16} color="#0A84FF" style={styles.verifiedIcon} />
                  )}
                  {selectedProfile.id === currentUser?.id && (
                    <Text style={styles.youTag}>({t('explore.you') || 'Tú'})</Text>
                  )}
                </View>
                
                <View style={styles.badgesRow}>
                  <View style={[
                    styles.roleBadge, 
                    { backgroundColor: selectedProfile.role === 'host' ? 'rgba(10, 132, 255, 0.15)' : 'rgba(52, 199, 89, 0.15)' }
                  ]}>
                    <MaterialCommunityIcons 
                      name={selectedProfile.role === 'host' ? 'home-account' : 'magnify'} 
                      size={12} 
                      color={selectedProfile.role === 'host' ? '#0A84FF' : '#34C759'} 
                    />
                    <Text style={[
                      styles.roleBadgeText, 
                      { color: selectedProfile.role === 'host' ? '#0A84FF' : '#34C759' }
                    ]}>
                      {selectedProfile.role === 'host' ? t('explore.role_host') : t('explore.role_seeker')}
                    </Text>
                  </View>

                  {isMatch(selectedProfile.id) && (
                    <View style={styles.matchBadge}>
                      <MaterialCommunityIcons name="heart" size={11} color="#FFCC00" />
                      <Text style={styles.matchBadgeText}>Match!</Text>
                    </View>
                  )}

                  {selectedProfile.trust_score !== null && selectedProfile.trust_score !== undefined && (
                    <View style={styles.trustBadge}>
                      <MaterialCommunityIcons name="shield-check" size={11} color="#FFCC00" />
                      <Text style={styles.trustBadgeText}>Score: {selectedProfile.trust_score}%</Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedProfile(null)}>
                <MaterialCommunityIcons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {selectedProfile.bio ? (
              <Text style={styles.cardBioText} numberOfLines={2}>
                {selectedProfile.bio}
              </Text>
            ) : (
              <Text style={[styles.cardBioText, { fontStyle: 'italic', color: '#8E8E93' }]}>
                Sin biografía disponible.
              </Text>
            )}

            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={styles.primaryActionButton}
                onPress={() => {
                  setSelectedProfile(null);
                  router.push(`/profile/${selectedProfile.id}`);
                }}
              >
                <Text style={styles.primaryActionButtonText}>
                  {t('explore.view_profile') || 'Ver Perfil'}
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 56,
  },
  markerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
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
    borderRadius: 7,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginTop: -2,
  },
  currentUserMarkerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: '#0A84FF',
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
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
    borderRadius: 7,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  cardContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    zIndex: 999,
  },
  detailCard: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  matchedCardBorder: {
    borderColor: '#FFCC00',
    borderWidth: 1.5,
  },
  currentUserCardBorder: {
    borderColor: '#0A84FF',
    borderWidth: 1.5,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: '#3A3A3C',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 4,
  },
  verifiedIcon: {
    marginLeft: 2,
  },
  youTag: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 204, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFCC00',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 204, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFCC00',
  },
  closeButton: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  cardBioText: {
    fontSize: 13,
    color: '#E5E5EA',
    lineHeight: 18,
    marginBottom: 16,
  },
  cardActions: {
    flexDirection: 'row',
    width: '100%',
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: '#49C788',
    height: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
