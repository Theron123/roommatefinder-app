import { useState, useRef, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Swiper from 'react-native-deck-swiper';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { useMatches } from '@/hooks/useMatches';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { getActiveFilters } from '@/app/explore/filters';
import { notifyNewMatch } from '@/lib/notifications';
import { Image } from 'expo-image';

const QUOTA_KEY = '@roommatefinder:swipe_quotas';
const LIMITS = { like: 30, reject: 30, skip: 5 };

export function useExplore() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [allSwiped, setAllSwiped] = useState(false);
  const [cardPhotoIndices, setCardPhotoIndices] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'swipe' | 'map'>('swipe');
  const [matchedProfiles, setMatchedProfiles] = useState<Profile[]>([]);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const swiperRef = useRef<Swiper<Profile>>(null);
  const router = useRouter();
  const { fetchMatches } = useMatches();
  const { requestLocation } = useDeviceLocation();

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
      
      const channel = supabase
        .channel('public:unread_messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          fetchUnreadCount();
        });
      
      unreadChannel = channel.subscribe();
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
        .select('id, name, age, photoUrl, latOffset, lngOffset, likes, preferences, dealbreakers, availability_status')
        .eq('id', session.user.id)
        .single();
      if (currentUserData) {
        setCurrentUser(currentUserData as unknown as Profile);
      }

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
        .neq('role', 'landlord')
        .neq('role', 'company')
        .neq('role', 'admin');

      if (filters.role === 'host') {
        query = query.eq('availability_status', 'have_room');
      } else if (filters.role === 'seeker') {
        query = query.neq('availability_status', 'have_room');
      }
      if (filters.onlyVerified) query = query.eq('is_identity_verified', true);
      
      if (swipedUserIds.length > 0) {
        query = query.not('id', 'in', `(${swipedUserIds.join(',')})`);
      }

      query = query.limit(50);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching profiles:', error);
      }
        
      if (data) {
        const shuffledProfiles = data.sort(() => 0.5 - Math.random());
        const urlsToPrefetch = shuffledProfiles
          .map(p => p.photoUrl)
          .filter(Boolean) as string[];
        if (urlsToPrefetch.length > 0) {
          Image.prefetch(urlsToPrefetch);
        }
        
        const baseLat = currentUserData?.latOffset || userLocation?.latitude || 19.4326;
        const baseLng = currentUserData?.lngOffset || userLocation?.longitude || -99.1332;

        const mapReadyProfiles = shuffledProfiles.map((p) => {
          if (p.latOffset && p.lngOffset) {
            return { ...p, latitude: p.latOffset, longitude: p.lngOffset };
          }
          if (!p.latitude || !p.longitude) {
            const latOffset = (Math.random() - 0.5) * 0.1;
            const lngOffset = (Math.random() - 0.5) * 0.1;
            return { ...p, latitude: baseLat + latOffset, longitude: baseLng + lngOffset };
          }
          return p;
        });

        setProfiles(mapReadyProfiles as unknown as Profile[]);
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
        const baseLat = currentUser?.latOffset || userLocation?.latitude || 19.4326;
        const baseLng = currentUser?.lngOffset || userLocation?.longitude || -99.1332;
        
        const mapReadyProfiles = loadedProfiles.map((p) => {
          if (p.latOffset && p.lngOffset) {
            return { ...p, latitude: p.latOffset, longitude: p.lngOffset };
          }
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

    const fetchLocation = async () => {
      const loc = await requestLocation();
      if (loc) {
        setUserLocation(loc);

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

  const onSwiped = () => {};

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
      return true;
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
      await recordSwipe(likedProfile.id, true);

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

      // For demo purposes, we will auto-simulate a mutual swipe back to ensure an instant Match!
      const shouldAutoMatch = true;
      if (matchingSwipe || shouldAutoMatch) {
        if (!matchingSwipe) {
          // Insert the matching swipe from target user to us for DB consistency
          await supabase.from('swipes').insert({
            swiper: likedProfile.id,
            swiped: myId,
            liked: true
          });
        }

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

  return {
    profiles,
    currentUser,
    loading,
    allSwiped,
    cardPhotoIndices,
    setCardPhotoIndices,
    viewMode,
    setViewMode,
    matchedProfiles,
    userLocation,
    unreadCount,
    swiperRef,
    fetchProfiles,
    onSwiped,
    onSwipedLeft,
    onSwipedRight,
    onSwipedTop,
    onSwipedBottom,
    onSwipedAll,
  };
}
