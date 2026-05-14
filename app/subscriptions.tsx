import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function SubscriptionsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
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
          <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
        </View>
        
        <Pressable style={styles.subCard}>
          <View>
            <Text style={styles.subDuration}>15 Days</Text>
            <Text style={styles.subDesc}>Short term access</Text>
          </View>
          <Text style={styles.subPrice}>$4.99</Text>
        </Pressable>
        
        <Pressable style={[styles.subCard, styles.subCardPopular]}>
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </View>
          <View>
            <Text style={styles.subDuration}>Quarterly</Text>
            <Text style={styles.subDesc}>3 months of benefits</Text>
          </View>
          <Text style={styles.subPrice}>$14.99</Text>
        </Pressable>

        <Pressable style={styles.subCard}>
          <View>
            <Text style={styles.subDuration}>Annual</Text>
            <Text style={styles.subDesc}>Best overall value</Text>
          </View>
          <Text style={styles.subPrice}>$49.99</Text>
        </Pressable>
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
    marginBottom: 24,
    gap: 8,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#49C788',
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
    marginBottom: 16,
  },
  subCardPopular: {
    borderColor: '#49C788',
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#49C788',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
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
  subPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
});
