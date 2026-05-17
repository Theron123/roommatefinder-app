import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet,
  Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

type Contract = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  effective_date: string | null;
  clauses: any;
  initiator: { name: string } | null;
  counterparty: { name: string } | null;
  initiator_id: string;
  counterparty_id: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  draft:                  { label: 'Borrador',    color: '#888',    icon: 'pencil-outline' },
  pending_authorization:  { label: 'Pendiente',   color: '#FFB800', icon: 'clock-outline' },
  active:                 { label: 'Activo',      color: '#49C788', icon: 'check-circle-outline' },
  terminated:             { label: 'Terminado',   color: '#FF4B4B', icon: 'close-circle-outline' },
};

const TYPE_LABELS: Record<string, string> = {
  roommate_agreement: 'Acuerdo de Roommate',
  rental_agreement:   'Contrato de Renta',
};

export default function ContractsIndexScreen() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchContracts();
    }, [])
  );

  const fetchContracts = async () => {
    if (contracts.length === 0) {
      setLoading(true);
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setUserId(session.user.id);

    const { data } = await supabase
      .from('contracts')
      .select('*, initiator:initiator_id(name), counterparty:counterparty_id(name)')
      .or(`initiator_id.eq.${session.user.id},counterparty_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false });

    setContracts((data as any) || []);
    setLoading(false);
  };

  const activeCount  = contracts.filter(c => c.status === 'active').length;
  const pendingCount = contracts.filter(c => c.status === 'pending_authorization').length;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#0d1117', '#000']} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Legal & Acuerdos</Text>
        <Pressable onPress={() => router.push('/terms')} style={s.tosBtn}>
          <MaterialCommunityIcons name="shield-outline" size={20} color="#49C788" />
        </Pressable>
      </LinearGradient>

      {/* Stats strip */}
      <View style={s.statsRow}>
        <View style={s.stat}>
          <Text style={s.statVal}>{contracts.length}</Text>
          <Text style={s.statLbl}>Total</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <Text style={[s.statVal, { color: '#49C788' }]}>{activeCount}</Text>
          <Text style={s.statLbl}>Activos</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <Text style={[s.statVal, { color: '#FFB800' }]}>{pendingCount}</Text>
          <Text style={s.statLbl}>Pendientes</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#49C788" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          {contracts.length === 0 ? (
            <View style={s.empty}>
              <MaterialCommunityIcons name="file-document-outline" size={64} color="#222" />
              <Text style={s.emptyTitle}>Sin contratos aún</Text>
              <Text style={s.emptyText}>
                Crea un acuerdo con un roommate o arrendador para proteger a ambas partes.
              </Text>
            </View>
          ) : (
            contracts.map(contract => {
              const st = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
              const isInitiator = contract.initiator_id === userId;
              const otherParty = isInitiator ? contract.counterparty?.name : contract.initiator?.name;
              return (
                <Pressable
                  key={contract.id}
                  style={s.card}
                  onPress={() => router.push(`/contracts/${contract.id}`)}
                >
                  <View style={s.cardTop}>
                    <View style={s.cardIconWrap}>
                      <MaterialCommunityIcons name="file-sign" size={24} color="#49C788" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardType}>{TYPE_LABELS[contract.type] || contract.type}</Text>
                      <Text style={s.cardParty}>
                        {isInitiator ? 'Con' : 'De'} {otherParty || 'Usuario desconocido'}
                      </Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: st.color + '22', borderColor: st.color }]}>
                      <MaterialCommunityIcons name={st.icon as any} size={12} color={st.color} />
                      <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                  <View style={s.cardBottom}>
                    <Text style={s.cardDate}>
                      {new Date(contract.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                    {contract.effective_date && (
                      <Text style={s.cardDate}>Vigente: {contract.effective_date}</Text>
                    )}
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#444" />
                  </View>
                </Pressable>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable style={s.fab} onPress={() => router.push('/contracts/new')}>
        <MaterialCommunityIcons name="plus" size={26} color="#000" />
        <Text style={s.fabText}>Nuevo Acuerdo</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#000' },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 8 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  headerTitle:  { flex: 1, color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  tosBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  statsRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', marginHorizontal: 20, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#1a1a2e' },
  stat:         { flex: 1, alignItems: 'center' },
  statVal:      { fontSize: 24, fontWeight: '800', color: '#fff' },
  statLbl:      { fontSize: 11, color: '#666', marginTop: 2 },
  statDivider:  { width: 1, height: 32, backgroundColor: '#1a1a2e' },
  scroll:       { paddingHorizontal: 20 },
  empty:        { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle:   { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  emptyText:    { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  card:         { backgroundColor: '#0d1117', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1a1a2e' },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(73,199,136,0.1)', justifyContent: 'center', alignItems: 'center' },
  cardType:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardParty:    { color: '#888', fontSize: 12, marginTop: 2 },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText:    { fontSize: 11, fontWeight: '700' },
  cardBottom:   { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1a1a2e', paddingTop: 10, gap: 8 },
  cardDate:     { color: '#555', fontSize: 12, flex: 1 },
  fab:          { position: 'absolute', bottom: 30, right: 20, left: 20, backgroundColor: '#49C788', borderRadius: 30, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#49C788', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  fabText:      { color: '#000', fontWeight: '800', fontSize: 16 },
});
