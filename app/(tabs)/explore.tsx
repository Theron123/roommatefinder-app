import { supabase } from '@/lib/supabase';
import { useCallback, useState, useRef, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Swiper from 'react-native-deck-swiper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from '@/components/MapViewWrapper';
import * as Location from 'expo-location';
import { getActiveFilters } from '@/app/explore/filters';

const { height, width } = Dimensions.get('window');

type Profile = {
  id: string;
  likes: string;
  preferences: string;
  dealbreakers: string;
  photoUrl?: string;
  name?: string;
  age?: number;
  lifestyle?: any;
  role?: 'landlord' | 'host' | 'seeker';
  latitude?: number;
  longitude?: number;
  availability_status?: string;
};

const QUOTA_KEY = '@roommatefinder:swipe_quotas';
const LIMITS = { like: 30, reject: 30, skip: 5 };

export default function ExploreScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [allSwiped, setAllSwiped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'swipe' | 'map'>('swipe');
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const swiperRef = useRef<Swiper<Profile>>(null);
  const router = useRouter();

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
    setCurrentIndex(0);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    const { data: currentUserData } = await supabase.from('profiles').select('id, latOffset, lngOffset, likes, preferences, dealbreakers').eq('id', session.user.id).single();
    if (currentUserData) {
      setCurrentUser(currentUserData);
    }

    const filters = getActiveFilters();
    let query = supabase
      .from('profiles')
      .select('id, name, age, photoUrl, role, latOffset, lngOffset, likes, preferences, dealbreakers, is_identity_verified, latitude, longitude')
      .neq('id', session.user.id)
      .neq('role', 'landlord')
      .limit(50);

    if (filters.role !== 'all') query = query.eq('role', filters.role);
    if (filters.onlyVerified) query = query.eq('is_identity_verified', true);

    const { data, error } = await query;
      
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
      
      // Request location to center map and generate mock coordinates if null
      let loc = { latitude: 19.4326, longitude: -99.1332 }; // Default to Mexico City
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          loc = { latitude: location.coords.latitude, longitude: location.coords.longitude };
          setUserLocation(loc);
        }
      } catch (e) {
        console.log('Location error', e);
      }
      
      const mapReadyProfiles = shuffledProfiles.map((p, index) => {
        // If they don't have lat/lon, randomly scatter them within ~10km of user
        if (!p.latitude || !p.longitude) {
          const latOffset = (Math.random() - 0.5) * 0.1;
          const lngOffset = (Math.random() - 0.5) * 0.1;
          return { ...p, latitude: loc.latitude + latOffset, longitude: loc.longitude + lngOffset };
        }
        return p;
      });

      setProfiles(mapReadyProfiles);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const onSwiped = () => {
    setCurrentIndex(prev => prev + 1);
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
    } catch (error) {
      return true; // Fail gracefully
    }
  };

  const onSwipedLeft = async (index: number) => {
    const allowed = await checkQuota('reject');
    if (allowed) console.log('Passed on', profiles[index].id);
  };

  const onSwipedRight = async (index: number) => {
    const allowed = await checkQuota('like');
    if (allowed) {
      const likedProfile = profiles[index];
      console.log('Liked', likedProfile.id);
      
      // Get authenticated user session directly
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'No authenticated session found. Please log in again.');
        return;
      }
      
      const myId = session.user.id;
      console.log('My auth ID:', myId, 'Liked user:', likedProfile.id);
      
      // FOR TESTING: Instantly create a match when swiping right
      const { data, error } = await supabase.from('matches').insert({
        user1: myId,
        user2: likedProfile.id,
      }).select();
      
      if (error) {
        console.error('Match insert error:', error.code, error.message);
        Alert.alert('Match Error', `${error.message}\n\nCode: ${error.code}\nUser1: ${myId}\nUser2: ${likedProfile.id}`);
      } else {
        console.log('Match created!', data);
        Alert.alert('Match!', `You matched with ${likedProfile.name || 'someone'}! 🎉`);
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

  const calculateCompatibility = (user1: any, user2: any) => {
    if (!user1?.lifestyle || !user2?.lifestyle) return null;
    
    const l1 = typeof user1.lifestyle === 'string' ? JSON.parse(user1.lifestyle) : user1.lifestyle;
    const l2 = typeof user2.lifestyle === 'string' ? JSON.parse(user2.lifestyle) : user2.lifestyle;
    
    if (!l1 || !l2) return null;

    let score = 0;
    let totalFields = 0;

    const keysToCompare = ['sleep', 'cleanliness', 'social', 'parties', 'pets', 'smoking', 'music', 'work', 'occupation', 'cooking'];
    
    for (const key of keysToCompare) {
      if (l1[key] && l2[key]) {
        totalFields++;
        if (l1[key] === l2[key]) score += 1;
      }
    }

    if (totalFields === 0) return null;
    
    let percentage = 40 + Math.round((score / totalFields) * 60);
    return percentage;
  };

  const renderCard = (card: Profile | null) => {
    if (!card) return null;
    
    // Fallback image if user has no photoUrl (increased quality and resolution)
    const imageSource = card.photoUrl 
      ? { uri: card.photoUrl } 
      : { uri: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=100&w=1200&auto=format&fit=crop' }; // High-res default image

    const compatibility = calculateCompatibility(currentUser, card);

    const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
      looking_urgent: { label: 'Buscando Urgente', color: '#34C759', icon: 'lightning-bolt' },
      exploring: { label: 'Solo Explorando', color: '#FFCC00', icon: 'compass' },
      have_room: { label: 'Tengo Cuarto', color: '#0A84FF', icon: 'home-account' }
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
        <View style={[styles.cardContentWrapper, { userSelect: 'none' } as any]}>
          <View style={styles.textOverlay}>
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
                <Text style={styles.subtitle}>Likes & Hobbies</Text>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="thumb-up-outline" size={16} color="#ccc" />
                  <Text style={styles.infoText} numberOfLines={2}>{card.likes || 'Open to anything'}</Text>
                </View>
              </View>

              <View style={[styles.infoSection, { flex: 1 }]}>
                <Text style={styles.subtitle}>Preferences</Text>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="home-search-outline" size={16} color="#ccc" />
                  <Text style={styles.infoText} numberOfLines={2}>{card.preferences || 'Flexible'}</Text>
                </View>
              </View>
            </View>

            {card.dealbreakers ? (
              <View style={styles.infoSection}>
                <Text style={styles.subtitleDealbreaker}>Dealbreakers</Text>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#FF4B4B" />
                  <Text style={styles.dealbreakerText} numberOfLines={2}>{card.dealbreakers}</Text>
                </View>
              </View>
            ) : null}

            {/* Action buttons removed from here to fix web clicking */}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerContainer} edges={['top']} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <View>
            <Text style={styles.mainTitle}>Explore</Text>
            <Text style={styles.subTitle}>Find your ideal roommate.</Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.toggleBtn, { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: '#333', borderRadius: 20, padding: 8 }]}
              onPress={() => router.push('/explore/filters')}
            >
              <MaterialCommunityIcons name="filter-variant" size={20} color="#49C788" />
            </TouchableOpacity>
            <View style={styles.toggleContainer}>
              <TouchableOpacity 
                style={[styles.toggleBtn, viewMode === 'swipe' && styles.toggleBtnActive]}
                onPress={() => setViewMode('swipe')}
              >
                <MaterialCommunityIcons name="cards-outline" size={20} color={viewMode === 'swipe' ? '#fff' : '#888'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
                onPress={() => setViewMode('map')}
              >
                <MaterialCommunityIcons name="map-outline" size={20} color={viewMode === 'map' ? '#fff' : '#888'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.swiperContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#49C788" size="large" />
            <Text style={styles.loadingText}>Finding people...</Text>
          </View>
        ) : viewMode === 'map' ? (
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: userLocation?.latitude || 19.4326,
              longitude: userLocation?.longitude || -99.1332,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            showsUserLocation={true}
            userInterfaceStyle="dark"
          >
            {profiles.map(profile => {
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
                      <Text style={styles.calloutRole}>{profile.role === 'host' ? 'Tiene cuarto' : 'Busca cuarto'}</Text>
                      <Text style={styles.calloutAction}>Ver perfil</Text>
                    </View>
                  </Callout>
                </Marker>
              );
            })}
          </MapView>
        ) : allSwiped || profiles.length === 0 ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="account-search-outline" size={60} color="#555" />
            <Text style={styles.emptyText}>No more roommates to show.</Text>
            <TouchableOpacity style={styles.reloadButton} onPress={fetchProfiles}>
              <Text style={styles.reloadButtonText}>Refresh</Text>
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
              <TouchableOpacity 
                style={[styles.actionButton, styles.buttonNope]} 
                onPress={() => swiperRef.current?.swipeLeft()}
              >
                <MaterialCommunityIcons name="close" size={28} color="#FF4B4B" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.buttonSkip]} 
                onPress={() => swiperRef.current?.swipeBottom()}
              >
                <MaterialCommunityIcons name="skip-next" size={28} color="#ff9800" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.buttonMessage]} 
                onPress={() => {
                  const card = profiles[currentIndex];
                  if (card) router.push(`/chat/${card.id}`);
                }}
              >
                <MaterialCommunityIcons name="message-text" size={24} color="#2196f3" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.buttonLike]} 
                onPress={async () => {
                  const idx = currentIndex;
                  // Call match logic directly (swiper callback may not fire on web)
                  await onSwipedRight(idx);
                  swiperRef.current?.swipeRight();
                }}
              >
                <MaterialCommunityIcons name="heart" size={28} color="#4caf50" />
              </TouchableOpacity>
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
    alignItems: 'flex-start'
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
    fontSize: 32,
    fontWeight: '900',
    color: '#000',
    textShadowColor: '#fff',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subTitle: {
    fontSize: 16,
    color: '#000',
    marginTop: 2,
    fontWeight: '800',
    textShadowColor: '#fff',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
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
    paddingBottom: 90, 
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
    paddingHorizontal: 20,
    zIndex: 100,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    borderWidth: 1.5,
  },
  buttonNope: {
    borderColor: '#FF4B4B',
  },
  buttonMessage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderColor: '#2196f3',
  },
  buttonSkip: {
    borderColor: '#ff9800',
  },
  buttonLike: {
    borderColor: '#4caf50',
  },
});


