import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet,
  Text, View, Modal, Alert
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../context/LanguageContext';

type Contract = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  effective_date: string | null;
  clauses: any;
  selected_custom_clauses: string[] | null;
  initiator: { name: string } | null;
  initiator_id: string;
  contract_participants: { user: { name: string } | null }[];
};

export default function AgreementsHubScreen() {
  const { t, locale } = useTranslation();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [roommates, setRoommates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contracts' | 'rules' | 'conflicts'>('contracts');
  const [showReportModal, setShowReportModal] = useState(false);

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    draft:                  { label: locale === 'es' ? 'Borrador' : 'Draft',    color: '#888',    icon: 'pencil-outline' },
    pending_authorization:  { label: t('contracts.stat_pending'),   color: '#FFB800', icon: 'clock-outline' },
    active:                 { label: t('contracts.stat_active'),      color: '#49C788', icon: 'check-circle-outline' },
    terminated:             { label: locale === 'es' ? 'Terminado' : 'Terminated',   color: '#FF4B4B', icon: 'close-circle-outline' },
    disputed:               { label: locale === 'es' ? 'En disputa' : 'Disputed',  color: '#E53935', icon: 'alert-circle-outline' },
  };

  const TYPE_LABELS: Record<string, string> = {
    roommate_agreement: t('contracts.roommate_agreement'),
    rental_agreement:   t('contracts.rental_agreement'),
    sublease:           locale === 'es' ? 'Subarrendamiento' : 'Sublease',
  };

  const getOptionalClauseLabel = (key: string) => {
    const dict: Record<string, { en: string; es: string }> = {
      no_subletting:       { en: 'No subletting', es: 'Sin subarrendamiento' },
      guest_policy:        { en: 'Guest policy (max. 7 nights)', es: 'Política de invitados (máx. 7 noches)' },
      cleaning_rota:       { en: 'Weekly cleaning rotation', es: 'Turno de limpieza semanal' },
      no_parties:          { en: 'No parties without 24h notice', es: 'Sin fiestas sin aviso de 24 h' },
      parking_included:    { en: 'Parking included', es: 'Estacionamiento incluido' },
      internet_split:      { en: 'Internet split between occupants', es: 'Internet dividido entre ocupantes' },
      early_termination:   { en: 'Early termination (30 days + 1 month)', es: 'Terminación anticipada' },
      renters_insurance:   { en: 'Renter\'s insurance required', es: 'Seguro de inquilino requerido' },
      temperature_control: { en: 'Temperature control 68–78 °F', es: 'Control de temperatura 68–78 °F' },
    };
    return dict[key]?.[locale] || key;
  };

  const getReasonLabel = (id: string) => {
    switch (id) {
      case 'noise': return t('report.reasons.noise');
      case 'cleaning': return t('report.reasons.cleaning');
      case 'payment': return t('report.reasons.payment');
      case 'damage': return t('report.reasons.damage');
      case 'breach': return t('report.reasons.breach');
      case 'other': return t('report.reasons.other');
      default: return '';
    }
  };

  const getReasonIcon = (id: string) => {
    switch (id) {
      case 'noise': return 'volume-high';
      case 'cleaning': return 'broom';
      case 'payment': return 'cash-clock';
      case 'damage': return 'home-alert';
      case 'breach': return 'file-alert';
      default: return 'alert-circle-outline';
    }
  };

  const getDisputeStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
      case 'open':
        return { label: locale === 'es' ? 'Pendiente' : 'Pending', color: '#FFB800' };
      case 'resolved':
        return { label: locale === 'es' ? 'Resuelto' : 'Resolved', color: '#49C788' };
      case 'investigating':
        return { label: locale === 'es' ? 'Investigando' : 'Investigating', color: '#0A84FF' };
      case 'dismissed':
        return { label: locale === 'es' ? 'Desestimado' : 'Dismissed', color: '#888' };
      default:
        return { label: locale === 'es' ? 'Pendiente' : 'Pending', color: '#888' };
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchContracts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const fetchContracts = async () => {
    if (contracts.length === 0) {
      setLoading(true);
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setUserId(session.user.id);

    // 1. Obtener los IDs de los contratos en los que soy participante/contraparte
    const { data: partData } = await supabase
      .from('contract_participants')
      .select('contract_id')
      .eq('user_id', session.user.id);

    const contractIds = partData?.map(p => p.contract_id).filter(Boolean) || [];

    let query = supabase
      .from('contracts')
      .select('*, initiator:initiator_id(name), contract_participants(user:user_id(name))');

    if (contractIds.length > 0) {
      query = query.or(`initiator_id.eq.${session.user.id},id.in.(${contractIds.join(',')})`);
    } else {
      query = query.eq('initiator_id', session.user.id);
    }

    const { data } = await query.order('created_at', { ascending: false });
    setContracts((data as any) || []);

    // 2. Obtener reportes de disputas
    const { data: reportsData } = await supabase
      .from('user_reports')
      .select('*, reporter:reporter_id(name), reported:reported_id(name)')
      .or(`reporter_id.eq.${session.user.id},reported_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false });

    if (reportsData) setReports(reportsData);

    // 3. Obtener roommates emparejados (matches) para poder reportar incidentes
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .or(`user1.eq.${session.user.id},user2.eq.${session.user.id}`);

    const matchedUserIds = matchesData
      ? (matchesData.map(m => m.user1 === session.user.id ? m.user2 : m.user1).filter(Boolean) as string[])
      : [];

    if (matchedUserIds.length > 0) {
      const { data: matchedProfiles } = await supabase
        .from('profiles')
        .select('id, name, photoUrl')
        .in('id', matchedUserIds);
      if (matchedProfiles) {
        setRoommates(matchedProfiles);
      }
    } else {
      setRoommates([]);
    }

    setLoading(false);
  };

  const activeCount  = contracts.filter(c => c.status === 'active').length;
  const pendingCount = contracts.filter(c => c.status === 'pending_authorization').length;
  const activeContract = contracts.find(c => c.status === 'active');

  const handleOpenReport = () => {
    if (roommates.length === 0) {
      Alert.alert(
        locale === 'es' ? 'Sin Roommates' : 'No Roommates',
        locale === 'es' 
          ? 'Necesitas tener al menos un match para poder iniciar una disputa.' 
          : 'You need to have at least one match to file a dispute.'
      );
      return;
    }
    setShowReportModal(true);
  };

  const handleSelectRoommateToReport = (roommateId: string, roommateName: string) => {
    setShowReportModal(false);
    router.push(`/trust/report?userId=${roommateId}&userName=${encodeURIComponent(roommateName)}`);
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Premium Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>{t('contracts.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Modern Tabs / Chips */}
      <View style={s.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          <Pressable style={[s.tabChip, activeTab === 'contracts' && s.tabChipActive]} onPress={() => setActiveTab('contracts')}>
             <MaterialCommunityIcons name="file-sign" size={16} color={activeTab === 'contracts' ? '#000' : '#888'} />
             <Text style={[s.tabText, activeTab === 'contracts' && s.tabTextActive]}>{t('contracts.tab_agreements')}</Text>
          </Pressable>
          <Pressable style={[s.tabChip, activeTab === 'rules' && s.tabChipActive]} onPress={() => setActiveTab('rules')}>
             <MaterialCommunityIcons name="home-heart" size={16} color={activeTab === 'rules' ? '#000' : '#888'} />
             <Text style={[s.tabText, activeTab === 'rules' && s.tabTextActive]}>{t('contracts.tab_rules')}</Text>
          </Pressable>
          <Pressable style={[s.tabChip, activeTab === 'conflicts' && s.tabChipActive]} onPress={() => setActiveTab('conflicts')}>
             <MaterialCommunityIcons name="gavel" size={16} color={activeTab === 'conflicts' ? '#000' : '#888'} />
             <Text style={[s.tabText, activeTab === 'conflicts' && s.tabTextActive]}>{t('contracts.tab_conflicts')}</Text>
          </Pressable>
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color="#49C788" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          
          {/* TAB 1: ACUERDOS Y CONTRATOS */}
          {activeTab === 'contracts' && (
            <>
              {/* Stats Overview */}
              <View style={s.overviewCard}>
                <View style={s.overviewHeader}>
                  <MaterialCommunityIcons name="chart-pie" size={18} color="#888" />
                  <Text style={s.overviewTitle}>{t('contracts.overview_title')}</Text>
                </View>
                <View style={s.statsRow}>
                  <View style={s.stat}>
                    <Text style={[s.statVal, { color: '#49C788' }]}>{activeCount}</Text>
                    <Text style={s.statLbl}>{t('contracts.stat_active')}</Text>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.stat}>
                    <Text style={[s.statVal, { color: '#FFB800' }]}>{pendingCount}</Text>
                    <Text style={s.statLbl}>{t('contracts.stat_pending')}</Text>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.stat}>
                    <Text style={[s.statVal, { color: '#fff' }]}>{contracts.length}</Text>
                    <Text style={s.statLbl}>{t('contracts.stat_history')}</Text>
                  </View>
                </View>
              </View>

              <Text style={s.sectionHeading}>{t('contracts.your_contracts')}</Text>

              {contracts.length === 0 ? (
                <View style={s.empty}>
                  <View style={s.emptyIconWrap}>
                    <MaterialCommunityIcons name="file-document-outline" size={40} color="#49C788" />
                  </View>
                  <Text style={s.emptyTitle}>{t('contracts.no_agreements')}</Text>
                  <Text style={s.emptyText}>{t('contracts.no_agreements_desc')}</Text>
                </View>
              ) : (
                contracts.map(contract => {
                  const st = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
                  const isInitiator = contract.initiator_id === userId;
                  const counterparties = (contract.contract_participants?.map(p => p.user?.name || '').filter(Boolean) as string[]) || [];
                  const otherParty = isInitiator 
                    ? (counterparties.join(', ') || 'Roommates')
                    : contract.initiator?.name;
                  
                  return (
                    <Pressable
                      key={contract.id}
                      style={s.card}
                      onPress={() => router.push(contract.status === 'pending_authorization' && !isInitiator ? `/contracts/review?id=${contract.id}` : `/contracts/${contract.id}`)}
                    >
                      <View style={s.cardTop}>
                        <View style={s.cardIconWrap}>
                          <MaterialCommunityIcons name="file-sign" size={22} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.cardType}>{TYPE_LABELS[contract.type] || contract.type}</Text>
                          <Text style={s.cardParty}>
                            {isInitiator ? t('contracts.with') : t('contracts.from')} {counterparties.join(', ') || otherParty || t('contracts.unknown_user')}
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
                            {t('contracts.updated_on')} {new Date(contract.created_at).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', { day: '2-digit', month: 'short' })}
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

          {/* TAB 2: REGLAS DE CONVIVENCIA (EXTRAÍDAS DEL CONTRATO ACTIVO) */}
          {activeTab === 'rules' && (
            <>
              {activeContract ? (
                <View style={{ gap: 20 }}>
                  <Text style={s.sectionHeading}>{locale === 'es' ? 'Reglas de la Casa Activas' : 'Active House Rules'}</Text>
                  <Text style={s.subtitleText}>
                    {locale === 'es' 
                      ? `Extraídas del contrato de tipo: ${TYPE_LABELS[activeContract.type] || activeContract.type}`
                      : `Extracted from agreement: ${TYPE_LABELS[activeContract.type] || activeContract.type}`}
                  </Text>

                  {/* 1. Reglas Financieras */}
                  <View style={s.rulesCard}>
                    <View style={s.rulesHeader}>
                      <MaterialCommunityIcons name="cash-multiple" size={20} color="#49C788" />
                      <Text style={s.rulesCardTitle}>{locale === 'es' ? 'Acuerdos Financieros' : 'Financial Agreements'}</Text>
                    </View>
                    <View style={s.ruleRow}>
                      <Text style={s.ruleLabel}>{t('contracts.total_rent')}</Text>
                      <Text style={s.ruleValue}>${activeContract.clauses?.rent?.amount || '—'}</Text>
                    </View>
                    <View style={s.rulesDivider} />
                    <View style={s.ruleRow}>
                      <Text style={s.ruleLabel}>{t('contracts.due_day')}</Text>
                      <Text style={s.ruleValue}>{locale === 'es' ? `Día ${activeContract.clauses?.rent?.due_day}` : `Day ${activeContract.clauses?.rent?.due_day}`}</Text>
                    </View>
                    <View style={s.rulesDivider} />
                    <View style={s.ruleRow}>
                      <Text style={s.ruleLabel}>{t('contracts.sec_deposit')}</Text>
                      <Text style={s.ruleValue}>${activeContract.clauses?.security_deposit?.amount || '—'}</Text>
                    </View>
                  </View>

                  {/* 2. Normas de Convivencia */}
                  <View style={s.rulesCard}>
                    <View style={s.rulesHeader}>
                      <MaterialCommunityIcons name="home-heart" size={20} color="#00C9A7" />
                      <Text style={s.rulesCardTitle}>{locale === 'es' ? 'Normas de Convivencia' : 'Cohabitation Rules'}</Text>
                    </View>
                    <View style={s.ruleRow}>
                      <Text style={s.ruleLabel}>{t('contracts.pets_allowed')}</Text>
                      <Text style={[s.ruleValue, { color: activeContract.clauses?.pets?.allowed ? '#49C788' : '#FF4B4B' }]}>
                        {activeContract.clauses?.pets?.allowed ? (locale === 'es' ? 'Permitido' : 'Allowed') : (locale === 'es' ? 'Prohibido' : 'Not Allowed')}
                      </Text>
                    </View>
                    <View style={s.rulesDivider} />
                    <View style={s.ruleRow}>
                      <Text style={s.ruleLabel}>{t('contracts.smoking_allowed')}</Text>
                      <Text style={[s.ruleValue, { color: activeContract.clauses?.smoking?.allowed ? '#49C788' : '#FF4B4B' }]}>
                        {activeContract.clauses?.smoking?.allowed ? (locale === 'es' ? 'Permitido' : 'Allowed') : (locale === 'es' ? 'Prohibido' : 'Not Allowed')}
                      </Text>
                    </View>
                    <View style={s.rulesDivider} />
                    <View style={s.ruleRow}>
                      <Text style={s.ruleLabel}>{t('contracts.overnight_guests')}</Text>
                      <Text style={[s.ruleValue, { color: activeContract.clauses?.visitors?.overnight_allowed ? '#49C788' : '#FF4B4B' }]}>
                        {activeContract.clauses?.visitors?.overnight_allowed ? (locale === 'es' ? 'Permitido' : 'Allowed') : (locale === 'es' ? 'Prohibido' : 'Not Allowed')}
                      </Text>
                    </View>
                    <View style={s.rulesDivider} />
                    <View style={s.ruleRow}>
                      <Text style={s.ruleLabel}>{t('contracts.cleaning_schedule')}</Text>
                      <Text style={[s.ruleValue, { color: '#0A84FF', textTransform: 'capitalize' }]}>
                        {t(`contracts.cleaning_opts.${activeContract.clauses?.cleaning?.schedule || 'weekly'}`)}
                      </Text>
                    </View>
                  </View>

                  {/* 3. Cláusulas Adicionales */}
                  {activeContract.selected_custom_clauses && activeContract.selected_custom_clauses.length > 0 && (
                    <View style={s.rulesCard}>
                      <View style={s.rulesHeader}>
                        <MaterialCommunityIcons name="playlist-check" size={20} color="#BF5AF2" />
                        <Text style={s.rulesCardTitle}>{locale === 'es' ? 'Cláusulas Especiales' : 'Special Clauses'}</Text>
                      </View>
                      {activeContract.selected_custom_clauses.map((clauseKey, idx) => (
                        <View key={clauseKey}>
                          {idx > 0 && <View style={s.rulesDivider} />}
                          <View style={{ paddingVertical: 8 }}>
                            <Text style={s.clauseTextTitle}>✓ {getOptionalClauseLabel(clauseKey)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={s.empty}>
                  <View style={s.emptyIconWrap}>
                    <MaterialCommunityIcons name="home-heart" size={40} color="#00C9A7" />
                  </View>
                  <Text style={s.emptyTitle}>{t('contracts.tab_rules')}</Text>
                  <Text style={s.emptyText}>{t('contracts.house_rules_desc')}</Text>
                  <Pressable style={s.actionBtnSecondary} onPress={() => setActiveTab('contracts')}>
                    <Text style={s.actionBtnSecondaryText}>{locale === 'es' ? 'Ir a Contratos' : 'Go to Agreements'}</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          {/* TAB 3: RESOLUCIÓN DE DISPUTAS Y CONFLICTOS */}
          {activeTab === 'conflicts' && (
            <>
              {reports.length > 0 ? (
                <View style={{ gap: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={s.sectionHeading}>{locale === 'es' ? 'Tus Casos Activos' : 'Your Active Cases'}</Text>
                    <Pressable style={s.reportBadgeBtn} onPress={handleOpenReport}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#000" />
                      <Text style={s.reportBadgeText}>{locale === 'es' ? 'Nuevo Caso' : 'New Case'}</Text>
                    </Pressable>
                  </View>

                  {reports.map((report) => {
                    const isReporter = report.reporter_id === userId;
                    const counterpartName = isReporter ? (report.reported?.name || 'Roommate') : (report.reporter?.name || 'Roommate');
                    const statusConfig = getDisputeStatusConfig(report.status || 'pending');

                    return (
                      <View key={report.id} style={s.disputeCard}>
                        <View style={s.disputeHeader}>
                          <View style={s.disputeTypeWrap}>
                            <MaterialCommunityIcons name={getReasonIcon(report.reason)} size={18} color="#fff" />
                            <Text style={s.disputeType}>{getReasonLabel(report.reason)}</Text>
                          </View>
                          <View style={[s.disputeStatusBadge, { backgroundColor: statusConfig.color + '15', borderColor: statusConfig.color + '40' }]}>
                            <Text style={[s.disputeStatusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                          </View>
                        </View>

                        <Text style={s.disputeTitle}>
                          {isReporter 
                            ? (locale === 'es' ? `Presentado contra ${counterpartName}` : `Filed against ${counterpartName}`)
                            : (locale === 'es' ? `Presentado por ${counterpartName}` : `Filed by ${counterpartName}`)
                          }
                        </Text>
                        
                        {report.description ? (
                          <Text style={s.disputeDesc} numberOfLines={3}>{report.description}</Text>
                        ) : null}

                        <View style={[s.rulesDivider, { marginVertical: 12 }]} />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={s.disputeDate}>
                            {new Date(report.created_at).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </Text>
                          <Text style={s.disputeId}>ID: #{report.id.slice(0, 8)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={s.empty}>
                  <View style={s.emptyIconWrap}>
                    <MaterialCommunityIcons name="gavel" size={40} color="#E53935" />
                  </View>
                  <Text style={s.emptyTitle}>{t('contracts.res_center_title')}</Text>
                  <Text style={s.emptyText}>{t('contracts.res_center_desc')}</Text>
                  <Pressable style={[s.actionBtnSecondary, { borderColor: '#E53935' }]} onPress={handleOpenReport}>
                    <Text style={[s.actionBtnSecondaryText, { color: '#E53935' }]}>{locale === 'es' ? 'Reportar un Incidente' : 'Report an Incident'}</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Modern FAB (Solo visible en contratos) */}
      {activeTab === 'contracts' && (
        <Pressable style={s.fab} onPress={() => router.push('/contracts/new')}>
          <LinearGradient colors={['#49C788', '#38a870']} style={s.fabGradient}>
            <MaterialCommunityIcons name="plus" size={24} color="#000" />
            <Text style={s.fabText}>{t('contracts.btn_new')}</Text>
          </LinearGradient>
        </Pressable>
      )}

      {/* MODAL: SELECCIONAR ROOMMATE PARA REPORTAR */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{locale === 'es' ? 'Reportar Incidente' : 'Report Incident'}</Text>
              <Pressable style={s.modalCloseBtn} onPress={() => setShowReportModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#fff" />
              </Pressable>
            </View>
            <Text style={s.modalSubtitle}>
              {locale === 'es' 
                ? 'Selecciona el roommate con el que tienes el conflicto para iniciar una mediación:' 
                : 'Select the roommate you have the conflict with to initiate mediation:'}
            </Text>
            
            <ScrollView style={{ maxHeight: 300 }}>
              {roommates.map((item) => (
                <Pressable
                  key={item.id}
                  style={s.roommateItem}
                  onPress={() => handleSelectRoommateToReport(item.id, item.name)}
                >
                  <Image
                    source={{ uri: item.photoUrl || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=60&w=100' }}
                    style={s.roommateAvatar}
                  />
                  <Text style={s.roommateName}>{item.name}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  
  sectionHeading: { color: '#fff', fontSize: 18, fontWeight: '700' },
  subtitleText: { color: '#666', fontSize: 12, marginTop: 4, marginBottom: 12 },

  empty:        { alignItems: 'center', paddingTop: 40, paddingHorizontal: 30 },
  emptyIconWrap:{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#222' },
  emptyTitle:   { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  emptyText:    { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },

  actionBtnSecondary: { borderWidth: 1, borderColor: '#49C788', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, alignSelf: 'center' },
  actionBtnSecondaryText: { color: '#49C788', fontWeight: '700', fontSize: 14 },

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

  // Rules Tab Styling
  rulesCard: { backgroundColor: '#0d1117', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1a1a2e' },
  rulesHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  rulesCardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ruleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, alignItems: 'center' },
  ruleLabel: { color: '#888', fontSize: 14 },
  ruleValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  rulesDivider: { height: 1, backgroundColor: '#1a1a2e' },
  clauseTextTitle: { color: '#fff', fontSize: 14, lineHeight: 20 },

  // Conflicts Tab Styling
  reportBadgeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#49C788', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 4 },
  reportBadgeText: { color: '#000', fontSize: 11, fontWeight: '700' },
  disputeCard: { backgroundColor: '#0d1117', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1a1a2e', position: 'relative' },
  disputeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  disputeTypeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disputeType: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disputeStatusBadge: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  disputeStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  disputeTitle: { color: '#888', fontSize: 13, marginBottom: 6 },
  disputeDesc: { color: '#ccc', fontSize: 13, lineHeight: 18 },
  disputeDate: { color: '#555', fontSize: 11 },
  disputeId: { color: '#555', fontSize: 11 },

  // Modal Styling
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalSubtitle: { color: '#888', fontSize: 13, lineHeight: 18, marginBottom: 20 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  roommateItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', padding: 12, borderRadius: 16, marginBottom: 12, gap: 12, borderWidth: 1, borderColor: '#1a1a2e' },
  roommateAvatar: { width: 40, height: 40, borderRadius: 20 },
  roommateName: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },
});
