import { supabase } from '@/lib/supabase';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';


type Profile = {
  id: string;
  likes: string;
  preferences: string;
  dealbreakers: string;
};

export default function ExploreScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', session.user.id)
      .limit(50);
      
    if (data) {
      setProfiles(data);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfiles();
    }, [])
  );

  const renderProfile = ({ item }: { item: Profile }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <IconSymbol size={24} name="person.circle.fill" color="#fff" />
        <Text style={styles.cardTitle}>Potential Roommate</Text>
      </View>
      
      <Text style={styles.label}>Likes & Hobbies</Text>
      <Text style={styles.content}>{item.likes || 'Not specified'}</Text>

      <Text style={styles.label}>Preferences</Text>
      <Text style={styles.content}>{item.preferences || 'Not specified'}</Text>

      <Text style={styles.label}>Dealbreakers</Text>
      <Text style={styles.contentDealbreaker}>{item.dealbreakers || 'None mentioned'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>Compatible Roommates</Text>
        <Text style={styles.subTitle}>Explore people matching your lifestyle.</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : profiles.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No roommates found yet.</Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={renderProfile}
          contentContainerStyle={styles.listContent}
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
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 4,
  },
  content: {
    fontSize: 15,
    color: '#ddd',
  },
  contentDealbreaker: {
    fontSize: 15,
    color: '#ff6b6b',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});
