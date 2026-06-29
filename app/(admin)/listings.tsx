import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Alert,
  ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const adminSupabase = serviceRoleKey
  ? createClient(process.env.EXPO_PUBLIC_SUPABASE_URL as string, serviceRoleKey, {
      auth: { persistSession: false },
    })
  : supabase;

type Listing = {
  id: string;
  title: string;
  address: string;
  price: number;
  status: string;
  is_property_verified: boolean | null;
  created_at: string;
  user_id: string;
};

const STATUSES = ['all', 'active', 'inactive', 'pending'];
const STATUS_COLOR: Record<string, string> = {
  active: '#49C788', inactive: '#888', pending: '#f97316',
};

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

  // List state
  const [listings, setListings]     = useState<Listing[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Import state
  const [jsonInput, setJsonInput]   = useState('');
  const [importing, setImporting]   = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);

  const fetchListings = useCallback(async () => {
    let query = supabase
      .from('listings')
      .select('id, title, address, price, status, is_property_verified, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(80);
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    const { data, error } = await query;
    if (!error) setListings(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [filterStatus]);

  useEffect(() => { setLoading(true); fetchListings(); }, [fetchListings]);

  const onRefresh = () => { setRefreshing(true); fetchListings(); };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'active' ? 'inactive' : 'active';
    await adminSupabase.from('listings').update({ status: next }).eq('id', id);
    fetchListings();
  };

  const deleteListing = (id: string) => {
    Alert.alert('Delete Listing', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await adminSupabase.from('listings').delete().eq('id', id);
          fetchListings();
        },
      },
    ]);
  };

  // ── Bulk Import ────────────────────────────────────────────────
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
      const { error } = await adminSupabase.from('listings').insert({
        title:              item.title,
        address:            item.address,
        price:              Number(item.price),
        latitude:           item.latitude  || null,
        longitude:          item.longitude || null,
        utilities_included: item.utilities_included || false,
        status:             item.status || 'active',
        images:             item.images  || [],
        user_id:            adminId,
      });
      if (error) errors.push(`Item ${i + 1} (${item.title}): ${error.message}`);
      else success++;
    }

    setImporting(false);
    setImportResult({ success, errors });
    if (success > 0) { setTab('list'); fetchListings(); }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const renderListing = ({ item }: { item: Listing }) => (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
          {item.is_property_verified && (
            <MaterialCommunityIcons name="check-decagram" size={13} color="#49C788" />
          )}
        </View>
        <Text style={styles.listingMeta} numberOfLines={1}>{item.address} · ₡{item.price.toLocaleString()}/mo</Text>
        <Text style={styles.listingDate}>{formatDate(item.created_at)}</Text>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={[styles.statusToggle, {
            backgroundColor: (STATUS_COLOR[item.status] || '#888') + '22',
            borderColor: (STATUS_COLOR[item.status] || '#888') + '55',
          }]}
          onPress={() => toggleStatus(item.id, item.status)}
        >
          <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] || '#888' }]}>
            {item.status}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteListing(item.id)} hitSlop={8}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ff4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Listings</Text>
        <View style={styles.tabToggle}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'list' && styles.tabBtnActive]}
            onPress={() => setTab('list')}
          >
            <Text style={[styles.tabBtnText, tab === 'list' && styles.tabBtnTextActive]}>Manage</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'import' && styles.tabBtnActive]}
            onPress={() => setTab('import')}
          >
            <MaterialCommunityIcons name="upload" size={14} color={tab === 'import' ? '#49C788' : '#888'} />
            <Text style={[styles.tabBtnText, tab === 'import' && styles.tabBtnTextActive]}>Bulk Import</Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'list' ? (
        <>
          {/* Filter */}
          <View style={styles.filterRow}>
            {STATUSES.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip,
                  filterStatus === s && {
                    borderColor: (STATUS_COLOR[s] || '#49C788'),
                    backgroundColor: (STATUS_COLOR[s] || '#49C788') + '18',
                  },
                ]}
                onPress={() => setFilterStatus(s)}
              >
                <Text style={[styles.filterText, filterStatus === s && { color: STATUS_COLOR[s] || '#49C788' }]}>
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
              data={listings}
              keyExtractor={(l) => l.id}
              renderItem={renderListing}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#49C788" />}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={<Text style={styles.emptyText}>No listings found.</Text>}
            />
          )}
        </>
      ) : (
        /* ── Bulk Import ── */
        <ScrollView style={styles.importScroll} contentContainerStyle={styles.importContent}>
          <View style={styles.importInfo}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#3b82f6" />
            <Text style={styles.importInfoText}>
              Paste a JSON array of listing objects. Required:{' '}
              <Text style={styles.code}>title</Text>,{' '}
              <Text style={styles.code}>address</Text>,{' '}
              <Text style={styles.code}>price</Text>.{'\n'}
              Optional: <Text style={styles.code}>latitude</Text>,{' '}
              <Text style={styles.code}>longitude</Text>,{' '}
              <Text style={styles.code}>utilities_included</Text>,{' '}
              <Text style={styles.code}>status</Text>,{' '}
              <Text style={styles.code}>images</Text>.
            </Text>
          </View>

          <TextInput
            style={styles.jsonInput}
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
            style={[styles.importBtn, (importing || !jsonInput.trim()) && { opacity: 0.5 }]}
            onPress={handleBulkImport}
            disabled={importing || !jsonInput.trim()}
          >
            {importing ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <MaterialCommunityIcons name="upload" size={18} color="#000" />
                <Text style={styles.importBtnText}>Import Listings</Text>
              </>
            )}
          </TouchableOpacity>

          {importResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultSuccess}>
                ✓ {importResult.success} listing{importResult.success !== 1 ? 's' : ''} imported successfully.
              </Text>
              {importResult.errors.map((e, i) => (
                <Text key={i} style={styles.resultError}>✗ {e}</Text>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0a0a0a' },
  topBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', flexWrap: 'wrap', gap: 10 },
  pageTitle:       { fontSize: 22, fontWeight: '700', color: '#fff' },
  tabToggle:       { flexDirection: 'row', backgroundColor: '#111', borderRadius: 8, padding: 3, borderWidth: 1, borderColor: '#1a1a1a', gap: 2 },
  tabBtn:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, gap: 5 },
  tabBtnActive:    { backgroundColor: '#1a1a1a' },
  tabBtnText:      { color: '#888', fontSize: 13, fontWeight: '500' },
  tabBtnTextActive:{ color: '#49C788' },
  filterRow:       { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', flexWrap: 'wrap' },
  filterChip:      { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#222', backgroundColor: '#111' },
  filterText:      { color: '#888', fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  row:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowMain:         { flex: 1, gap: 3 },
  rowTop:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listingTitle:    { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  listingMeta:     { color: '#888', fontSize: 12 },
  listingDate:     { color: '#444', fontSize: 11 },
  rowActions:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusToggle:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusText:      { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  separator:       { height: 1, backgroundColor: '#111' },
  centerLoader:    { paddingTop: 80, alignItems: 'center' },
  emptyText:       { textAlign: 'center', color: '#555', marginTop: 60, fontSize: 15 },
  importScroll:    { flex: 1 },
  importContent:   { padding: 20, gap: 16 },
  importInfo:      { flexDirection: 'row', gap: 10, backgroundColor: '#0d1825', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#1e3a5f', alignItems: 'flex-start' },
  importInfoText:  { color: '#aaa', fontSize: 13, lineHeight: 20, flex: 1 },
  code:            { color: '#49C788', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  jsonInput:       { backgroundColor: '#0e0e0e', borderRadius: 10, borderWidth: 1, borderColor: '#222', color: '#49C788', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, padding: 14, minHeight: 200 },
  importBtn:       { backgroundColor: '#49C788', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  importBtnText:   { color: '#000', fontSize: 15, fontWeight: '700' },
  resultBox:       { backgroundColor: '#111', borderRadius: 10, padding: 16, gap: 6, borderWidth: 1, borderColor: '#1a1a1a' },
  resultSuccess:   { color: '#49C788', fontSize: 13, fontWeight: '600' },
  resultError:     { color: '#ff4444', fontSize: 12 },
});
