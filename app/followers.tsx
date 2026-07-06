import { View, Text, StyleSheet, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '../context/LanguageContext';

export default function FollowersScreen() {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const isEs = locale === 'es';

  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRealFollowers();
  }, []);

  const fetchRealFollowers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      const myId = session.user.id;

      // 1. Obtener swipes recibidos por mí con liked = true
      const { data: swipesData, error: swipesError } = await supabase
        .from('swipes')
        .select('swiper, created_at')
        .eq('swiped', myId)
        .eq('liked', true);

      if (swipesError || !swipesData || swipesData.length === 0) {
        setFollowers([]);
        setLoading(false);
        return;
      }

      // 2. Extraer los IDs únicos de los swipers
      const swiperIds = Array.from(new Set(swipesData.map(s => s.swiper)));

      // 3. Obtener los perfiles correspondientes
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, age, photoUrl')
        .in('id', swiperIds);

      if (profilesError || !profilesData) {
        setFollowers([]);
        setLoading(false);
        return;
      }

      // 4. Combinar con fecha de swipe
      const followersList = profilesData.map(profile => {
        const swipe = swipesData.find(s => s.swiper === profile.id);
        return {
          ...profile,
          swipeTime: (swipe && swipe.created_at) ? new Date(swipe.created_at) : new Date(),
        };
      });

      // Ordenar por tiempo de swipe descendente
      followersList.sort((a, b) => b.swipeTime.getTime() - a.swipeTime.getTime());

      setFollowers(followersList);
    } catch (e) {
      console.error('Error cargando seguidores:', e);
      setFollowers([]);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + (isEs ? ' d' : ' d');
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + (isEs ? ' h' : ' h');
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + (isEs ? ' m' : ' m');
    return isEs ? 'ahora' : 'now';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
        </Pressable>
        <Text style={styles.title}>{isEs ? 'Seguidores Recientes' : 'Recent Followers'}</Text>
        <View style={{ width: 32 }} />
      </View>

      <Text style={styles.subtitle}>
        {isEs 
          ? 'Personas a las que les gustó tu perfil recientemente. ¡Haz match con ellas para chatear!'
          : 'These people liked your profile recently. Match with them to start chatting!'}
      </Text>

      {loading ? (
        <ActivityIndicator color="#49C788" size="large" style={{ marginTop: 50 }} />
      ) : followers.length === 0 ? (
        <Text style={{color: '#888', textAlign: 'center', marginTop: 40}}>
          {isEs ? 'No tienes nuevos seguidores todavía.' : 'No new followers yet.'}
        </Text>
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/profile/${item.id}`)} style={styles.row}>
              <Image source={{ uri: item.photoUrl || 'https://via.placeholder.com/150' }} style={styles.avatar} />
              <View style={styles.content}>
                 <Text style={styles.name}>{item.name}, {item.age}</Text>
                 <Text style={styles.time}>
                   {isEs ? `Le gustaste hace ${getTimeAgo(item.swipeTime)}` : `Liked you ${getTimeAgo(item.swipeTime)} ago`}
                 </Text>
              </View>
              <View style={styles.actionBtn}>
                 <MaterialCommunityIcons name="heart" size={20} color="#fff" />
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a24',
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    color: '#888',
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  list: {
    paddingTop: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: '#49C788',
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  time: {
    fontSize: 13,
    color: '#49C788',
  },
  actionBtn: {
    backgroundColor: '#49C788',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#1a1a24',
    marginLeft: 90,
  },
});
