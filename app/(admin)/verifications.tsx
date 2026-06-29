import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Verification = {
  id: string;
  type: string;
  status: string;
  document_url: string | null;
  created_at: string;
  user_id: string;
};

const VERIFY_META: Record<string, { icon: any; color: string }> = {
  identity:   { icon: 'card-account-details', color: '#3b82f6' },
  background: { icon: 'shield-check',          color: '#49C788' },
  income:     { icon: 'cash',                  color: '#a855f7' },
  phone:      { icon: 'phone',                 color: '#06b6d4' },
  social:     { icon: 'instagram',             color: '#f97316' },
  university: { icon: 'school',                color: '#f43f5e' },
  workplace:  { icon: 'briefcase',             color: '#eab308' },
  references: { icon: 'account-check',         color: '#49C788' },
};

const PROFILE_FLAG: Record<string, string> = {
  identity:   'is_identity_verified',
  background: 'is_background_verified',
  income:     'is_income_verified',
  phone:      'is_phone_verified',
  social:     'is_social_verified',
  university: 'is_university_verified',
  workplace:  'is_workplace_verified',
  references: 'is_references_verified',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#f97316', approved: '#49C788', rejected: '#ff4444',
};

export default function AdminVerifications() {
  const [items, setItems]           = useState<Verification[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from('verifications')
      .select('id, type, status, document_url, created_at, user_id')
      .eq('status', filterStatus)
      .order('created_at', { ascending: false });

    if (!error) setItems(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [filterStatus]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const decide = (id: string, userId: string, type: string, decision: 'approved' | 'rejected') => {
    Alert.alert(
      decision === 'approved' ? 'Approve Verification' : 'Reject Verification',
      `${decision === 'approved' ? 'Approve' : 'Reject'} this ${type} verification?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: decision === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            await supabaseAdmin.from('verifications').update({ status: decision }).eq('id', id);
            if (decision === 'approved') {
              const flag = PROFILE_FLAG[type];
              if (flag) await supabaseAdmin.from('profiles').update({ [flag]: true }).eq('id', userId);
            }
            fetchData();
          },
        },
      ],
    );
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const renderItem = ({ item }: { item: Verification }) => {
    const meta = VERIFY_META[item.type] || { icon: 'help-circle', color: '#888' };
    return (
      <View style={styles.card}>
        <View style={[styles.typeIcon, { backgroundColor: meta.color + '20' }]}>
          <MaterialCommunityIcons name={meta.icon} size={22} color={meta.color} />
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.typeName}>{item.type}</Text>
          <Text style={styles.userId}>{item.user_id.slice(0, 12)}...</Text>
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>

          {item.document_url ? (
            <TouchableOpacity onPress={() => Linking.openURL(item.document_url!)}>
              <Text style={styles.viewDoc}>View Document →</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.noDoc}>No document uploaded</Text>
          )}
        </View>

        <View style={styles.cardActions}>
          {item.status === 'pending' ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#49C78822', borderColor: '#49C78866' }]}
                onPress={() => decide(item.id, item.user_id, item.type, 'approved')}
              >
                <MaterialCommunityIcons name="check" size={18} color="#49C788" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#ff444422', borderColor: '#ff444466' }]}
                onPress={() => decide(item.id, item.user_id, item.type, 'rejected')}
              >
                <MaterialCommunityIcons name="close" size={18} color="#ff4444" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
                {item.status}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Verifications</Text>
      </View>

      <View style={styles.filterRow}>
        {['pending', 'approved', 'rejected'].map(s => (
          <TouchableOpacity
            key={s}
            style={[
              styles.filterChip,
              filterStatus === s && {
                borderColor: STATUS_COLOR[s],
                backgroundColor: STATUS_COLOR[s] + '18',
              },
            ]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[styles.filterText, filterStatus === s && { color: STATUS_COLOR[s] }]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#49C788" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(v) => v.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#49C788" />}
          ListEmptyComponent={<Text style={styles.emptyText}>No {filterStatus} verifications.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0a0a0a' },
  topBar:      { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  pageTitle:   { fontSize: 22, fontWeight: '700', color: '#fff' },
  filterRow:   { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', flexWrap: 'wrap' },
  filterChip:  { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#222', backgroundColor: '#111' },
  filterText:  { color: '#888', fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  listContent: { padding: 16, gap: 10 },
  card:        { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, padding: 14, gap: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1a1a1a' },
  typeIcon:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardBody:    { flex: 1, gap: 3 },
  typeName:    { color: '#fff', fontWeight: '600', fontSize: 14, textTransform: 'capitalize' },
  userId:      { color: '#555', fontSize: 11 },
  date:        { color: '#444', fontSize: 11 },
  viewDoc:     { color: '#49C788', fontSize: 12, marginTop: 2 },
  noDoc:       { color: '#333', fontSize: 12, marginTop: 2 },
  cardActions: { gap: 6, alignItems: 'center' },
  actionBtn:   { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:  { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  centerLoader:{ paddingTop: 80, alignItems: 'center' },
  emptyText:   { textAlign: 'center', color: '#555', marginTop: 60, fontSize: 15 },
});
