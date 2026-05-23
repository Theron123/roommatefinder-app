import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const SettingsItem = ({ icon, title, onPress, color = '#fff' }: any) => (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={styles.itemLeft}>
        <MaterialCommunityIcons name={icon} size={24} color={color} style={styles.icon} />
        <Text style={[styles.itemText, { color }]}>{title}</Text>
      </View>
      {title !== 'Log Out' && (
        <MaterialCommunityIcons name="chevron-right" size={24} color="#444" />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionGroup}>
          <SettingsItem icon="account-circle-outline" title="Edit Profile" onPress={() => router.push('/preferences')} />
          <SettingsItem icon="shield-lock-outline" title="Privacy & Security" onPress={() => {}} />
          <SettingsItem icon="bell-outline" title="Notifications" onPress={() => {}} />
          <SettingsItem icon="star-outline" title="Subscriptions & Payments" onPress={() => router.push('/subscriptions')} />
        </View>

        <Text style={styles.sectionTitle}>Support & About</Text>
        <View style={styles.sectionGroup}>
          <SettingsItem icon="help-circle-outline" title="Help & Support" onPress={() => {}} />
          <SettingsItem icon="information-outline" title="About" onPress={() => {}} />
          <SettingsItem icon="file-document-outline" title="Terms & Policies" onPress={() => router.push('/terms')} />
        </View>

        <Text style={styles.sectionTitle}>Login</Text>
        <View style={styles.sectionGroup}>
          <SettingsItem icon="logout" title="Log Out" color="#FF3B30" onPress={handleLogout} />
        </View>

      </ScrollView>
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
  scrollContent: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginLeft: 20,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  sectionGroup: {
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1a1a24',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a24',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 16,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
