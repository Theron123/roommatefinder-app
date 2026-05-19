import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet,
  Text, View
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
  disputed:               { label: 'En Disputa',  color: '#E53935', icon: 'alert-circle-outline' },
};

const TYPE_LABELS: Record<string, string> = {
  roommate_agreement: 'Acuerdo de Roommate',
  rental_agreement:   'Contrato de Renta',
  sublease:           'Subarrendamiento',
};

export default function AgreementsHubScreen() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contracts' | 'rules' | 'conflicts'>('contracts');

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
      {/* Premium Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Legal Hub</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Modern Tabs / Chips */}
      <View style={s.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          <Pressable style={[s.tabChip, activeTab === 'contracts' && s.tabChipActive]} onPress={() => setActiveTab('contracts')}>
             <MaterialCommunityIcons name="file-sign" size={16} color={activeTab === 'contracts' ? '#000' : '#888'} />
             <Text style={[s.tabText, activeTab === 'contracts' && s.tabTextActive]}>Acuerdos</Text>
          </Pressable>
          <Pressable style={[s.tabChip, activeTab === 'rules' && s.tabChipActive]} onPress={() => setActiveTab('rules')}>
             <MaterialCommunityIcons name="home-heart" size={16} color={activeTab === 'rules' ? '#000' : '#888'} />
             <Text style={[s.tabText, activeTab === 'rules' && s.tabTextActive]}>House Rules</Text>
          </Pressable>
          <Pressable style={[s.tabChip, activeTab === 'conflicts' && s.tabChipActive]} onPress={() => setActiveTab('conflicts')}>
             <MaterialCommunityIcons name="gavel" size={16} color={activeTab === 'conflicts' ? '#000' : '#888'} />
             <Text style={[s.tabText, activeTab === 'conflicts' && s.tabTextActive]}>Reportar Conflictos</Text>
          </Pressable>
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color="#49C788" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          
          {activeTab === 'contracts' && (
            <>
              {/* Stats Overview */}
              <View style={s.overviewCard}>
                <View style={s.overviewHeader}>
                  <MaterialCommunityIcons name="chart-pie" size={18} color="#888" />
                  <Text style={s.overviewTitle}>Resumen Legal</Text>
                </View>
                <View style={s.statsRow}>
                  <View style={s.stat}>
                    <Text style={[s.statVal, { color: '#49C788' }]}>{activeCount}</Text>
                    <Text style={s.statLbl}>Activos</Text>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.stat}>
                    <Text style={[s.statVal, { color: '#FFB800' }]}>{pendingCount}</Text>
                    <Text style={s.statLbl}>Pendientes</Text>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.stat}>
                    <Text style={[s.statVal, { color: '#fff' }]}>{contracts.length}</Text>
                    <Text style={s.statLbl}>Historial</Text>
                  </View>
                </View>
              </View>

              <Text style={s.sectionHeading}>Tus Contratos</Text>

              {contracts.length === 0 ? (
                <View style={s.empty}>
                  <View style={s.emptyIconWrap}>
                    <MaterialCommunityIcons name="file-document-outline" size={40} color="#49C788" />
                  </View>
                  <Text style={s.emptyTitle}>Sin acuerdos activos</Text>
                  <Text style={s.emptyText}>
                    Crea un contrato inteligente con un roommate para formalizar pagos y reglas.
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
                          <MaterialCommunityIcons name="file-sign" size={22} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.cardType}>{TYPE_LABELS[contract.type] || contract.type}</Text>
                          <Text style={s.cardParty}>
                            {isInitiator ? 'Con' : 'De'} {otherParty || 'Usuario desconocido'}
                          </Text>
                        </View>
                        <View style={[s.badge, { backgroundColor: st.color + '15', borderColor: st.color + '30' }]}>
                          <View style={[s.badgeDot, { backgroundColor: st.color }]} />
                          <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                        </View>
                      </View>
                      
                      <View style={s.cardDivider} />
                      
                      <View style={s.cardBottom}>
                        <View style={s.timelinePoint}>
                          <MaterialCommunityIcons name="calendar-blank" size={14} color="#888" />
                          <Text style={s.cardDate}>
                            Actualizado el {new Date(contract.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                          </Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#444" />
                      </View>
                    </Pressable>
                  );
                })
              )}
            </>
          )}

          {activeTab === 'rules' && (
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <MaterialCommunityIcons name="home-heart" size={40} color="#00C9A7" />
              </View>
              <Text style={s.emptyTitle}>House Rules</Text>
              <Text style={s.emptyText}>
                Aquí verás las reglas visuales extraídas de tus contratos activos (visitas, mascotas, silencio).
              </Text>
            </View>
          )}

          {activeTab === 'conflicts' && (
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <MaterialCommunityIcons name="gavel" size={40} color="#E53935" />
              </View>
              <Text style={s.emptyTitle}>Centro de Resolución</Text>
              <Text style={s.emptyText}>
                No tienes disputas activas. Reporta incidencias que rompan el acuerdo aquí.
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Modern FAB */}
      {activeTab === 'contracts' && (
        <Pressable style={s.fab} onPress={() => router.push('/contracts/new')}>
          <LinearGradient colors={['#49C788', '#38a870']} style={s.fabGradient}>
            <MaterialCommunityIcons name="plus" size={24} color="#000" />
            <Text style={s.fabText}>Nuevo</Text>
          </LinearGradient>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#000' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, paddingTop: 16 },
  backBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  headerTitle:  { color: '#fff', fontSize: 20, fontWeight: '700' },
  actionBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  
  tabContainer: { paddingHorizontal: 20, paddingVertical: 12 },
  tabChip:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, gap: 8, borderWidth: 1, borderColor: '#222' },
  tabChipActive:{ backgroundColor: '#49C788', borderColor: '#49C788' },
  tabText:      { color: '#888', fontSize: 13, fontWeight: '600' },
  tabTextActive:{ color: '#000', fontWeight: '800' },

  scroll:       { paddingHorizontal: 20, paddingTop: 10 },
  
  overviewCard: { backgroundColor: '#111', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#222' },
  overviewHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  overviewTitle:{ color: '#888', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statsRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stat:         { alignItems: 'center', flex: 1 },
  statVal:      { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  statLbl:      { fontSize: 12, color: '#666', fontWeight: '500' },
  statDivider:  { width: 1, height: 30, backgroundColor: '#222' },
  
  sectionHeading: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },

  empty:        { alignItems: 'center', paddingTop: 40, paddingHorizontal: 30 },
  emptyIconWrap:{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#222' },
  emptyTitle:   { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  emptyText:    { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 22 },

  card:         { backgroundColor: '#0d1117', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1a1a2e' },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a222e', justifyContent: 'center', alignItems: 'center' },
  cardType:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardParty:    { color: '#888', fontSize: 13, marginTop: 4 },
  
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  badgeDot:     { width: 6, height: 6, borderRadius: 3 },
  badgeText:    { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  cardDivider:  { height: 1, backgroundColor: '#1a1a2e', marginVertical: 14 },
  
  cardBottom:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timelinePoint:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDate:     { color: '#666', fontSize: 12, fontWeight: '500' },
  
  fab:          { position: 'absolute', bottom: 30, right: 20, shadowColor: '#49C788', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10, borderRadius: 100 },
  fabGradient:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 100, gap: 8 },
  fabText:      { color: '#000', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
});

