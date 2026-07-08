import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, RefreshControl, Alert, Modal, Image, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';

type Contract = {
  id: string;
  type: string;
  status: string;
  clauses: any;
  selected_custom_clauses: string[] | null;
  effective_date: string | null;
  termination_date: string | null;
  created_at: string;
  updated_at: string | null;
  initiator_id: string | null;
  initiator: { name: string } | null;
  contract_participants: { user_id: string; profiles: { name: string } }[];
  listings: {
    id: string;
    title: string | null;
    address: string | null;
    price: number | null;
    user_id: string | null;
    images: string[] | null;
    owner: { name: string } | null;
  } | null;
};

type ContractStats = {
  total: number;
  pending: number;
  active: number;
  terminated: number;
};

type ContractAuditLog = {
  timestamp: string;
  action: string;
  adminName: string;
};

const STATUS_FILTERS = ['all', 'pending_authorization', 'active', 'terminated'];

export default function AdminContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Stats State
  const [stats, setStats] = useState<ContractStats>({
    total: 0, pending: 0, active: 0, terminated: 0
  });

  // Modal detailed states
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'parties' | 'moderation'>('details');

  // Admin local metadata
  const [adminNotes, setAdminNotes] = useState('');
  const [auditLogs, setAuditLogs] = useState<ContractAuditLog[]>([]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const showAlert = (title: string, message: string) => {
    const isError = title.toLowerCase() === 'error';
    const isSuccess = title.toLowerCase() === 'éxito' || title.toLowerCase() === 'success';
    if (isError || isSuccess) {
      showToast(message, isError ? 'error' : 'success');
    } else {
      if (Platform.OS === 'web') {
        alert(`${title}: ${message}`);
      } else {
        Alert.alert(title, message);
      }
    }
  };

  const { locale, t } = useTranslation();
  const { accentColor } = useAdminTheme();

  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    draft: { label: locale === 'es' ? 'Borrador' : 'Draft', color: '#888', bg: '#111', icon: 'pencil-outline' },
    pending_authorization: { label: locale === 'es' ? 'Pendiente' : 'Pending', color: '#FFB800', bg: 'rgba(255,184,0,0.08)', icon: 'clock-outline' },
    active: { label: locale === 'es' ? 'Activo' : 'Active', color: '#49C788', bg: 'rgba(73,199,136,0.08)', icon: 'check-circle-outline' },
    terminated: { label: locale === 'es' ? 'Terminado' : 'Terminated', color: '#FF4B4B', bg: 'rgba(255,75,75,0.08)', icon: 'close-circle-outline' },
  };

  const getContractTypeLabel = (type: string) => {
    if (type === 'roommate_agreement') {
      return locale === 'es' ? 'Acuerdo de Roommate' : 'Roommate Agreement';
    }
    if (type === 'rental_agreement') {
      return locale === 'es' ? 'Contrato de Renta' : 'Rental Agreement';
    }
    return type;
  };

  // Cargar metadatos administrativos locales
  const loadAdminMetadata = async (contractId: string) => {
    try {
      const notesKey = `admin_contract_notes:${contractId}`;
      const auditKey = `admin_contract_audit:${contractId}`;

      const savedNotes = await AsyncStorage.getItem(notesKey);
      const savedAudit = await AsyncStorage.getItem(auditKey);

      setAdminNotes(savedNotes || '');
      setAuditLogs(savedAudit ? JSON.parse(savedAudit) : []);
    } catch (e) {
      console.error('Error cargando notas locales:', e);
    }
  };

  // Guardar notas administrativas locales
  const saveAdminMetadata = async () => {
    if (!selectedContract) return;
    try {
      const notesKey = `admin_contract_notes:${selectedContract.id}`;
      await AsyncStorage.setItem(notesKey, adminNotes);

      showAlert(
        locale === 'es' ? 'Éxito' : 'Success',
        locale === 'es' ? 'Notas guardadas correctamente.' : 'Notes saved successfully.'
      );
      await addAuditLog(selectedContract.id, 'Notas de moderación actualizadas');
    } catch (e) {
      console.error('Error guardando notas locales:', e);
    }
  };

  // Registrar logs de auditoría locales
  const addAuditLog = async (contractId: string, action: string) => {
    try {
      const auditKey = `admin_contract_audit:${contractId}`;
      const savedAudit = await AsyncStorage.getItem(auditKey);
      const logs: ContractAuditLog[] = savedAudit ? JSON.parse(savedAudit) : [];

      const newLog: ContractAuditLog = {
        timestamp: new Date().toISOString(),
        action,
        adminName: 'Super Admin'
      };

      const updatedLogs = [newLog, ...logs];
      await AsyncStorage.setItem(auditKey, JSON.stringify(updatedLogs));
      setAuditLogs(updatedLogs);
    } catch (e) {
      console.error('Error al registrar logs en AsyncStorage:', e);
    }
  };

  // Calcular estadísticas de contratos
  const fetchStats = async () => {
    try {
      const [totalRes, pendingRes, activeRes, terminatedRes] = await Promise.all([
        supabase.from('contracts').select('*', { count: 'exact', head: true }),
        supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'pending_authorization'),
        supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'terminated'),
      ]);

      setStats({
        total: totalRes.count || 0,
        pending: pendingRes.count || 0,
        active: activeRes.count || 0,
        terminated: terminatedRes.count || 0,
      });
    } catch (e) {
      console.error('Error calculando estadísticas:', e);
    }
  };

  // Cargar contratos de Supabase
  const fetchContracts = useCallback(async () => {
    try {
      let query = supabase
        .from('contracts')
        .select('*, initiator:initiator_id(name), contract_participants(user_id, profiles(name)), listings:listing_id(*, owner:profiles(name))');

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      query = query.order('created_at', { ascending: false }).limit(60);

      const { data, error } = await query;
      if (!error && data) {
        setContracts(data as unknown as Contract[]);
      }
    } catch (e) {
      console.error('Error cargando contratos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    setLoading(true);
    fetchContracts();
    fetchStats();
  }, [fetchContracts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchContracts();
    fetchStats();
  };

  const openContractDetail = (contract: Contract) => {
    setSelectedContract(contract);
    loadAdminMetadata(contract.id);
    setActiveTab('details');
    setModalVisible(true);
  };

  // Actualizar estado del contrato en Supabase
  const updateContractStatus = async (newStatus: string, actionName: string) => {
    if (!selectedContract) return;
    try {
      // 1. Actualizar estado del contrato
      const { error } = await supabase
        .from('contracts')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selectedContract.id);

      if (error) throw error;

      // 2. Actualizar estado del alojamiento asociado (alquilar o liberar)
      if (selectedContract.listings?.id) {
        let listingStatus = 'available'; // Estado vacante al rechazar/finalizar
        if (newStatus === 'active') {
          listingStatus = 'inactive'; // Estado ocupado al aprobar
        }

        const { error: listingError } = await supabase
          .from('listings')
          .update({ status: listingStatus })
          .eq('id', selectedContract.listings.id);

        if (listingError) {
          console.error('Error al actualizar estado de alojamiento:', listingError);
        }
      }

      // 3. Sincronizar asíncronamente con Yardi Voyager (Simulado/Preparación PMS)
      if (selectedContract.listings?.id && newStatus === 'active') {
        try {
          const { loadConfigFromEnv } = require('../../lib/integrations/yardi/config');
          const { YardiApiClient } = require('../../lib/integrations/yardi/client');
          const { YardiSyncManager } = require('../../lib/integrations/yardi/sync');
          const { YardiIntegrationProvider } = require('../../lib/integrations/yardi/provider');

          const config = loadConfigFromEnv();
          config.simulationMode = true; // Simulación para pruebas locales
          const client = new YardiApiClient(config);
          const syncManager = new YardiSyncManager(client);
          const provider = new YardiIntegrationProvider(client, syncManager);

          // Lanzar la sincronización en segundo plano
          provider.syncLease({
            id: selectedContract.id,
            propertyId: selectedContract.listings.id,
            residentId: selectedContract.initiator_id,
            startDate: selectedContract.effective_date || new Date().toISOString().split('T')[0],
            endDate: selectedContract.termination_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            rentAmount: typeof selectedContract.clauses === 'object' && selectedContract.clauses ? (selectedContract.clauses as any).rentAmount || 0 : 0,
            status: 'Active'
          }).then(() => {
            console.log('[Yardi PMS] Sincronización exitosa del Lease.');
          }).catch((err: any) => {
            console.error('[Yardi PMS] Error al sincronizar Lease:', err);
          });
        } catch (pmsError) {
          console.error('[Yardi PMS] No se pudo inicializar la sincronización:', pmsError);
        }
      }

      setSelectedContract({ ...selectedContract, status: newStatus });
      await addAuditLog(selectedContract.id, actionName);
      fetchContracts();
      fetchStats();
      showAlert(locale === 'es' ? 'Éxito' : 'Success', locale === 'es' ? 'Contrato y alojamiento actualizados con éxito.' : 'Contract and accommodation updated successfully.');
    } catch (e: any) {
      showAlert('Error', e.message || 'Error al actualizar el estado.');
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Búsqueda local por inquilino, arrendador o apartamento
  const filteredContracts = contracts.filter(c => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const initMatch = c.initiator?.name?.toLowerCase().includes(query);
    const hostMatch = c.listings?.owner?.name?.toLowerCase().includes(query);
    const propMatch = c.listings?.title?.toLowerCase().includes(query);
    return initMatch || hostMatch || propMatch;
  });

  const renderContract = ({ item }: { item: Contract }) => {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
    const tenantName = item.initiator?.name || (locale === 'es' ? 'Inquilino' : 'Tenant');
    const landlordName = item.listings?.owner?.name || (locale === 'es' ? 'Arrendador' : 'Host');

    return (
      <TouchableOpacity style={styles.contractCard} onPress={() => openContractDetail(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.typeIconContainer}>
            <MaterialCommunityIcons 
              name={item.type === 'roommate_agreement' ? 'account-group-outline' : 'home-city-outline'} 
              size={20} 
              color={accentColor} 
            />
            <Text style={styles.typeText} numberOfLines={1}>{getContractTypeLabel(item.type)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.bg, borderColor: config.color + '33', borderWidth: 1 }]}>
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.detailsRow}>
            <View style={styles.personCol}>
              <Text style={styles.roleLabel}>{locale === 'es' ? 'Inquilino' : 'Tenant'}</Text>
              <Text style={styles.personName} numberOfLines={1}>{tenantName}</Text>
            </View>
            <MaterialCommunityIcons name="swap-horizontal" size={18} color="#222" />
            <View style={styles.personCol}>
              <Text style={styles.roleLabel}>{locale === 'es' ? 'Arrendador' : 'Landlord'}</Text>
              <Text style={styles.personName} numberOfLines={1}>{landlordName}</Text>
            </View>
          </View>

          {item.listings && (
            <View style={styles.propRow}>
              <MaterialCommunityIcons name="home-outline" size={14} color="#666" />
              <Text style={styles.propText} numberOfLines={1}>
                {item.listings.title} · ${item.listings.price}/mo
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{locale === 'es' ? 'Creado el: ' : 'Created: '}{formatDate(item.created_at)}</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color="#444" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderToast = () => {
    if (!toast) return null;
    return (
      <View style={styles.toastOuterContainer}>
        <View style={[styles.toastCard, toast.type === 'success' ? styles.toastCardSuccess : styles.toastCardError]}>
          <MaterialCommunityIcons 
            name={toast.type === 'success' ? 'check-circle' : 'alert-circle'} 
            size={18} 
            color={toast.type === 'success' ? '#22c55e' : '#ef4444'} 
          />
          <Text style={styles.toastMessageText}>{toast.message}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>{locale === 'es' ? 'Moderación de Contratos' : 'Contract Requests'}</Text>
      </View>

      {/* Barra de Búsqueda */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder={locale === 'es' ? 'Buscar por inquilino, arrendador o propiedad...' : 'Search by tenant, landlord, or apartment...'}
            placeholderTextColor="#555"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtros por Estado */}
      <View style={styles.filtersRow}>
        {STATUS_FILTERS.map(st => (
          <TouchableOpacity
            key={st}
            style={[
              styles.filterChip,
              filterStatus === st && {
                borderColor: (STATUS_CONFIG[st]?.color || accentColor),
                backgroundColor: (STATUS_CONFIG[st]?.color || accentColor) + '15',
              },
            ]}
            onPress={() => setFilterStatus(st)}
          >
            <Text style={[styles.filterChipText, filterStatus === st && { color: STATUS_CONFIG[st]?.color || accentColor }]}>
              {st === 'all' ? (locale === 'es' ? 'Todos' : 'All') : (STATUS_CONFIG[st]?.label || st)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Panel de Estadísticas (KPIs) */}
      <View style={styles.statsPanel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="file-document-outline" size={18} color="#fff" />
            <Text style={styles.statNumText}>{stats.total}</Text>
            <Text style={styles.statLabelText}>{locale === 'es' ? 'Contratos' : 'Total'}</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#FFB800" />
            <Text style={[styles.statNumText, { color: '#FFB800' }]}>{stats.pending}</Text>
            <Text style={styles.statLabelText}>{locale === 'es' ? 'Pendientes' : 'Pending'}</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color="#49C788" />
            <Text style={[styles.statNumText, { color: '#49C788' }]}>{stats.active}</Text>
            <Text style={styles.statLabelText}>{locale === 'es' ? 'Activos' : 'Active'}</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="close-circle-outline" size={18} color="#FF4B4B" />
            <Text style={[styles.statNumText, { color: '#FF4B4B' }]}>{stats.terminated}</Text>
            <Text style={styles.statLabelText}>{locale === 'es' ? 'Rechazados' : 'Rejected'}</Text>
          </View>
        </ScrollView>
      </View>

      {/* FlatList de Contratos */}
      {loading && !refreshing ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <FlatList
          data={filteredContracts}
          keyExtractor={(item) => item.id}
          renderItem={renderContract}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="file-document-remove-outline" size={48} color="#222" />
              <Text style={styles.emptyText}>{locale === 'es' ? 'No se encontraron solicitudes de contrato.' : 'No contract requests found.'}</Text>
            </View>
          }
        />
      )}

      {/* Modal Detallado de Contrato */}
      <Modal
        visible={modalVisible && selectedContract !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedContract && (
              <>
                {/* Cabecera del Modal */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalIntro}>
                    <MaterialCommunityIcons name="file-document-outline" size={28} color={accentColor} />
                    <View style={styles.modalTitleGroup}>
                      <Text style={styles.modalTitleText} numberOfLines={1}>{getContractTypeLabel(selectedContract.type)}</Text>
                      <Text style={styles.modalSubtitleText} numberOfLines={1}>{selectedContract.id}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                    <MaterialCommunityIcons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Tabs del Modal */}
                <View style={styles.modalTabBar}>
                  {(['details', 'parties', 'moderation'] as const).map(tItem => (
                    <TouchableOpacity
                      key={tItem}
                      style={[styles.modalTabItem, activeTab === tItem && { borderBottomColor: accentColor }]}
                      onPress={() => setActiveTab(tItem)}
                    >
                      <Text style={[styles.modalTabText, activeTab === tItem && { color: '#fff' }]}>
                        {tItem === 'details' ? (locale === 'es' ? 'Cláusulas' : 'Details') :
                         tItem === 'parties' ? (locale === 'es' ? 'Involucrados' : 'Parties') :
                         (locale === 'es' ? 'Moderación' : 'Actions')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Contenido por pestaña */}
                <ScrollView contentContainerStyle={styles.modalTabContent}>
                  {activeTab === 'details' && (
                    <View style={styles.tabPanel}>
                      <Text style={styles.sectionTitle}>{locale === 'es' ? 'Términos Financieros' : 'Financial Clauses'}</Text>
                      
                      <View style={styles.metaBox}>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>{locale === 'es' ? 'Renta Mensual' : 'Monthly Rent'}</Text>
                          <Text style={styles.metaValue}>${selectedContract.clauses?.rent?.amount || '—'}</Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>{locale === 'es' ? 'Día de Vencimiento' : 'Rent Due Day'}</Text>
                          <Text style={styles.metaValue}>{locale === 'es' ? `Día ${selectedContract.clauses?.rent?.due_day}` : `Day ${selectedContract.clauses?.rent?.due_day}`}</Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>{locale === 'es' ? 'Depósito de Seguridad' : 'Security Deposit'}</Text>
                          <Text style={styles.metaValue}>${selectedContract.clauses?.security_deposit?.amount || '—'}</Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>{locale === 'es' ? 'Fecha de Vigencia' : 'Effective Date'}</Text>
                          <Text style={styles.metaValue}>{formatDate(selectedContract.effective_date || '')}</Text>
                        </View>
                      </View>

                      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{locale === 'es' ? 'Reglas de Convivencia' : 'House Rules'}</Text>
                      <View style={styles.metaBox}>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>{locale === 'es' ? 'Mascotas' : 'Pets'}</Text>
                          <Text style={[styles.metaValue, { color: selectedContract.clauses?.pets?.allowed ? '#49C788' : '#FF4B4B' }]}>
                            {selectedContract.clauses?.pets?.allowed ? (locale === 'es' ? 'Permitido' : 'Allowed') : (locale === 'es' ? 'No Permitido' : 'Not Allowed')}
                          </Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>{locale === 'es' ? 'Fumar' : 'Smoking'}</Text>
                          <Text style={[styles.metaValue, { color: selectedContract.clauses?.smoking?.allowed ? '#49C788' : '#FF4B4B' }]}>
                            {selectedContract.clauses?.smoking?.allowed ? (locale === 'es' ? 'Permitido' : 'Allowed') : (locale === 'es' ? 'No Permitido' : 'Not Allowed')}
                          </Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>{locale === 'es' ? 'Invitados a pernoctar' : 'Overnight Visitors'}</Text>
                          <Text style={[styles.metaValue, { color: selectedContract.clauses?.visitors?.overnight_allowed ? '#49C788' : '#FF4B4B' }]}>
                            {selectedContract.clauses?.visitors?.overnight_allowed ? (locale === 'es' ? 'Permitido' : 'Allowed') : (locale === 'es' ? 'No Permitido' : 'Not Allowed')}
                          </Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>{locale === 'es' ? 'Frecuencia de Limpieza' : 'Cleaning Schedule'}</Text>
                          <Text style={styles.metaValue}>{selectedContract.clauses?.cleaning?.schedule || '—'}</Text>
                        </View>
                      </View>

                      {selectedContract.selected_custom_clauses && selectedContract.selected_custom_clauses.length > 0 && (
                        <>
                          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{locale === 'es' ? 'Cláusulas Adicionales Seleccionadas' : 'Selected Custom Clauses'}</Text>
                          <View style={styles.metaBox}>
                            {selectedContract.selected_custom_clauses.map((clauseKey, idx) => (
                              <View key={idx} style={styles.customClauseRow}>
                                <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={16} color={accentColor} />
                                <Text style={styles.customClauseText}>{clauseKey}</Text>
                              </View>
                            ))}
                          </View>
                        </>
                      )}
                    </View>
                  )}

                  {activeTab === 'parties' && (
                    <View style={styles.tabPanel}>
                      <Text style={styles.sectionTitle}>{locale === 'es' ? 'Inquilino / Arrendatario' : 'Tenant / Requestor'}</Text>
                      <View style={styles.personInfoBox}>
                        <MaterialCommunityIcons name="account" size={24} color={accentColor} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.personTitle}>{selectedContract.initiator?.name || 'Inquilino'}</Text>
                          <Text style={styles.personSub}>{selectedContract.initiator_id}</Text>
                        </View>
                      </View>

                      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{locale === 'es' ? 'Arrendador / Propietario' : 'Landlord / Owner'}</Text>
                      <View style={styles.personInfoBox}>
                        <MaterialCommunityIcons name="account-tie" size={24} color="#FFB800" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.personTitle}>{selectedContract.listings?.owner?.name || 'Arrendador'}</Text>
                          <Text style={styles.personSub}>{selectedContract.listings?.user_id}</Text>
                        </View>
                      </View>

                      {selectedContract.listings && (
                        <>
                          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{locale === 'es' ? 'Alojamiento Solicitado' : 'Associated Property'}</Text>
                          <View style={styles.propBox}>
                            {selectedContract.listings.images && selectedContract.listings.images[0] ? (
                              <Image source={{ uri: selectedContract.listings.images[0] }} style={styles.propThumb} />
                            ) : (
                              <View style={styles.propThumbFallback}>
                                <MaterialCommunityIcons name="home-city" size={22} color="#444" />
                              </View>
                            )}
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={styles.propTitleText}>{selectedContract.listings.title}</Text>
                              <Text style={styles.propAddressText}>{selectedContract.listings.address}</Text>
                              <Text style={styles.propPriceText}>${selectedContract.listings.price}/mo</Text>
                            </View>
                          </View>
                        </>
                      )}
                    </View>
                  )}

                  {activeTab === 'moderation' && (
                    <View style={styles.tabPanel}>
                      <Text style={styles.sectionTitle}>{locale === 'es' ? 'Notas de Moderación Interna' : 'Internal Admin Notes'}</Text>
                      <TextInput
                        style={styles.notesInputArea}
                        value={adminNotes}
                        onChangeText={setAdminNotes}
                        placeholder={locale === 'es' ? 'Ingresa aquí comentarios sobre la aprobación, llamadas a propietarios o justificaciones...' : 'Write verification comments, landlord calls, or rejection reasons here...'}
                        placeholderTextColor="#444"
                        multiline={true}
                        numberOfLines={4}
                      />
                      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#111', borderColor: '#222', borderWidth: 1 }]} onPress={saveAdminMetadata}>
                        <Text style={[styles.saveBtnText, { color: '#fff' }]}>{locale === 'es' ? 'Guardar Notas' : 'Save Notes'}</Text>
                      </TouchableOpacity>

                      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{locale === 'es' ? 'Controles Administrativos' : 'Administrative Actions'}</Text>
                      <View style={styles.actionButtonsCol}>
                        {selectedContract.status !== 'active' && (
                          <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#49C788' }]}
                            onPress={() => updateContractStatus('active', 'Contrato aprobado y formalizado por admin')}
                          >
                            <MaterialCommunityIcons name="check-circle" size={18} color="#000" />
                            <Text style={[styles.actionBtnText, { color: '#000' }]}>{locale === 'es' ? 'Aprobar Contrato' : 'Approve Contract'}</Text>
                          </TouchableOpacity>
                        )}

                        {selectedContract.status !== 'terminated' && (
                          <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: 'rgba(255,75,75,0.1)', borderColor: '#FF4B4B', borderWidth: 1 }]}
                            onPress={() => updateContractStatus('terminated', 'Contrato rechazado y finalizado por admin')}
                          >
                            <MaterialCommunityIcons name="close-circle" size={18} color="#FF4B4B" />
                            <Text style={[styles.actionBtnText, { color: '#FF4B4B' }]}>{locale === 'es' ? 'Rechazar Contrato' : 'Reject / Terminate'}</Text>
                          </TouchableOpacity>
                        )}

                        {selectedContract.status !== 'pending_authorization' && (
                          <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#111', borderColor: '#FFB800', borderWidth: 1 }]}
                            onPress={() => updateContractStatus('pending_authorization', 'Contrato colocado en estado Pendiente por admin')}
                          >
                            <MaterialCommunityIcons name="clock-outline" size={18} color="#FFB800" />
                            <Text style={[styles.actionBtnText, { color: '#FFB800' }]}>{locale === 'es' ? 'Marcar como Pendiente' : 'Mark as Pending'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{locale === 'es' ? 'Historial de Auditoría' : 'Audit Log'}</Text>
                      {auditLogs.length === 0 ? (
                        <Text style={styles.emptyText}>{locale === 'es' ? 'No hay logs registrados para este contrato.' : 'No audit logs recorded.'}</Text>
                      ) : (
                        auditLogs.map((log, idx) => (
                          <View key={idx} style={styles.auditCard}>
                            <View style={styles.auditHeader}>
                              <Text style={styles.auditAdminText}>{log.adminName}</Text>
                              <Text style={styles.auditTimeText}>{formatDate(log.timestamp)} {new Date(log.timestamp).toLocaleTimeString()}</Text>
                            </View>
                            <Text style={styles.auditActionText}>{log.action}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </ScrollView>
                {modalVisible && renderToast()}
              </>
            )}
          </View>
        </View>
      </Modal>
      {!modalVisible && renderToast()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  topBar: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  searchBarRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c0c0c',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    height: 44,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#111',
    backgroundColor: '#070707',
  },
  filterChipText: { color: '#666', fontSize: 11, fontWeight: '600' },
  statsPanel: {
    borderBottomWidth: 1,
    borderBottomColor: '#111',
    backgroundColor: '#070707',
  },
  statsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  statBox: {
    width: 100,
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#161616',
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  statNumText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statLabelText: { color: '#555', fontSize: 10, fontWeight: '500' },
  listContainer: { padding: 16, paddingBottom: 40 },
  separator: { height: 12 },
  centerLoader: { paddingVertical: 100, alignItems: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { textAlign: 'center', color: '#555', fontSize: 14 },
  contractCard: {
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#161616',
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeIconContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  typeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  cardBody: { gap: 10 },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  personCol: { flex: 1, gap: 2 },
  roleLabel: { color: '#555', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  personName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  propRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#070707', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  propText: { color: '#888', fontSize: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#161616', paddingTop: 8 },
  dateText: { color: '#444', fontSize: 11 },

  // Estilos del Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContainer: { height: '88%', backgroundColor: '#0a0a0a', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: '#222' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#161616' },
  modalIntro: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  modalTitleGroup: { flex: 1, gap: 2 },
  modalTitleText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalSubtitleText: { color: '#444', fontSize: 11, fontFamily: 'monospace' },
  closeButton: { padding: 4 },
  modalTabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#161616', backgroundColor: '#070707' },
  modalTabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  modalTabText: { fontSize: 13, color: '#666', fontWeight: '600' },
  modalTabContent: { padding: 16, paddingBottom: 60 },
  tabPanel: { gap: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  metaBox: { backgroundColor: '#0c0c0c', borderRadius: 10, borderWidth: 1, borderColor: '#161616', padding: 12, gap: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { color: '#666', fontSize: 13 },
  metaValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  customClauseRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customClauseText: { color: '#fff', fontSize: 12, textTransform: 'capitalize' },
  personInfoBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0c0c0c', borderRadius: 10, borderWidth: 1, borderColor: '#161616', padding: 12 },
  personTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  personSub: { color: '#444', fontSize: 11, fontFamily: 'monospace' },
  propBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0c0c0c', borderRadius: 10, borderWidth: 1, borderColor: '#161616', padding: 12 },
  propThumb: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#111' },
  propThumbFallback: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#161616', alignItems: 'center', justifyContent: 'center' },
  propTitleText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  propAddressText: { color: '#666', fontSize: 12 },
  propPriceText: { color: '#49C788', fontSize: 12, fontWeight: '700' },
  notesInputArea: { backgroundColor: '#0c0c0c', borderWidth: 1, borderColor: '#1e1e1e', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14, textAlignVertical: 'top', height: 100 },
  saveBtn: { height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  saveBtnText: { fontSize: 14, fontWeight: 'bold' },
  actionButtonsCol: { gap: 10 },
  actionBtn: { height: 44, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnText: { fontSize: 14, fontWeight: 'bold' },
  auditCard: { backgroundColor: '#0c0c0c', borderRadius: 8, borderWidth: 1, borderColor: '#161616', padding: 12, gap: 6, marginTop: 8 },
  auditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  auditAdminText: { color: '#aaa', fontSize: 12, fontWeight: 'bold' },
  auditTimeText: { color: '#444', fontSize: 10 },
  auditActionText: { color: '#fff', fontSize: 13 },
  toastOuterContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    maxWidth: '90%',
  },
  toastCardSuccess: {
    borderColor: '#22c55e40',
  },
  toastCardError: {
    borderColor: '#ef444440',
  },
  toastMessageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});
