import { mockCurrentUserConfig } from '@/lib/mockData';
import { router } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState } from 'react';

const PLACEHOLDER_PHOTO = 'https://i.pravatar.cc/300?img=33';

export default function MyProfileScreen() {
  const profile = mockCurrentUserConfig.profile as any;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState<string>((profile?.name as string) || 'You');

  const handleSaveProfile = () => {
    if (mockCurrentUserConfig.profile) {
      mockCurrentUserConfig.profile.name = name;
    }
    setEditing(false);
    Alert.alert('Saved!', 'Your profile has been updated.');
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>No profile found.</Text>
          <Pressable onPress={() => router.replace('/preferences')} style={styles.setupBtn}>
            <Text style={styles.setupBtnText}>Set Up Preferences</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const likesArr = profile.likes ? profile.likes.split(', ').filter(Boolean) : [];
  const prefsArr = profile.preferences ? profile.preferences.split(', ').filter(Boolean) : [];
  const dealsArr = profile.dealbreakers ? profile.dealbreakers.split(', ').filter(Boolean) : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Header with avatar */}
        <View style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: PLACEHOLDER_PHOTO }} style={styles.avatar} />
            <View style={styles.onlineDot} />
          </View>

          {editing ? (
            <View style={styles.editNameRow}>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.nameInput}
                autoFocus
              />
              <Pressable onPress={handleSaveProfile} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setEditing(true)} style={styles.nameRow}>
              <Text style={styles.profileName}>{name}</Text>
              <IconSymbol name="pencil" size={18} color="#888" />
            </Pressable>
          )}

          <Text style={styles.profileSub}>Your profile is visible to nearby roommates</Text>
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{likesArr.length}</Text>
            <Text style={styles.statLabel}>Interests</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{prefsArr.length}</Text>
            <Text style={styles.statLabel}>Preferences</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{dealsArr.length}</Text>
            <Text style={styles.statLabel}>Dealbreakers</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Hobbies */}
        <Text style={styles.sectionTitle}>My Hobbies & Interests</Text>
        <View style={styles.chipWrap}>
          {likesArr.length > 0 ? likesArr.map((tag: string) => (
            <View key={tag} style={styles.chip}>
              <Text style={styles.chipText}>{tag}</Text>
            </View>
          )) : <Text style={styles.emptySection}>Not set yet</Text>}
        </View>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>Lifestyle Preferences</Text>
        <View style={styles.chipWrap}>
          {prefsArr.length > 0 ? (<>{prefsArr.map((tag: string) => (
            <View key={tag} style={[styles.chip, { backgroundColor: '#071916', borderColor: '#00C9A7' }]}>
              <Text style={[styles.chipText, { color: '#00C9A7' }]}>{tag}</Text>
            </View>
          ))}</>) : <Text style={styles.emptySection}>Not set yet</Text>}
        </View>

        {/* Dealbreakers */}
        <Text style={styles.sectionTitle}>Dealbreakers</Text>
        <View style={styles.chipWrap}>
          {dealsArr.length > 0 ? (<>{dealsArr.map((tag: string) => (
            <View key={tag} style={[styles.chip, { backgroundColor: '#1a0a0a', borderColor: '#FF6B6B' }]}>
              <Text style={[styles.chipText, { color: '#FF6B6B' }]}>{tag}</Text>
            </View>
          ))}</>) : <Text style={styles.emptySection}>Not set yet</Text>}
        </View>

        <View style={styles.divider} />

        {/* Edit Preferences CTA */}
        <Pressable onPress={() => router.replace('/preferences')} style={styles.editBtn}>
          <IconSymbol name="slider.horizontal.3" size={20} color="#000" />
          <Text style={styles.editBtnText}>Edit My Preferences</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scroll: {
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginBottom: 16,
  },
  setupBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  setupBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#6C63FF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4ade80',
    borderWidth: 2,
    borderColor: '#000',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  nameInput: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: '#6C63FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 140,
  },
  saveBtn: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  profileSub: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  emptySection: {
    color: '#555',
    fontSize: 14,
    fontStyle: 'italic',
  },
  editBtn: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  editBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
