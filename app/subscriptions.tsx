import { View, Text, StyleSheet, Pressable, SafeAreaView, Switch, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SubscriptionsScreen() {
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('share_badges_enabled')
          .eq('id', session.user.id)
          .single();
        setIsPremium(data?.share_badges_enabled === true);
      }
    } catch {
      // error reading value
    }
    setLoading(false);
  };

  const toggleSubscription = async (value: boolean) => {
    setIsPremium(value);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase
          .from('profiles')
          .update({ share_badges_enabled: value })
          .eq('id', session.user.id);
      }
    } catch (e) {
      console.error('Failed to save premium status', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Premium Plans</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.premiumSection}>
        <View style={styles.premiumHeader}>
          <IconSymbol name="star.fill" size={24} color="#49C788" />
          <Text style={styles.premiumTitle}>Test Subscription</Text>
        </View>

        <Text style={styles.infoText}>
          Use this toggle to mock your subscription status and test the paywall feature on the Home feed.
        </Text>
        
        {loading ? (
          <ActivityIndicator color="#49C788" size="large" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.subCard}>
            <View>
              <Text style={styles.subDuration}>Premium Access</Text>
              <Text style={styles.subDesc}>{isPremium ? 'Currently Active' : 'Currently Free Plan'}</Text>
            </View>
            <Switch
              value={isPremium}
              onValueChange={toggleSubscription}
              trackColor={{ false: '#333', true: '#49C788' }}
              thumbColor={'#fff'}
            />
          </View>
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
  premiumSection: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#49C788',
  },
  infoText: {
    color: '#aaa',
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 20,
  },
  subCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subDuration: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subDesc: {
    color: '#888',
    marginTop: 4,
  },
});
