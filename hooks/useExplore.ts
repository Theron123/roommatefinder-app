import { useState, useRef, useEffect, useMemo } from 'react';
import { Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Swiper from 'react-native-deck-swiper';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';
import { useMatches } from '@/hooks/useMatches';
import { getCurrentUserId } from '@/hooks/useProfileQueries';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { getActiveFilters } from '@/app/explore/filters';
import { notifyNewMatch } from '@/lib/notifications';
import { Image } from 'expo-image';

const QUOTA_KEY = '@roommatefinder:swipe_quotas';
const LIMITS = { like: 30, reject: 30, skip: 5 };
const FALLBACK_COORDS = { latitude: 19.4326, longitude: -99.1332 }; // Ciudad de México, fallback si no hay ubicación

// Le pone coordenadas "listas para mapa" a un perfil: usa latOffset/lngOffset
// si existen, si no genera un punto aleatorio cercano a la base dada.
function withMapCoords<T extends { latOffset?: number | null; lngOffset?: number | null; latitude?: number | null; longitude?: number | null }>(
  profile: T,
  baseLat: number,
  baseLng: number
): T {
  if (profile.latOffset && profile.lngOffset) {
    return { ...profile, latitude: profile.latOffset, longitude: profile.lngOffset };
  }
  if (!profile.latitude || !profile.longitude) {
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;
    return { ...profile, latitude: baseLat + latOffset, longitude: baseLng + lngOffset };
  }
  return profile;
}

// Hook principal de la pantalla Explore: maneja perfiles candidatos, swipes, matches y cuotas de uso
export function useExplore() {
  const [allSwiped, setAllSwiped] = useState(false);
  const [cardPhotoIndices, setCardPhotoIndices] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'swipe' | 'map'>('swipe');
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);

  const swiperRef = useRef<Swiper<Profile>>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requestLocation } = useDeviceLocation();
  const { data: matchProfilesRaw } = useMatches();

  // Consulta el perfil candidato a explorar (usuario actual + lista filtrada, excluyendo ya swipeados)
  const profilesQuery = useQuery({
    queryKey: ['explore-profiles'],
    queryFn: async () => {
      const myId = await getCurrentUserId();
      if (!myId) return { profiles: [] as Profile[], currentUser: null as Profile | null };

      const { data: currentUserData } = await supabase
        .from('profiles')
        .select('id, name, age, photoUrl, latOffset, lngOffset, likes, preferences, dealbreakers, availability_status')
        .eq('id', myId)
        .single();

      const { data: userSwipes } = await supabase
        .from('swipes')
        .select('swiped')
        .eq('swiper', myId);

      const swipedUserIds = userSwipes?.map((s) => s.swiped) || [];

      const filters = getActiveFilters();
      let query = supabase
        .from('profiles')
        .select('id, name, age, photoUrl, role, latOffset, lngOffset, likes, preferences, dealbreakers, is_identity_verified, latitude, longitude')
        .neq('id', myId)
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
      if (error) console.error('Error fetching profiles:', error);

      if (!data) return { profiles: [], currentUser: currentUserData as unknown as Profile | null };

      const shuffledProfiles = data.sort(() => 0.5 - Math.random());
      const urlsToPrefetch = shuffledProfiles.map((p) => p.photoUrl).filter(Boolean) as string[];
      if (urlsToPrefetch.length > 0) {
        Image.prefetch(urlsToPrefetch);
      }

      const baseLat = currentUserData?.latOffset || FALLBACK_COORDS.latitude;
      const baseLng = currentUserData?.lngOffset || FALLBACK_COORDS.longitude;
      const mapReadyProfiles = shuffledProfiles.map((p) => withMapCoords(p, baseLat, baseLng));

      return {
        profiles: mapReadyProfiles as unknown as Profile[],
        currentUser: currentUserData as unknown as Profile | null,
      };
    },
  });

  const currentUser = profilesQuery.data?.currentUser ?? null;

  // Una vez resuelve el GPS del dispositivo, rellena las coordenadas de los
  // perfiles que no tenían latOffset/lngOffset ni latitud/longitud propias.
  const profiles = useMemo(() => {
    const base = profilesQuery.data?.profiles ?? [];
    if (!userLocation) return base;
    return base.map((p) => {
      if (p.latitude && p.longitude) return p;
      return withMapCoords(p, userLocation.latitude, userLocation.longitude);
    });
  }, [profilesQuery.data, userLocation]);

  // Perfiles con match, listos para mostrar en el mapa
  const matchedProfiles = useMemo(() => {
    const matches = matchProfilesRaw ?? [];
    if (matches.length === 0) return [];
    const baseLat = currentUser?.latOffset || userLocation?.latitude || FALLBACK_COORDS.latitude;
    const baseLng = currentUser?.lngOffset || userLocation?.longitude || FALLBACK_COORDS.longitude;
    return matches.map((p) => withMapCoords(p, baseLat, baseLng));
  }, [matchProfilesRaw, currentUser, userLocation]);

  // Consulta el número de mensajes no leídos del usuario actual
  const unreadCountQuery = useQuery({
    queryKey: ['explore-unread-count'],
    queryFn: async () => {
      const myId = await getCurrentUserId();
      if (!myId) return 0;

      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', myId)
        .eq('is_read', false);

      if (error) return 0;
      return count ?? 0;
    },
  });
  const unreadCount = unreadCountQuery.data ?? 0;

  useEffect(() => {
    let unreadChannel: any = null;

    const setupUnreadSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const channel = supabase
        .channel('public:unread_messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          queryClient.invalidateQueries({ queryKey: ['explore-unread-count'] });
        });

      unreadChannel = channel.subscribe();
    };

    setupUnreadSubscription();

    return () => {
      if (unreadChannel) {
        supabase.removeChannel(unreadChannel);
      }
    };
  }, [queryClient]);

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

  useEffect(() => {
    requestLocation().then((loc) => {
      if (loc) setUserLocation(loc);
    });
  }, [requestLocation]);

  // Vuelve a mostrar el swiper (resetea "no quedan perfiles") cada vez que llega una lista nueva
  useEffect(() => {
    if (profilesQuery.data) setAllSwiped(false);
  }, [profilesQuery.data]);

  // Callback vacío para el evento genérico de swipe del componente Swiper
  const onSwiped = () => {};

  // Verifica y actualiza la cuota horaria de swipes (like/reject/skip); revierte el swipe si se excede el límite
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

  // Guarda un swipe (like o reject) en la tabla swipes
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

  // Maneja el swipe hacia la izquierda (rechazo), respetando la cuota
  const onSwipedLeft = async (index: number) => {
    const allowed = await checkQuota('reject');
    if (allowed) {
      const targetProfile = profiles[index];
      await recordSwipe(targetProfile.id, false);
      console.log('Passed on', targetProfile.id);
    }
  };

  // Maneja el swipe hacia la derecha (like): registra el swipe y crea/detecta el match mutuo, notificando al usuario
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
          queryClient.invalidateQueries({ queryKey: ['matches'] });

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

  // Maneja el swipe hacia abajo (saltar perfil), respetando la cuota
  const onSwipedBottom = async (index: number) => {
    const allowed = await checkQuota('skip');
    if (allowed) console.log('Skipped', profiles[index].id);
  };

  // Maneja el swipe hacia arriba: navega directo al chat con ese perfil
  const onSwipedTop = (index: number) => {
    if (index < profiles.length) {
      router.push(`/chat/${profiles[index].id}`);
    }
  };

  // Marca que ya no quedan perfiles por mostrar
  const onSwipedAll = () => {
    setAllSwiped(true);
  };

  return {
    profiles,
    currentUser,
    loading: profilesQuery.isLoading,
    allSwiped,
    cardPhotoIndices,
    setCardPhotoIndices,
    viewMode,
    setViewMode,
    matchedProfiles,
    userLocation,
    unreadCount,
    swiperRef,
    fetchProfiles: () => profilesQuery.refetch(),
    onSwiped,
    onSwipedLeft,
    onSwipedRight,
    onSwipedTop,
    onSwipedBottom,
    onSwipedAll,
  };
}
