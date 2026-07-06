import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, RefreshControl, Alert, Modal, Switch,
  Image, Dimensions, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';

type Listing = {
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
  contracts?: { id: string; status: string }[] | null;
};

type ListingStats = {
  total: number;
  active: number;
  pending: number;
  verified: number;
  avgPrice: number;
};

type OwnerProfile = {
  id: string;
  name: string;
  role: string | null;
  trust_score: number | null;
  photoUrl: string | null;
  is_identity_verified: boolean | null;
};

type PropertyAuditLog = {
  timestamp: string;
  action: string;
  adminName: string;
};

const STATUSES = ['all', 'active', 'inactive', 'pending'];
const VERIFICATIONS = ['all', 'verified', 'unverified'];

const BULK_PLACEHOLDER = `[
  {
    "title": "Cozy Studio in Escazú",
    "address": "Escazú, San José, Costa Rica",
    "price": 450,
    "latitude": 9.9167,
    "longitude": -84.1333,
    "utilities_included": true,
    "status": "active"
  }
]`;

export default function AdminListings() {
  const [tab, setTab] = useState<'list' | 'import'>('list');

  // List & Filter States
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterVerification, setFilterVerification] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, price-asc, price-desc
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);

  // Stats State
  const [stats, setStats] = useState<ListingStats>({
    total: 0, active: 0, pending: 0, verified: 0, avgPrice: 0
  });

  // Detailed Modal States
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'gallery' | 'owner' | 'audit'>('general');

  // Editable fields in Modal
  const [editTitle, setEditTitle] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLatitude, setEditLatitude] = useState('');
  const [editLongitude, setEditLongitude] = useState('');
  const [editUtilities, setEditUtilities] = useState(false);
  
  // Admin local metadata
  const [adminNotes, setAdminNotes] = useState('');
  const [auditLogs, setAuditLogs] = useState<PropertyAuditLog[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);

  // Import state
  const [jsonInput, setJsonInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);

  const { locale, t } = useTranslation();
  const { accentColor } = useAdminTheme();

  const STATUS_COLOR: Record<string, string> = {
    active: accentColor, inactive: '#888', pending: '#f97316',
  };

  const translateStatus = (st: string) => {
    if (st === 'active') return locale === 'es' ? 'Activo' : 'Active';
    if (st === 'inactive') return locale === 'es' ? 'Inactivo' : 'Inactive';
    if (st === 'pending') return locale === 'es' ? 'Pendiente' : 'Pending';
    return st;
  };

  const translateRole = (role: string) => {
    if (role === 'seeker') return locale === 'es' ? 'Buscador' : 'Seeker';
    if (role === 'host') return locale === 'es' ? 'Anfitrión' : 'Host';
    if (role === 'landlord') return locale === 'es' ? 'Propietario' : 'Landlord';
    if (role === 'admin') return locale === 'es' ? 'Administrador' : 'Admin';
    return role;
  };

  // Carga notas y auditoría administrativa local
  const loadAdminMetadata = async (listingId: string) => {
    try {
      const notesKey = `admin_property_notes:${listingId}`;
      const auditKey = `admin_property_audit:${listingId}`;

      const savedNotes = await AsyncStorage.getItem(notesKey);
      const savedAudit = await AsyncStorage.getItem(auditKey);

      setAdminNotes(savedNotes || '');
      setAuditLogs(savedAudit ? JSON.parse(savedAudit) : []);
    } catch (e) {
      console.error('Error al cargar metadatos locales:', e);
    }
  };

  // Guarda notas administrativas
  const saveAdminMetadata = async () => {
    if (!selectedListing) return;
    try {
      const notesKey = `admin_property_notes:${selectedListing.id}`;
      await AsyncStorage.setItem(notesKey, adminNotes);
      
      Alert.alert(
        locale === 'es' ? 'Éxito' : 'Success',
        locale === 'es' ? 'Notas guardadas correctamente.' : 'Notes saved successfully.'
      );
      await addAuditLog(selectedListing.id, 'Notas administrativas actualizadas');
    } catch (e) {
      console.error('Error al guardar notas locales:', e);
    }
  };

  // Registra logs de cambios
  const addAuditLog = async (listingId: string, action: string) => {
    try {
      const auditKey = `admin_property_audit:${listingId}`;
      const savedAudit = await AsyncStorage.getItem(auditKey);
      const logs: PropertyAuditLog[] = savedAudit ? JSON.parse(savedAudit) : [];

      const newLog: PropertyAuditLog = {
        timestamp: new Date().toISOString(),
        action,
        adminName: 'Super Admin'
      };

      const updatedLogs = [newLog, ...logs];
      await AsyncStorage.setItem(auditKey, JSON.stringify(updatedLogs));
      setAuditLogs(updatedLogs);
    } catch (e) {
      console.error('Error al registrar logs en AsyncStorage:', e);
    }
  };

  // Carga asíncrona de datos del dueño del anuncio
  const loadOwnerProfile = async (userId: string) => {
    setOwnerLoading(true);
    setOwnerProfile(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, trust_score, photoUrl, is_identity_verified')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setOwnerProfile(data as unknown as OwnerProfile);
      }
    } catch (e) {
      console.error('Error cargando propietario:', e);
    } finally {
      setOwnerLoading(false);
    }
  };

  // Carga estadísticas de alojamientos
  const fetchStats = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [totalRes, activeRes, pendingRes, verifiedRes, priceRes, newThisMonthRes] = await Promise.all([
        supabase.from('listings').select('*', { count: 'exact', head: true }),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_property_verified', true),
        supabase.from('listings').select('price'),
        supabase.from('listings').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
      ]);

      const prices = (priceRes.data || []).map(p => p.price || 0).filter(p => p > 0);
      const avg = prices.length ? Math.round(prices.reduce((sum, current) => sum + current, 0) / prices.length) : 0;

      setStats({
        total: totalRes.count || 0,
        active: activeRes.count || 0,
        pending: pendingRes.count || 0,
        verified: verifiedRes.count || 0,
        avgPrice: avg,
      });
    } catch (e) {
      console.error('Error cargando estadísticas agregadas:', e);
    }
  };

  // Consultar y filtrar alojamientos de Supabase
  const fetchListings = useCallback(async () => {
    let query = supabase
      .from('listings')
      .select('*, contracts(id, status)');

    // Filtros de base de datos
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }
    if (filterVerification === 'verified') {
      query = query.eq('is_property_verified', true);
    } else if (filterVerification === 'unverified') {
      query = query.or('is_property_verified.is.null,is_property_verified.eq.false');
    }

    // Ordenaciones
    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sortBy === 'price-asc') {
      query = query.order('price', { ascending: true });
    } else if (sortBy === 'price-desc') {
      query = query.order('price', { ascending: false });
    }

    // Búsqueda por texto
    if (search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    // Límite de seguridad
    query = query.limit(80);

    const { data, error } = await query;
    if (!error) {
      setListings((data as unknown as Listing[]) || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [filterStatus, filterVerification, sortBy, search]);

  useEffect(() => {
    setLoading(true);
    fetchListings();
    fetchStats();
  }, [fetchListings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchListings();
    fetchStats();
  };

  // Abre el modal detallado
  const openListingDetail = (listing: Listing) => {
    setSelectedListing(listing);
    setEditTitle(listing.title || '');
    setEditAddress(listing.address || '');
    setEditPrice(listing.price ? String(listing.price) : '');
    setEditDescription(listing.description || '');
    setEditLatitude(listing.latitude ? String(listing.latitude) : '');
    setEditLongitude(listing.longitude ? String(listing.longitude) : '');
    setEditUtilities(!!listing.utilities_included);

    loadAdminMetadata(listing.id);
    if (listing.user_id) {
      loadOwnerProfile(listing.user_id);
    }
    setActiveTab('general');
    setDetailModalVisible(true);
  };

  // Guarda cambios editados en Supabase
  const saveListingDetails = async () => {
    if (!selectedListing) return;
    try {
      const priceNum = Number(editPrice);
      if (isNaN(priceNum) || priceNum < 0) {
        Alert.alert('Error', locale === 'es' ? 'El precio debe ser un número válido.' : 'Price must be a valid number.');
        return;
      }

      const updateData = {
        title: editTitle.trim(),
        address: editAddress.trim(),
        price: priceNum,
        description: editDescription.trim(),
        latitude: editLatitude ? Number(editLatitude) : null,
        longitude: editLongitude ? Number(editLongitude) : null,
        utilities_included: editUtilities
      };

      const { error } = await supabase
        .from('listings')
        .update(updateData as any)
        .eq('id', selectedListing.id);

      if (error) throw error;

      setSelectedListing({ ...selectedListing, ...updateData });
      await addAuditLog(selectedListing.id, 'Detalles de propiedad modificados por admin');
      Alert.alert(locale === 'es' ? 'Éxito' : 'Success', locale === 'es' ? 'Alojamiento actualizado con éxito.' : 'Listing updated successfully.');
      fetchListings();
      fetchStats();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error guardando cambios');
    }
  };

  // Actualiza campo individual (ej. estado o verificación)
  const updateListingField = async (field: keyof Listing, value: any, actionName: string) => {
    if (!selectedListing) return;
    try {
      const updateData = { [field]: value };
      const { error } = await supabase
        .from('listings')
        .update(updateData as any)
        .eq('id', selectedListing.id);

      if (error) throw error;

      const updated = { ...selectedListing, ...updateData };
      setSelectedListing(updated);
      await addAuditLog(selectedListing.id, actionName);
      fetchListings();
      fetchStats();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Fallo de actualización');
    }
  };

  // Elimina un alojamiento
  const deleteListing = (id: string) => {
    Alert.alert(
      t('admin.listings.delete_confirm', 'Delete Listing'),
      t('admin.listings.delete_message', 'Are you sure you want to delete this listing? This action cannot be undone.'),
      [
        { text: t('general.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('admin.listings.delete_btn', 'Delete'),
          style: 'destructive',
          onPress: async () => {
             const { error } = await supabase.from('listings').delete().eq('id', id);
             if (!error) {
               setDetailModalVisible(false);
               fetchListings();
               fetchStats();
             } else {
               Alert.alert('Error', error.message);
             }
          },
        },
      ]
    );
  };

  // ── Importación Masiva JSON ─────────────────────────────────────
  const handleBulkImport = async () => {
    setImportResult(null);
    let parsed: any[];
    try {
      parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error('Root must be a JSON array.');
    } catch (e: any) {
      Alert.alert('JSON Error', e.message);
      return;
    }

    setImporting(true);
    const errors: string[] = [];
    let success = 0;

    const { data: { session } } = await supabase.auth.getSession();
    const adminId = session?.user?.id;

    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item.title || !item.address || !item.price) {
        errors.push(`Item ${i + 1}: Missing required fields (title, address, price).`);
        continue;
      }
      const { error } = await supabase.from('listings').insert({
        title: item.title,
        address: item.address,
        price: Number(item.price),
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        utilities_included: item.utilities_included || false,
        status: item.status || 'active',
        images: item.images || [],
        user_id: adminId,
      });
      if (error) errors.push(`Item ${i + 1} (${item.title}): ${error.message}`);
      else success++;
    }

    setImporting(false);
    setImportResult({ success, errors });
    if (success > 0) {
      setTab('list');
      fetchListings();
      fetchStats();
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Renderizador de Anuncios
  const renderListing = ({ item }: { item: Listing }) => {
    const featuredPhoto = item.images && item.images[0] ? item.images[0] : null;
    const statusVal = item.status || 'active';

    return (
      <TouchableOpacity style={styles.propertyCard} onPress={() => openListingDetail(item)}>
        <View style={styles.cardMain}>
          {featuredPhoto ? (
            <Image source={{ uri: featuredPhoto }} style={styles.propertyThumbnail} />
          ) : (
            <View style={styles.propertyThumbnailFallback}>
              <MaterialCommunityIcons name="home-city" size={24} color="#333" />
            </View>
          )}

          <View style={styles.cardDetails}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardTitleText} numberOfLines={1}>{item.title || 'Untitled Property'}</Text>
              {item.is_property_verified && (
                <MaterialCommunityIcons name="check-decagram" size={16} color={accentColor} />
              )}
            </View>
            <Text style={styles.cardLocationText} numberOfLines={1}>{item.address || 'No Address'}</Text>
            
            <View style={styles.cardFooterRow}>
              <Text style={styles.priceLabel}>
                {t('admin.listings.price', '${price}/mo').replace('{price}', (item.price || 0).toLocaleString())}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                {item.contracts?.some(c => c.status === 'pending_authorization') && (
                  <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,184,0,0.08)', borderColor: '#FFB800', borderWidth: 1 }]}>
                    <Text style={[styles.statusText, { color: '#FFB800', fontSize: 9 }]}>
                      {locale === 'es' ? 'Contrato Pendiente' : 'Contract Pending'}
                    </Text>
                  </View>
                )}
                {item.contracts?.some(c => c.status === 'active') && (
                  <View style={[styles.statusBadge, { backgroundColor: 'rgba(73,199,136,0.08)', borderColor: '#49C788', borderWidth: 1 }]}>
                    <Text style={[styles.statusText, { color: '#49C788', fontSize: 9 }]}>
                      {locale === 'es' ? 'Alquilado' : 'Leased'}
                    </Text>
                  </View>
                )}
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[statusVal] || '#888') + '15' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[statusVal] || '#888' }]}>
                    {translateStatus(statusVal)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Barra Superior e Interruptor de Pestañas */}
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>{locale === 'es' ? 'Gestión de Alojamientos' : 'Accommodations Hub'}</Text>
        <View style={styles.tabToggle}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'list' && styles.tabBtnActive]}
            onPress={() => setTab('list')}
          >
            <Text style={[styles.tabBtnText, tab === 'list' && { color: accentColor }]}>
              {locale === 'es' ? 'Moderación' : 'Mod'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'import' && styles.tabBtnActive]}
            onPress={() => setTab('import')}
          >
            <MaterialCommunityIcons name="upload" size={14} color={tab === 'import' ? accentColor : '#888'} />
            <Text style={[styles.tabBtnText, tab === 'import' && { color: accentColor }]}>
              {locale === 'es' ? 'Importar' : 'Import'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'list' ? (
        <>
          {/* Controles de Búsqueda y Ajuste de Filtros */}
          <View style={styles.searchFilterRow}>
            <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder={locale === 'es' ? 'Buscar por título o dirección...' : 'Search by title or address...'}
                placeholderTextColor="#555"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#666" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity 
              style={[styles.filterButton, showFiltersMenu && { borderColor: accentColor }]}
              onPress={() => setShowFiltersMenu(!showFiltersMenu)}
            >
              <MaterialCommunityIcons name="tune" size={20} color={showFiltersMenu ? accentColor : '#aaa'} />
            </TouchableOpacity>
          </View>

          {/* Menú de Configuración de Filtros Avanzados */}
          {showFiltersMenu && (
            <View style={styles.filterMenuContainer}>
              {/* Estados */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{locale === 'es' ? 'Estado' : 'Status'}</Text>
                <View style={styles.chipsRow}>
                  {STATUSES.map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.chip, filterStatus === st && { borderColor: accentColor, backgroundColor: `${accentColor}10` }]}
                      onPress={() => setFilterStatus(st)}
                    >
                      <Text style={[styles.chipText, filterStatus === st && { color: accentColor }]}>
                        {st === 'all' ? (locale === 'es' ? 'Todos' : 'All') : translateStatus(st)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Verificación y Ordenación */}
              <View style={styles.doubleFilterRow}>
                <View style={[styles.filterSection, { flex: 1 }]}>
                  <Text style={styles.filterLabel}>{locale === 'es' ? 'Verificación' : 'Verification'}</Text>
                  <View style={styles.chipsRow}>
                    {VERIFICATIONS.map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.chip, filterVerification === v && { borderColor: accentColor, backgroundColor: `${accentColor}10` }]}
                        onPress={() => setFilterVerification(v)}
                      >
                        <Text style={[styles.chipText, filterVerification === v && { color: accentColor }]}>
                          {v === 'all' ? (locale === 'es' ? 'Todos' : 'All') : v === 'verified' ? (locale === 'es' ? 'Verificado' : 'Verified') : (locale === 'es' ? 'No Verificado' : 'Unverified')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.filterSection, { width: 150 }]}>
                  <Text style={styles.filterLabel}>{locale === 'es' ? 'Ordenar por' : 'Sort by'}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    {[
                      { key: 'newest', val: locale === 'es' ? 'Nuevos' : 'Newest' },
                      { key: 'oldest', val: locale === 'es' ? 'Antiguos' : 'Oldest' },
                      { key: 'price-asc', val: locale === 'es' ? 'Precio min' : 'Price Min' },
                      { key: 'price-desc', val: locale === 'es' ? 'Precio máx' : 'Price Max' }
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.chip, sortBy === item.key && { borderColor: accentColor, backgroundColor: `${accentColor}10` }]}
                        onPress={() => setSortBy(item.key)}
                      >
                        <Text style={[styles.chipText, sortBy === item.key && { color: accentColor }]}>{item.val}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          )}

          {/* Estadísticas de Métricas de Propiedad */}
          <View style={styles.statsPanel}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
              <View style={styles.statBox}>
                <MaterialCommunityIcons name="home-city" size={18} color="#fff" />
                <Text style={styles.statNumText}>{stats.total}</Text>
                <Text style={styles.statLabelText}>{locale === 'es' ? 'Alojamientos' : 'Listings'}</Text>
              </View>
              <View style={styles.statBox}>
                <MaterialCommunityIcons name="home-circle-outline" size={18} color={accentColor} />
                <Text style={[styles.statNumText, { color: accentColor }]}>{stats.active}</Text>
                <Text style={styles.statLabelText}>{locale === 'es' ? 'Activos' : 'Active'}</Text>
              </View>
              <View style={styles.statBox}>
                <MaterialCommunityIcons name="clock-outline" size={18} color="#f97316" />
                <Text style={[styles.statNumText, { color: '#f97316' }]}>{stats.pending}</Text>
                <Text style={styles.statLabelText}>{locale === 'es' ? 'Pendientes' : 'Pending'}</Text>
              </View>
              <View style={styles.statBox}>
                <MaterialCommunityIcons name="check-decagram" size={18} color="#22c55e" />
                <Text style={[styles.statNumText, { color: '#22c55e' }]}>{stats.verified}</Text>
                <Text style={styles.statLabelText}>{locale === 'es' ? 'Verificados' : 'Verified'}</Text>
              </View>
              <View style={styles.statBox}>
                <MaterialCommunityIcons name="cash-multiple" size={18} color="#06b6d4" />
                <Text style={[styles.statNumText, { color: '#06b6d4' }]}>${stats.avgPrice}</Text>
                <Text style={styles.statLabelText}>{locale === 'es' ? 'Promedio' : 'Avg Rent'}</Text>
              </View>
            </ScrollView>
          </View>

          {/* Listado de Alojamientos */}
          {loading && !refreshing ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color={accentColor} />
            </View>
          ) : (
            <FlatList
              data={listings}
              keyExtractor={(l) => l.id}
              renderItem={renderListing}
              contentContainerStyle={styles.listContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="home-remove-outline" size={48} color="#222" />
                  <Text style={styles.emptyText}>{locale === 'es' ? 'No se encontraron alojamientos.' : 'No accommodations found.'}</Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        /* ── Importador Masivo JSON ── */
        <ScrollView style={styles.importScroll} contentContainerStyle={styles.importContent}>
          <View style={styles.importInfo}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#3b82f6" />
            <Text style={styles.importInfoText}>
              {locale === 'es' 
                ? "Pega un arreglo JSON de objetos de alojamiento. Requerido: "
                : "Paste a JSON array of listing objects. Required: "}
              <Text style={[styles.code, { color: accentColor }]}>title</Text>,{' '}
              <Text style={[styles.code, { color: accentColor }]}>address</Text>,{' '}
              <Text style={[styles.code, { color: accentColor }]}>price</Text>.{'\n'}
              {locale === 'es' ? "Opcional: " : "Optional: "}
              <Text style={[styles.code, { color: accentColor }]}>latitude</Text>,{' '}
              <Text style={[styles.code, { color: accentColor }]}>longitude</Text>,{' '}
              <Text style={[styles.code, { color: accentColor }]}>utilities_included</Text>,{' '}
              <Text style={[styles.code, { color: accentColor }]}>status</Text>,{' '}
              <Text style={[styles.code, { color: accentColor }]}>images</Text>.
            </Text>
          </View>

          <TextInput
            style={[styles.jsonInput, { color: accentColor }]}
            multiline
            placeholder={BULK_PLACEHOLDER}
            placeholderTextColor="#333"
            value={jsonInput}
            onChangeText={setJsonInput}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.importBtn, { backgroundColor: accentColor }, (importing || !jsonInput.trim()) && { opacity: 0.5 }]}
            onPress={handleBulkImport}
            disabled={importing || !jsonInput.trim()}
          >
            {importing ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <MaterialCommunityIcons name="upload" size={18} color="#000" />
                <Text style={styles.importBtnText}>{locale === 'es' ? "Importar Alojamientos" : "Import Listings"}</Text>
              </>
            )}
          </TouchableOpacity>

          {importResult && (
            <View style={styles.resultBox}>
              <Text style={[styles.resultSuccess, { color: accentColor }]}>
                ✓ {importResult.success} {locale === 'es' ? `alojamiento${importResult.success !== 1 ? 's' : ''} importado${importResult.success !== 1 ? 's' : ''} correctamente.` : `listing${importResult.success !== 1 ? 's' : ''} imported successfully.`}
              </Text>
              {importResult.errors.map((e, i) => (
                <Text key={i} style={styles.resultError}>✗ {e}</Text>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal Ficha Detallada del Alojamiento */}
      <Modal
        visible={detailModalVisible && selectedListing !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedListing && (
              <>
                {/* Cabecera del Modal */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalPropIntro}>
                    <MaterialCommunityIcons name="home-circle" size={32} color={accentColor} />
                    <View style={styles.modalPropTitleGroup}>
                      <Text style={styles.modalTitleText} numberOfLines={1}>{selectedListing.title}</Text>
                      <Text style={styles.modalSubtitleText} numberOfLines={1}>{selectedListing.id}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeButton}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Pestañas del Modal */}
                <View style={styles.modalTabBar}>
                  {(['general', 'gallery', 'owner', 'audit'] as const).map((tabItem) => (
                    <TouchableOpacity
                      key={tabItem}
                      style={[styles.modalTabItem, activeTab === tabItem && { borderBottomColor: accentColor }]}
                      onPress={() => setActiveTab(tabItem)}
                    >
                      <Text style={[styles.modalTabText, activeTab === tabItem && { color: '#fff' }]}>
                        {tabItem === 'general' ? (locale === 'es' ? 'Detalles' : 'General') :
                         tabItem === 'gallery' ? (locale === 'es' ? 'Galería' : 'Photos') :
                         tabItem === 'owner' ? (locale === 'es' ? 'Anfitrión' : 'Owner') :
                         (locale === 'es' ? 'Auditoría' : 'Audit')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Contenido del Modal por Pestaña */}
                <ScrollView contentContainerStyle={styles.modalTabContent}>
                  {activeTab === 'general' && (
                    <View style={styles.tabPanel}>
                      <Text style={styles.sectionTitle}>{locale === 'es' ? 'Ficha de Edición' : 'Edit Information'}</Text>
                      
                      <Text style={styles.inputLabel}>{locale === 'es' ? 'Título de Propiedad' : 'Property Title'}</Text>
                      <TextInput 
                        style={styles.textInput} 
                        value={editTitle} 
                        onChangeText={setEditTitle} 
                        placeholder="Título"
                        placeholderTextColor="#444"
                      />

                      <Text style={styles.inputLabel}>{locale === 'es' ? 'Dirección Completa' : 'Address'}</Text>
                      <TextInput 
                        style={styles.textInput} 
                        value={editAddress} 
                        onChangeText={setEditAddress} 
                        placeholder="Dirección"
                        placeholderTextColor="#444"
                      />

                      <Text style={styles.inputLabel}>{locale === 'es' ? 'Renta Mensual ($)' : 'Monthly Rent ($)'}</Text>
                      <TextInput 
                        style={styles.textInput} 
                        value={editPrice} 
                        onChangeText={setEditPrice} 
                        placeholder="Price"
                        placeholderTextColor="#444"
                        keyboardType="numeric"
                      />

                      <Text style={styles.inputLabel}>{locale === 'es' ? 'Descripción del Inmueble' : 'Description'}</Text>
                      <TextInput 
                        style={[styles.textInput, styles.descriptionInput]} 
                        value={editDescription} 
                        onChangeText={setEditDescription} 
                        placeholder="Descripción"
                        placeholderTextColor="#444"
                        multiline={true}
                        numberOfLines={4}
                      />

                      <View style={styles.doubleMetaRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.inputLabel}>{locale === 'es' ? 'Latitud' : 'Latitude'}</Text>
                          <TextInput 
                            style={styles.textInput} 
                            value={editLatitude} 
                            onChangeText={setEditLatitude} 
                            placeholder="Lat"
                            placeholderTextColor="#444"
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.inputLabel}>{locale === 'es' ? 'Longitud' : 'Longitude'}</Text>
                          <TextInput 
                            style={styles.textInput} 
                            value={editLongitude} 
                            onChangeText={setEditLongitude} 
                            placeholder="Lng"
                            placeholderTextColor="#444"
                            keyboardType="numeric"
                          />
                        </View>
                      </View>

                      <View style={styles.switchRow}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.switchTitle}>{locale === 'es' ? 'Servicios Incluidos' : 'Utilities Included'}</Text>
                          <Text style={styles.switchDesc}>{locale === 'es' ? 'Indica si agua/luz/internet están dentro de la mensualidad' : 'Water, light and internet included in price'}</Text>
                        </View>
                        <Switch
                          value={editUtilities}
                          onValueChange={setEditUtilities}
                          trackColor={{ false: '#333', true: accentColor }}
                          thumbColor={'#fff'}
                        />
                      </View>

                      <Text style={styles.inputLabel}>{locale === 'es' ? 'Estado Administrativo' : 'Status Moderation'}</Text>
                      <View style={styles.buttonGroup}>
                        {STATUSES.filter(s => s !== 'all').map((stOption) => {
                          const isActive = selectedListing.status === stOption;
                          return (
                            <TouchableOpacity
                              key={stOption}
                              style={[styles.groupBtn, isActive && { backgroundColor: STATUS_COLOR[stOption] || accentColor }]}
                              onPress={() => {
                                Alert.alert(
                                  locale === 'es' ? 'Confirmar Cambio de Estado' : 'Confirm Status Change',
                                  locale === 'es' ? `¿Desea marcar esta propiedad como ${stOption}?` : `Do you want to set this property as ${stOption}?`,
                                  [
                                    { text: locale === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
                                    { text: locale === 'es' ? 'Confirmar' : 'Confirm', onPress: () => updateListingField('status', stOption, `Estado de propiedad establecido en ${stOption}`) }
                                  ]
                                );
                              }}
                            >
                              <Text style={[styles.groupBtnText, isActive && { color: '#000', fontWeight: 'bold' }]}>
                                {translateStatus(stOption)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={styles.switchRow}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.switchTitle}>{locale === 'es' ? 'Propiedad Verificada' : 'Property Verified'}</Text>
                          <Text style={styles.switchDesc}>{locale === 'es' ? 'Activa el distintivo oficial de verificación en la feed' : 'Show official checkmark badge on listings feed'}</Text>
                        </View>
                        <Switch
                          value={selectedListing.is_property_verified === true}
                          onValueChange={(val) => updateListingField('is_property_verified', val, `Verificación de propiedad establecida en ${val}`)}
                          trackColor={{ false: '#333', true: accentColor }}
                          thumbColor={'#fff'}
                        />
                      </View>

                      {/* Estatus Contractual del Alojamiento */}
                      <Text style={styles.inputLabel}>{locale === 'es' ? 'Actividad de Contratos' : 'Contract Activity'}</Text>
                      <View style={styles.switchRow}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.switchTitle}>
                            {selectedListing.contracts?.some(c => c.status === 'active')
                              ? (locale === 'es' ? 'Arrendado (Contrato Activo)' : 'Leased (Active Contract)')
                              : selectedListing.contracts?.some(c => c.status === 'pending_authorization')
                              ? (locale === 'es' ? 'Aprobación Pendiente' : 'Approval Pending')
                              : (locale === 'es' ? 'Sin Contratos Activos' : 'No Active Contracts')}
                          </Text>
                          <Text style={styles.switchDesc}>
                            {locale === 'es' ? 'Estatus actual de renta de este alojamiento' : 'Current leasing status of this property'}
                          </Text>
                        </View>
                        <MaterialCommunityIcons
                          name={selectedListing.contracts?.some(c => c.status === 'active')
                            ? 'file-document'
                            : selectedListing.contracts?.some(c => c.status === 'pending_authorization')
                            ? 'file-document-edit-outline'
                            : 'file-document-outline'}
                          size={24}
                          color={selectedListing.contracts?.some(c => c.status === 'active')
                            ? '#49C788'
                            : selectedListing.contracts?.some(c => c.status === 'pending_authorization')
                            ? '#FFB800'
                            : '#555'}
                        />
                      </View>

                      {/* Botón Guardar Cambios */}
                      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={saveListingDetails}>
                        <Text style={styles.saveBtnText}>{locale === 'es' ? 'Guardar Cambios' : 'Save Property Details'}</Text>
                      </TouchableOpacity>

                      {/* Botón Eliminar Propiedad (Destructivo) */}
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteListing(selectedListing.id)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#ff4444" />
                        <Text style={styles.deleteBtnText}>{locale === 'es' ? 'Eliminar Anuncio Permanente' : 'Permanently Delete Listing'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {activeTab === 'gallery' && (
                    <View style={styles.tabPanel}>
                      <Text style={styles.sectionTitle}>{locale === 'es' ? 'Galería de Fotos' : 'Property Gallery'}</Text>
                      {!selectedListing.images || selectedListing.images.length === 0 ? (
                        <View style={styles.emptyPhotosBox}>
                          <MaterialCommunityIcons name="image-off" size={48} color="#222" />
                          <Text style={styles.emptyText}>{locale === 'es' ? 'No hay imágenes cargadas para esta propiedad.' : 'No images uploaded for this listing.'}</Text>
                        </View>
                      ) : (
                        <View style={styles.galleryGrid}>
                          {selectedListing.images.map((img, idx) => (
                            <View key={idx} style={styles.galleryImageContainer}>
                              <Image source={{ uri: img }} style={styles.galleryImage} />
                              <View style={styles.galleryIndexBadge}>
                                <Text style={styles.galleryIndexText}>{idx + 1}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {activeTab === 'owner' && (
                    <View style={styles.tabPanel}>
                      <Text style={styles.sectionTitle}>{locale === 'es' ? 'Información del Anfitrión / Dueño' : 'Host / Landlord Information'}</Text>
                      
                      {ownerLoading ? (
                        <ActivityIndicator size="small" color={accentColor} style={{ padding: 20 }} />
                      ) : ownerProfile ? (
                        <View style={styles.ownerCard}>
                          <View style={styles.ownerIntro}>
                            {ownerProfile.photoUrl ? (
                              <Image source={{ uri: ownerProfile.photoUrl }} style={styles.ownerAvatar} />
                            ) : (
                              <View style={[styles.ownerAvatar, styles.ownerAvatarTextBg]}>
                                <Text style={[styles.ownerAvatarText, { color: accentColor }]}>{(ownerProfile.name || '?')[0].toUpperCase()}</Text>
                              </View>
                            )}
                            <View style={styles.ownerMeta}>
                              <View style={styles.ownerNameRow}>
                                <Text style={styles.ownerNameText}>{ownerProfile.name}</Text>
                                {ownerProfile.is_identity_verified && (
                                  <MaterialCommunityIcons name="check-decagram" size={16} color={accentColor} />
                                )}
                              </View>
                              <Text style={styles.ownerRoleText}>
                                {translateRole(ownerProfile.role || 'seeker')}
                              </Text>
                            </View>
                          </View>
                          
                          <View style={styles.ownerStatsGrid}>
                            <View style={styles.ownerStatCard}>
                              <Text style={styles.ownerStatLabel}>{locale === 'es' ? 'Confianza' : 'Trust Score'}</Text>
                              <Text style={[styles.ownerStatValue, { color: accentColor }]}>
                                {ownerProfile.trust_score !== null ? `${ownerProfile.trust_score}%` : '—'}
                              </Text>
                            </View>
                            <View style={styles.ownerStatCard}>
                              <Text style={styles.ownerStatLabel}>ID</Text>
                              <Text style={styles.ownerIdText} numberOfLines={1}>{ownerProfile.id}</Text>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.emptyText}>{locale === 'es' ? 'No se pudo cargar la información del propietario.' : 'Failed to load host information.'}</Text>
                      )}
                    </View>
                  )}

                  {activeTab === 'audit' && (
                    <View style={styles.tabPanel}>
                      <Text style={styles.sectionTitle}>{locale === 'es' ? 'Notas de Control Interno' : 'Internal Moderation Notes'}</Text>
                      <TextInput
                        style={styles.notesInputArea}
                        value={adminNotes}
                        onChangeText={setAdminNotes}
                        placeholder={locale === 'es' ? 'Escribe aquí observaciones sobre la propiedad, justificación de suspensiones o revisiones físicas realizadas...' : 'Write notes about physical inspections, warning histories, or approvals here...'}
                        placeholderTextColor="#444"
                        multiline={true}
                        numberOfLines={4}
                      />
                      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#1a1a1a', borderColor: '#333', borderWidth: 1 }]} onPress={saveAdminMetadata}>
                        <Text style={[styles.saveBtnText, { color: '#fff' }]}>{locale === 'es' ? 'Guardar Notas' : 'Save Notes'}</Text>
                      </TouchableOpacity>

                      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{locale === 'es' ? 'Auditoría del Alojamiento' : 'Property Activity Logs'}</Text>
                      {auditLogs.length === 0 ? (
                        <Text style={styles.emptyText}>{locale === 'es' ? 'No hay logs registrados para este alojamiento.' : 'No property logs recorded.'}</Text>
                      ) : (
                        auditLogs.map((log, idx) => (
                          <View key={idx} style={styles.auditCard}>
                            <View style={styles.auditHeader}>
                              <Text style={styles.auditAdminText}>{log.adminName}</Text>
                              <Text style={styles.auditTimeText}>{formatDate(log.timestamp)} {new Date(log.timestamp).toLocaleTimeString()}</Text>
                            </View>
                            <Text style={styles.auditActionText}>{log.action}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    flexWrap: 'wrap',
    gap: 10
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  tabToggle: { 
    flexDirection: 'row', 
    backgroundColor: '#0c0c0c', 
    borderRadius: 8, 
    padding: 3, 
    borderWidth: 1, 
    borderColor: '#1e1e1e', 
    gap: 2 
  },
  tabBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, gap: 5 },
  tabBtnActive: { backgroundColor: '#161616' },
  tabBtnText: { color: '#888', fontSize: 13, fontWeight: '500' },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111'
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    height: 44
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0c0c0c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e1e1e'
  },
  filterMenuContainer: {
    backgroundColor: '#080808',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    paddingHorizontal: 16,
  },
  filterSection: {
    marginTop: 10,
  },
  filterLabel: {
    color: '#555',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    backgroundColor: '#0c0c0c',
  },
  chipText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  doubleFilterRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  statsPanel: {
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    backgroundColor: '#070707'
  },
  statsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10
  },
  statBox: {
    width: 105,
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#161616',
    padding: 10,
    alignItems: 'center',
    gap: 4
  },
  statNumText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabelText: {
    color: '#555',
    fontSize: 10,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  propertyCard: {
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 12,
  },
  cardMain: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  propertyThumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#111'
  },
  propertyThumbnailFallback: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardDetails: {
    flex: 1,
    gap: 4
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6
  },
  cardTitleText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1
  },
  cardLocationText: {
    color: '#666',
    fontSize: 12
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2
  },
  priceLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  separator: { height: 12 },
  centerLoader: { paddingVertical: 100, alignItems: 'center' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12
  },
  emptyText: {
    textAlign: 'center',
    color: '#555',
    fontSize: 14
  },
  importScroll: { flex: 1 },
  importContent: { padding: 20, gap: 16 },
  importInfo: { 
    flexDirection: 'row', 
    gap: 10, 
    backgroundColor: '#0c1827', 
    borderRadius: 10, 
    padding: 14, 
    borderWidth: 1, 
    borderColor: '#1d3b61', 
    alignItems: 'flex-start' 
  },
  importInfoText: { color: '#aaa', fontSize: 13, lineHeight: 20, flex: 1 },
  code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  jsonInput: { 
    backgroundColor: '#0c0c0c', 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#1e1e1e', 
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', 
    fontSize: 12, 
    padding: 14, 
    minHeight: 200 
  },
  importBtn: { borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  importBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  resultBox: { backgroundColor: '#0c0c0c', borderRadius: 10, padding: 16, gap: 6, borderWidth: 1, borderColor: '#1e1e1e' },
  resultSuccess: { fontSize: 13, fontWeight: '600' },
  resultError: { color: '#ff4444', fontSize: 12 },

  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '90%',
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
  },
  modalPropIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalPropTitleGroup: {
    flex: 1,
    gap: 2,
  },
  modalTitleText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitleText: {
    color: '#444',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  closeButton: {
    padding: 4,
  },
  modalTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
    backgroundColor: '#070707',
  },
  modalTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modalTabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  modalTabContent: {
    padding: 16,
    paddingBottom: 60,
  },
  tabPanel: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    height: 44,
    backgroundColor: '#0c0c0c',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 14,
  },
  descriptionInput: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  doubleMetaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 12,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  switchDesc: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
  },
  buttonGroup: {
    flexDirection: 'row',
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 3,
    gap: 2,
  },
  groupBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupBtnText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  saveBtn: {
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteBtn: {
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#331010',
    flexDirection: 'row',
    gap: 8,
    marginTop: 6
  },
  deleteBtnText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyPhotosBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#0c0c0c',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    gap: 10,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  galleryImageContainer: {
    width: (width - 42) / 2,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryIndexBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryIndexText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ownerCard: {
    backgroundColor: '#0c0c0c',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 16,
    gap: 16,
  },
  ownerIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#111',
  },
  ownerAvatarTextBg: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222'
  },
  ownerAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  ownerMeta: {
    flex: 1,
    gap: 2,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownerNameText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ownerRoleText: {
    color: '#555',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  ownerStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  ownerStatCard: {
    flex: 1,
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#161616',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  ownerStatLabel: {
    color: '#444',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  ownerStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  ownerIdText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  notesInputArea: {
    backgroundColor: '#0c0c0c',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    textAlignVertical: 'top',
    height: 100,
  },
  auditCard: {
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#161616',
    padding: 12,
    gap: 6,
    marginTop: 8,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditAdminText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  auditTimeText: {
    color: '#444',
    fontSize: 10,
  },
  auditActionText: {
    color: '#fff',
    fontSize: 13,
  },
});
