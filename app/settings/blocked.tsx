import { View, Text, StyleSheet, Pressable, SafeAreaView, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

type BlockedUser = {
  id: string;
  name: string;
  photoUrl: string | null;
};

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { locale } = useTranslation();
  const isEs = locale === 'es';

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data } = await supabase
          .from('user_blocks')
          .select(`
            blocked_id,
            profiles!user_blocks_blocked_id_fkey (
              id,
              name,
              photoUrl
            )
          `)
          .eq('blocker_id', session.user.id);
        
        if (data) {
          const formatted = data.map((item: any) => ({
            id: item.blocked_id,
            name: item.profiles?.name || 'User',
            photoUrl: item.profiles?.photoUrl || null
          }));
          setBlockedUsers(formatted);
        }
      }
    } catch (err) {
      console.log('Error fetching blocked users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { error } = await supabase
          .from('user_blocks')
          .delete()
          .eq('blocker_id', session.user.id)
          .eq('blocked_id', blockedId);

        if (!error) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          fetchBlockedUsers();
        }
      }
    } catch (err) {
      console.log('Error unblocking user:', err);
    }
  };

  const handleSearchUsers = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const blockedIds = blockedUsers.map(u => u.id);
        
        const { data } = await supabase
          .from('profiles')
          .select('id, name, photoUrl')
          .neq('id', session.user.id)
          .ilike('name', `%${text}%`)
          .limit(10);
          
        if (data) {
          const formatted = data
            .filter((u: any) => !blockedIds.includes(u.id))
            .map((u: any) => ({
              id: u.id,
              name: u.name || 'User',
              photoUrl: u.photoUrl || null
            }));
          setSearchResults(formatted);
        }
      }
    } catch (err) {
      console.log('Error searching users:', err);
    }
  };

  const handleBlock = async (targetId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { error } = await supabase
          .from('user_blocks')
          .insert({
            blocker_id: session.user.id,
            blocked_id: targetId
          });

        if (!error) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSearchQuery('');
          setSearchResults([]);
          
          // Delete match record if any
          await supabase
            .from('matches')
            .delete()
            .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
            .or(`user1_id.eq.${targetId},user2_id.eq.${targetId}`);
          
          fetchBlockedUsers();
        }
      }
    } catch (err) {
      console.log('Error blocking user:', err);
    }
  };

  const renderBlockedItem = ({ item }: { item: BlockedUser }) => (
    <View style={s.userCard}>
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={s.avatar} contentFit="cover" />
      ) : (
        <View style={s.avatarFallback}>
          <MaterialCommunityIcons name="person" size={20} color="#666" />
        </View>
      )}
      <View style={s.userInfo}>
        <Text style={s.userName}>{item.name}</Text>
      </View>
      <Pressable 
        style={({ pressed }) => [s.unblockBtn, pressed && { opacity: 0.8 }]}
        onPress={() => handleUnblock(item.id)}
      >
        <Text style={s.unblockBtnText}>{isEs ? 'Desbloquear' : 'Unblock'}</Text>
      </Pressable>
    </View>
  );

  const renderSearchItem = ({ item }: { item: BlockedUser }) => (
    <View style={s.userCard}>
      {item.photoUrl ? (
        <Image source={{ uri: item.photoUrl }} style={s.avatar} contentFit="cover" />
      ) : (
        <View style={s.avatarFallback}>
          <MaterialCommunityIcons name="person" size={20} color="#666" />
        </View>
      )}
      <View style={s.userInfo}>
        <Text style={s.userName}>{item.name}</Text>
      </View>
      <Pressable 
        style={({ pressed }) => [s.blockBtn, pressed && { opacity: 0.8 }]}
        onPress={() => handleBlock(item.id)}
      >
        <Text style={s.blockBtnText}>{isEs ? 'Bloquear' : 'Block'}</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#131824', '#000']} style={s.header}>
        <Pressable 
          onPress={() => router.back()} 
          style={({ pressed }) => [s.backBtn, pressed && s.btnPressed]}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </Pressable>
        <Text style={s.title}>
          {isEs ? "Usuarios Bloqueados" : "Blocked Users"}
        </Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <View style={s.content}>
        {/* Search bar to block new users */}
        <Text style={s.sectionTitle}>{isEs ? "Bloquear Nuevo Usuario" : "Block New User"}</Text>
        <View style={s.searchBarContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#666" style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder={isEs ? "Buscar usuario por nombre..." : "Search user by name..."}
            placeholderTextColor="#555"
            value={searchQuery}
            onChangeText={handleSearchUsers}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#666" />
            </Pressable>
          )}
        </View>

        {/* Search Results */}
        {searchQuery.length > 0 && (
          <View style={s.searchResultsContainer}>
            {searchResults.length === 0 ? (
              <Text style={s.emptyText}>{isEs ? "No se encontraron usuarios." : "No users found."}</Text>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={renderSearchItem}
                style={s.searchResultsList}
              />
            )}
            <View style={s.divider} />
          </View>
        )}

        <Text style={s.sectionTitle}>{isEs ? "Lista de Bloqueados" : "Blocked List"}</Text>
        
        {loading ? (
          <ActivityIndicator color="#FF9F0A" style={{ marginTop: 40 }} />
        ) : blockedUsers.length === 0 ? (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="account-check-outline" size={48} color="#444" />
            <Text style={s.emptyStateText}>
              {isEs ? "No tienes usuarios bloqueados." : "You have no blocked users."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={blockedUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderBlockedItem}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btnPressed: {
    opacity: 0.8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#555',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  } as any,
  searchResultsContainer: {
    maxHeight: 220,
    marginBottom: 20,
    backgroundColor: '#0f121a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  searchResultsList: {
    flexGrow: 0,
  },
  emptyText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 10,
  },
  list: {
    paddingBottom: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  unblockBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unblockBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  blockBtn: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  blockBtnText: {
    color: '#FF453A',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 12,
  },
  emptyStateText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },
});
