import { supabase } from '@/lib/supabase';
import { useCallback, useState, useRef, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Pressable, RefreshControl, DeviceEventEmitter, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import { getSimilarityScore, getDistanceFromLatLonInKm } from '@/utils/mathHelpers';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../../context/LanguageContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Profile = {
  id: string;
  likes: string;
  preferences: string;
  dealbreakers: string;
  latitude: number | null;
  longitude: number | null;
  name?: string;
  age?: number;
  bio?: string;
  photoUrl?: string;
  latOffset?: number;
  lngOffset?: number;
  distance?: number | null;
  similarityScore?: number;
  hasListing?: boolean;
  role?: 'landlord' | 'host' | 'seeker';
};

export default function HomeScreen() {
  const { t, translateHobby } = useTranslation();
  const { width } = useWindowDimensions();
  const numColumns = width > 1000 ? 3 : (width > 680 ? 2 : 1);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedMode, setFeedMode] = useState<'people' | 'apartments'>('people');
  const [isPremium, setIsPremium] = useState(false);
  const [currentUserPhoto, setCurrentUserPhoto] = useState<string | null>(null);
  const router = useRouter();

  const avatarRef = useRef<any>(null);

  const measureAvatar = () => {
    if (avatarRef.current) {
      avatarRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        if (width > 0 && height > 0) {
          DeviceEventEmitter.emit('register_tutorial_coords', {
            key: 'profile_avatar',
            coords: { x, y, w: width, h: height, borderRadius: width / 2 }
          });
        }
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(measureAvatar, 200);
    const sub = DeviceEventEmitter.addListener('request_tutorial_measure', () => {
      measureAvatar();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  const fetchCurrentUserPhoto = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('profiles')
        .select('photoUrl')
        .eq('id', session.user.id)
        .single();
      if (data?.photoUrl) {
        setCurrentUserPhoto(data.photoUrl);
      }
    } catch (e) {
      console.log('Error fetching user photo:', e);
    }
  };

  const fetchMatches = async (isRefresh = false) => {
    if (profiles.length === 0 && !isRefresh) {
      setLoading(true);
    }
    if (isRefresh) setRefreshing(true);

    try {
      const stored = await AsyncStorage.getItem('mock_premium');
      setIsPremium(stored === 'true');
    } catch {
      // error reading value
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('id, latOffset, lngOffset, likes, preferences, photoUrl')
      .eq('id', session.user.id)
      .single();
    
    if (!currentUserProfile) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (currentUserProfile.photoUrl) {
      setCurrentUserPhoto(currentUserProfile.photoUrl);
    }

    // Fetch blocked users first to filter them out of the feed
    const { data: blockedRecords } = await supabase
      .from('user_blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${session.user.id},blocked_id.eq.${session.user.id}`);

    const blockedUserIds = blockedRecords 
      ? blockedRecords.map(r => r.blocker_id === session.user.id ? r.blocked_id : r.blocker_id) 
      : [];

    // Fetch profiles without the listings join since the foreign key is missing, filtering by is_public and excluding blocked profiles
    let query = supabase
      .from('profiles')
      .select('id, name, age, photoUrl, likes, preferences, dealbreakers, latOffset, lngOffset')
      .neq('id', session.user.id)
      .neq('role', 'landlord')
      .eq('is_public', true);

    if (blockedUserIds.length > 0) {
      query = query.not('id', 'in', `(${blockedUserIds.join(',')})`);
    }

    const { data: otherProfiles } = await query.limit(50);

    if (otherProfiles) {
      let scoredProfiles = otherProfiles.map((p: any) => {
        let distance = null;
        let pLat = p.latOffset;
        let pLng = p.lngOffset;
        let cLat = currentUserProfile.latOffset;
        let cLng = currentUserProfile.lngOffset;

        if (pLat != null && pLng != null && cLat != null && cLng != null) {
          distance = getDistanceFromLatLonInKm(cLat, cLng, pLat, pLng);
        }

        const simLikes = getSimilarityScore(currentUserProfile.likes, p.likes);
        const simPrefs = getSimilarityScore(currentUserProfile.preferences, p.preferences);
        const similarityScore = simLikes + simPrefs;
        const hasListing = p.listings && Array.isArray(p.listings) ? p.listings.length > 0 : !!p.listings;

        return { ...p, distance, similarityScore, hasListing };
      });

      // Sort: First by distance (low to high), then by similarity (high to low)
      scoredProfiles.sort((a, b) => {
        if (a.distance != null && b.distance != null) {
           if (Math.abs(a.distance - b.distance) > 1) {
             return a.distance - b.distance;
           }
        }
        
        if (a.distance != null && b.distance == null) return -1;
        if (b.distance != null && a.distance == null) return 1;

        return (b.similarityScore || 0) - (a.similarityScore || 0);
      });

      setProfiles(scoredProfiles as Profile[]);
    }
    
    setLoading(false);
    setRefreshing(false);
  };

  const fetchListings = async (isRefresh = false) => {
    if (listings.length === 0 && !isRefresh) setLoading(true);
    if (isRefresh) setRefreshing(true);
    
    const { data } = await supabase
      .from('listings')
      .select('id, images, price, utilities_included, title, address, description')
      .limit(50);
    if (data) setListings(data);
    
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchCurrentUserPhoto();
      if (feedMode === 'people') {
        fetchMatches();
      } else {
        fetchListings();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feedMode])
  );

  const renderProfile = useCallback(({ item, index }: { item: Profile, index: number }) => {
    const isBlurred = index >= 5 && !isPremium;
    const distanceText = item.distance != null ? `${item.distance.toFixed(1)} ${t('explore.away')}` : t('explore.loc_unknown');
    const matchTag = (item.similarityScore && item.similarityScore > 0) ? `${item.similarityScore} ${t('explore.matching')}` : '';

    const isHighMatch = item.similarityScore && item.similarityScore >= 6;
    const isMediumMatch = item.similarityScore && item.similarityScore >= 3 && item.similarityScore < 6;
    const avatarBorderColor = isHighMatch ? '#49C788' : (isMediumMatch ? '#0A84FF' : 'rgba(255, 255, 255, 0.15)');

    const likesArray = item.likes ? item.likes.split(',').map(h => translateHobby(h.trim())).filter(Boolean) : [];
    const prefsArray = item.preferences ? item.preferences.split(',').map(h => translateHobby(h.trim())).filter(Boolean) : [];

    return (
      <Pressable 
        onPress={() => {
          if (isBlurred) {
            router.push('/subscriptions');
          } else {
            router.push(`/profile/${item.id}`);
          }
        }} 
        style={styles.cardContainer}
      >
        <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: '#0a0a0f' }}>
          <LinearGradient
            colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.005)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              {item.photoUrl ? (
                <Image 
                  source={{ uri: item.photoUrl }} 
                  style={[styles.cardAvatar, { borderColor: avatarBorderColor }]} 
                  contentFit="cover" 
                  transition={200} 
                />
              ) : (
                <View style={[styles.avatarFallback, { borderColor: avatarBorderColor }]}>
                  <IconSymbol size={32} name="person.crop.circle.fill" color="#888" />
                </View>
              )}
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name || 'Roommate'}{item.age ? `, ${item.age}` : ''}</Text>
                <Text style={styles.cardSubtitle}>{t('explore.tap_view')}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={[styles.badge, { backgroundColor: 'rgba(10,132,255,0.06)', borderColor: 'rgba(10,132,255,0.15)', borderWidth: 1 }]}>
                <MaterialCommunityIcons name="map-marker-outline" size={12} color="#0A84FF" style={{ marginRight: 4 }} />
                <Text style={[styles.badgeText, { color: '#0A84FF' }]}>{distanceText}</Text>
              </View>
              {matchTag ? (
                <View style={[styles.badge, { backgroundColor: 'rgba(73,199,136,0.08)', borderColor: 'rgba(73,199,136,0.2)', borderWidth: 1 }]}>
                  <MaterialCommunityIcons name="fire" size={12} color="#49C788" style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: '#49C788' }]}>{matchTag}</Text>
                </View>
              ) : null}
              {item.hasListing ? (
                <View style={[styles.badge, { backgroundColor: 'rgba(255,159,10,0.06)', borderColor: 'rgba(255,159,10,0.15)', borderWidth: 1 }]}>
                  <MaterialCommunityIcons name="home-outline" size={12} color="#FF9F0A" style={{ marginRight: 4 }} />
                  <Text style={[styles.badgeText, { color: '#FF9F0A', fontWeight: 'bold' }]}>{t('explore.has_room')}</Text>
                </View>
              ) : null}
            </View>
            
            <Text style={styles.label}>{t('explore.likes_hobbies')}</Text>
            {likesArray.length > 0 ? (
              <View style={styles.tagContainer}>
                {likesArray.slice(0, 3).map((tag, idx) => (
                  <View key={idx} style={styles.hobbyTag}>
                    <Text style={styles.hobbyTagText}>{tag}</Text>
                  </View>
                ))}
                {likesArray.length > 3 && (
                  <View style={styles.hobbyTagMore}>
                    <Text style={styles.hobbyTagMoreText}>+{likesArray.length - 3}</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.content}>{t('explore.no_pref')}</Text>
            )}

            <Text style={styles.label}>{t('explore.preferences')}</Text>
            {prefsArray.length > 0 ? (
              <View style={styles.tagContainer}>
                {prefsArray.slice(0, 3).map((tag, idx) => (
                  <View key={idx} style={styles.hobbyTag}>
                    <Text style={styles.hobbyTagText}>{tag}</Text>
                  </View>
                ))}
                {prefsArray.length > 3 && (
                  <View style={styles.hobbyTagMore}>
                    <Text style={styles.hobbyTagMoreText}>+{prefsArray.length - 3}</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.content}>{t('explore.no_pref')}</Text>
            )}
          </LinearGradient>
          
          {isBlurred && (
            <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill}>
              <View style={styles.blurOverlayContent}>
                <IconSymbol name="lock.fill" size={40} color="#49C788" />
                <Text style={styles.blurTitle}>{t('explore.premium_match')}</Text>
                <Text style={styles.blurDesc}>{t('explore.premium_desc')}</Text>
                <View style={styles.blurBtn}>
                  <Text style={styles.blurBtnText}>{t('explore.unlock_premium')}</Text>
                </View>
              </View>
            </BlurView>
          )}
        </View>
      </Pressable>
    );
  }, [isPremium, router, t, translateHobby]);

  const renderListing = useCallback(({ item }: { item: any }) => (
    <Pressable 
      style={styles.listingCardContainer}
      onPress={() => router.push(`/listing/${item.id}`)}
    >
      <View style={styles.listingCard}>
        {/* Full bleed image with gradient overlay */}
        <View style={styles.listingImageWrapper}>
          {item.images && item.images.length > 0 ? (
            <Image source={{ uri: item.images[0] }} style={styles.listingImage} contentFit="cover" transition={300} />
          ) : (
            <View style={[styles.listingImage, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}>
              <IconSymbol name="house.fill" size={50} color="#555" />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={styles.listingGradient}
          />
          
          {/* Floating Price Tag */}
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>${item.price}</Text>
            <Text style={styles.pricePeriod}>/{t('myprofile.month')}</Text>
          </View>
          
          {/* Utilities Badge */}
          {item.utilities_included && (
            <View style={styles.utilitiesBadge}>
              <MaterialCommunityIcons name="flash" size={12} color="#000" />
              <Text style={styles.utilitiesText}>{t('home.utilities_inc')}</Text>
            </View>
          )}
        </View>

        {/* Content details */}
        <View style={styles.listingContent}>
          <Text style={styles.listingTitle} numberOfLines={1}>{item.title || t('home.beautiful_apartment')}</Text>
          
          <View style={styles.listingLocationRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={16} color="#888" />
            <Text style={styles.listingAddress} numberOfLines={1}>{item.address || t('home.loc_not_specified')}</Text>
          </View>
          
          {item.description && (
            <Text style={styles.listingDesc} numberOfLines={2}>{item.description}</Text>
          )}
        </View>
      </View>
    </Pressable>
  ), [router, t]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.responsiveContent}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Pressable 
                onLongPress={() => {
                  DeviceEventEmitter.emit('show_tutorial');
                }}
                delayLongPress={800}
              >
                <Text style={styles.mainTitle}>
                  Roommate<Text style={{ color: '#49C788' }}>Finder</Text>
                </Text>
              </Pressable>
              <Text style={styles.subTitle}>{t('explore.subtitle')}</Text>
            </View>
            <Pressable 
              ref={avatarRef}
              onPress={() => router.push('/settings')} 
              style={styles.headerAvatarContainer}
              onLayout={() => {
                measureAvatar();
                setTimeout(measureAvatar, 50);
              }}
            >
              {currentUserPhoto ? (
                <Image source={{ uri: currentUserPhoto }} style={styles.headerAvatar} contentFit="cover" />
              ) : (
                <View style={styles.headerIconWrapper}>
                  <IconSymbol size={22} name="person.crop.circle.fill" color="#888" />
                </View>
              )}
              <View style={styles.activeDot} />
            </Pressable>
          </View>
        </View>

        <View style={styles.toggleContainer}>
          <Pressable 
            style={[styles.toggleBtn, feedMode === 'people' && styles.toggleBtnActive]}
            onPress={() => setFeedMode('people')}
          >
            <Text style={[styles.toggleText, feedMode === 'people' && styles.toggleTextActive]}>{t('explore.people')}</Text>
          </Pressable>
          <Pressable 
            style={[styles.toggleBtn, feedMode === 'apartments' && styles.toggleBtnActive]}
            onPress={() => setFeedMode('apartments')}
          >
            <Text style={[styles.toggleText, feedMode === 'apartments' && styles.toggleTextActive]}>{t('explore.apartments')}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#49C788" size="large" />
          </View>
        ) : feedMode === 'people' ? (
          profiles.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>{t('explore.no_matches')}</Text>
            </View>
          ) : (
            <FlashList
              key={`profiles-grid-${numColumns}`}
              data={profiles}
              numColumns={numColumns}
              keyExtractor={(item) => item.id}
              renderItem={renderProfile}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => fetchMatches(true)} tintColor="#49C788" />
              }
            />
          )
        ) : (
          listings.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>{t('explore.no_apts')}</Text>
            </View>
          ) : (
            <FlashList
              key={`listings-grid-${numColumns}`}
              data={listings}
              numColumns={numColumns}
              keyExtractor={(item) => item.id}
              renderItem={renderListing}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => fetchListings(true)} tintColor="#49C788" />
              }
            />
          )
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerAvatarContainer: {
    position: 'relative',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#49C788',
  },
  headerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#49C788',
    borderWidth: 2,
    borderColor: '#000',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subTitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  toggleBtnActive: {
    backgroundColor: '#49C788',
    shadowColor: '#49C788',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '700',
    fontSize: 14,
  },
  toggleTextActive: {
    color: '#000',
    fontWeight: '800',
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
  },
  cardContainer: {
    flex: 1,
    margin: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    borderWidth: 2.5,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#111',
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: 1,
  },
  content: {
    fontSize: 15,
    color: '#ddd',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  hobbyTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  hobbyTagText: {
    color: '#e0e0e0',
    fontSize: 12,
    fontWeight: '500',
  },
  hobbyTagMore: {
    backgroundColor: 'rgba(73, 199, 136, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(73, 199, 136, 0.15)',
  },
  hobbyTagMoreText: {
    color: '#49C788',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  listingCardContainer: {
    flex: 1,
    margin: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  listingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  listingImageWrapper: {
    position: 'relative',
    height: 220,
    width: '100%',
  },
  listingImage: {
    width: '100%',
    height: '100%',
  },
  listingGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  priceTag: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  pricePeriod: {
    color: '#ddd',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  utilitiesBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#49C788',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    shadowColor: '#49C788',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  utilitiesText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listingContent: {
    padding: 16,
  },
  listingTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  listingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  listingAddress: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '500',
  },
  listingDesc: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
  },
  blurOverlayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  blurTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  blurDesc: {
    color: '#ccc',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  blurBtn: {
    backgroundColor: '#49C788',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  blurBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  responsiveContent: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
});
