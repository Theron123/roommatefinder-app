import { supabase } from '@/lib/supabase';
import { useCallback, useState, useRef, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Swiper from 'react-native-deck-swiper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height } = Dimensions.get('window');

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
};

const QUOTA_KEY = '@roommatefinder:swipe_quotas';
const LIMITS = { like: 30, reject: 30, skip: 5 };

export default function ExploreScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [allSwiped, setAllSwiped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const swiperRef = useRef<Swiper<Profile>>(null);
  const router = useRouter();

  const fetchProfiles = async () => {
    setLoading(true);
    setAllSwiped(false);
    setCurrentIndex(0);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    const { data: currentUserData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (currentUserData) {
      setCurrentUser(currentUserData);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', session.user.id)
      .neq('role', 'landlord')
      .limit(50);
      
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
      setProfiles(shuffledProfiles);
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
    if (allowed) console.log('Liked', profiles[index].id);
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

    return (
      <View style={styles.cardContainer}>
        <Image 
          source={imageSource} 
          style={[StyleSheet.absoluteFill, styles.cardImageRounded]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          priority="high"
        />
        <View style={styles.cardContentWrapper}>
          <View style={styles.textOverlay}>
            {compatibility !== null && (
              <View style={styles.compatibilityBadge}>
                <MaterialCommunityIcons name="star-four-points" size={14} color="#000" />
                <Text style={styles.compatibilityText}>{compatibility}% compatible</Text>
              </View>
            )}
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
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#49C788" />
                  <Text style={styles.dealbreakerText} numberOfLines={2}>{card.dealbreakers}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.buttonNope]} 
                onPress={() => swiperRef.current?.swipeLeft()}
              >
                <MaterialCommunityIcons name="close" size={24} color="#49C788" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.buttonSkip]} 
                onPress={() => swiperRef.current?.swipeBottom()}
              >
                <MaterialCommunityIcons name="skip-next" size={24} color="#ff9800" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.buttonMessage]} 
                onPress={() => router.push(`/chat/${card.id}`)}
              >
                <MaterialCommunityIcons name="message-text" size={20} color="#2196f3" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.buttonLike]} 
                onPress={() => swiperRef.current?.swipeRight()}
              >
                <MaterialCommunityIcons name="heart" size={24} color="#4caf50" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerContainer} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.mainTitle}>Explore</Text>
          <Text style={styles.subTitle}>Find your ideal roommate.</Text>
        </View>
      </SafeAreaView>

      <View style={styles.swiperContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#49C788" size="large" />
            <Text style={styles.loadingText}>Finding people...</Text>
          </View>
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
              animateCardOpacity
              swipeBackCard
              overlayOpacityHorizontalThreshold={10}
              overlayOpacityVerticalThreshold={10}
              containerStyle={styles.swiper}
              cardStyle={styles.cardStyle}
              overlayLabels={{
                left: {
                  title: 'NOPE',
                  style: {
                    label: {
                      backgroundColor: 'transparent',
                      borderColor: '#49C788',
                      color: '#49C788',
                      borderWidth: 4,
                      fontSize: 32,
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      justifyContent: 'flex-start',
                      paddingTop: 40,
                      paddingRight: 40,
                      backgroundColor: 'rgba(255, 75, 75, 0.4)',
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
                      backgroundColor: 'rgba(76, 175, 80, 0.4)',
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
                      backgroundColor: 'rgba(33, 150, 243, 0.4)',
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
                      backgroundColor: 'rgba(255, 152, 0, 0.4)',
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
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
    paddingBottom: 16, 
  },
  compatibilityBadge: {
    backgroundColor: '#49C788',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 6,
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingTop: 8,
    width: '100%',
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    borderColor: '#49C788',
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


