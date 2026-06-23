import { supabase } from '@/lib/supabase';
import { useState, useRef, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity, Alert, Platform, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ExploreIcon } from '@/components/ui/ExploreIcon';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Swiper from 'react-native-deck-swiper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from '@/components/MapViewWrapper';
import { calculateCompatibility } from '@/utils/compatibility';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { useMatches } from '@/hooks/useMatches';
import { getActiveFilters } from '@/app/explore/filters';
import { LinearGradient } from 'expo-linear-gradient';
import { notifyNewMatch } from '@/lib/notifications';
import { useTranslation } from '../../context/LanguageContext';



type Profile = {
  id: string;
  likes: string;
  preferences: string;
  dealbreakers: string;
  photoUrl?: string;
  photos?: string[];
  name?: string;
  age?: number;
  lifestyle?: any;
  role?: 'landlord' | 'host' | 'seeker';
  latitude?: number;
  longitude?: number;
  latOffset?: number;
  lngOffset?: number;
  availability_status?: string;
};

const QUOTA_KEY = '@roommatefinder:swipe_quotas';
const LIMITS = { like: 30, reject: 30, skip: 5 };

export default function ExploreScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const btnBigSize = Math.min(Math.max(screenWidth * 0.15, 55), 65);
  const btnSmallSize = Math.min(Math.max(screenWidth * 0.12, 45), 52);

  const { t, translateHobbiesList, translatePreferencesList, translateDealbreakersList } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [allSwiped, setAllSwiped] = useState(false);

  const [cardPhotoIndices, setCardPhotoIndices] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'swipe' | 'map'>('swipe');
  const [matchedProfiles, setMatchedProfiles] = useState<Profile[]>([]);
  const { fetchMatches } = useMatches();
  const { requestLocation } = useDeviceLocation();
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const swiperRef = useRef<Swiper<Profile>>(null);
  const router = useRouter();

  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', session.user.id)
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    } catch (e) {
      console.log('Error fetching unread count:', e);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    let unreadChannel: any = null;

    const setupUnreadSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      unreadChannel = supabase
        .channel('public:unread_messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
          fetchUnreadCount();
        })
        .subscribe();
    };

    setupUnreadSubscription();

    return () => {
      if (unreadChannel) {
        supabase.removeChannel(unreadChannel);
      }
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Prevent browser native gestures (pull-to-refresh, back navigation) from cancelling swipes
      document.body.style.overscrollBehavior = 'none';
      document.body.style.touchAction = 'none';
    }
    return () => {
      if (Platform.OS === 'web') {
        document.body.style.overscrollBehavior = 'auto';
        document.body.style.touchAction = 'auto';
      }
    };
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    setAllSwiped(false);


    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: currentUserData } = await supabase
        .from('profiles')
        .select('id, latOffset, lngOffset, likes, preferences, dealbreakers')
        .eq('id', session.user.id)
        .single();
      if (currentUserData) {
        setCurrentUser(currentUserData);
      }

      // Fetch user's swipes to exclude them from the feed
      const { data: userSwipes } = await supabase
        .from('swipes')
        .select('swiped')
        .eq('swiper', session.user.id);
      
      const swipedUserIds = userSwipes?.map(s => s.swiped) || [];

      const filters = getActiveFilters();
      let query = supabase
        .from('profiles')
        .select('id, name, age, photoUrl, role, latOffset, lngOffset, likes, preferences, dealbreakers, is_identity_verified, latitude, longitude')
        .neq('id', session.user.id)
        .neq('role', 'landlord');

      if (filters.role !== 'all') query = query.eq('role', filters.role);
      if (filters.onlyVerified) query = query.eq('is_identity_verified', true);
      
      // Exclude profiles that the user has already swiped on!
      if (swipedUserIds.length > 0) {
        query = query.not('id', 'in', `(${swipedUserIds.join(',')})`);
      }

      // Limit to 50 profiles
      query = query.limit(50);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching profiles:', error);
      }
        
      if (data) {
        // Shuffle or sort the profiles to make the explore feed dynamic
        const shuffledProfiles = data.sort(() => 0.5 - Math.random());
        // Prefetch images for faster loading
        const urlsToPrefetch = shuffledProfiles
          .map(p => p.photoUrl)
          .filter(Boolean) as string[];
        if (urlsToPrefetch.length > 0) {
          Image.prefetch(urlsToPrefetch);
        }
        
        // Base coordinates: Try saved manual location first, then GPS, then fallback to CDMX
        const baseLat = currentUserData?.latOffset || userLocation?.latitude || 19.4326;
        const baseLng = currentUserData?.lngOffset || userLocation?.longitude || -99.1332;

        const mapReadyProfiles = shuffledProfiles.map((p) => {
          // If profile has exact manually set coordinates, use them!
          if (p.latOffset && p.lngOffset) {
            return { ...p, latitude: p.latOffset, longitude: p.lngOffset };
          }
          // Otherwise fall back to a random scatter around the base location
          if (!p.latitude || !p.longitude) {
            const latOffset = (Math.random() - 0.5) * 0.1;
            const lngOffset = (Math.random() - 0.5) * 0.1;
            return { ...p, latitude: baseLat + latOffset, longitude: baseLng + lngOffset };
          }
          return p;
        });

        setProfiles(mapReadyProfiles);
      }
    } catch (e) {
      console.error('Error in fetchProfiles:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchedProfiles = async () => {
    try {
      const loadedProfiles = await fetchMatches();

      if (loadedProfiles && loadedProfiles.length > 0) {
        // Base coordinates: Try saved manual location first, then GPS, then fallback to CDMX
        const baseLat = currentUser?.latOffset || userLocation?.latitude || 19.4326;
        const baseLng = currentUser?.lngOffset || userLocation?.longitude || -99.1332;
        
        const mapReadyProfiles = loadedProfiles.map((p) => {
          // If profile has exact manually set coordinates, use them!
          if (p.latOffset && p.lngOffset) {
            return { ...p, latitude: p.latOffset, longitude: p.lngOffset };
          }
          // Otherwise fall back
          if (!p.latitude || !p.longitude) {
            const latOffset = (Math.random() - 0.5) * 0.1;
            const lngOffset = (Math.random() - 0.5) * 0.1;
            return { ...p, latitude: baseLat + latOffset, longitude: baseLng + lngOffset };
          }
          return p;
        });

        setMatchedProfiles(mapReadyProfiles);
      } else {
        setMatchedProfiles([]);
      }
    } catch (e) {
      console.error('Error fetching matched profiles:', e);
    }
  };


  useEffect(() => {
    fetchProfiles();
    fetchMatchedProfiles();

    // Fetch device location in the background without blocking the profiles load
    const fetchLocation = async () => {
      const loc = await requestLocation();
      if (loc) {
        setUserLocation(loc);

        // Update any profiles that don't have static coordinates to center around the new userLocation
        setProfiles(prevProfiles => 
          prevProfiles.map(p => {
            if (!p.latitude || !p.longitude) {
              const latOffset = (Math.random() - 0.5) * 0.1;
              const lngOffset = (Math.random() - 0.5) * 0.1;
              return { ...p, latitude: loc.latitude + latOffset, longitude: loc.longitude + lngOffset };
            }
            return p;
          })
        );
      }
    };
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSwiped = () => {

  };

  const checkQuota = async (type: 'like' | 'reject' | 'skip') => {
    try {
      const raw = await AsyncStorage.getItem(QUOTA_KEY);
      let quotas = raw ? JSON.parse(raw) : null;
      const now = Date.now();
      
      if (!quotas || now - quotas.timestamp > 3600000) {
        quotas = { timestamp: now, like: 0, reject: 0, skip: 0 };
      }
      
      if (quotas[type] >= LIMITS[type]) {
        Alert.alert('Limit Reached', `You have reached your limit of ${LIMITS[type]} ${type}s per hour. Check back later!`);
        swiperRef.current?.swipeBack();
        return false;
      }
      
      quotas[type] += 1;
      await AsyncStorage.setItem(QUOTA_KEY, JSON.stringify(quotas));
      return true;
    } catch {
      return true; // Fail gracefully
    }
  };

  const recordSwipe = async (targetId: string, liked: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const myId = session.user.id;

      await supabase.from('swipes').insert({
        swiper: myId,
        swiped: targetId,
        liked: liked,
      });
    } catch (err) {
      console.error('Error in recordSwipe:', err);
    }
  };

  const onSwipedLeft = async (index: number) => {
    const allowed = await checkQuota('reject');
    if (allowed) {
      const targetProfile = profiles[index];
      await recordSwipe(targetProfile.id, false);
      console.log('Passed on', targetProfile.id);
    }
  };

  const onSwipedRight = async (index: number) => {
    const allowed = await checkQuota('like');
    if (allowed) {
      const likedProfile = profiles[index];
      console.log('Liked', likedProfile.id);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'No authenticated session found. Please log in again.');
        return;
      }
      
      const myId = session.user.id;
      
      // 1. Record the swipe as liked: true
      await recordSwipe(likedProfile.id, true);

      // 2. Check if the other user has already liked us!
      const { data: matchingSwipe, error: swipeError } = await supabase
        .from('swipes')
        .select('*')
        .eq('swiper', likedProfile.id)
        .eq('swiped', myId)
        .eq('liked', true)
        .maybeSingle();

      if (swipeError) {
        console.error('Error checking matching swipe:', swipeError);
      }

      // 3. If there is a matching swipe, create the mutual match!
      if (matchingSwipe) {
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .insert({
            user1: myId,
            user2: likedProfile.id,
            status: 'active',
          })
          .select()
          .single();

        if (matchError) {
          console.error('Match insert error:', matchError.code, matchError.message);
          Alert.alert('Match Error', `${matchError.message}\n\nCode: ${matchError.code}`);
        } else {
          console.log('Mutual Match created!', matchData);
          Alert.alert("It's a Match! 🎉", `You and ${likedProfile.name || 'someone'} liked each other! You can now start chatting.`);
          
          try {
            await notifyNewMatch(likedProfile.name || 'Roommate', likedProfile.id);
          } catch (notifErr) {
            console.error('Notification error', notifErr);
          }
        }
      } else {
        console.log('Like registered. Waiting for mutual like.');
      }
    }
  };

  const onSwipedBottom = async (index: number) => {
    const allowed = await checkQuota('skip');
    if (allowed) console.log('Skipped', profiles[index].id);
  };

  const onSwipedTop = (index: number) => {
    if (index < profiles.length) {
      router.push(`/chat/${profiles[index].id}`);
    }
  };

  const onSwipedAll = () => {
    setAllSwiped(true);
  };

  const renderCard = (card: Profile | null) => {
    if (!card) return null;
    
    const photosList = Array.isArray(card.photos) && card.photos.length > 0
      ? card.photos.filter(Boolean)
      : [card.photoUrl].filter(Boolean);

    const activePhotoIdx = cardPhotoIndices[card.id] || 0;
    const imageSource = photosList[activePhotoIdx]
      ? { uri: photosList[activePhotoIdx] }
      : { uri: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=100&w=1200&auto=format&fit=crop' };

    const compatibility = calculateCompatibility(currentUser, card);
    const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
      looking_urgent: { label: t('explore.looking_urgent'), color: '#34C759', icon: 'lightning-bolt' },
      exploring: { label: t('explore.exploring'), color: '#FFCC00', icon: 'compass' },
      have_room: { label: t('explore.role_host'), color: '#0A84FF', icon: 'home-account' }
    };
    const statusConfig = card.availability_status ? STATUS_MAP[card.availability_status] : null;

    return (
      <View style={styles.cardContainer}>
        <Image 
          source={imageSource} 
          style={[StyleSheet.absoluteFill, styles.cardImageRounded, { userSelect: 'none', WebkitUserDrag: 'none' } as any]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          priority="high"
          //@ts-ignore
          draggable={false}
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

        {/* Tap navigation overlays */}
        {photosList.length > 1 ? (
          <View style={styles.tapNavigationOverlay}>
            <Pressable
              style={styles.tapSide}
              onPress={() => {
                setCardPhotoIndices(prev => ({
                  ...prev,
                  [card.id]: Math.max(0, activePhotoIdx - 1)
                }));
              }}
            />
            <Pressable
              style={styles.tapMiddle}
              onPress={() => {
                router.push(`/profile/${card.id}`);
              }}
            />
            <Pressable
              style={styles.tapSide}
              onPress={() => {
                setCardPhotoIndices(prev => ({
                  ...prev,
                  [card.id]: Math.min(photosList.length - 1, activePhotoIdx + 1)
                }));
              }}
            />
          </View>
        ) : (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              router.push(`/profile/${card.id}`);
            }}
          />
        )}

        {/* Counter badge */}
        {photosList.length > 1 && (
          <View style={styles.pageBadge}>
            <Text style={styles.pageBadgeText}>{activePhotoIdx + 1} / {photosList.length}</Text>
          </View>
        )}

        <View style={[styles.cardContentWrapper, { userSelect: 'none' } as any]} pointerEvents="box-none">
          <Pressable 
            style={styles.textOverlay}
            onPress={() => {
              router.push(`/profile/${card.id}`);
            }}
          >
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {compatibility !== null && (
                <View style={styles.compatibilityBadge}>
                  <MaterialCommunityIcons name="star-four-points" size={14} color="#000" />
                  <Text style={styles.compatibilityText}>{compatibility}% compatible</Text>
                </View>
              )}
              {statusConfig && (
                <View style={[styles.compatibilityBadge, { backgroundColor: statusConfig.color, marginBottom: 0 }]}>
                  <MaterialCommunityIcons name={statusConfig.icon as any} size={14} color="#000" />
                  <Text style={styles.compatibilityText}>{statusConfig.label}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardTitle}>
              {card.name || 'Roommate'} {card.age ? `, ${card.age}` : ''}
            </Text>
            
            <View style={styles.rowContainer}>
              <View style={[styles.infoSection, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.subtitle}>{t('explore.likes_hobbies')}</Text>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="thumb-up-outline" size={16} color="#ccc" />
                  <Text style={styles.infoText} numberOfLines={2}>{translateHobbiesList(card.likes) || t('explore.open_anything', 'Open to anything')}</Text>
                </View>
              </View>

              <View style={[styles.infoSection, { flex: 1 }]}>
                <Text style={styles.subtitle}>{t('explore.preferences')}</Text>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="home-search-outline" size={16} color="#ccc" />
                  <Text style={styles.infoText} numberOfLines={2}>{translatePreferencesList(card.preferences) || t('explore.flexible', 'Flexible')}</Text>
                </View>
              </View>
            </View>

            {card.dealbreakers ? (
              <View style={styles.infoSection}>
                <Text style={styles.subtitleDealbreaker}>{t('myprofile.dealbreakers')}</Text>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#FF4B4B" />
                  <Text style={styles.dealbreakerText} numberOfLines={2}>{translateDealbreakersList(card.dealbreakers)}</Text>
                </View>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0)']}
        locations={[0, 0.5, 1]}
        style={styles.headerContainer}
      >
        <SafeAreaView edges={['top']} pointerEvents="box-none">
          <View style={styles.header} pointerEvents="box-none">
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.mainTitle}>{t('tabs.explore')}</Text>
              <Text style={styles.subTitle} numberOfLines={1}>{t('explore.subtitle')}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {/* WhatsApp-Style Chat Shortcut Button in Explore Header */}
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: '#333', borderRadius: 20, padding: 8, position: 'relative' }]}
                onPress={() => router.push('/inbox')}
              >
                <ExploreIcon name="message-text" size={20} color="#49C788" />
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: '#333', borderRadius: 20, padding: 8 }]}
                onPress={() => router.push('/explore/filters')}
              >
                <ExploreIcon name="filter-variant" size={20} color="#49C788" />
              </TouchableOpacity>
              
              <View style={styles.toggleContainer}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, viewMode === 'swipe' && styles.toggleBtnActive]}
                  onPress={() => setViewMode('swipe')}
                >
                  <ExploreIcon name="cards-outline" size={20} color={viewMode === 'swipe' ? '#fff' : '#888'} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
                  onPress={() => setViewMode('map')}
                >
                  <ExploreIcon name="map-outline" size={20} color={viewMode === 'map' ? '#fff' : '#888'} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.swiperContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#49C788" size="large" />
            <Text style={styles.loadingText}>{t('explore.finding_people')}</Text>
          </View>
        ) : viewMode === 'map' ? (
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: currentUser?.latOffset || userLocation?.latitude || 19.4326,
              longitude: currentUser?.lngOffset || userLocation?.longitude || -99.1332,
              latitudeDelta: 0.1, // Zoom in closer, dynamically centered on User
              longitudeDelta: 0.1,
            }}
            showsUserLocation={true}
            userInterfaceStyle="dark"
          >
            {matchedProfiles.map(profile => {
              if (!profile.latitude || !profile.longitude) return null;
              return (
                <Marker
                  key={profile.id}
                  coordinate={{ latitude: profile.latitude, longitude: profile.longitude }}
                >
                  <View style={styles.markerContainer}>
                    <Image 
                      source={{ uri: profile.photoUrl || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=100&w=200&auto=format&fit=crop' }} 
                      style={styles.markerImage} 
                    />
                    <View style={styles.markerBadge}>
                      <MaterialCommunityIcons name="home-search" size={10} color="#000" />
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
          </MapView>
        ) : allSwiped || profiles.length === 0 ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="account-search-outline" size={60} color="#555" />
            <Text style={styles.emptyText}>{t('explore.no_more')}</Text>
            <TouchableOpacity style={styles.reloadButton} onPress={fetchProfiles}>
              <Text style={styles.reloadButtonText}>{t('explore.reload')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Swiper
              ref={swiperRef}
              cards={profiles}
              renderCard={renderCard}
              onSwiped={onSwiped}
              onSwipedLeft={onSwipedLeft}
              onSwipedRight={onSwipedRight}
              onSwipedTop={onSwipedTop}
              onSwipedBottom={onSwipedBottom}
              onSwipedAll={onSwipedAll}
              onTapCard={(cardIndex) => router.push(`/profile/${profiles[cardIndex].id}`)}
              cardIndex={0}
              backgroundColor="transparent"
              stackSize={3}
              stackSeparation={15}
              swipeBackCard
              useViewOverflow={false}
              animateOverlayLabelsOpacity
              overlayOpacityHorizontalThreshold={10}
              overlayOpacityVerticalThreshold={10}
              inputOverlayLabelsOpacityRangeX={[-150, -75, 0, 75, 150]}
              outputOverlayLabelsOpacityRangeX={[1, 0.5, 0, 0.5, 1]}
              inputOverlayLabelsOpacityRangeY={[-150, -75, 0, 75, 150]}
              outputOverlayLabelsOpacityRangeY={[1, 0.5, 0, 0.5, 1]}
              containerStyle={[styles.swiper, { touchAction: 'none' } as any]}
              cardStyle={styles.cardStyle}
              overlayLabels={{
                left: {
                  title: 'NOPE',
                  style: {
                    label: {
                      backgroundColor: 'transparent',
                      borderColor: '#FF4B4B',
                      color: '#FF4B4B',
                      borderWidth: 4,
                      fontSize: 32,
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      justifyContent: 'flex-start',
                      paddingTop: 40,
                      paddingRight: 40,
                      backgroundColor: 'rgba(255, 75, 75, 0.85)',
                      width: '100%',
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      borderRadius: 20,
                      zIndex: 100,
                    }
                  }
                },
                right: {
                  title: 'LIKE',
                  style: {
                    label: {
                      backgroundColor: 'transparent',
                      borderColor: '#4caf50',
                      color: '#4caf50',
                      borderWidth: 4,
                      fontSize: 32,
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                      paddingTop: 40,
                      paddingLeft: 40,
                      backgroundColor: 'rgba(76, 175, 80, 0.85)',
                      width: '100%',
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      borderRadius: 20,
                      zIndex: 100,
                    }
                  }
                },
                top: {
                  title: 'MESSAGE',
                  style: {
                    label: {
                      backgroundColor: 'transparent',
                      borderColor: '#2196f3',
                      color: '#2196f3',
                      borderWidth: 4,
                      fontSize: 32,
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingBottom: 60,
                      backgroundColor: 'rgba(33, 150, 243, 0.85)',
                      width: '100%',
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      borderRadius: 20,
                      zIndex: 100,
                    }
                  }
                },
                bottom: {
                  title: 'SKIP',
                  style: {
                    label: {
                      backgroundColor: 'transparent',
                      borderColor: '#ff9800',
                      color: '#ff9800',
                      borderWidth: 4,
                      fontSize: 32,
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      paddingTop: 60,
                      backgroundColor: 'rgba(255, 152, 0, 0.85)',
                      width: '100%',
                      height: '100%',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      borderRadius: 20,
                      zIndex: 100,
                    }
                  }
                }
              }}
            />
            
            <View style={styles.floatingActionButtons} pointerEvents="box-none">
              <Pressable 
                style={({ pressed }) => [
                  styles.actionButton, 
                  styles.buttonSkip,
                  { width: btnSmallSize, height: btnSmallSize, borderRadius: btnSmallSize / 2 },
                  { transform: [{ scale: pressed ? 0.92 : 1 }] }
                ]} 
                onPress={() => swiperRef.current?.swipeBottom()}
              >
                <MaterialCommunityIcons name="arrow-down-thick" size={btnSmallSize * 0.55} color="#ff9800" />
              </Pressable>

              <Pressable 
                style={({ pressed }) => [
                  styles.actionButton, 
                  styles.buttonNope,
                  { width: btnBigSize, height: btnBigSize, borderRadius: btnBigSize / 2 },
                  { transform: [{ scale: pressed ? 0.92 : 1 }] }
                ]} 
                onPress={() => swiperRef.current?.swipeLeft()}
              >
                <MaterialCommunityIcons name="close" size={btnBigSize * 0.65} color="#FF4B4B" />
              </Pressable>

              <Pressable 
                style={({ pressed }) => [
                  styles.actionButton, 
                  styles.buttonLike,
                  { width: btnBigSize, height: btnBigSize, borderRadius: btnBigSize / 2 },
                  { transform: [{ scale: pressed ? 0.92 : 1 }] }
                ]} 
                onPress={() => swiperRef.current?.swipeRight()}
              >
                <MaterialCommunityIcons name="heart" size={btnBigSize * 0.55} color="#4caf50" />
              </Pressable>

              <Pressable 
                style={({ pressed }) => [
                  styles.actionButton, 
                  styles.buttonMessage,
                  { width: btnSmallSize, height: btnSmallSize, borderRadius: btnSmallSize / 2 },
                  { transform: [{ scale: pressed ? 0.92 : 1 }] }
                ]} 
                onPress={() => swiperRef.current?.swipeTop()}
              >
                <IconSymbol name="bubble.left.and.bubble.right.fill" size={btnSmallSize * 0.55} color="#49C788" />
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    // @ts-ignore - Required for web dragging PanResponder
    touchAction: 'none',
    userSelect: 'none',
    // @ts-ignore
    WebkitUserSelect: 'none',
  },
  indicatorContainer: {
    position: 'absolute',
    top: 12,
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
    width: '35%',
    height: '100%',
  },
  tapMiddle: {
    width: '30%',
    height: '100%',
  },
  pageBadge: {
    position: 'absolute',
    top: 24,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  pageBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  headerContainer: {
    zIndex: 10,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: '#333'
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  toggleBtnActive: {
    backgroundColor: '#49C788',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#49C788',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
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
    backgroundColor: '#49C788',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000'
  },
  calloutContainer: {
    width: 140,
    padding: 8,
    alignItems: 'center',
  },
  calloutName: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2
  },
  calloutRole: {
    color: '#666',
    fontSize: 12,
    marginBottom: 6
  },
  calloutAction: {
    color: '#0A84FF',
    fontWeight: '700',
    fontSize: 12
  },
  swiperContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  swiper: {
    backgroundColor: 'transparent',
  },
  cardStyle: {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    height: '100%',
    width: '100%',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#888',
    marginTop: 10,
    fontSize: 16,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-medium',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subTitle: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 2,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'sans-serif',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardContainer: {
    flex: 1,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    backgroundColor: '#1a1a1a', 
    // @ts-ignore
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  cardContentWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    borderRadius: 20,
  },
  cardImageRounded: {
    borderRadius: 20,
  },
  textOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)', 
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 12, 
    paddingBottom: 110, 
  },
  compatibilityBadge: {
    backgroundColor: '#49C788',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  compatibilityText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoSection: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitleDealbreaker: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ff8a8a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 13,
    color: '#eee',
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
  dealbreakerText: {
    fontSize: 13,
    color: '#ff8a8a',
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
    lineHeight: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    marginTop: 15,
    textAlign: 'center',
  },
  reloadButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#49C788',
    borderRadius: 25,
  },
  reloadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  floatingActionButtons: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    zIndex: 100,
    paddingHorizontal: 10,
  },

  actionButton: {
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1.5,
  },
  actionButtonBig: {
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    borderWidth: 2,
  },
  buttonNope: {
    borderColor: '#FF4B4B',
    shadowColor: '#FF4B4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  buttonMessage: {
    borderColor: '#49C788',
    shadowColor: '#49C788',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  buttonSkip: {
    borderColor: '#ff9800',
    shadowColor: '#ff9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  buttonLike: {
    borderColor: '#4caf50',
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#25D366', // WhatsApp bright green
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
});


