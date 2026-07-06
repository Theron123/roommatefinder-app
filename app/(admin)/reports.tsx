import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Report = {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter_id: string;
  reported_id: string;
};

const STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'];

export default function AdminReports() {
  const [reports, setReports]       = useState<Report[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');

  const { locale, t } = useTranslation();
  const { accentColor } = useAdminTheme();

  const STATUS_COLOR: Record<string, string> = {
    pending: '#f97316', reviewed: '#3b82f6', resolved: accentColor, dismissed: '#555',
  };

  const fetchReports = useCallback(async () => {
    const { data, error } = await supabase
      .from('user_reports')
      .select('id, reason, description, status, created_at, reporter_id, reported_id')
      .eq('status', filterStatus)
      .order('created_at', { ascending: false });

    if (!error) setReports((data as unknown as Report[]) || []);
    setLoading(false);
    setRefreshing(false);
  }, [filterStatus]);

  useEffect(() => { setLoading(true); fetchReports(); }, [fetchReports]);

  const onRefresh = () => { setRefreshing(true); fetchReports(); };

  const updateStatus = (id: string, newStatus: string) => {
    Alert.alert(
      t('general.confirm', 'Confirm'), 
      t('admin.reports.update_msg', 'Mark as "{status}"?').replace('{status}', newStatus), 
      [
        { text: t('general.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('general.confirm', 'Confirm'),
          onPress: async () => {
            await supabase.from('user_reports').update({ status: newStatus }).eq('id', id);
            fetchReports();
          },
        },
      ]
    );
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(t('settings.locale', 'en-US'), {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const renderReport = ({ item }: { item: Report }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.reason}>{item.reason}</Text>
          <Text style={styles.meta}>
            {t('admin.reports.reporter', 'Reporter')}: {item.reporter_id.slice(0, 8)}... → {t('admin.reports.reported', 'Reported')}: {item.reported_id.slice(0, 8)}...
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
            {item.status}
          </Text>
        </View>
      </View>

      {item.description ? (
        <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
      ) : (
        <Text style={styles.noDesc}>{locale === 'es' ? 'Sin descripción proporcionada.' : 'No description provided.'}</Text>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        <View style={styles.actions}>
          {STATUSES
            .filter(s => s !== item.status)
            .map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.actionBtn, { borderColor: STATUS_COLOR[s] + '66' }]}
                onPress={() => updateStatus(item.id, s)}
              >
                <Text style={[styles.actionText, { color: STATUS_COLOR[s] }]}>{s}</Text>
              </TouchableOpacity>
            ))
          }
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>{t('admin.reports.title', 'User Reports')}</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {STATUSES.map(s => (
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
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          renderItem={renderReport}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {locale === 'es' ? `No hay reportes pendientes.` : `No pending reports.`}
            </Text>
          }
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
  filterChip:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#222', backgroundColor: '#111' },
  filterText:  { color: '#888', fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  listContent: { padding: 16, gap: 12 },
  card:        { backgroundColor: '#111', borderRadius: 12, padding: 16, gap: 10, borderWidth: 1, borderColor: '#1a1a1a' },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardHeaderLeft: { flex: 1, gap: 3 },
  reason:      { color: '#fff', fontWeight: '600', fontSize: 15 },
  meta:        { color: '#555', fontSize: 11 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:  { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  description: { color: '#888', fontSize: 13, lineHeight: 18 },
  noDesc:      { color: '#333', fontSize: 12 },
  cardFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  date:        { color: '#444', fontSize: 11 },
  actions:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actionBtn:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  actionText:  { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  centerLoader:{ paddingTop: 80, alignItems: 'center' },
  emptyText:   { textAlign: 'center', color: '#555', marginTop: 60, fontSize: 15 },
});
