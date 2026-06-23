import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, Dimensions, Alert } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { getSimilarityScore, getDistanceFromLatLonInKm } from '@/utils/mathHelpers';
import MapComponent from '@/components/ui/MapComponent';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../context/LanguageContext';
import { useMyProfile, useUserProfile } from '@/hooks/useProfileQueries';

export default function ProfileDetailScreen() {
  const { t, locale, translateLanguage, translateHobbiesList, translateDealbreakersList, translatePreferencesList } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { data: targetData, isLoading: isTargetLoading } = useUserProfile(id as string);
  const { data: myProfileData, isLoading: isMyProfileLoading } = useMyProfile();

  const profile = targetData?.profile || null;
  const listing = targetData?.listing || null;
  const currentUser = myProfileData?.profile || null;

  const loading = (isTargetLoading && !profile) || (isMyProfileLoading && !currentUser);

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Fullscreen Lightbox states
  const [isLightboxVisible, setIsLightboxVisible] = useState(false);
  const [lightboxPhotoIdx, setLightboxPhotoIdx] = useState(0);

  const handleBlockUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    Alert.alert(
      locale === 'es' ? 'Bloquear Usuario' : 'Block User',
      locale === 'es' 
        ? `¿Estás seguro de que deseas bloquear a ${profile?.name || 'este usuario'}? Ya no aparecerá en tus recomendaciones y no podrán enviarse mensajes.`
        : `Are you sure you want to block ${profile?.name || 'this user'}? They will no longer appear in your feed and you won't be able to message each other.`,
      [
        { text: locale === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: locale === 'es' ? 'Bloquear' : 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_blocks')
                .insert({
                  blocker_id: session.user.id,
                  blocked_id: id
                });
              
              if (!error) {
                // Delete match record if any
                await supabase
                  .from('matches')
                  .delete()
                  .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
                  .or(`user1_id.eq.${id},user2_id.eq.${id}`);

                Alert.alert(
                  locale === 'es' ? 'Usuario Bloqueado' : 'User Blocked',
                  locale === 'es' ? 'El usuario ha sido bloqueado exitosamente.' : 'The user has been blocked.',
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              } else {
                Alert.alert('Error', error.message);
              }
            } catch (err) {
              console.log('Error blocking user:', err);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>{t('profile.not_found', 'Profile not found.')}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('general.back')}</Text>
        </Pressable>
      </View>
    );
  }

  // Calculate Match Percentage and Distance
  let matchPercentage = 0;
  let distanceText = t('explore.loc_unknown');

  if (currentUser) {
    const simLikes = getSimilarityScore(currentUser.likes, profile.likes);
    const simPrefs = getSimilarityScore(currentUser.preferences, profile.preferences);
    const simDeals = getSimilarityScore(currentUser.dealbreakers, profile.dealbreakers);
    
    // Simple mock logic: Assume 15 max possible keyword matches is 100%
    const totalScore = simLikes + simPrefs + simDeals;
    matchPercentage = Math.min(Math.round((totalScore / 10) * 100), 99);
    if (matchPercentage < 20) matchPercentage = 25; // Floor it for realism

    if (currentUser.latOffset != null && currentUser.lngOffset != null && profile.latOffset != null && profile.lngOffset != null) {
      const dist = getDistanceFromLatLonInKm(currentUser.latOffset, currentUser.lngOffset, profile.latOffset, profile.lngOffset);
      distanceText = `${dist.toFixed(1)} ${t('explore.away')}`;
    }
  }

  const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
    looking_urgent: { label: t('explore.looking_urgent'), color: '#34C759', icon: 'lightning-bolt' },
    exploring: { label: t('explore.exploring'), color: '#FFCC00', icon: 'compass' },
    have_room: { label: t('explore.role_host'), color: '#0A84FF', icon: 'home-account' }
  };
  const statusConfig = profile.availability_status ? STATUS_MAP[profile.availability_status] : null;

  const photosList = profile
    ? (Array.isArray(profile.photos) && profile.photos.length > 0
      ? profile.photos.filter(Boolean)
      : [profile.photoUrl].filter(Boolean))
    : [];

  const lifestyleObj = profile?.lifestyle 
    ? (typeof profile.lifestyle === 'string' ? JSON.parse(profile.lifestyle) : profile.lifestyle) 
    : {};
  const languagesArr = lifestyleObj?.languages || [];

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: photosList[activePhotoIdx] || profile.photoUrl }} style={styles.headerImage} contentFit="cover" transition={200} />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)']}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          
          {/* Instagram-style progress indicators */}
          {photosList.length > 1 && (
            <View style={styles.indicatorContainer}>
              {photosList.map((_: any, idx: number) => (
                <View
                  key={idx}
                  style={[
                    styles.indicatorBar,
                    {
                      backgroundColor: idx === activePhotoIdx ? '#49C788' : 'rgba(255, 255, 255, 0.4)',
                      width: `${100 / photosList.length - 2}%`,
                    }
                  ]}
                />
              ))}
            </View>
          )}

          {/* Left/Right press navigation overlays */}
          {photosList.length > 1 ? (
            <View style={styles.tapNavigationOverlay}>
              <Pressable
                style={styles.tapSide}
                onPress={() => setActivePhotoIdx((prev) => Math.max(0, prev - 1))}
              />
              <Pressable
                style={styles.tapMiddle}
                onPress={() => {
                  setLightboxPhotoIdx(activePhotoIdx);
                  setIsLightboxVisible(true);
                }}
              />
              <Pressable
                style={styles.tapSide}
                onPress={() => setActivePhotoIdx((prev) => Math.min(photosList.length - 1, prev + 1))}
              />
            </View>
          ) : (
            <Pressable
              style={styles.tapNavigationOverlay}
              onPress={() => {
                setLightboxPhotoIdx(activePhotoIdx);
                setIsLightboxVisible(true);
              }}
            />
          )}

          {/* Counter badge (bottom-right) */}
          {photosList.length > 1 && (
            <View style={styles.pageBadge}>
              <Text style={styles.pageBadgeText}>{activePhotoIdx + 1} / {photosList.length}</Text>
            </View>
          )}

          {/* Glassmorphic Expand button (bottom-left) */}
          <Pressable
            style={styles.expandBadge}
            onPress={() => {
              setLightboxPhotoIdx(activePhotoIdx);
              setIsLightboxVisible(true);
            }}
          >
            <MaterialCommunityIcons name="arrow-expand" size={14} color="#fff" />
            <Text style={styles.expandBadgeText}>{t('profile.expand', 'Expand')}</Text>
          </Pressable>
          
          {/* Close button overlay */}
          <Pressable onPress={() => router.back()} style={styles.closeIcon}>
            <IconSymbol name="chevron.down.circle.fill" size={32} color="#fff" />
          </Pressable>
        </View>
 
        {/* Info Box */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.name}>{profile.name}{profile.age ? `, ${profile.age}` : ''}</Text>
              <Text style={styles.distanceBadge}>{distanceText}</Text>
              {statusConfig && (
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '22', borderColor: statusConfig.color }]}>
                  <MaterialCommunityIcons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                </View>
              )}
            </View>
 
            {/* Match Circle */}
            <View style={styles.matchCircle}>
              <Text style={styles.matchPercent}>{matchPercentage}%</Text>
              <Text style={styles.matchLabel}>Match</Text>
            </View>
          </View>
 
          <View style={styles.divider} />
 
          <Text style={styles.sectionTitle}>{t('myprofile.about_me')}</Text>
          <Text style={styles.bioText}>{profile.bio || t('profile.empty_bio', 'This user has not written a bio yet.')}</Text>
 
          <View style={styles.divider} />
 
          <Text style={styles.sectionTitle}>{t('myprofile.interests')}</Text>
          <Text style={styles.tagsText}>{translateHobbiesList(profile.likes) || t('explore.no_pref')}</Text>
 
          <Text style={styles.sectionTitle}>{t('myprofile.lifestyle')}</Text>
          <Text style={styles.tagsText}>{translatePreferencesList(profile.preferences) || t('explore.no_pref')}</Text>
 
          {languagesArr.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t('myprofile.languages')}</Text>
              <Text style={styles.tagsText}>
                {languagesArr.map((lang: string) => translateLanguage(lang)).join(', ')}
              </Text>
            </>
          )}

          <Text style={styles.sectionTitle}>{t('myprofile.dealbreakers')}</Text>
          <Text style={[styles.tagsText, { color: '#FF4B4B' }]}>{translateDealbreakersList(profile.dealbreakers) || t('explore.no_pref')}</Text>
          
          {profile.latOffset && profile.lngOffset && (
            <>
              <Text style={styles.sectionTitle}>{t('profile.approx_loc', 'Approximate Location')}</Text>
              <MapComponent lat={profile.latOffset} lng={profile.lngOffset} />
            </>
          )}
 
          {listing && (
            <View style={styles.apartmentSection}>
              <Text style={styles.sectionTitle}>{t('profile.room_available', 'Room / Apartment Available')}</Text>
              <View style={styles.listingCard}>
                {listing.images && listing.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageCarousel}>
                    {listing.images.map((url: string, idx: number) => (
                      <Image key={idx} source={{ uri: url }} style={styles.carouselImage} contentFit="cover" transition={200} />
                    ))}
                  </ScrollView>
                )}
                <View style={styles.listingDetails}>
                  <Text style={styles.listingTitle}>{listing.title || t('myprofile.untitled_room')}</Text>
                  <Text style={styles.listingPrice}>${listing.price}/{t('myprofile.month')} {listing.utilities_included && t('profile.utilities_included', '(Utilities Included)')}</Text>
                  {listing.description && <Text style={styles.listingDesc}>{listing.description}</Text>}
                  {listing.address && <Text style={styles.listingAddress}>📍 {listing.address}</Text>}
                </View>
              </View>
            </View>
          )}
 
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
 
      {/* Floating Action Button for Chat & Block */}
      <View style={styles.bottomBar}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable style={[styles.primaryButton, { flex: 1 }]} onPress={() => router.push(`/chat/${profile.id}`)}>
            <IconSymbol name="paperplane.fill" size={20} color="#000" style={{ marginRight: 8 } as any} />
            <Text style={styles.primaryButtonText}>{t('profile.message_user', 'Message') + ' ' + (profile.name || '')}</Text>
          </Pressable>
          <Pressable style={styles.blockButton} onPress={handleBlockUser}>
            <MaterialCommunityIcons name="account-cancel" size={24} color="#FF453A" />
          </Pressable>
        </View>
      </View>

      {/* Fullscreen Lightbox Modal */}
      <Modal
        visible={isLightboxVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => {
          setActivePhotoIdx(lightboxPhotoIdx);
          setIsLightboxVisible(false);
        }}
      >
        <View style={styles.lightboxContainer}>
          {/* Top Story indicators */}
          {photosList.length > 1 && (
            <View style={styles.lightboxIndicatorContainer}>
              {photosList.map((_: any, idx: number) => (
                <View
                  key={idx}
                  style={[
                    styles.lightboxIndicatorBar,
                    {
                      backgroundColor: idx === lightboxPhotoIdx ? '#49C788' : 'rgba(255, 255, 255, 0.3)',
                      width: `${100 / photosList.length - 2}%`,
                    }
                  ]}
                />
              ))}
            </View>
          )}

          {/* Close button (top right) */}
          <Pressable
            style={styles.lightboxCloseBtn}
            onPress={() => {
              setActivePhotoIdx(lightboxPhotoIdx);
              setIsLightboxVisible(false);
            }}
          >
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </Pressable>

          {/* Zoomable Image Container */}
          <ScrollView
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.lightboxImageWrapper}
          >
            <Image
              source={{ uri: photosList[lightboxPhotoIdx] }}
              style={styles.lightboxImage}
              contentFit="contain"
              transition={200}
            />
          </ScrollView>

          {/* Left/Right press navigation overlays inside lightbox */}
          {photosList.length > 1 && (
            <View style={styles.lightboxTapOverlay}>
              <Pressable
                style={styles.lightboxTapSide}
                onPress={() => setLightboxPhotoIdx((prev) => Math.max(0, prev - 1))}
              />
              <View style={{ flex: 1 }} pointerEvents="none" />
              <Pressable
                style={styles.lightboxTapSide}
                onPress={() => setLightboxPhotoIdx((prev) => Math.min(photosList.length - 1, prev + 1))}
              />
            </View>
          )}

          {/* Bottom Counter badge */}
          <View style={styles.lightboxPageBadge}>
            <Text style={styles.lightboxPageBadgeText}>
              {lightboxPhotoIdx + 1} / {photosList.length}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
  },
  backBtn: {
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  imageContainer: {
    width: '100%',
    height: 450,
    backgroundColor: '#111',
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  indicatorBar: {
    height: 3,
    borderRadius: 1.5,
  },
  tapNavigationOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 5,
  },
  tapSide: {
    width: '30%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0)',
  },
  tapMiddle: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0)',
  },
  pageBadge: {
    position: 'absolute',
    top: 70,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 10,
  },
  pageBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  closeIcon: {
    position: 'absolute',
    top: 70,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    zIndex: 15,
  },
  content: {
    padding: 24,
    backgroundColor: '#000',
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
  },
  distanceBadge: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  matchCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#49C788',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a3a28',
  },
  matchPercent: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  matchLabel: {
    color: '#49C788',
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    marginTop: 10,
  },
  bioText: {
    fontSize: 16,
    color: '#ddd',
    lineHeight: 24,
  },
  tagsText: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  primaryButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  blockButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  apartmentSection: {
    marginTop: 20,
  },
  listingCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
    marginTop: 8,
  },
  imageCarousel: {
    flexDirection: 'row',
  },
  carouselImage: {
    width: 250,
    height: 180,
    marginRight: 2,
  },
  listingDetails: {
    padding: 16,
  },
  listingTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listingPrice: {
    color: '#49C788',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  listingDesc: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  listingAddress: {
    color: '#888',
    fontSize: 14,
  },
  expandBadge: {
    position: 'absolute',
    bottom: 45,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  expandBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lightboxIndicatorContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  lightboxIndicatorBar: {
    height: 3,
    borderRadius: 1.5,
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 65,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  lightboxImageWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  lightboxTapOverlay: {
    position: 'absolute',
    top: 120,
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 5,
  },
  lightboxTapSide: {
    width: '40%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0)',
  },
  lightboxPageBadge: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
  },
  lightboxPageBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
