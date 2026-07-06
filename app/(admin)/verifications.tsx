import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';
import { Image } from 'expo-image';

type Verification = {
  id: string;
  type: string;
  status: string;
  document_url: string | null;
  created_at: string;
  user_id: string;
  metadata?: any;
  profiles?: {
    name: string | null;
    photoUrl: string | null;
  } | null;
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

export default function AdminVerifications() {
  const [items, setItems]           = useState<Verification[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const { locale, t } = useTranslation();
  const { accentColor } = useAdminTheme();

  const VERIFY_META: Record<string, { icon: any; color: string }> = {
    identity:   { icon: 'card-account-details', color: '#3b82f6' },
    background: { icon: 'shield-check',          color: accentColor },
    income:     { icon: 'cash',                  color: '#a855f7' },
    phone:      { icon: 'phone',                 color: '#06b6d4' },
    social:     { icon: 'instagram',             color: '#f97316' },
    university: { icon: 'school',                color: '#f43f5e' },
    workplace:  { icon: 'briefcase',             color: '#eab308' },
    references: { icon: 'account-check',         color: accentColor },
  };

  const STATUS_COLOR: Record<string, string> = {
    pending: '#f97316', approved: accentColor, rejected: '#ff4444',
  };

  // Custom Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'confirm' | 'alert'>('confirm');
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(null);

  const showCustomAlert = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType('alert');
    setOnConfirmAction(null);
    setModalVisible(true);
  };

  const showCustomConfirm = (title: string, message: string, action: () => void) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType('confirm');
    setOnConfirmAction(() => action);
    setModalVisible(true);
  };

  const translateType = (type: string) => {
    if (type === 'identity') return locale === 'es' ? 'Identidad' : 'Identity';
    if (type === 'background') return locale === 'es' ? 'Antecedentes' : 'Background';
    if (type === 'income') return locale === 'es' ? 'Ingresos' : 'Income';
    if (type === 'phone') return locale === 'es' ? 'Teléfono' : 'Phone';
    if (type === 'social') return locale === 'es' ? 'Redes Sociales' : 'Social';
    if (type === 'university') return locale === 'es' ? 'Universidad' : 'University';
    if (type === 'workplace') return locale === 'es' ? 'Trabajo' : 'Workplace';
    if (type === 'references') return locale === 'es' ? 'Referencias' : 'References';
    return type;
  };

  const fetchStats = async () => {
    try {
      const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
        supabase.from('verifications').select('*', { count: 'exact', head: true }),
        supabase.from('verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('verifications').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('verifications').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      ]);

      setStats({
        total: totalRes.count || 0,
        pending: pendingRes.count || 0,
        approved: approvedRes.count || 0,
        rejected: rejectedRes.count || 0,
      });
    } catch (e) {
      console.error('Error calculando estadísticas de verificaciones:', e);
    }
  };

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from('verifications')
      .select('id, type, status, document_url, created_at, user_id, metadata, profiles(name, photoUrl)')
      .eq('status', filterStatus)
      .order('created_at', { ascending: false });

    if (!error) setItems((data as any) || []);
    fetchStats();
    setLoading(false);
    setRefreshing(false);
  }, [filterStatus]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const decide = (id: string, userId: string, type: string, decision: 'approved' | 'rejected') => {
    const title = decision === 'approved' 
      ? t('admin.verifications.approve_title', 'Approve Verification') 
      : t('admin.verifications.reject_title', 'Reject Verification');
    const msg = decision === 'approved' 
      ? (locale === 'es' ? `¿Aprobar esta verificación de ${translateType(type)}?` : `Approve this ${type} verification?`)
      : (locale === 'es' ? `¿Rechazar esta verificación de ${translateType(type)}?` : `Reject this ${type} verification?`);

    const handleAction = async () => {
      setModalVisible(false);
      try {
        const { error: verifyErr } = await supabase
          .from('verifications')
          .update({ status: decision })
          .eq('id', id);

        if (verifyErr) {
          showCustomAlert('Error', verifyErr.message);
          return;
        }

        const flag = PROFILE_FLAG[type];
        if (flag && decision === 'approved') {
          const { error: profileUpdateErr } = await supabase
            .from('profiles')
            .update({ [flag]: true } as any)
            .eq('id', userId);

          if (profileUpdateErr) {
            showCustomAlert('Error', profileUpdateErr.message);
            return;
          }
        }

        showCustomAlert(
          locale === 'es' ? 'Éxito' : 'Success',
          locale === 'es' ? 'Solicitud procesada correctamente.' : 'Request processed successfully.'
        );
        fetchData();
      } catch (err: any) {
        const errMsg = err.message || String(err);
        showCustomAlert('Error', errMsg);
      }
    };

    showCustomConfirm(title, msg, handleAction);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(t('settings.locale', 'en-US'), { month: 'short', day: 'numeric', year: 'numeric' });

  const renderMetadata = (item: Verification) => {
    if (!item.metadata) return null;
    const { national_id, country_code, university, input } = item.metadata;
    if (!national_id && !university && !input) return null;

    return (
      <View style={styles.metaBox}>
        {national_id && (
          <Text style={styles.metaText}>
            🪪 {locale === 'es' ? 'Identificación' : 'National ID'}: <Text style={styles.metaVal}>{national_id} ({country_code || 'CRI'})</Text>
          </Text>
        )}
        {university && (
          <Text style={styles.metaText}>
            🏫 {locale === 'es' ? 'Universidad' : 'University'}: <Text style={styles.metaVal}>{university}</Text>
          </Text>
        )}
        {input && (
          <Text style={styles.metaText}>
            ✉️ {locale === 'es' ? 'Correo/Usuario' : 'Email/Username'}: <Text style={styles.metaVal}>{input}</Text>
          </Text>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Verification }) => {
    const meta = VERIFY_META[item.type] || { icon: 'help-circle', color: '#888' };
    const userName = item.profiles?.name || (locale === 'es' ? 'Usuario' : 'User');
    const userPhoto = item.profiles?.photoUrl;

    return (
      <View style={styles.card}>
        {/* User photo/avatar */}
        {userPhoto ? (
          <Image source={{ uri: userPhoto }} style={styles.avatar} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{userName[0]?.toUpperCase() || '?'}</Text>
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.userRow}>
            <Text style={styles.userName}>{userName}</Text>
            <View style={[styles.typeBadge, { backgroundColor: meta.color + '15', borderColor: meta.color + '40' }]}>
              <MaterialCommunityIcons name={meta.icon} size={12} color={meta.color} style={{ marginRight: 4 }} />
              <Text style={[styles.typeBadgeText, { color: meta.color }]}>{translateType(item.type)}</Text>
            </View>
          </View>
          
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>

          {/* Render metadata cleanly */}
          {renderMetadata(item)}

          {item.document_url ? (
            <TouchableOpacity onPress={() => Linking.openURL(item.document_url!)} style={styles.docButton}>
              <MaterialCommunityIcons name="file-document-outline" size={16} color={accentColor} style={{ marginRight: 4 }} />
              <Text style={[styles.viewDoc, { color: accentColor }]}>{locale === 'es' ? 'Ver Documento adjunto' : 'View attached document'}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.noDoc}>{locale === 'es' ? 'Sin documento físico' : 'No physical document'}</Text>
          )}
        </View>

        <View style={styles.cardActions}>
          {item.status === 'pending' ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10b98120', borderColor: '#10b98140' }]}
                onPress={() => decide(item.id, item.user_id, item.type, 'approved')}
              >
                <MaterialCommunityIcons name="check" size={18} color="#10b981" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#ef444420', borderColor: '#ef444440' }]}
                onPress={() => decide(item.id, item.user_id, item.type, 'rejected')}
              >
                <MaterialCommunityIcons name="close" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '15', borderColor: STATUS_COLOR[item.status] + '30' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
                {item.status.toUpperCase()}
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
        <Text style={styles.pageTitle}>{t('admin.verifications.title', 'Verifications Hub')}</Text>
      </View>

      {/* Panel de Estadísticas (KPIs) */}
      <View style={styles.statsPanel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="shield-outline" size={18} color={accentColor} />
            <Text style={[styles.statNumText, { color: '#fff' }]}>{stats.total}</Text>
            <Text style={styles.statLabelText}>{locale === 'es' ? 'Total' : 'Total'}</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#f97316" />
            <Text style={[styles.statNumText, { color: '#f97316' }]}>{stats.pending}</Text>
            <Text style={styles.statLabelText}>{locale === 'es' ? 'Pendientes' : 'Pending'}</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="check-decagram" size={18} color="#10b981" />
            <Text style={[styles.statNumText, { color: '#10b981' }]}>{stats.approved}</Text>
            <Text style={styles.statLabelText}>{locale === 'es' ? 'Aprobadas' : 'Approved'}</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="close-circle-outline" size={18} color="#ff4444" />
            <Text style={[styles.statNumText, { color: '#ff4444' }]}>{stats.rejected}</Text>
            <Text style={styles.statLabelText}>{locale === 'es' ? 'Rechazadas' : 'Rejected'}</Text>
          </View>
        </ScrollView>
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
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(v) => v.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {locale === 'es' ? 'No hay verificaciones pendientes.' : 'No pending verifications.'}
            </Text>
          }
        />
      )}

      {/* Premium Branded Minimalist Confirmation & Alert Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            
            <View style={styles.modalButtons}>
              {modalType === 'confirm' ? (
                <>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.modalBtnCancel]} 
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalBtnCancelText}>{t('general.cancel', 'Cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.modalBtn, 
                      { 
                        backgroundColor: modalTitle.includes('Rechazar') || modalTitle.includes('Reject') 
                          ? '#ff4444' 
                          : accentColor 
                      }
                    ]} 
                    onPress={() => onConfirmAction?.()}
                  >
                    <Text style={styles.modalBtnConfirmText}>{t('general.confirm', 'Confirm')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={[styles.modalBtn, { backgroundColor: accentColor, width: '100%' }]} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalBtnConfirmText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0a0a0a' },
  topBar:      { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  pageTitle:   { fontSize: 22, fontWeight: '700', color: '#fff' },
  statsPanel: {
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    backgroundColor: '#070707',
  },
  statsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  statBox: {
    width: 100,
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  statNumText: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabelText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  filterRow:   { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', flexWrap: 'wrap' },
  filterChip:  { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#222', backgroundColor: '#111' },
  filterText:  { color: '#888', fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  listContent: { padding: 16, gap: 12 },
  card:        { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, padding: 16, gap: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: '#1a1a1a' },
  avatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: '#222', flexShrink: 0 },
  cardBody:    { flex: 1, gap: 4 },
  userRow:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  userName:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  typeBadge:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  typeBadgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  date:        { color: '#666', fontSize: 11 },
  metaBox:     { backgroundColor: '#161616', borderRadius: 8, padding: 8, marginTop: 4, gap: 3, borderWidth: 1, borderColor: '#222' },
  metaText:    { color: '#888', fontSize: 12 },
  metaVal:     { color: '#e0e0e0', fontWeight: '600' },
  docButton:   { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  viewDoc:     { fontSize: 12, fontWeight: '600' },
  noDoc:       { color: '#444', fontSize: 12, marginTop: 2 },
  cardActions: { gap: 6, alignSelf: 'center', paddingLeft: 4 },
  actionRow:   { flexDirection: 'row', gap: 8 },
  actionBtn:   { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-end' },
  statusText:  { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  centerLoader:{ paddingTop: 80, alignItems: 'center' },
  emptyText:   { textAlign: 'center', color: '#555', marginTop: 60, fontSize: 15 },

  // Custom Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222',
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalMessage: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    justifyContent: 'center',
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  modalBtnCancelText: {
    color: '#bbb',
    fontWeight: '600',
    fontSize: 14,
  },
  modalBtnConfirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
