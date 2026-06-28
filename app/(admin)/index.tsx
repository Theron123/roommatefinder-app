import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

type Stats = {
  totalUsers: number;
  newUsersToday: number;
  activeListings: number;
  totalMatches: number;
  pendingReports: number;
  pendingVerifications: number;
  totalMessages: number;
};

type RecentUser = { id: string; name: string; role: string; created_at: string };

export default function AdminOverview() {
  const [stats, setStats]             = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const fetchData = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      { count: totalUsers },
      { count: newUsersToday },
      { count: activeListings },
      { count: totalMatches },
      { count: pendingReports },
      { count: pendingVerifications },
      { count: totalMessages },
      { data: recent },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('matches').select('*', { count: 'exact', head: true }),
      supabase.from('user_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('id, name, role, created_at').order('created_at', { ascending: false }).limit(6),
    ]);

    setStats({
      totalUsers: totalUsers || 0,
      newUsersToday: newUsersToday || 0,
      activeListings: activeListings || 0,
      totalMatches: totalMatches || 0,
      pendingReports: pendingReports || 0,
      pendingVerifications: pendingVerifications || 0,
      totalMessages: totalMessages || 0,
    });
    setRecentUsers(recent || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const CARDS = stats ? [
    { label: 'Total Users',     value: stats.totalUsers,           sub: `+${stats.newUsersToday} today`,  icon: 'account-group'  as const, color: '#49C788', route: '/(admin)/users' },
    { label: 'Active Listings', value: stats.activeListings,       sub: 'live right now',                  icon: 'home-city'      as const, color: '#3b82f6', route: '/(admin)/listings' },
    { label: 'Total Matches',   value: stats.totalMatches,         sub: 'all time',                        icon: 'heart'          as const, color: '#f43f5e', route: null },
    { label: 'Messages Sent',   value: stats.totalMessages,        sub: 'all time',                        icon: 'message-text'   as const, color: '#a855f7', route: null },
    { label: 'Pending Reports', value: stats.pendingReports,       sub: 'need attention',                  icon: 'alert-circle'   as const, color: '#f97316', route: '/(admin)/reports' },
    { label: 'Verifications',   value: stats.pendingVerifications, sub: 'pending review',                  icon: 'shield-check'   as const, color: '#06b6d4', route: '/(admin)/verifications' },
  ] : [];

  const ROLE_COLOR: Record<string, string> = {
    admin: '#f97316', seeker: '#49C788', host: '#3b82f6', landlord: '#a855f7',
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#49C788" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Overview</Text>
          <Text style={styles.pageSubtitle}>Welcome back, Administrator</Text>
        </View>

        {loading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color="#49C788" />
          </View>
        ) : (
          <>
            {/* Stat Cards */}
            <View style={styles.cardsGrid}>
              {CARDS.map((card) => (
                <TouchableOpacity
                  key={card.label}
                  style={styles.card}
                  onPress={() => card.route && router.push(card.route as any)}
                  activeOpacity={card.route ? 0.7 : 1}
                >
                  <View style={[styles.cardIconWrap, { backgroundColor: card.color + '20' }]}>
                    <MaterialCommunityIcons name={card.icon} size={24} color={card.color} />
                  </View>
                  <Text style={styles.cardValue}>{card.value.toLocaleString()}</Text>
                  <Text style={styles.cardLabel}>{card.label}</Text>
                  <Text style={styles.cardSub}>{card.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent Users */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Sign-ups</Text>
                <TouchableOpacity onPress={() => router.push('/(admin)/users' as any)}>
                  <Text style={styles.seeAll}>See all →</Text>
                </TouchableOpacity>
              </View>
              {recentUsers.map((u) => (
                <View key={u.id} style={styles.userRow}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{(u.name || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{u.name || 'Unknown'}</Text>
                    <Text style={styles.userDate}>{formatDate(u.created_at)}</Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLOR[u.role] || '#888') + '25' }]}>
                    <Text style={[styles.roleText, { color: ROLE_COLOR[u.role] || '#888' }]}>
                      {u.role || 'none'}
                    </Text>
                  </View>
                </View>
              ))}
              {recentUsers.length === 0 && (
                <Text style={styles.emptyText}>No users yet.</Text>
              )}
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsRow}>
                {[
                  { label: 'Bulk Import Listings', icon: 'upload'       as const, color: '#3b82f6', route: '/(admin)/listings' },
                  { label: 'Review Reports',        icon: 'alert-circle' as const, color: '#f97316', route: '/(admin)/reports' },
                  { label: 'Verify Users',           icon: 'shield-check' as const, color: '#06b6d4', route: '/(admin)/verifications' },
                  { label: 'Manage Payments',        icon: 'credit-card'  as const, color: '#a855f7', route: '/(admin)/payments' },
                ].map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    style={styles.actionBtn}
                    onPress={() => router.push(a.route as any)}
                  >
                    <MaterialCommunityIcons name={a.icon} size={20} color={a.color} />
                    <Text style={styles.actionLabel}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0a0a0a' },
  scroll:        { flex: 1 },
  scrollContent: { padding: 24, gap: 24 },
  header:        { gap: 4 },
  pageTitle:     { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  pageSubtitle:  { fontSize: 14, color: '#888' },
  centerLoader:  { paddingTop: 80, alignItems: 'center' },
  cardsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 18,
    width: '47%',
    gap: 6,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  cardIconWrap:  { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardValue:     { fontSize: 26, fontWeight: '700', color: '#fff', marginTop: 4 },
  cardLabel:     { fontSize: 13, color: '#aaa', fontWeight: '500' },
  cardSub:       { fontSize: 11, color: '#555' },
  section:       { backgroundColor: '#111', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#1a1a1a', gap: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:  { fontSize: 16, fontWeight: '600', color: '#fff' },
  seeAll:        { fontSize: 13, color: '#49C788' },
  userRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar:    { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  userAvatarText:{ color: '#49C788', fontWeight: '700', fontSize: 16 },
  userInfo:      { flex: 1, gap: 2 },
  userName:      { color: '#fff', fontSize: 14, fontWeight: '500' },
  userDate:      { color: '#555', fontSize: 12 },
  roleBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  roleText:      { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  emptyText:     { color: '#555', fontSize: 13, textAlign: 'center' },
  actionsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn:     { backgroundColor: '#1a1a1a', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#222' },
  actionLabel:   { color: '#ccc', fontSize: 13, fontWeight: '500' },
});
