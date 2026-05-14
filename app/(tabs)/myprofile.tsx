import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

export default function MyProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [listing, setListing] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      fetchMyProfile();
    }, [])
  );

  const fetchMyProfile = async () => {
    if (!profile) {
      setLoading(true);
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data) {
        setProfile(data);
        setName(data.name || 'You');
        setBio(data.bio || '');
        setAge(data.age ? data.age.toString() : '');
      }

      const { data: listingData } = await supabase.from('listings').select('*').eq('user_id', session.user.id).single();
      if (listingData) {
        setListing(listingData);
      } else {
        setListing(null);
      }
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (profile) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const updateData = { name, bio, age: age ? parseInt(age) : null };
        await supabase.from('profiles').update(updateData).eq('id', session.user.id);
        setProfile({ ...profile, ...updateData });
      }
    }
    setEditing(false);
    Alert.alert('Saved!', 'Your profile has been updated.');
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4], // Changed to 3:4 portrait so it fits well on Explore cards without bad scaling
      quality: 1, // Increased to max quality as requested
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        setUploading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const photoUri = result.assets[0].uri;
        
        // Convert URI to blob
        const response = await fetch(photoUri);
        const blob = await response.blob();

        // Create unique filename based on user ID and timestamp
        const fileExt = photoUri.split('.').pop() || 'jpeg';
        const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;

        // Upload to Supabase Storage 'Roommate' bucket
        const { error: uploadError } = await supabase.storage
          .from('Roommate')
          .upload(fileName, blob, {
            contentType: `image/${fileExt}`,
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get Public URL
        const { data } = supabase.storage.from('Roommate').getPublicUrl(fileName);
        const publicUrl = data.publicUrl;

        // Save URL to profile
        await supabase.from('profiles').update({ photoUrl: publicUrl }).eq('id', session.user.id);
        setProfile({ ...profile, photoUrl: publicUrl });

      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Upload Failed', 'There was an error uploading your profile picture.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator color="#fff" style={{marginTop: 40}} /></SafeAreaView>;
  }

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

  const lifestyleObj = profile.lifestyle ? (typeof profile.lifestyle === 'string' ? JSON.parse(profile.lifestyle) : profile.lifestyle) : {};
  const lifestyleEntries = Object.entries(lifestyleObj).filter(([k, v]) => k !== 'languages' && v);
  const languagesArr = lifestyleObj.languages || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Header with avatar */}
        <LinearGradient colors={['#1a1a24', '#000']} style={styles.heroSection}>
          <Pressable onPress={pickImage} style={styles.avatarWrapper} disabled={uploading}>
            {uploading ? (
              <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#333' }]}>
                <ActivityIndicator color="#6C63FF" />
              </View>
            ) : profile?.photoUrl ? (
              <Image source={{ uri: profile.photoUrl }} style={styles.avatar} contentFit="cover" transition={200} />
            ) : (
              <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#333' }]}>
                <IconSymbol name="person.crop.circle.fill" size={60} color="#666" />
              </View>
            )}
            <View style={styles.onlineDot} />
          </Pressable>

          {editing ? (
            <View style={styles.editInfoContainer}>
              <View style={styles.editNameRow}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.nameInput}
                  placeholder="Name"
                  placeholderTextColor="#666"
                />
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  style={[styles.nameInput, { minWidth: 60, marginLeft: 10 }]}
                  placeholder="Age"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <Pressable onPress={handleSaveProfile} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setEditing(true)} style={styles.nameRow}>
              <Text style={styles.profileName}>{name}{profile.age ? `, ${profile.age}` : ''}</Text>
              <IconSymbol name="pencil" size={18} color="#888" />
            </Pressable>
          )}

          <Text style={styles.profileSub}>Your profile is visible to nearby roommates</Text>
        </LinearGradient>

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

        {/* About Me / Bio */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>About Me</Text>
          {!editing && (
            <Pressable onPress={() => setEditing(true)}>
              <IconSymbol name="pencil" size={20} color="#888" />
            </Pressable>
          )}
        </View>
        <View style={styles.bioContainer}>
          {editing ? (
            <TextInput
              style={styles.bioInput}
              multiline
              placeholder="Write something about yourself..."
              placeholderTextColor="#666"
              value={bio}
              onChangeText={setBio}
            />
          ) : (
            <Pressable onPress={() => setEditing(true)}>
              <Text style={profile.bio ? styles.bioText : styles.emptySection}>
                {profile.bio || 'Tap to add bio...'}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.divider} />

        {/* My Apartment Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Mi Apartamento</Text>
          <Pressable onPress={() => router.push('/manage-listing')}>
            <IconSymbol name={listing ? "pencil.circle.fill" : "plus.circle.fill"} size={24} color="#FF9F1C" />
          </Pressable>
        </View>

        <View style={styles.listingContainer}>
          {listing ? (
            <Pressable onPress={() => router.push('/manage-listing')} style={styles.listingCard}>
              {listing.images && listing.images.length > 0 ? (
                <Image source={{ uri: listing.images[0] }} style={styles.listingImage} contentFit="cover" />
              ) : (
                <View style={[styles.listingImage, styles.listingImagePlaceholder]}>
                  <IconSymbol name="house.fill" size={32} color="#333" />
                </View>
              )}
              <View style={styles.listingDetails}>
                <Text style={styles.listingTitle} numberOfLines={1}>{listing.title || 'Untitled Room'}</Text>
                <Text style={styles.listingPrice}>${listing.price}/mes</Text>
                {listing.address && <Text style={styles.listingAddress} numberOfLines={1}>{listing.address}</Text>}
              </View>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push('/manage-listing')} style={[styles.addChip, { borderColor: '#FF9F1C', marginHorizontal: 20 }]}>
              <IconSymbol name="house.fill" size={16} color="#FF9F1C" />
              <Text style={[styles.addChipText, { color: '#FF9F1C' }]}>Publica tu cuarto o apartamento</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.divider} />

        {/* Hobbies */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>My Hobbies & Interests</Text>
          <Pressable onPress={() => router.push('/preferences')}>
            <IconSymbol name="plus.circle.fill" size={24} color="#6C63FF" />
          </Pressable>
        </View>
        <View style={styles.chipWrap}>
          {likesArr.length > 0 ? likesArr.map((tag: string) => (
            <View key={tag} style={styles.chip}>
              <Text style={styles.chipText}>{tag}</Text>
            </View>
          )) : (
            <Pressable onPress={() => router.push('/preferences')} style={styles.addChip}>
              <IconSymbol name="plus" size={16} color="#6C63FF" />
              <Text style={styles.addChipText}>Add Hobbies</Text>
            </Pressable>
          )}
        </View>

        {/* Lifestyle */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Lifestyle & Habits</Text>
          <Pressable onPress={() => router.push('/preferences')}>
            <IconSymbol name="plus.circle.fill" size={24} color="#00C9A7" />
          </Pressable>
        </View>
        <View style={styles.chipWrap}>
          {prefsArr.length > 0 && prefsArr.map((tag: string) => (
            <View key={tag} style={[styles.chip, { backgroundColor: '#071916', borderColor: '#00C9A7' }]}>
              <Text style={[styles.chipText, { color: '#00C9A7' }]}>{tag}</Text>
            </View>
          ))}
          {lifestyleEntries.length > 0 && lifestyleEntries.map(([key, val]: any) => (
            <View key={key} style={[styles.chip, { backgroundColor: '#071916', borderColor: '#00C9A7' }]}>
              <Text style={[styles.chipText, { color: '#00C9A7', fontWeight: 'bold' }]}>{val}</Text>
            </View>
          ))}
          {languagesArr.length > 0 && languagesArr.map((lang: string) => (
            <View key={`lang-${lang}`} style={[styles.chip, { backgroundColor: '#071916', borderColor: '#00C9A7' }]}>
              <Text style={[styles.chipText, { color: '#00C9A7' }]}>🗣️ {lang}</Text>
            </View>
          ))}
          
          {prefsArr.length === 0 && lifestyleEntries.length === 0 && languagesArr.length === 0 && (
            <Pressable onPress={() => router.push('/preferences')} style={[styles.addChip, { borderColor: '#00C9A7' }]}>
              <IconSymbol name="plus" size={16} color="#00C9A7" />
              <Text style={[styles.addChipText, { color: '#00C9A7' }]}>Add Lifestyle Details</Text>
            </Pressable>
          )}
        </View>

        {/* Dealbreakers */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Dealbreakers</Text>
          <Pressable onPress={() => router.push('/preferences')}>
            <IconSymbol name="plus.circle.fill" size={24} color="#FF6B6B" />
          </Pressable>
        </View>
        <View style={styles.chipWrap}>
          {dealsArr.length > 0 ? (<>{dealsArr.map((tag: string) => (
            <View key={tag} style={[styles.chip, { backgroundColor: '#1a0a0a', borderColor: '#FF6B6B' }]}>
              <Text style={[styles.chipText, { color: '#FF6B6B' }]}>{tag}</Text>
            </View>
          ))}</>) : (
            <Pressable onPress={() => router.push('/preferences')} style={[styles.addChip, { borderColor: '#FF6B6B' }]}>
              <IconSymbol name="plus" size={16} color="#FF6B6B" />
              <Text style={[styles.addChipText, { color: '#FF6B6B' }]}>Add Dealbreakers</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.divider} />

        {/* Premium Subscriptions */}
        <View style={styles.premiumSection}>
          <View style={styles.premiumHeader}>
            <IconSymbol name="star.fill" size={20} color="#FFD700" />
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

        <View style={styles.divider} />

        {/* Edit Preferences CTA */}
        <Pressable onPress={() => router.replace('/preferences')} style={styles.editBtn}>
          <IconSymbol name="slider.horizontal.3" size={20} color="#000" />
          <Text style={styles.editBtnText}>Edit My Preferences</Text>
        </Pressable>

        <View style={{ height: 16 }} />

        {/* Logout CTA */}
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
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
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 14,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
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
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#6C63FF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4ade80',
    borderWidth: 3,
    borderColor: '#1a1a24',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  emptySection: {
    color: '#555',
    fontSize: 16,
    fontStyle: 'italic',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    marginBottom: 12,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 99, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#6C63FF',
    borderStyle: 'dashed',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  addChipText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editInfoContainer: {
    alignItems: 'center',
    gap: 12,
  },
  bioContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  bioText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
  },
  bioInput: {
    backgroundColor: '#111',
    color: '#fff',
    fontSize: 16,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#333',
  },
  editBtn: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 30,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  editBtnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    marginHorizontal: 20,
    borderRadius: 30,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  logoutBtnText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
    fontSize: 16,
  },
  premiumSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  subCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subCardPopular: {
    borderColor: '#6C63FF',
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#6C63FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  subDuration: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subDesc: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  subPrice: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  listingContainer: {
    paddingHorizontal: 20,
  },
  listingCard: {
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  listingImage: {
    width: 100,
    height: 100,
  },
  listingImagePlaceholder: {
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingDetails: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  listingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listingPrice: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listingAddress: {
    color: '#888',
    fontSize: 12,
  },
});
