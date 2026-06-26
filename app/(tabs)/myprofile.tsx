import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { uploadToSupabase, getCleanExtension } from '@/utils/file';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useCallback, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../context/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { useMyProfile, useUpdateProfileMutation } from '@/hooks/useProfileQueries';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileLifestyleDetails from '@/components/profile/ProfileLifestyleDetails';
import EditProfileModal from '@/components/profile/EditProfileModal';

export default function MyProfileScreen() {
  const { t, translateHobby, translateDealbreaker, translateLifestyleKey, translateLifestyleVal, translateLanguage } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useMyProfile();
  const updateProfileMutation = useUpdateProfileMutation();

  const profile = data?.profile || null;
  const listing = data?.listing || null;
  const contractCount = data?.contractCount || 0;
  const pendingCount = data?.pendingCount || 0;

  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [status, setStatus] = useState<string>('exploring');

  const STATUS_OPTIONS = [
    { id: 'looking_urgent', label: t('explore.looking_urgent'), color: '#34C759', icon: 'lightning-bolt' },
    { id: 'exploring', label: t('explore.exploring'), color: '#FFCC00', icon: 'compass' },
    { id: 'have_room', label: t('explore.have_room'), color: '#0A84FF', icon: 'home-account' }
  ];

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setBio(profile.bio || '');
      setAge(profile.age ? profile.age.toString() : '');
      setStatus(profile.availability_status || 'exploring');
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleSaveProfile = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        name,
        bio,
        age: age ? parseInt(age) : null,
      });
      setEditing(false);
      Alert.alert(t('general.saved'), t('myprofile.saved_alert'));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar el perfil');
    }
  };

  const updateStatus = async (newStatus: string) => {
    setStatus(newStatus);
    try {
      await updateProfileMutation.mutateAsync({
        availability_status: newStatus,
      });
    } catch (err) {
      console.log('Error updating status:', err);
    }
  };

  const pickImage = async (slotIndex?: number) => {
    const targetIdx = typeof slotIndex === 'number' ? slotIndex : 0;
    
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
        const fileExt = getCleanExtension(photoUri, result.assets[0].mimeType);
        const fileName = `${session.user.id}-${Date.now()}-${targetIdx}.${fileExt}`;

        // Upload to Supabase Storage 'Roommate' bucket using unified platform-safe helper
        await uploadToSupabase('Roommate', fileName, photoUri, `image/${fileExt}`);

        // Get Public URL
        const { data } = supabase.storage.from('Roommate').getPublicUrl(fileName);
        const publicUrl = data.publicUrl;

        // Fetch current profile to get latest photos array
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('photos, photoUrl')
          .eq('id', session.user.id)
          .single();

        let updatedPhotos = Array.isArray(currentProfile?.photos) ? [...currentProfile.photos] : [];
        
        // Pad the array to ensure we can set at the specific index
        while (updatedPhotos.length < 5) {
          updatedPhotos.push(updatedPhotos.length === 0 ? (currentProfile?.photoUrl || '') : '');
        }

        // Update photo at targeted index
        updatedPhotos[targetIdx] = publicUrl;

        const updatePayload: any = { photos: updatedPhotos };
        if (targetIdx === 0) {
          updatePayload.photoUrl = publicUrl;
        }

        // Save URL to profile
        await supabase.from('profiles').update(updatePayload).eq('id', session.user.id);
        
        queryClient.invalidateQueries({ queryKey: ['myProfile'] });

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

  if (isLoading && !profile) {
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

  // Label mapping for lifestyle keys → human-readable category names with emojis
  const LIFESTYLE_LABELS: Record<string, { label: string; emoji: string }> = {
    sleep: { label: 'Sleep', emoji: '🌙' },
    cleanliness: { label: 'Cleanliness', emoji: '🧹' },
    social: { label: 'Personality', emoji: '🧠' },
    parties: { label: 'Parties', emoji: '🎉' },
    pets: { label: 'Pets', emoji: '🐾' },
    smoking: { label: 'Smoking', emoji: '🚬' },
    music: { label: 'Loud Music', emoji: '🎵' },
    work: { label: 'Work Style', emoji: '💼' },
    occupation: { label: 'Occupation', emoji: '👔' },
    budget: { label: 'Budget', emoji: '💰' },
    cooking: { label: 'Cooking', emoji: '🍳' },
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Header with avatar */}
        <ProfileHeader
          profile={profile}
          insets={insets}
          uploading={uploading}
          name={name}
          age={age}
          status={status}
          STATUS_OPTIONS={STATUS_OPTIONS}
          onPickImage={pickImage}
          onEditPress={() => setEditing(true)}
          onSettingsPress={() => router.push('/settings')}
          onUpdateStatus={updateStatus}
          t={t}
        />

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{likesArr.length}</Text>
            <Text style={styles.statLabel}>{t('myprofile.interests_stat')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{prefsArr.length}</Text>
            <Text style={styles.statLabel}>{t('myprofile.prefs_stat')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{dealsArr.length}</Text>
            <Text style={styles.statLabel}>{t('myprofile.deals_stat')}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Biografía (Bio & Profile Photos) */}
        <Text style={styles.sectionTitle}>{t('myprofile.gallery')}</Text>
        <View style={styles.photosManagerContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScrollContent}>
            {(() => {
              const photosList = Array.isArray(profile?.photos) ? [...profile.photos] : [];
              const slots = Array.from({ length: 5 }, (_, i) => photosList[i] || (i === 0 ? profile?.photoUrl : null));
              
              return slots.map((uri, index) => (
                <Pressable
                  key={index}
                  style={[styles.photoSlot, !uri && styles.emptyPhotoSlot]}
                  onPress={() => pickImage(index)}
                  disabled={uploading}
                >
                  {uri ? (
                    <>
                      <Image source={{ uri }} style={styles.slotImage} contentFit="cover" />
                      <View style={styles.slotBadge}>
                        <Text style={styles.slotBadgeText}>{index + 1}</Text>
                      </View>
                      <View style={styles.editCameraOverlay}>
                        <MaterialCommunityIcons name="camera" size={14} color="#fff" />
                      </View>
                    </>
                  ) : (
                    <View style={styles.emptySlotContent}>
                      <View style={styles.emptySlotPlusCircle}>
                        <MaterialCommunityIcons name="plus" size={18} color="#49C788" />
                      </View>
                      <Text style={styles.emptySlotText}>{t('myprofile.slot')} {index + 1}</Text>
                    </View>
                  )}
                </Pressable>
              ));
            })()}
          </ScrollView>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Sobre Mí / Bio */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('myprofile.about_me')}</Text>
          <Pressable onPress={() => setEditing(true)}>
            <IconSymbol name="pencil" size={20} color="#888" />
          </Pressable>
        </View>
        <View style={styles.bioContainer}>
          <Pressable onPress={() => setEditing(true)}>
            <Text style={profile.bio ? styles.bioText : styles.emptySection}>
              {profile.bio || t('myprofile.tap_bio')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        {/* My Apartment Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('myprofile.my_apartment')}</Text>
          <Pressable onPress={() => router.push('/manage-listing')}>
            <IconSymbol name={listing ? "pencil.circle.fill" : "plus.circle.fill"} size={24} color="#FFB800" />
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
                <Text style={styles.listingTitle} numberOfLines={1}>{listing.title || t('myprofile.untitled_room')}</Text>
                <Text style={styles.listingPrice}>${listing.price}/{t('myprofile.month')}</Text>
                {listing.address && <Text style={styles.listingAddress} numberOfLines={1}>{listing.address}</Text>}
              </View>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push('/manage-listing')} style={[styles.addChip, { borderColor: '#FFB800', marginHorizontal: 20 }]}>
              <IconSymbol name="house.fill" size={16} color="#FFB800" />
              <Text style={[styles.addChipText, { color: '#FFB800' }]}>{t('myprofile.list_room')}</Text>
            </Pressable>
          )}
        </View>

              <ProfileLifestyleDetails
          likesArr={likesArr}
          prefsArr={prefsArr}
          dealsArr={dealsArr}
          lifestyleEntries={lifestyleEntries}
          languagesArr={languagesArr}
          LIFESTYLE_LABELS={LIFESTYLE_LABELS}
          translateHobby={translateHobby}
          translateDealbreaker={translateDealbreaker}
          translateLifestyleKey={translateLifestyleKey}
          translateLifestyleVal={translateLifestyleVal}
          translateLanguage={translateLanguage}
          router={router}
          t={t}
        />

        {/* Edit Preferences CTA */}
        <Pressable onPress={() => router.replace('/preferences')} style={styles.editBtn}>
          <IconSymbol name="slider.horizontal.3" size={20} color="#000" />
          <Text style={styles.editBtnText}>{t('myprofile.edit_prefs')}</Text>
        </Pressable>

        <View style={{ height: 16 }} />

        {/* ── Trust & Safety ── */}
        <View style={styles.divider} />
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('myprofile.trust_center')}</Text>
          <MaterialCommunityIcons name="shield-check" size={22} color="#0A84FF" />
        </View>
        <Pressable style={s.trustCard} onPress={() => router.push('/trust')}>
          <View style={s.trustIconWrap}>
            <MaterialCommunityIcons name="shield-account" size={32} color="#0A84FF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.trustTitle}>{t('myprofile.trust_center')}</Text>
            <Text style={s.trustSub}>{t('myprofile.trust_sub')} <Text style={{fontWeight: '800', color: (profile?.trust_score ?? 0) > 75 ? '#34C759' : '#FFD60A'}}>{profile?.trust_score || 20}/100</Text></Text>
            <Text style={s.trustHint}>{t('myprofile.trust_hint')}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#444" />
        </Pressable>

        <View style={{ height: 16 }} />

        {/* ── Legal Hub ── */}
        <View style={styles.divider} />
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('myprofile.legal_hub')}</Text>
          <MaterialCommunityIcons name="gavel" size={22} color="#49C788" />
        </View>
        <Pressable style={styles.legalCard} onPress={() => router.push('/contracts')}>
          <LinearGradient colors={['rgba(73,199,136,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.legalIconWrap}>
            <MaterialCommunityIcons name="file-sign" size={28} color="#49C788" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.legalTitle}>{t('myprofile.contracts_sub')}</Text>
            <Text style={styles.legalSub}>
              {contractCount === 0
                ? t('myprofile.no_contracts')
                : `${contractCount} ${contractCount !== 1 ? t('myprofile.contracts_count_plural') : t('myprofile.contracts_count')}${pendingCount > 0 ? ` · ${pendingCount} ${t('myprofile.pending_count')}` : ''}`
              }
            </Text>
          </View>
          {pendingCount > 0 && (
            <View style={styles.legalBadge}>
              <Text style={styles.legalBadgeText}>{pendingCount}</Text>
            </View>
          )}
          <MaterialCommunityIcons name="chevron-right" size={20} color="#444" />
        </Pressable>


        <View style={{ height: 16 }} />

        {/* Logout CTA */}
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutBtnText}>{t('myprofile.logout')}</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>

      <EditProfileModal
        visible={editing}
        onClose={() => setEditing(false)}
        name={name}
        onChangeName={setName}
        age={age}
        onChangeAge={setAge}
        bio={bio}
        onChangeBio={setBio}
        onSave={handleSaveProfile}
        t={t}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scroll: {
    paddingBottom: 30,
    width: '100%',
    alignSelf: 'center',
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
    backgroundColor: '#49C788',
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 14,
    shadowColor: '#49C788',
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
  premiumWheelBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#333',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#49C788',
    zIndex: 10,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#49C788',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#49C788',
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
    borderBottomColor: '#49C788',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 140,
  },
  saveBtn: {
    backgroundColor: '#49C788',
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
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 20,
    borderRadius: 16,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
  lifestyleSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  lifestyleCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  lifestyleCategoryLabel: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 120,
  },
  chipWrapInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    color: '#e0e0e0',
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
    backgroundColor: 'rgba(73, 199, 136, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(73, 199, 136, 0.2)',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  addChipText: {
    color: '#49C788',
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
    borderColor: 'rgba(255, 75, 75, 0.3)',
  },
  logoutBtnText: {
    color: '#FF4B4B',
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
    color: '#49C788',
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
    borderColor: '#49C788',
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#49C788',
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
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  listingImage: {
    width: 100,
    height: 100,
  },
  legalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: 'rgba(73,199,136,0.25)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    gap: 14,
  },
  legalIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(73,199,136,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  legalSub: {
    color: '#666',
    fontSize: 12,
  },
  legalBadge: {
    backgroundColor: '#FFB800',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
  legalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
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
    color: '#49C788',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listingAddress: {
    color: '#888',
    fontSize: 12,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#49C788',
    borderRadius: 20,
    paddingVertical: 10,
    gap: 6,
  },
  actionChipText: {
    color: '#49C788',
    fontSize: 14,
    fontWeight: '700',
  },
  statusChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  photosManagerContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  photosScrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  photoSlot: {
    width: 100,
    height: 130,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
  },
  emptyPhotoSlot: {
    borderStyle: 'dashed',
    borderColor: '#49C788',
    backgroundColor: 'rgba(73, 199, 136, 0.05)',
  },
  slotImage: {
    width: 100,
    height: 130,
  },
  slotBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  slotBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  editCameraOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#49C788',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  emptySlotContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  emptySlotPlusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(73, 199, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotText: {
    color: '#49C788',
    fontSize: 11,
    fontWeight: '700',
  },
});

const s = StyleSheet.create({
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    gap: 14,
  },
  trustIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  trustSub: {
    color: '#aaa',
    fontSize: 13,
  },
  trustHint: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  }
});
