import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Image,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';

type Apartment = {
  id: string;
  title: string | null;
  address: string | null;
  description: string | null;
  price: number | null;
  status: string | null;
  is_property_verified: boolean | null;
  created_at: string;
  user_id: string | null;
  images: string[] | null;
  latitude: number | null;
  longitude: number | null;
  utilities_included: boolean | null;
  // Simulated fields
  views?: number;
  appsCount?: number;
  favorites?: number;
  occupancyStatus?: 'available' | 'occupied';
};

const AMENITIES_LIST = [
  { key: 'wifi', label: 'WiFi', icon: 'wifi' },
  { key: 'ac', label: 'Aire Acondicionado', icon: 'air-conditioner' },
  { key: 'pool', label: 'Alberca / Piscina', icon: 'pool' },
  { key: 'gym', label: 'Gimnasio', icon: 'dumbbell' },
  { key: 'parking', label: 'Estacionamiento', icon: 'car' },
  { key: 'elevator', label: 'Elevador', icon: 'elevator' },
  { key: 'furnished', label: 'Amueblado', icon: 'sofa' },
  { key: 'pets', label: 'Mascotas Permitidas', icon: 'dog' },
];

export default function CompanyApartmentsScreen() {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [formUtilities, setFormUtilities] = useState(false);
  const [formImages, setFormImages] = useState('');
  const [occupancy, setOccupancy] = useState<'available' | 'occupied'>('available');

  // Floorplans & Amenities mock
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [floorplanUrl, setFloorplanUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const { locale } = useTranslation();
  const { accentColor } = useAdminTheme();

  const fetchApartments = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const currentUserId = session.user.id;

      let query = supabase
        .from('listings')
        .select('*')
        .eq('user_id', currentUserId);

      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        // Enriquecer con datos simulados de PMS almacenados localmente
        const enriched = await Promise.all(
          (data as Apartment[]).map(async (apt) => {
            const pmsKey = `pms_apt_meta:${apt.id}`;
            const cached = await AsyncStorage.getItem(pmsKey);
            const meta = cached ? JSON.parse(cached) : {
              views: Math.floor(Math.random() * 200) + 15,
              appsCount: Math.floor(Math.random() * 8),
              favorites: Math.floor(Math.random() * 40) + 5,
              occupancyStatus: Math.random() > 0.4 ? 'available' : 'occupied',
            };
            
            // Save to preserve values
            if (!cached) {
              await AsyncStorage.setItem(pmsKey, JSON.stringify(meta));
            }

            return {
              ...apt,
              views: meta.views,
              appsCount: meta.appsCount,
              favorites: meta.favorites,
              occupancyStatus: meta.occupancyStatus,
            };
          })
        );
        setApartments(enriched);
      }
    } catch (e) {
      console.error('Error fetching company apartments:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetchApartments();
  }, [fetchApartments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApartments();
  };

  const handleOpenForm = (apt: Apartment | null = null) => {
    setSelectedApartment(apt);
    if (apt) {
      setFormTitle(apt.title || '');
      setFormAddress(apt.address || '');
      setFormDescription(apt.description || '');
      setFormPrice(apt.price ? String(apt.price) : '');
      setFormStatus(apt.status || 'active');
      setFormUtilities(!!apt.utilities_included);
      setFormImages(apt.images ? apt.images.join(', ') : '');
      setOccupancy(apt.occupancyStatus || 'available');
      
      // Load cached amenities/media
      AsyncStorage.getItem(`pms_apt_ext:${apt.id}`).then((cached) => {
        if (cached) {
          const parsed = JSON.parse(cached);
          setSelectedAmenities(parsed.amenities || []);
          setFloorplanUrl(parsed.floorplanUrl || '');
          setVideoUrl(parsed.videoUrl || '');
        } else {
          setSelectedAmenities([]);
          setFloorplanUrl('');
          setVideoUrl('');
        }
      });
    } else {
      setFormTitle('');
      setFormAddress('');
      setFormDescription('');
      setFormPrice('');
      setFormStatus('active');
      setFormUtilities(false);
      setFormImages('');
      setOccupancy('available');
      setSelectedAmenities([]);
      setFloorplanUrl('');
      setVideoUrl('');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formPrice.trim()) {
      Alert.alert(locale === 'es' ? 'Error' : 'Error', locale === 'es' ? 'El título y el precio son obligatorios.' : 'Title and Price are required.');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const currentUserId = session.user.id;

      const imgsArray = formImages.split(',').map(s => s.trim()).filter(Boolean);
      const defaultImg = imgsArray.length > 0 ? imgsArray : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'];

      const payload = {
        title: formTitle.trim(),
        address: formAddress.trim(),
        description: formDescription.trim(),
        price: Number(formPrice),
        status: formStatus,
        utilities_included: formUtilities,
        images: defaultImg,
        latitude: 9.9281, // Default coordinates
        longitude: -84.0907,
        user_id: currentUserId,
      };

      let aptId = '';

      if (selectedApartment) {
        // Edit existing
        const { error } = await supabase
          .from('listings')
          .update(payload)
          .eq('id', selectedApartment.id);
        if (error) throw error;
        aptId = selectedApartment.id;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('listings')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        aptId = data.id;
      }

      // Save PMS specific metadata
      const pmsMetaKey = `pms_apt_meta:${aptId}`;
      const existingMeta = await AsyncStorage.getItem(pmsMetaKey);
      const meta = existingMeta ? JSON.parse(existingMeta) : {
        views: Math.floor(Math.random() * 40) + 5,
        appsCount: 0,
        favorites: Math.floor(Math.random() * 10),
      };
      meta.occupancyStatus = occupancy;
      await AsyncStorage.setItem(pmsMetaKey, JSON.stringify(meta));

      // Save amenities and additional PMS media
      await AsyncStorage.setItem(`pms_apt_ext:${aptId}`, JSON.stringify({
        amenities: selectedAmenities,
        floorplanUrl,
        videoUrl,
      }));

      // Log activity
      const auditLog = {
        timestamp: new Date().toISOString(),
        action: selectedApartment ? `Apartamento "${formTitle}" actualizado` : `Apartamento "${formTitle}" creado`,
        adminName: 'PMS Hub',
      };
      const existingLogs = await AsyncStorage.getItem(`admin_user_audit:${currentUserId}`);
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      await AsyncStorage.setItem(`admin_user_audit:${currentUserId}`, JSON.stringify([auditLog, ...logs]));

      setModalVisible(false);
      Alert.alert(locale === 'es' ? 'Éxito' : 'Success', locale === 'es' ? 'Datos guardados correctamente.' : 'Apartment saved successfully.');
      fetchApartments();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save apartment');
      setLoading(false);
    }
  };

  const handleDuplicate = async (apt: Apartment) => {
    const performDuplicate = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const payload = {
          title: `${apt.title} (Copy)`,
          address: apt.address,
          description: apt.description,
          price: apt.price,
          status: 'active',
          utilities_included: apt.utilities_included,
          images: apt.images,
          latitude: apt.latitude || 9.9281,
          longitude: apt.longitude || -84.0907,
          user_id: session.user.id,
        };

        const { data, error } = await supabase
          .from('listings')
          .insert(payload)
          .select('id')
          .single();

        if (error) throw error;

        // Duplicate metadata
        const newAptId = data.id;
        await AsyncStorage.setItem(`pms_apt_meta:${newAptId}`, JSON.stringify({
          views: 0,
          appsCount: 0,
          favorites: 0,
          occupancyStatus: 'available',
        }));

        // Fetch ext media from original
        const cachedExt = await AsyncStorage.getItem(`pms_apt_ext:${apt.id}`);
        if (cachedExt) {
          await AsyncStorage.setItem(`pms_apt_ext:${newAptId}`, cachedExt);
        }

        Alert.alert(locale === 'es' ? 'Éxito' : 'Success', locale === 'es' ? 'Anuncio duplicado correctamente.' : 'Listing duplicated successfully.');
        fetchApartments();
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to duplicate listing');
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        locale === 'es' 
          ? `¿Duplicar anuncio de "${apt.title}"?`
          : `Duplicate listing "${apt.title}"?`
      );
      if (confirmed) performDuplicate();
    } else {
      Alert.alert(
        locale === 'es' ? 'Duplicar Anuncio' : 'Duplicate Listing',
        locale === 'es' 
          ? `¿Estás seguro de duplicar este anuncio? Se creará una copia en estado disponible.`
          : `Are you sure you want to duplicate this listing? It will create a copy marked as available.`,
        [
          { text: locale === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
          { text: locale === 'es' ? 'Duplicar' : 'Duplicate', style: 'default', onPress: performDuplicate },
        ]
      );
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const performDelete = async () => {
      try {
        setLoading(true);
        const { error } = await supabase.from('listings').delete().eq('id', id);
        if (error) throw error;

        // Remove storage items
        await AsyncStorage.removeItem(`pms_apt_meta:${id}`);
        await AsyncStorage.removeItem(`pms_apt_ext:${id}`);

        Alert.alert(locale === 'es' ? 'Éxito' : 'Deleted', locale === 'es' ? 'Apartamento eliminado.' : 'Apartment deleted successfully.');
        fetchApartments();
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to delete listing');
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        locale === 'es' 
          ? `¿Eliminar permanentemente "${title}"?`
          : `Permanently delete "${title}"?`
      );
      if (confirmed) performDelete();
    } else {
      Alert.alert(
        locale === 'es' ? 'Confirmar Eliminación' : 'Confirm Delete',
        locale === 'es' 
          ? `Esta acción es permanente. ¿Eliminar "${title}"?`
          : `This action is permanent. Delete "${title}"?`,
        [
          { text: locale === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
          { text: locale === 'es' ? 'Eliminar' : 'Delete', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  const toggleAmenity = (key: string) => {
    if (selectedAmenities.includes(key)) {
      setSelectedAmenities(selectedAmenities.filter(k => k !== key));
    } else {
      setSelectedAmenities([...selectedAmenities, key]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.pageTitle}>{locale === 'es' ? 'Mis Departamentos' : 'My Apartments'}</Text>
            <Text style={styles.pageSubtitle}>
              {locale === 'es' ? 'Gestiona la disponibilidad, rentas y contenidos.' : 'Manage availability, rental prices, and listings.'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: accentColor }]}
            onPress={() => handleOpenForm(null)}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#000" />
            <Text style={styles.addBtnText}>{locale === 'es' ? 'Nuevo' : 'New'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Searchbar */}
      <View style={styles.searchBarContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={locale === 'es' ? 'Buscar departamento...' : 'Search apartments...'}
          placeholderTextColor="#666"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <FlatList
          data={apartments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image
                source={{ uri: item.images?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80' }}
                style={styles.cardImage}
              />
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.occupancyStatus === 'occupied' ? 'rgba(168,85,247,0.12)' : 'rgba(73,199,136,0.12)' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: item.occupancyStatus === 'occupied' ? '#a855f7' : '#49C788' }
                    ]}>
                      {item.occupancyStatus === 'occupied' 
                        ? (locale === 'es' ? 'Ocupado' : 'Occupied') 
                        : (locale === 'es' ? 'Disponible' : 'Available')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardAddress} numberOfLines={1}>
                  <MaterialCommunityIcons name="map-marker-outline" size={12} color="#666" /> {item.address || 'Escazú, San José'}
                </Text>

                <View style={styles.cardStats}>
                  <Text style={styles.cardPrice}>${item.price} <Text style={styles.pricePeriod}>/ mo</Text></Text>
                  <View style={styles.metricsBox}>
                    <View style={styles.statMini}>
                      <MaterialCommunityIcons name="eye-outline" size={12} color="#888" />
                      <Text style={styles.statMiniText}>{item.views}</Text>
                    </View>
                    <View style={styles.statMini}>
                      <MaterialCommunityIcons name="clipboard-text-outline" size={12} color="#888" />
                      <Text style={styles.statMiniText}>{item.appsCount}</Text>
                    </View>
                    <View style={styles.statMini}>
                      <MaterialCommunityIcons name="heart-outline" size={12} color="#888" />
                      <Text style={styles.statMiniText}>{item.favorites}</Text>
                    </View>
                  </View>
                </View>

                {/* Actions Row */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: 'rgba(255,255,255,0.06)' }]}
                    onPress={() => handleOpenForm(item)}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={14} color="#aaa" />
                    <Text style={styles.actionBtnText}>{locale === 'es' ? 'Editar' : 'Edit'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: 'rgba(255,255,255,0.06)' }]}
                    onPress={() => handleDuplicate(item)}
                  >
                    <MaterialCommunityIcons name="content-copy" size={14} color="#aaa" />
                    <Text style={styles.actionBtnText}>{locale === 'es' ? 'Duplicar' : 'Duplicate'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: 'rgba(255,68,68,0.1)' }]}
                    onPress={() => handleDelete(item.id, item.title || 'Untitled')}
                  >
                    <MaterialCommunityIcons name="delete-outline" size={14} color="#ff4444" />
                    <Text style={[styles.actionBtnText, { color: '#ff4444' }]}>{locale === 'es' ? 'Eliminar' : 'Delete'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="office-building" size={48} color="#333" />
              <Text style={styles.emptyText}>
                {locale === 'es' ? 'No tienes departamentos publicados' : 'No apartments listed'}
              </Text>
            </View>
          }
        />
      )}

      {/* Add / Edit Form Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedApartment
                  ? (locale === 'es' ? 'Editar Departamento' : 'Edit Apartment')
                  : (locale === 'es' ? 'Publicar Departamento' : 'List Apartment')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 32 }}>
              {/* General Section */}
              <Text style={styles.formSectionTitle}>{locale === 'es' ? 'Datos Básicos' : 'Basic Info'}</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{locale === 'es' ? 'Título del Anuncio' : 'Listing Title'}</Text>
                <TextInput
                  style={styles.formInput}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="Escibe el título..."
                  placeholderTextColor="#555"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{locale === 'es' ? 'Dirección' : 'Address'}</Text>
                <TextInput
                  style={styles.formInput}
                  value={formAddress}
                  onChangeText={setFormAddress}
                  placeholder="Calle, Ciudad, Estado..."
                  placeholderTextColor="#555"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>{locale === 'es' ? 'Renta Mensual ($)' : 'Monthly Rent ($)'}</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formPrice}
                    onChangeText={formText => setFormPrice(formText.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    placeholder="800"
                    placeholderTextColor="#555"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>{locale === 'es' ? 'Estado de Ocupación' : 'Occupancy Status'}</Text>
                  <View style={styles.occupancyToggleContainer}>
                    <TouchableOpacity
                      style={[styles.occupancyBtn, occupancy === 'available' && { backgroundColor: `${accentColor}20`, borderColor: accentColor }]}
                      onPress={() => setOccupancy('available')}
                    >
                      <Text style={[styles.occupancyBtnText, { color: occupancy === 'available' ? accentColor : '#888' }]}>
                        {locale === 'es' ? 'Disp' : 'Avail'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.occupancyBtn, occupancy === 'occupied' && { backgroundColor: 'rgba(168,85,247,0.2)', borderColor: '#a855f7' }]}
                      onPress={() => setOccupancy('occupied')}
                    >
                      <Text style={[styles.occupancyBtnText, { color: occupancy === 'occupied' ? '#a855f7' : '#888' }]}>
                        {locale === 'es' ? 'Ocup' : 'Occ'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{locale === 'es' ? 'Descripción' : 'Description'}</Text>
                <TextInput
                  style={[styles.formInput, { minHeight: 80, textAlignVertical: 'top' }]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  multiline
                  numberOfLines={4}
                  placeholder="Detalles sobre el espacio..."
                  placeholderTextColor="#555"
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>{locale === 'es' ? 'Servicios Incluidos' : 'Utilities Included'}</Text>
                  <Text style={styles.toggleDesc}>{locale === 'es' ? 'Luz, agua e internet incluidos en la renta.' : 'Electricity, water, wifi included.'}</Text>
                </View>
                <Switch
                  value={formUtilities}
                  onValueChange={setFormUtilities}
                  trackColor={{ false: '#333', true: `${accentColor}80` }}
                  thumbColor={formUtilities ? accentColor : '#f4f3f4'}
                />
              </View>

              {/* Media Section */}
              <Text style={styles.formSectionTitle}>{locale === 'es' ? 'Multimedia & Planos' : 'Media & Floorplans'}</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{locale === 'es' ? 'Imágenes (URLs separadas por coma)' : 'Image URLs (comma separated)'}</Text>
                <TextInput
                  style={styles.formInput}
                  value={formImages}
                  onChangeText={setFormImages}
                  placeholder="https://images.com/photo1.jpg, ..."
                  placeholderTextColor="#555"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{locale === 'es' ? 'Plano de Planta (URL del PDF / Imagen)' : 'Floor Plan (PDF / Image URL)'}</Text>
                <TextInput
                  style={styles.formInput}
                  value={floorplanUrl}
                  onChangeText={setFloorplanUrl}
                  placeholder="https://images.com/floorplan.png"
                  placeholderTextColor="#555"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{locale === 'es' ? 'Video Tour (URL de Youtube / Vimeo)' : 'Video Tour URL'}</Text>
                <TextInput
                  style={styles.formInput}
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                  placeholder="https://youtube.com/watch?v=..."
                  placeholderTextColor="#555"
                />
              </View>

              {/* Amenities Section */}
              <Text style={styles.formSectionTitle}>{locale === 'es' ? 'Comodidades (Amenities)' : 'Amenities'}</Text>
              <View style={styles.amenitiesGrid}>
                {AMENITIES_LIST.map((amenity) => {
                  const selected = selectedAmenities.includes(amenity.key);
                  return (
                    <TouchableOpacity
                      key={amenity.key}
                      style={[styles.amenityChip, selected && { backgroundColor: `${accentColor}18`, borderColor: accentColor }]}
                      onPress={() => toggleAmenity(amenity.key)}
                    >
                      <MaterialCommunityIcons name={amenity.icon as any} size={15} color={selected ? accentColor : '#666'} />
                      <Text style={[styles.amenityChipText, { color: selected ? accentColor : '#888' }]}>{amenity.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelActionBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelActionText}>{locale === 'es' ? 'Cancelar' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmActionBtn, { backgroundColor: accentColor }]} onPress={handleSave}>
                <Text style={styles.confirmActionText}>{locale === 'es' ? 'Guardar' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#12121a',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#111',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardAddress: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    paddingBottom: 14,
  },
  cardPrice: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  pricePeriod: {
    color: '#555',
    fontSize: 12,
    fontWeight: '500',
  },
  metricsBox: {
    flexDirection: 'row',
    gap: 12,
  },
  statMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statMiniText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    gap: 6,
  },
  actionBtnText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: '#555',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0c0c14',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    height: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formSectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    paddingLeft: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  occupancyToggleContainer: {
    flexDirection: 'row',
    gap: 6,
    height: 42,
  },
  occupancyBtn: {
    flex: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  occupancyBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 10,
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleDesc: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  amenityChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  cancelActionBtn: {
    flex: 1,
    backgroundColor: '#1b1b24',
    borderRadius: 10,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmActionBtn: {
    flex: 1,
    borderRadius: 10,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmActionText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
