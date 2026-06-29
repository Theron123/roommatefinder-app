import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';

type Profile = {
  id: string;
  name: string;
  role: string;
  trust_score: number | null;
  risk_level: string | null;
  created_at: string;
  is_identity_verified: boolean | null;
  is_background_verified: boolean | null;
};

const ROLES = ['all', 'seeker', 'host', 'landlord', 'admin'];

export default function AdminUsers() {
  const [users, setUsers]           = useState<Profile[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const { locale, t } = useTranslation();
  const { accentColor } = useAdminTheme();

  const ROLE_COLOR: Record<string, string> = {
    admin: '#f97316', seeker: accentColor, host: '#3b82f6', landlord: '#a855f7',
  };
  const RISK_COLOR: Record<string, string> = {
    low: accentColor, medium: '#f97316', high: '#ff4444',
  };

  const translateRole = (role: string) => {
    if (role === 'seeker') return t('explore.role_seeker', 'Seeker');
    if (role === 'host') return t('explore.role_host', 'Host');
    if (role === 'landlord') return locale === 'es' ? 'Propietario' : 'Landlord';
    if (role === 'admin') return locale === 'es' ? 'Admin' : 'Admin';
    return role;
  };

  const fetchUsers = useCallback(async () => {
    let query = supabase
      .from('profiles')
      .select('id, name, role, trust_score, risk_level, created_at, is_identity_verified, is_background_verified')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filterRole !== 'all') query = query.eq('role', filterRole);
    if (search.trim())        query = query.ilike('name', `%${search.trim()}%`);

    const { data, error } = await query;
    if (!error) setUsers(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [filterRole, search]);

  useEffect(() => { setLoading(true); fetchUsers(); }, [fetchUsers]);

  const onRefresh = () => { setRefreshing(true); fetchUsers(); };

  const changeRole = (userId: string, currentRole: string) => {
    const options = ROLES
      .filter(r => r !== 'all' && r !== currentRole)
      .map(r => ({ 
        text: translateRole(r), 
        onPress: () => confirmRoleChange(userId, r) 
      }));
    
    Alert.alert(
      t('admin.users.change_role', 'Change Role'), 
      t('admin.users.current_role', `Current: ${currentRole}`).replace('{role}', translateRole(currentRole)), 
      [
        ...options,
        { text: t('general.cancel', 'Cancel'), style: 'cancel' as const },
      ]
    );
  };

  const confirmRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) fetchUsers();
    else Alert.alert(t('general.error', 'Error'), t('admin.users.error_change', 'Failed to change role') + ': ' + error.message);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(t('settings.locale', 'en-US'), { month: 'short', day: 'numeric', year: '2-digit' });

  const renderUser = ({ item }: { item: Profile }) => (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={[styles.avatarText, { color: accentColor }]}>{(item.name || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.infoCol}>
        <Text style={styles.userName}>{item.name || 'Unknown'}</Text>
        <View style={styles.badgesRow}>
          {item.is_identity_verified && (
            <MaterialCommunityIcons name="check-decagram" size={13} color={accentColor} />
          )}
          {item.is_background_verified && (
            <MaterialCommunityIcons name="shield-check" size={13} color="#3b82f6" />
          )}
          {item.risk_level && (
            <View style={[styles.riskBadge, { backgroundColor: (RISK_COLOR[item.risk_level] || '#888') + '25' }]}>
              <Text style={[styles.riskText, { color: RISK_COLOR[item.risk_level] || '#888' }]}>
                {t('admin.users.risk', `Risk: ${item.risk_level}`).replace('{level}', item.risk_level)}
              </Text>
            </View>
          )}
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.roleBadge, { backgroundColor: (ROLE_COLOR[item.role] || '#888') + '20' }]}
        onPress={() => changeRole(item.id, item.role)}
      >
        <Text style={[styles.roleText, { color: ROLE_COLOR[item.role] || '#888' }]}>
          {translateRole(item.role) || '—'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={12} color={ROLE_COLOR[item.role] || '#888'} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>{t('admin.users.title', 'Users Management')}</Text>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={18} color="#555" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('admin.users.search_placeholder', 'Search users by name...')}
            placeholderTextColor="#555"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#555" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Role filter */}
      <View style={styles.filterRow}>
        {ROLES.map(r => (
          <TouchableOpacity
            key={r}
            style={[
              styles.filterChip, 
              filterRole === r && { backgroundColor: `${accentColor}1a`, borderColor: accentColor }
            ]}
            onPress={() => setFilterRole(r)}
          >
            <Text style={[styles.filterChipText, filterRole === r && { color: accentColor }]}>
              {r === 'all' ? t('admin.users.filter_all', 'All Roles') : translateRole(r)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Table header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 1 }]}>{t('admin.verifications.user', 'User')}</Text>
        <Text style={[styles.headerCell, { width: 100 }]}>{t('admin.nav.settings', 'Role')} ↓</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={renderUser}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('admin.users.no_users', 'No users found.')}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#0a0a0a' },
  topBar:               { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  pageTitle:            { fontSize: 22, fontWeight: '700', color: '#fff' },
  searchBox:            { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 8, paddingHorizontal: 10, gap: 6, borderWidth: 1, borderColor: '#222', height: 40 },
  searchInput:          { flex: 1, color: '#fff', fontSize: 14 },
  filterRow:            { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  filterChip:           { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  filterChipText:       { color: '#888', fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  tableHeader:          { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', backgroundColor: '#080808' },
  headerCell:           { color: '#555', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  row:                  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  avatar:               { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  avatarText:           { fontWeight: '700', fontSize: 15 },
  infoCol:              { flex: 1, gap: 4 },
  userName:             { color: '#fff', fontSize: 14, fontWeight: '500' },
  badgesRow:            { flexDirection: 'row', alignItems: 'center', gap: 5 },
  riskBadge:            { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  riskText:             { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  dateText:             { color: '#444', fontSize: 11 },
  roleBadge:            { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  roleText:             { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  separator:            { height: 1, backgroundColor: '#111' },
  centerLoader:         { paddingTop: 80, alignItems: 'center' },
  emptyText:            { textAlign: 'center', color: '#555', marginTop: 60, fontSize: 15 },
});
