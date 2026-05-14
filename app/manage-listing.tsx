import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

export default function ManageListingScreen() {
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

    const { data } = await supabase.from('listings').select('*').eq('user_id', session.user.id).single();
    if (data) {
      setListingId(data.id);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setPrice(data.price ? data.price.toString() : '');
      setAddress(data.address || '');
      setImages(data.images || []);
      setUtilities(data.utilities_included || false);
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

    const listingData = {
      user_id: session.user.id,
      title,
      description,
      price: parseFloat(price),
      address,
      images,
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

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        setSaving(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const photoUri = result.assets[0].uri;
        const response = await fetch(photoUri);
        const blob = await response.blob();
        const fileExt = photoUri.split('.').pop() || 'jpeg';
        const fileName = `listing-${session.user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('Roommate').upload(fileName, blob, {
          contentType: `image/${fileExt}`,
        });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('Roommate').getPublicUrl(fileName);
        const publicUrl = data.publicUrl;

        setImages(prev => [...prev, publicUrl]);
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Could not upload image');
      } finally {
        setSaving(false);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {images.map((url, idx) => (
            <View key={idx} style={styles.imageWrapper}>
              <Image source={{ uri: url }} style={styles.image} contentFit="cover" />
              <Pressable style={styles.removeBtn} onPress={() => removeImage(idx)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#49C788" />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.addImageBtn} onPress={pickImage} disabled={saving}>
            <IconSymbol name="camera.fill" size={32} color="#49C788" />
            <Text style={styles.addImageText}>Add Photo</Text>
          </Pressable>
        </ScrollView>

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
  imageScroll: { flexDirection: 'row', marginTop: 8 },
  imageWrapper: { marginRight: 12, position: 'relative' },
  image: { width: 120, height: 120, borderRadius: 12 },
  removeBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#000', borderRadius: 12 },
  addImageBtn: { width: 120, height: 120, borderRadius: 12, borderWidth: 2, borderColor: '#49C788', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(108, 99, 255, 0.05)' },
  addImageText: { color: '#49C788', marginTop: 8, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#49C788', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { marginTop: 16, padding: 16, alignItems: 'center' },
  deleteBtnText: { color: '#49C788', fontSize: 16, fontWeight: 'bold' },
});
