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
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';

type UserProfile = {
  id: string;
  name: string;
  role: string | null;
  photoUrl: string | null;
  created_at: string;
  email?: string;
};

type AuditLog = {
  timestamp: string;
  action: string;
  adminName: string;
};

const ROLES_LIST = [
  { value: 'admin', label: 'Level 1 – System Administrator', labelEs: 'Nivel 1 – Administrador de Sistema', color: '#f97316', icon: 'shield-crown' },
  { value: 'company', label: 'Level 2 – Company', labelEs: 'Nivel 2 – Empresa Inmobiliaria', color: '#3b82f6', icon: 'office-building' },
  { value: 'landlord', label: 'Level 3 – Property Owner', labelEs: 'Nivel 3 – Propietario de Inmuebles', color: '#a855f7', icon: 'home-account' },
  { value: 'seeker', label: 'Standard User (Seeker)', labelEs: 'Usuario Estándar (Buscador)', color: '#49C788', icon: 'account-outline' },
  { value: 'host', label: 'Standard User (Host)', labelEs: 'Usuario Estándar (Anfitrión)', color: '#06b6d4', icon: 'account-cowboy-hat' },
];

export default function RoleManagementScreen() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  
  // Selected user for role change
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [targetRole, setTargetRole] = useState<string>('seeker');

  const { locale } = useTranslation();
  const { accentColor } = useAdminTheme();

  const fetchEmailsForUsers = async (profilesList: UserProfile[]) => {
    const updated = await Promise.all(
      profilesList.map(async (u) => {
        const emailKey = `admin_email:${u.id}`;
        const saved = await AsyncStorage.getItem(emailKey);
        const cleanName = (u.name || 'user').toLowerCase().replace(/\s+/g, '');
        return {
          ...u,
          email: saved || `${cleanName}@roommatefinder.com`,
        };
      })
    );
    return updated;
  };

  const fetchUsers = useCallback(async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('id, name, role, photoUrl, created_at');

      if (search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      query = query.order('name', { ascending: true }).limit(50);

      const { data, error } = await query;
      if (!error && data) {
        const withEmails = await fetchEmailsForUsers(data as UserProfile[]);
        setUsers(withEmails);
      }
    } catch (e) {
      console.error('Error fetching users for roles:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const addAuditLog = async (userId: string, action: string) => {
    try {
      const auditKey = `admin_user_audit:${userId}`;
      const existing = await AsyncStorage.getItem(auditKey);
      const logs = existing ? JSON.parse(existing) : [];
      const newLog: AuditLog = {
        timestamp: new Date().toISOString(),
        action,
        adminName: 'Super Admin',
      };
      await AsyncStorage.setItem(auditKey, JSON.stringify([newLog, ...logs]));
    } catch (e) {
      console.error('Error writing audit log:', e);
    }
  };

  const handleRoleChange = (user: UserProfile) => {
    setSelectedUser(user);
    setTargetRole(user.role || 'seeker');
    setPickerModalVisible(true);
  };

  const confirmRoleChange = async () => {
    if (!selectedUser) return;
    setPickerModalVisible(false);

    const oldRoleLabel = ROLES_LIST.find(r => r.value === (selectedUser.role || 'seeker'))?.label || 'seeker';
    const newRoleLabel = ROLES_LIST.find(r => r.value === targetRole)?.label || targetRole;

    const performChange = async () => {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('profiles')
          .update({ role: targetRole })
          .eq('id', selectedUser.id);

        if (error) throw error;

        // Log to audit
        await addAuditLog(
          selectedUser.id,
          `Rol modificado de "${oldRoleLabel}" a "${newRoleLabel}"`
        );

        Alert.alert(
          locale === 'es' ? 'Éxito' : 'Success',
          locale === 'es' ? 'Rol de usuario actualizado con éxito.' : 'User role updated successfully.'
        );
        fetchUsers();
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to update user role');
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        locale === 'es' 
          ? `¿Estás seguro de cambiar el rol de ${selectedUser.name} a "${newRoleLabel}"?`
          : `Are you sure you want to change the role of ${selectedUser.name} to "${newRoleLabel}"?`
      );
      if (confirmed) {
        performChange();
      }
    } else {
      Alert.alert(
        locale === 'es' ? 'Confirmar Cambio de Rol' : 'Confirm Role Change',
        locale === 'es'
          ? `¿Estás seguro de cambiar el rol de ${selectedUser.name} de "${oldRoleLabel}" a "${newRoleLabel}"?`
          : `Are you sure you want to change the role of ${selectedUser.name} from "${oldRoleLabel}" to "${newRoleLabel}"?`,
        [
          { text: locale === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
          { text: locale === 'es' ? 'Confirmar' : 'Confirm', style: 'default', onPress: performChange },
        ]
      );
    }
  };

  const getRoleBadge = (roleName: string | null) => {
    const current = ROLES_LIST.find(r => r.value === (roleName || 'seeker')) || ROLES_LIST[3];
    return (
      <View style={[styles.roleBadge, { backgroundColor: current.color + '15', borderColor: current.color + '30' }]}>
        <MaterialCommunityIcons name={current.icon as any} size={13} color={current.color} style={{ marginRight: 4 }} />
        <Text style={[styles.roleBadgeText, { color: current.color }]}>
          {locale === 'es' ? current.labelEs : current.label}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{locale === 'es' ? 'Gestión de Jerarquías y Roles' : 'User Hierarchy Management'}</Text>
        <Text style={styles.pageSubtitle}>
          {locale === 'es' 
            ? 'Asigna privilegios administrativos y de negocio a los usuarios de la plataforma.'
            : 'Assign administrative and business privilege levels to platform users.'}
        </Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBarContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={locale === 'es' ? 'Buscar usuario por nombre o correo...' : 'Search users by name or email...'}
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
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, { borderColor: accentColor + '20' }]}>
                  <Text style={[styles.avatarText, { color: accentColor }]}>
                    {(item.name || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>{item.name || 'Unknown User'}</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.editBtn, { backgroundColor: `${accentColor}12`, borderColor: `${accentColor}25` }]}
                  onPress={() => handleRoleChange(item)}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={accentColor} />
                  <Text style={[styles.editBtnText, { color: accentColor }]}>{locale === 'es' ? 'Cambiar' : 'Change'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.footerLabel}>{locale === 'es' ? 'Rol Actual:' : 'Current Role:'}</Text>
                {getRoleBadge(item.role)}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>
                {locale === 'es' ? 'No se encontraron usuarios' : 'No users found'}
              </Text>
            </View>
          }
        />
      )}

      {/* Picker Modal for Roles */}
      <Modal
        visible={pickerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{locale === 'es' ? 'Seleccionar Jerarquía' : 'Select Privilege Level'}</Text>
              <TouchableOpacity onPress={() => setPickerModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 24 }}>
              {ROLES_LIST.map((roleOpt) => {
                const isSelected = targetRole === roleOpt.value;
                return (
                  <TouchableOpacity
                    key={roleOpt.value}
                    style={[styles.roleOption, isSelected && { backgroundColor: `${roleOpt.color}15`, borderColor: `${roleOpt.color}40` }]}
                    onPress={() => setTargetRole(roleOpt.value)}
                  >
                    <View style={[styles.optionIconBox, { backgroundColor: isSelected ? `${roleOpt.color}25` : '#1a1a24' }]}>
                      <MaterialCommunityIcons name={roleOpt.icon as any} size={20} color={isSelected ? roleOpt.color : '#888'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, isSelected && { color: roleOpt.color, fontWeight: '700' }]}>
                        {locale === 'es' ? roleOpt.labelEs : roleOpt.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialCommunityIcons name="check-circle" size={20} color={roleOpt.color} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelActionBtn} onPress={() => setPickerModalVisible(false)}>
                <Text style={styles.cancelActionText}>{locale === 'es' ? 'Cancelar' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmActionBtn, { backgroundColor: accentColor }]} onPress={confirmRoleChange}>
                <Text style={styles.confirmActionText}>{locale === 'es' ? 'Aplicar' : 'Apply'}</Text>
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
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
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
  userCard: {
    backgroundColor: '#12121a',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    gap: 2,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  userEmail: {
    color: '#666',
    fontSize: 12,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  footerLabel: {
    color: '#777',
    fontSize: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
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
    maxHeight: '80%',
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
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12121c',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
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
