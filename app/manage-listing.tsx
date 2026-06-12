import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { uriToBlob } from '@/utils/file';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ManageListingScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listingId, setListingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [utilities, setUtilities] = useState(false);

  useEffect(() => {
    fetchListing();
  }, []);

  const fetchListing = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (id) {
      const { data } = await supabase.from('listings').select('*').eq('id', id).single();
      if (data && data.user_id === session.user.id) {
        setListingId(data.id);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setPrice(data.price ? data.price.toString() : '');
        setAddress(data.address || '');
        setImages(data.images || []);
        setUtilities(data.utilities_included || false);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!title || !price) {
      Alert.alert('Error', 'Title and Price are required.');
      return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const cleanImages = images.filter(Boolean);
    const listingData = {
      user_id: session.user.id,
      title,
      description,
      price: parseFloat(price),
      address,
      images: cleanImages,
      utilities_included: utilities,
      status: 'available',
    };

    if (listingId) {
      const { error } = await supabase.from('listings').update(listingData).eq('id', listingId);
      if (error) Alert.alert('Error', error.message);
      else {
        Alert.alert('Success', 'Listing updated!');
        router.back();
      }
    } else {
      const { error } = await supabase.from('listings').insert([listingData]);
      if (error) Alert.alert('Error', error.message);
      else {
        Alert.alert('Success', 'Listing created!');
        router.back();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!listingId) return;
    Alert.alert('Delete Listing', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setSaving(true);
        await supabase.from('listings').delete().eq('id', listingId);
        setSaving(false);
        router.back();
      }}
    ]);
  };

  const pickImage = async (slotIndex?: number) => {
    const targetIdx = typeof slotIndex === 'number' ? slotIndex : 0;
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        setSaving(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const photoUri = result.assets[0].uri;
        const blob = await uriToBlob(photoUri);
        const fileExt = photoUri.split('.').pop() || 'jpeg';
        const fileName = `listing-${session.user.id}-${Date.now()}-${targetIdx}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('Roommate').upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('Roommate').getPublicUrl(fileName);
        const publicUrl = data.publicUrl;

        setImages(prev => {
          let updated = Array.isArray(prev) ? [...prev] : [];
          while (updated.length < 5) {
            updated.push('');
          }
          updated[targetIdx] = publicUrl;
          return updated;
        });
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Could not upload image');
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#49C788" size="large" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#49C788" />
          <Text style={styles.headerTitle}>My Apartment</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Spacious Sunny Room in Downtown" placeholderTextColor="#666" />

        <Text style={styles.label}>Monthly Price ($)</Text>
        <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="800" keyboardType="numeric" placeholderTextColor="#666" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Describe the room, house rules, vibe..." multiline placeholderTextColor="#666" />

        <Text style={styles.label}>Location / Address</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Neighborhood or Street" placeholderTextColor="#666" />

        <Pressable 
          style={styles.toggleBtn} 
          onPress={() => setUtilities(!utilities)}
        >
          <View style={[styles.checkbox, utilities && styles.checkboxActive]}>
            {utilities && <IconSymbol name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.toggleText}>Utilities Included in Price</Text>
        </Pressable>

        <Text style={styles.label}>Photos</Text>
        <View style={styles.photosManagerContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScrollContent}>
            {(() => {
              const photosList = Array.isArray(images) ? [...images] : [];
              const slots = Array.from({ length: 5 }, (_, i) => photosList[i] || '');
              
              return slots.map((uri, index) => (
                <Pressable
                  key={index}
                  style={[styles.photoSlot, !uri && styles.emptyPhotoSlot]}
                  onPress={() => pickImage(index)}
                  disabled={saving}
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
                      <Text style={styles.emptySlotText}>Slot {index + 1}</Text>
                    </View>
                  )}
                </Pressable>
              ));
            })()}
          </ScrollView>
        </View>

        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Listing</Text>}
        </Pressable>

        {listingId && (
          <Pressable style={styles.deleteBtn} onPress={handleDelete} disabled={saving}>
            <Text style={styles.deleteBtnText}>Delete Listing</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  scroll: { padding: 20, paddingBottom: 60 },
  label: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#111', color: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333', fontSize: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#49C788', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxActive: { backgroundColor: '#49C788' },
  toggleText: { color: '#fff', fontSize: 16 },
  photosManagerContainer: {
    marginBottom: 20,
  },
  photosScrollContent: {
    gap: 12,
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
    width: '100%',
    height: '100%',
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
  saveBtn: { backgroundColor: '#49C788', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { marginTop: 16, padding: 16, alignItems: 'center' },
  deleteBtnText: { color: '#49C788', fontSize: 16, fontWeight: 'bold' },
});
