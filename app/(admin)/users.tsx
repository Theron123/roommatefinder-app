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

type Profile = {
  id: string;
  name: string;
  role: string | null;
  trust_score: number | null;
  risk_level: string | null;
  created_at: string;
  is_identity_verified: boolean | null;
  is_background_verified: boolean | null;
  is_income_verified: boolean | null;
  is_phone_verified: boolean | null;
  is_references_verified: boolean | null;
  is_social_verified: boolean | null;
  is_university_verified: boolean | null;
  is_workplace_verified: boolean | null;
  share_badges_enabled: boolean | null;
  photoUrl: string | null;
  photos: string[] | null;
  bio: string | null;
  age: number | null;
  availability_status: string | null; // Usado para Account Status
};

type UserStats = {
  total: number;
  active: number;
  verified: number;
  pendingVerification: number;
  suspended: number;
  newThisMonth: number;
};

type AuditLog = {
  timestamp: string;
  action: string;
  adminName: string;
};

type AssociationStats = {
  listings: number;
  contracts: number;
  reportsFiled: number;
  reportsAgainst: number;
};

const ROLES = ['all', 'seeker', 'host', 'landlord', 'admin'];
const STATUSES = ['all', 'active', 'pending', 'suspended', 'disabled'];
const VERIFICATIONS = ['all', 'verified', 'unverified'];

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  
  // Filtros y Ordenación
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterVerification, setFilterVerification] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name-asc, name-desc, trust-desc
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);

  // Estadísticas del Dashboard
  const [stats, setStats] = useState<UserStats>({
    total: 0, active: 0, verified: 0, pendingVerification: 0, suspended: 0, newThisMonth: 0
  });

  // Estado del Modal Detallado
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'verifications' | 'associations' | 'audit'>('general');

  // Datos editables locales en el modal de detalles
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editRole, setEditRole] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('active');
  const [editTrustScore, setEditTrustScore] = useState<number | null>(null);
  const [editRiskLevel, setEditRiskLevel] = useState<string | null>(null);
  const [editVip, setEditVip] = useState<boolean>(false);
  const [editVerifications, setEditVerifications] = useState<Record<string, boolean>>({});

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const showAlert = (title: string, message: string) => {
    const isError = title.toLowerCase() === 'error';
    const isSuccess = title.toLowerCase() === 'éxito' || title.toLowerCase() === 'success';
    if (isError || isSuccess) {
      showToast(message, isError ? 'error' : 'success');
    } else {
      if (Platform.OS === 'web') {
        alert(`${title}: ${message}`);
      } else {
        Alert.alert(title, message);
      }
    }
  };

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [assocStats, setAssocStats] = useState<AssociationStats>({ listings: 0, contracts: 0, reportsFiled: 0, reportsAgainst: 0 });
  const [assocLoading, setAssocLoading] = useState(false);

  const { locale, t } = useTranslation();
  const { accentColor } = useAdminTheme();

  const ROLE_COLOR: Record<string, string> = {
    admin: '#f97316', seeker: accentColor, host: '#3b82f6', landlord: '#a855f7',
  };
  const RISK_COLOR: Record<string, string> = {
    low: accentColor, medium: '#f97316', high: '#ff4444',
  };
  const STATUS_COLOR: Record<string, string> = {
    active: '#22c55e', pending: '#eab308', suspended: '#ef4444', disabled: '#6b7280'
  };

  const translateRole = (role: string) => {
    if (role === 'seeker') return locale === 'es' ? 'Buscador' : 'Seeker';
    if (role === 'host') return locale === 'es' ? 'Anfitrión' : 'Host';
    if (role === 'landlord') return locale === 'es' ? 'Propietario' : 'Landlord';
    if (role === 'admin') return locale === 'es' ? 'Administrador' : 'Admin';
    return role;
  };

  const translateStatus = (status: string) => {
    if (status === 'active') return locale === 'es' ? 'Activo' : 'Active';
    if (status === 'pending') return locale === 'es' ? 'Pendiente' : 'Pending';
    if (status === 'suspended') return locale === 'es' ? 'Suspendido' : 'Suspended';
    if (status === 'disabled') return locale === 'es' ? 'Deshabilitado' : 'Disabled';
    return status;
  };

  // Genera datos de contacto mock basados en el usuario pero persistibles localmente
  const loadContactDetails = async (userId: string, userName: string) => {
    try {
      const emailKey = `admin_email:${userId}`;
      const phoneKey = `admin_phone:${userId}`;
      const notesKey = `admin_notes:${userId}`;
      const auditKey = `admin_audit:${userId}`;

      const savedEmail = await AsyncStorage.getItem(emailKey);
      const savedPhone = await AsyncStorage.getItem(phoneKey);
      const savedNotes = await AsyncStorage.getItem(notesKey);
      const savedAudit = await AsyncStorage.getItem(auditKey);

      const cleanName = (userName || 'user').toLowerCase().replace(/\s+/g, '');
      
      setEditEmail(savedEmail || `${cleanName}@example.com`);
      setEditPhone(savedPhone || `+1 (604) 555-${Math.floor(1000 + Math.random() * 9000)}`);
      setEditNotes(savedNotes || '');
      setAuditLogs(savedAudit ? JSON.parse(savedAudit) : []);
    } catch (e) {
      console.error('Error cargando detalles del contacto:', e);
    }
  };

  // Guarda notas y datos de contacto de administración
  const saveAdminDetails = async () => {
    if (!selectedUser) return;
    try {
      const emailKey = `admin_email:${selectedUser.id}`;
      const phoneKey = `admin_phone:${selectedUser.id}`;
      const notesKey = `admin_notes:${selectedUser.id}`;

      await AsyncStorage.setItem(emailKey, editEmail);
      await AsyncStorage.setItem(phoneKey, editPhone);
      await AsyncStorage.setItem(notesKey, editNotes);

      const updateData: Partial<Profile> = {};
      const auditActions: string[] = [];

      if (editName.trim() && editName !== selectedUser.name) {
        updateData.name = editName.trim();
        auditActions.push(`Nombre editado de "${selectedUser.name}" a "${editName}"`);
      }
      if (editRole !== selectedUser.role) {
        updateData.role = editRole;
        auditActions.push(`Rol cambiado de "${selectedUser.role || 'ninguno'}" a "${editRole || 'ninguno'}"`);
      }
      if (editStatus !== (selectedUser.availability_status || 'active')) {
        updateData.availability_status = editStatus;
        auditActions.push(`Estado cambiado de "${selectedUser.availability_status || 'active'}" a "${editStatus}"`);
      }
      if (editTrustScore !== selectedUser.trust_score) {
        updateData.trust_score = editTrustScore;
        auditActions.push(`Trust Score cambiado de "${selectedUser.trust_score !== null ? selectedUser.trust_score + '%' : 'ninguno'}" a "${editTrustScore !== null ? editTrustScore + '%' : 'ninguno'}"`);
      }
      if (editRiskLevel !== (selectedUser.risk_level || 'low')) {
        updateData.risk_level = editRiskLevel;
        auditActions.push(`Nivel de riesgo cambiado de "${selectedUser.risk_level || 'low'}" a "${editRiskLevel}"`);
      }
      if (editVip !== (selectedUser.share_badges_enabled === true)) {
        updateData.share_badges_enabled = editVip;
        auditActions.push(`Suscripción Premium cambiada a ${editVip}`);
      }

      // Verificaciones
      const verifKeys = [
        'is_identity_verified',
        'is_background_verified',
        'is_income_verified',
        'is_phone_verified',
        'is_references_verified',
        'is_social_verified',
        'is_university_verified',
        'is_workplace_verified'
      ] as const;

      verifKeys.forEach((key) => {
        const val = !!editVerifications[key];
        const oldVal = !!selectedUser[key];
        if (val !== oldVal) {
          updateData[key] = val;
          auditActions.push(`Estado de ${key} cambiado a ${val}`);
        }
      });

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(updateData as any)
          .eq('id', selectedUser.id);
        
        if (error) throw error;
        
        // Agregar logs de auditoría secuencialmente
        for (const action of auditActions) {
          await addAuditLog(selectedUser.id, action);
        }

        // Actualizar el selectedUser local
        setSelectedUser({ ...selectedUser, ...updateData });
      }

      showAlert(
        locale === 'es' ? 'Éxito' : 'Success',
        locale === 'es' ? 'Datos del usuario guardados con éxito.' : 'User details saved successfully.'
      );
      fetchUsers();
      fetchStats();
    } catch (e: any) {
      showAlert('Error', e.message || 'Error guardando datos');
    }
  };

  // Registra una acción administrativa en el historial
  const addAuditLog = async (userId: string, action: string) => {
    try {
      const auditKey = `admin_audit:${userId}`;
      const savedAudit = await AsyncStorage.getItem(auditKey);
      const logs: AuditLog[] = savedAudit ? JSON.parse(savedAudit) : [];
      
      const newLog: AuditLog = {
        timestamp: new Date().toISOString(),
        action,
        adminName: 'Super Admin'
      };

      const updatedLogs = [newLog, ...logs];
      await AsyncStorage.setItem(auditKey, JSON.stringify(updatedLogs));
      setAuditLogs(updatedLogs);
    } catch (e) {
      console.error('Error registrando auditoría:', e);
    }
  };

  // Carga estadísticas de registros asociados
  const loadAssociationStats = async (userId: string) => {
    setAssocLoading(true);
    try {
      const [listingsRes, contractsRes, reportsFiledRes, reportsAgainstRes] = await Promise.all([
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('initiator_id', userId),
        supabase.from('user_reports').select('*', { count: 'exact', head: true }).eq('reporter_id', userId),
        supabase.from('user_reports').select('*', { count: 'exact', head: true }).eq('reported_id', userId)
      ]);

      setAssocStats({
        listings: listingsRes.count || 0,
        contracts: contractsRes.count || 0,
        reportsFiled: reportsFiledRes.count || 0,
        reportsAgainst: reportsAgainstRes.count || 0
      });
    } catch (err) {
      console.error('Error al cargar asociaciones de BD:', err);
    } finally {
      setAssocLoading(false);
    }
  };

  // Obtener estadísticas agregadas de la tabla profiles
  const fetchStats = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [totalCount, activeCount, verifiedCount, pendingVerif, suspendedCount, newThisMonth] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('availability_status', 'suspended'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_identity_verified', true),
        supabase.from('verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('availability_status', 'suspended'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
      ]);

      setStats({
        total: totalCount.count || 0,
        active: activeCount.count || 0,
        verified: verifiedCount.count || 0,
        pendingVerification: pendingVerif.count || 0,
        suspended: suspendedCount.count || 0,
        newThisMonth: newThisMonth.count || 0,
      });
    } catch (e) {
      console.error('Error consultando estadísticas agregadas:', e);
    }
  };

  // Obtener y filtrar perfiles de usuarios de Supabase
  const fetchUsers = useCallback(async () => {
    let query = supabase
      .from('profiles')
      .select('*');

    // Aplicar filtros a nivel de base de datos
    if (filterRole !== 'all') {
      query = query.eq('role', filterRole);
    }
    if (filterStatus !== 'all') {
      query = query.eq('availability_status', filterStatus);
    }
    if (filterVerification === 'verified') {
      query = query.eq('is_identity_verified', true);
    } else if (filterVerification === 'unverified') {
      query = query.or('is_identity_verified.is.null,is_identity_verified.eq.false');
    }

    // Aplicar ordenación
    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sortBy === 'name-asc') {
      query = query.order('name', { ascending: true });
    } else if (sortBy === 'name-desc') {
      query = query.order('name', { ascending: false });
    } else if (sortBy === 'trust-desc') {
      query = query.order('trust_score', { ascending: false, nullsFirst: false });
    }

    if (search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    // Límite de seguridad
    query = query.limit(100);

    const { data, error } = await query;
    if (!error) {
      setUsers((data as unknown as Profile[]) || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [filterRole, filterStatus, filterVerification, sortBy, search]);

  useEffect(() => {
    setLoading(true);
    fetchUsers();
    fetchStats();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
    fetchStats();
  };

  // Abre el modal detallado de usuario
  const openUserDetail = (user: Profile) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditStatus(user.availability_status || 'active');
    setEditTrustScore(user.trust_score);
    setEditRiskLevel(user.risk_level || 'low');
    setEditVip(user.share_badges_enabled === true);
    setEditVerifications({
      is_identity_verified: !!user.is_identity_verified,
      is_background_verified: !!user.is_background_verified,
      is_income_verified: !!user.is_income_verified,
      is_phone_verified: !!user.is_phone_verified,
      is_references_verified: !!user.is_references_verified,
      is_social_verified: !!user.is_social_verified,
      is_university_verified: !!user.is_university_verified,
      is_workplace_verified: !!user.is_workplace_verified,
    });
    loadContactDetails(user.id, user.name);
    loadAssociationStats(user.id);
    setActiveTab('general');
    setDetailModalVisible(true);
  };



  const formatDate = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Renderizar cada usuario en la lista
  const renderUser = ({ item }: { item: Profile }) => {
    const avatarFallback = (item.name || '?')[0].toUpperCase();
    const photoUrl = item.photoUrl || (item.photos && item.photos[0]) || null;
    const accountStatus = item.availability_status || 'active';

    return (
      <TouchableOpacity style={styles.userCard} onPress={() => openUserDetail(item)}>
        <View style={styles.cardHeader}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarTextContainer}>
              <Text style={[styles.avatarText, { color: accentColor }]}>{avatarFallback}</Text>
            </View>
          )}

          <View style={styles.cardMiddle}>
            <View style={styles.nameRow}>
              <Text style={styles.userNameText} numberOfLines={1}>{item.name || 'Unknown'}</Text>
              {item.share_badges_enabled && (
                <MaterialCommunityIcons name="star" size={16} color="#eab308" style={{ marginLeft: 4 }} />
              )}
            </View>
            <View style={styles.metricsRow}>
              <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLOR[item.role || 'seeker'] || '#888') + '15' }]}>
                <Text style={[styles.roleText, { color: ROLE_COLOR[item.role || 'seeker'] || '#888' }]}>
                  {translateRole(item.role || 'seeker')}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[accountStatus] || '#888') + '15' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[accountStatus] || '#888' }]}>
                  {translateStatus(accountStatus)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardRight}>
            <View style={styles.trustScoreContainer}>
              <MaterialCommunityIcons name="shield-check" size={14} color={accentColor} />
              <Text style={styles.trustScoreValue}>{item.trust_score !== null ? `${item.trust_score}%` : '—'}</Text>
            </View>
            <Text style={styles.dateLabel}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.verificationBadgesRow}>
            <MaterialCommunityIcons 
              name="check-decagram" 
              size={16} 
              color={item.is_identity_verified ? accentColor : '#222'} 
              style={styles.verificationIconSpacing}
            />
            <MaterialCommunityIcons 
              name="shield-account" 
              size={16} 
              color={item.is_background_verified ? '#3b82f6' : '#222'} 
              style={styles.verificationIconSpacing}
            />
            <MaterialCommunityIcons 
              name="wallet" 
              size={16} 
              color={item.is_income_verified ? '#22c55e' : '#222'} 
              style={styles.verificationIconSpacing}
            />
            <MaterialCommunityIcons 
              name="cellphone-check" 
              size={16} 
              color={item.is_phone_verified ? '#06b6d4' : '#222'} 
              style={styles.verificationIconSpacing}
            />
            <MaterialCommunityIcons 
              name="account-details" 
              size={16} 
              color={item.is_references_verified ? '#a855f7' : '#222'} 
              style={styles.verificationIconSpacing}
            />
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#333" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderToast = () => {
    if (!toast) return null;
    return (
      <View style={styles.toastOuterContainer}>
        <View style={[styles.toastCard, toast.type === 'error' ? styles.toastCardError : styles.toastCardSuccess]}>
          <MaterialCommunityIcons 
            name={toast.type === 'success' ? "check-circle" : "alert-circle"} 
            size={18} 
            color={toast.type === 'success' ? "#22c55e" : "#ef4444"} 
          />
          <Text style={styles.toastMessageText}>{toast.message}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Barra superior de Búsqueda y Ajustes */}
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder={locale === 'es' ? 'Buscar usuarios por nombre...' : 'Search users by name...'}
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
          style={[styles.filterMenuButton, showFiltersMenu && { borderColor: accentColor }]}
          onPress={() => setShowFiltersMenu(!showFiltersMenu)}
        >
          <MaterialCommunityIcons name="tune" size={20} color={showFiltersMenu ? accentColor : '#aaa'} />
        </TouchableOpacity>
      </View>

      {/* Menú Expandible de Filtros y Ordenación */}
      {showFiltersMenu && (
        <View style={styles.expandedFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {/* Roles */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabelText}>{locale === 'es' ? 'Rol' : 'Role'}</Text>
              <View style={styles.filterChipsRow}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.chip, filterRole === r && { borderColor: accentColor, backgroundColor: `${accentColor}10` }]}
                    onPress={() => setFilterRole(r)}
                  >
                    <Text style={[styles.chipText, filterRole === r && { color: accentColor }]}>
                      {r === 'all' ? (locale === 'es' ? 'Todos' : 'All') : translateRole(r)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {/* Estados de Cuenta */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabelText}>{locale === 'es' ? 'Estado Cuenta' : 'Account Status'}</Text>
              <View style={styles.filterChipsRow}>
                {STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, filterStatus === s && { borderColor: accentColor, backgroundColor: `${accentColor}10` }]}
                    onPress={() => setFilterStatus(s)}
                  >
                    <Text style={[styles.chipText, filterStatus === s && { color: accentColor }]}>
                      {s === 'all' ? (locale === 'es' ? 'Todos' : 'All') : translateStatus(s)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.rowFiltersGrid}>
            {/* Filtro Verificación */}
            <View style={[styles.filterSection, { flex: 1 }]}>
              <Text style={styles.filterLabelText}>{locale === 'es' ? 'Verificación' : 'Verification'}</Text>
              <View style={styles.filterChipsRow}>
                {VERIFICATIONS.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.chip, filterVerification === v && { borderColor: accentColor, backgroundColor: `${accentColor}10` }]}
                    onPress={() => setFilterVerification(v)}
                  >
                    <Text style={[styles.chipText, filterVerification === v && { color: accentColor }]}>
                      {v === 'all' ? (locale === 'es' ? 'Todos' : 'All') : v === 'verified' ? (locale === 'es' ? 'Verificado' : 'Verified') : (locale === 'es' ? 'Sin Verificar' : 'Unverified')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Ordenación */}
            <View style={[styles.filterSection, { width: 140 }]}>
              <Text style={styles.filterLabelText}>{locale === 'es' ? 'Ordenar por' : 'Sort by'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                {[
                  { key: 'newest', val: locale === 'es' ? 'Recientes' : 'Newest' },
                  { key: 'oldest', val: locale === 'es' ? 'Antiguos' : 'Oldest' },
                  { key: 'trust-desc', val: locale === 'es' ? 'Confianza' : 'Trust' }
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

      {/* Grid de Métricas del Dashboard */}
      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScrollContent}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="account-group" size={20} color="#fff" />
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>{locale === 'es' ? 'Total' : 'Total'}</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="account-check" size={20} color="#22c55e" />
            <Text style={[styles.statNumber, { color: '#22c55e' }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>{locale === 'es' ? 'Activos' : 'Active'}</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="check-decagram" size={20} color={accentColor} />
            <Text style={[styles.statNumber, { color: accentColor }]}>{stats.verified}</Text>
            <Text style={styles.statLabel}>{locale === 'es' ? 'Verificados' : 'Verified'}</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="shield-alert" size={20} color="#eab308" />
            <Text style={[styles.statNumber, { color: '#eab308' }]}>{stats.pendingVerification}</Text>
            <Text style={styles.statLabel}>{locale === 'es' ? 'Pendientes' : 'Pending'}</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="account-cancel" size={20} color="#ef4444" />
            <Text style={[styles.statNumber, { color: '#ef4444' }]}>{stats.suspended}</Text>
            <Text style={styles.statLabel}>{locale === 'es' ? 'Suspendidos' : 'Suspended'}</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="account-plus" size={20} color="#06b6d4" />
            <Text style={[styles.statNumber, { color: '#06b6d4' }]}>{stats.newThisMonth}</Text>
            <Text style={styles.statLabel}>{locale === 'es' ? 'Este Mes' : 'New Month'}</Text>
          </View>
        </ScrollView>
      </View>

      {/* Lista de Usuarios */}
      {loading && !refreshing ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons name="account-question" size={48} color="#222" />
              <Text style={styles.emptyText}>
                {locale === 'es' ? 'No se encontraron usuarios.' : 'No users found.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Modal Detallado de Ficha del Usuario */}
      <Modal
        visible={detailModalVisible && selectedUser !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedUser && (
              <>
                {/* Cabecera del Modal */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalUserIntro}>
                    {selectedUser.photoUrl || (selectedUser.photos && selectedUser.photos[0]) ? (
                      <Image source={{ uri: selectedUser.photoUrl || selectedUser.photos![0] }} style={styles.modalAvatar} />
                    ) : (
                      <View style={[styles.modalAvatar, styles.modalAvatarTextBg]}>
                        <Text style={[styles.modalAvatarText, { color: accentColor }]}>{(selectedUser.name || '?')[0].toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={styles.modalUserIntroText}>
                      <Text style={styles.modalTitleText} numberOfLines={1}>{selectedUser.name}</Text>
                      <Text style={styles.modalSubtitleText} numberOfLines={1}>{selectedUser.id}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeButton}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Barra de Pestañas del Modal */}
                <View style={styles.tabBar}>
                  {(['general', 'verifications', 'associations', 'audit'] as const).map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[styles.tabItem, activeTab === tab && { borderBottomColor: accentColor }]}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Text style={[styles.tabText, activeTab === tab && { color: '#fff' }]}>
                        {tab === 'general' ? (locale === 'es' ? 'General' : 'General') :
                         tab === 'verifications' ? (locale === 'es' ? 'Verificaciones' : 'Verif') :
                         tab === 'associations' ? (locale === 'es' ? 'Asociaciones' : 'Links') :
                         (locale === 'es' ? 'Auditoría' : 'Audit')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Contenido de Pestañas */}
                <ScrollView contentContainerStyle={styles.tabContentContainer}>
                  {activeTab === 'general' && (
                    <View style={styles.tabPanel}>
                      <Text style={styles.sectionTitle}>{locale === 'es' ? 'Información de Cuenta' : 'Account Details'}</Text>
                      
                      <Text style={styles.inputLabel}>{locale === 'es' ? 'Nombre Completo' : 'Full Name'}</Text>
                      <TextInput 
                        style={styles.textInput} 
                        value={editName} 
                        onChangeText={setEditName} 
                        placeholder={locale === 'es' ? 'Nombre' : 'Name'}
                        placeholderTextColor="#444"
                      />

                      <Text style={styles.inputLabel}>{locale === 'es' ? 'Correo Electrónico (Persistido Local)' : 'Email (Local Persisted)'}</Text>
                      <TextInput 
                        style={styles.textInput} 
                        value={editEmail} 
                        onChangeText={setEditEmail} 
                        placeholder="Email"
                        placeholderTextColor="#444"
                        keyboardType="email-address"
                      />

                      <Text style={styles.inputLabel}>{locale === 'es' ? 'Teléfono (Persistido Local)' : 'Phone (Local Persisted)'}</Text>
                      <TextInput 
                        style={styles.textInput} 
                        value={editPhone} 
                        onChangeText={setEditPhone} 
                        placeholder="Phone"
                        placeholderTextColor="#444"
                        keyboardType="phone-pad"
                      />

                      <Text style={styles.inputLabel}>{locale === 'es' ? 'Rol de Usuario' : 'User Role'}</Text>
                      <View style={styles.buttonGroupRow}>
                        {ROLES.filter(r => r !== 'all').map((roleOption) => {
                          const isActive = editRole === roleOption;
                          return (
                            <TouchableOpacity
                              key={roleOption}
                              style={[styles.groupButton, isActive && { backgroundColor: accentColor }]}
                              onPress={() => setEditRole(roleOption)}
                            >
                              <Text style={[styles.groupButtonText, isActive && { color: '#000', fontWeight: 'bold' }]}>
                                {translateRole(roleOption)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <Text style={styles.inputLabel}>{locale === 'es' ? 'Estado de la Cuenta' : 'Account Status'}</Text>
                      <View style={styles.buttonGroupRow}>
                        {STATUSES.filter(s => s !== 'all').map((statusOption) => {
                          const isActive = editStatus === statusOption;
                          return (
                            <TouchableOpacity
                              key={statusOption}
                              style={[styles.groupButton, isActive && { backgroundColor: STATUS_COLOR[statusOption] }]}
                              onPress={() => setEditStatus(statusOption)}
                            >
                              <Text style={[styles.groupButtonText, isActive && { color: '#000', fontWeight: 'bold' }]}>
                                {translateStatus(statusOption)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={styles.metaRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.inputLabel}>{locale === 'es' ? 'Puntaje de Confianza (Trust Score)' : 'Trust Score'}</Text>
                          <View style={styles.scoreControlRow}>
                            <TouchableOpacity 
                              style={styles.adjustScoreBtn}
                              onPress={() => {
                                const current = editTrustScore !== null ? editTrustScore : 50;
                                const newVal = Math.max(0, current - 5);
                                setEditTrustScore(newVal);
                              }}
                            >
                              <MaterialCommunityIcons name="minus" size={16} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.scoreTextValue}>{editTrustScore !== null ? `${editTrustScore}%` : '50%'}</Text>
                            <TouchableOpacity 
                              style={styles.adjustScoreBtn}
                              onPress={() => {
                                const current = editTrustScore !== null ? editTrustScore : 50;
                                const newVal = Math.min(100, current + 5);
                                setEditTrustScore(newVal);
                              }}
                            >
                              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={{ width: 140 }}>
                          <Text style={styles.inputLabel}>{locale === 'es' ? 'Nivel de Riesgo' : 'Risk Level'}</Text>
                          <View style={styles.riskSelectionRow}>
                            {['low', 'medium', 'high'].map((lvl) => {
                              const isActive = editRiskLevel === lvl;
                              return (
                                <TouchableOpacity
                                  key={lvl}
                                  style={[styles.riskOptionBtn, isActive && { backgroundColor: RISK_COLOR[lvl] }]}
                                  onPress={() => setEditRiskLevel(lvl)}
                                >
                                  <Text style={[styles.riskOptionText, isActive && { color: '#000', fontWeight: 'bold' }]}>
                                    {lvl[0].toUpperCase()}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      </View>

                      <View style={styles.vipToggleRow}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.vipToggleTitle}>{locale === 'es' ? 'Suscripción Premium / VIP' : 'VIP / Premium Subscription'}</Text>
                          <Text style={styles.vipToggleDesc}>{locale === 'es' ? 'Otorga ventajas exclusivas en la feed' : 'Grants premium features in application feed'}</Text>
                        </View>
                        <Switch
                          value={editVip}
                          onValueChange={(val) => setEditVip(val)}
                          trackColor={{ false: '#333', true: accentColor }}
                          thumbColor={'#fff'}
                        />
                      </View>

                      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={saveAdminDetails}>
                        <Text style={styles.saveBtnText}>{locale === 'es' ? 'Guardar Cambios' : 'Save Changes'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {activeTab === 'verifications' && (
                    <View style={styles.tabPanel}>
                      <Text style={styles.sectionTitle}>{locale === 'es' ? 'Estado de Verificaciones' : 'Verifications Panel'}</Text>
                      
                      {[
                        { key: 'is_identity_verified', label: locale === 'es' ? 'Verificación de Identidad' : 'Identity Verification', icon: 'check-decagram', color: accentColor },
                        { key: 'is_background_verified', label: locale === 'es' ? 'Antecedentes Penales' : 'Background Verification', icon: 'shield-account', color: '#3b82f6' },
                        { key: 'is_income_verified', label: locale === 'es' ? 'Comprobación de Ingresos' : 'Income Verification', icon: 'wallet', color: '#22c55e' },
                        { key: 'is_phone_verified', label: locale === 'es' ? 'Verificación Telefónica' : 'Phone Verification', icon: 'cellphone-check', color: '#06b6d4' },
                        { key: 'is_references_verified', label: locale === 'es' ? 'Referencias de Arrendadores' : 'Leasing References', icon: 'account-details', color: '#a855f7' },
                        { key: 'is_social_verified', label: locale === 'es' ? 'Redes Sociales' : 'Social Media Verification', icon: 'earth', color: '#3b82f6' },
                        { key: 'is_university_verified', label: locale === 'es' ? 'Verificación Universitaria' : 'University Check', icon: 'school', color: '#f59e0b' },
                        { key: 'is_workplace_verified', label: locale === 'es' ? 'Centro de Trabajo' : 'Workplace Check', icon: 'briefcase', color: '#ec4899' }
                      ].map((item) => {
                        const val = !!editVerifications[item.key];
                        return (
                          <View key={item.key} style={styles.verificationRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <MaterialCommunityIcons name={item.icon as any} size={22} color={val ? item.color : '#333'} />
                              <Text style={[styles.verificationRowText, val && { color: '#fff' }]}>{item.label}</Text>
                            </View>
                            <Switch
                              value={val}
                              onValueChange={(newVal) => setEditVerifications(prev => ({ ...prev, [item.key]: newVal }))}
                              trackColor={{ false: '#333', true: item.color }}
                              thumbColor={'#fff'}
                            />
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {activeTab === 'associations' && (
                    <View style={styles.tabPanel}>
                      <Text style={styles.sectionTitle}>{locale === 'es' ? 'Registros Asociados en la BD' : 'Associated Database Records'}</Text>
                      {assocLoading ? (
                        <ActivityIndicator size="small" color={accentColor} style={{ padding: 20 }} />
                      ) : (
                        <View style={styles.assocGrid}>
                          <View style={styles.assocCard}>
                            <MaterialCommunityIcons name="home-city" size={24} color="#3b82f6" />
                            <Text style={styles.assocNumber}>{assocStats.listings}</Text>
                            <Text style={styles.assocLabel}>{locale === 'es' ? 'Anuncios Creados' : 'Listings Creadas'}</Text>
                          </View>
                          <View style={styles.assocCard}>
                            <MaterialCommunityIcons name="file-sign" size={24} color="#a855f7" />
                            <Text style={styles.assocNumber}>{assocStats.contracts}</Text>
                            <Text style={styles.assocLabel}>{locale === 'es' ? 'Contratos Firmados' : 'Signed Contracts'}</Text>
                          </View>
                          <View style={styles.assocCard}>
                            <MaterialCommunityIcons name="alert-box" size={24} color="#f97316" />
                            <Text style={styles.assocNumber}>{assocStats.reportsFiled}</Text>
                            <Text style={styles.assocLabel}>{locale === 'es' ? 'Reportes Emitidos' : 'Reports Filed'}</Text>
                          </View>
                          <View style={styles.assocCard}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#ef4444" />
                            <Text style={styles.assocNumber}>{assocStats.reportsAgainst}</Text>
                            <Text style={styles.assocLabel}>{locale === 'es' ? 'Reportes en Contra' : 'Reports Received'}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {activeTab === 'audit' && (
                    <View style={styles.tabPanel}>
                      <Text style={styles.sectionTitle}>{locale === 'es' ? 'Comentarios del Administrador' : 'Administrative Notes'}</Text>
                      <TextInput
                        style={styles.notesArea}
                        value={editNotes}
                        onChangeText={setEditNotes}
                        placeholder={locale === 'es' ? 'Escribe aquí notas de control interno, justificación de suspensiones, etc...' : 'Write administrative notes, verification log details here...'}
                        placeholderTextColor="#444"
                        multiline={true}
                        numberOfLines={4}
                      />
                      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#1a1a1a', borderColor: '#333', borderWidth: 1 }]} onPress={saveAdminDetails}>
                        <Text style={[styles.saveBtnText, { color: '#fff' }]}>{locale === 'es' ? 'Guardar Notas' : 'Save Notes'}</Text>
                      </TouchableOpacity>

                      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{locale === 'es' ? 'Historial de Auditoría Local' : 'Local Audit Trail'}</Text>
                      {auditLogs.length === 0 ? (
                        <Text style={styles.emptyText}>{locale === 'es' ? 'No hay logs administrativos registrados.' : 'No administration logs registered.'}</Text>
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
                {detailModalVisible && renderToast()}
              </>
            )}
          </View>
        </View>
      </Modal>
      {!detailModalVisible && renderToast()}
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  topBar: { 
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
    backgroundColor: '#0d0d0d', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    gap: 8, 
    borderWidth: 1, 
    borderColor: '#1a1a1a', 
    height: 44 
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  filterMenuButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1a1a1a'
  },
  expandedFiltersContainer: {
    backgroundColor: '#0a0a0a',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  filterScroll: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  filterSection: {
    marginRight: 16,
  },
  filterLabelText: {
    color: '#555',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChipsRow: {
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
    borderColor: '#1e1e1e',
    backgroundColor: '#0d0d0d',
  },
  chipText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  rowFiltersGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 10
  },
  statsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    backgroundColor: '#080808'
  },
  statsScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10
  },
  statCard: {
    width: 105,
    backgroundColor: '#0c0c0c',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#161616',
    padding: 10,
    alignItems: 'center',
    gap: 4
  },
  statNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 12,
    gap: 10
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111'
  },
  avatarTextContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 18
  },
  cardMiddle: {
    flex: 1,
    gap: 4
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  userNameText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    maxWidth: width * 0.4
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize'
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
  cardRight: {
    alignItems: 'flex-end',
    gap: 4
  },
  trustScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e1e1e'
  },
  trustScoreValue: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold'
  },
  dateLabel: {
    color: '#444',
    fontSize: 10
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#161616',
    paddingTop: 8
  },
  verificationBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  verificationIconSpacing: {
    marginRight: 2
  },
  separator: { height: 12 },
  centerLoader: { paddingVertical: 100, alignItems: 'center' },
  emptyStateContainer: {
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
    borderBottomColor: '#1a1a1a',
  },
  modalUserIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#111',
  },
  modalAvatarTextBg: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222'
  },
  modalAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalUserIntroText: {
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
    backgroundColor: '#070707',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  tabContentContainer: {
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
  buttonGroupRow: {
    flexDirection: 'row',
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 3,
    gap: 2,
  },
  groupButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupButtonText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  scoreControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 3,
    gap: 10,
    height: 44,
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  adjustScoreBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTextValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  riskSelectionRow: {
    flexDirection: 'row',
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 3,
    height: 44,
    alignItems: 'center',
    gap: 2,
  },
  riskOptionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskOptionText: {
    color: '#888',
    fontSize: 11,
  },
  vipToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 12,
  },
  vipToggleTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  vipToggleDesc: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
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
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 12,
  },
  verificationRowText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  assocGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  assocCard: {
    width: (width - 44) / 2,
    backgroundColor: '#0c0c0c',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  assocNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  assocLabel: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  notesArea: {
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
  toastOuterContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    maxWidth: '90%',
  },
  toastCardSuccess: {
    borderColor: '#22c55e40',
  },
  toastCardError: {
    borderColor: '#ef444440',
  },
  toastMessageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});
