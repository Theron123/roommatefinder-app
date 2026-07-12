import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';

type Contract = {
  id: string;
  status: 'draft' | 'pending' | 'active' | 'expired';
  tenant_name: string;
  listing_title: string;
  rent_price: number;
  start_date: string;
  end_date: string;
  created_at: string | null;
};

export default function CompanyContractsScreen() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'draft' | 'pending' | 'expired'>('active');

  // Preview Modal
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { locale } = useTranslation();
  const { accentColor } = useAdminTheme();

  const loadContracts = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;

      // 1. Fetch real listings to match IDs
      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, title, price')
        .eq('user_id', userId);

      const listingIds = listingsData?.map(l => l.id) || [];

      let fetchedContracts: Contract[] = [];

      if (listingIds.length > 0) {
        // Fetch database contracts
        const { data: contractData, error } = await supabase
          .from('contracts')
          .select('id, status, created_at, listing_id')
          .in('listing_id', listingIds);

        if (!error && contractData) {
          fetchedContracts = await Promise.all(
            contractData.map(async (c) => {
              const matchingApt = listingsData?.find(l => l.id === c.listing_id);
              // Fetch metadata or use fallbacks
              const extKey = `pms_contract_ext:${c.id}`;
              const cached = await AsyncStorage.getItem(extKey);
              const ext = cached ? JSON.parse(cached) : {
                tenant_name: 'Daniel Ortega',
                start_date: '2026-06-01',
                end_date: '2027-06-01',
              };

              return {
                id: c.id,
                status: (c.status as any) || 'active',
                tenant_name: ext.tenant_name,
                listing_title: matchingApt?.title || 'Apartamento',
                rent_price: matchingApt?.price || 500,
                start_date: ext.start_date,
                end_date: ext.end_date,
                created_at: c.created_at,
              };
            })
          );
        }
      }

      // 2. Load/Inject simulated local draft and pending contracts if none are present in DB
      const localKey = `pms_local_contracts:${userId}`;
      const savedLocal = await AsyncStorage.getItem(localKey);
      let localList: Contract[] = [];
      if (savedLocal) {
        localList = JSON.parse(savedLocal);
      } else {
        localList = [
          {
            id: 'mock_c1',
            status: 'draft',
            tenant_name: 'Carlos Mendoza',
            listing_title: 'Premium Suite Condesa',
            rent_price: 1200,
            start_date: '2026-08-01',
            end_date: '2027-08-01',
            created_at: new Date().toISOString(),
          },
          {
            id: 'mock_c2',
            status: 'pending',
            tenant_name: 'Mateo Díaz',
            listing_title: 'Studio Flat Polanco',
            rent_price: 750,
            start_date: '2026-08-15',
            end_date: '2027-08-15',
            created_at: new Date().toISOString(),
          },
        ];
        await AsyncStorage.setItem(localKey, JSON.stringify(localList));
      }

      const allContracts = [...fetchedContracts, ...localList];
      setContracts(allContracts);
    } catch (e) {
      console.error('Error loading company contracts:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadContracts();
  };

  const handleUpdateStatus = async (contractId: string, newStatus: Contract['status']) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;

      if (contractId.startsWith('mock_')) {
        const localKey = `pms_local_contracts:${userId}`;
        const updated = contracts
          .filter(c => c.id.startsWith('mock_'))
          .map(c => c.id === contractId ? { ...c, status: newStatus } : c);
        await AsyncStorage.setItem(localKey, JSON.stringify(updated));
      } else {
        await supabase
          .from('contracts')
          .update({ status: newStatus })
          .eq('id', contractId);
      }

      Alert.alert(locale === 'es' ? 'Contrato Actualizado' : 'Contract Updated');
      loadContracts();
      setModalVisible(false);
    } catch (e) {
      console.error('Error updating contract status:', e);
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      c.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
      c.listing_title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = c.status === activeTab;
    return matchesSearch && matchesStatus;
  });

  const getStatusLabel = (status: Contract['status']) => {
    const labels = {
      draft: { es: 'Borrador', en: 'Draft', color: '#888' },
      pending: { es: 'Pendiente de Firma', en: 'Pending Signature', color: '#ff9f0a' },
      active: { es: 'Contrato Activo', en: 'Active Contract', color: '#49C788' },
      expired: { es: 'Expirado', en: 'Expired', color: '#ff4444' },
    };
    return labels[status] || { es: status, en: status, color: '#aaa' };
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{locale === 'es' ? 'Contratos de Arrendamiento' : 'Rental Agreements'}</Text>
        <Text style={styles.pageSubtitle}>
          {locale === 'es' ? 'Administra contratos activos, firmas digitales y borradores.' : 'Manage rental agreements, signatures, and draft documents.'}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['active', 'pending', 'draft', 'expired'] as const).map((tab) => {
          const active = activeTab === tab;
          const label = getStatusLabel(tab);
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, active && { borderBottomColor: accentColor }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, active && { color: accentColor, fontWeight: '700' }]}>
                {locale === 'es' ? label.es : label.en}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Searchbar */}
      <View style={styles.searchBarContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={locale === 'es' ? 'Buscar por inquilino o departamento...' : 'Search by tenant or apartment...'}
          placeholderTextColor="#666"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <FlatList
          data={filteredContracts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => { setSelectedContract(item); setModalVisible(true); }}>
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardTitle}>{item.listing_title}</Text>
                  <Text style={styles.cardTenant}>
                    <MaterialCommunityIcons name="account-outline" size={13} color="#666" style={{ marginRight: 4 }} /> {item.tenant_name}
                  </Text>
                </View>
                <Text style={styles.cardPrice}>${item.rent_price}/mo</Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardDates}>
                  {item.start_date} <Text style={{ color: '#444' }}>→</Text> {item.end_date}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#555" />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>
                {locale === 'es' ? 'No se encontraron contratos en esta pestaña' : 'No agreements found in this tab'}
              </Text>
            </View>
          }
        />
      )}

      {/* Contract Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{locale === 'es' ? 'Detalle de Contrato' : 'Contract Overview'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {selectedContract && (
              <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 32 }}>
                {/* Contract Icon Box */}
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons name="file-document-outline" size={42} color={accentColor} />
                  <Text style={styles.boxTitle}>{selectedContract.listing_title}</Text>
                  <Text style={styles.boxSub}>{locale === 'es' ? 'Contrato de Renta Residencial' : 'Residential Lease Agreement'}</Text>
                </View>

                {/* Info Card */}
                <View style={styles.glassCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{locale === 'es' ? 'Arrendatario / Inquilino:' : 'Tenant Name:'}</Text>
                    <Text style={styles.infoValue}>{selectedContract.tenant_name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{locale === 'es' ? 'Monto de Renta:' : 'Rent Value:'}</Text>
                    <Text style={styles.infoValue}>${selectedContract.rent_price} / mes</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{locale === 'es' ? 'Fecha de Inicio:' : 'Start Date:'}</Text>
                    <Text style={styles.infoValue}>{selectedContract.start_date}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{locale === 'es' ? 'Fecha de Término:' : 'Expiration Date:'}</Text>
                    <Text style={styles.infoValue}>{selectedContract.end_date}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{locale === 'es' ? 'Estado actual:' : 'Status:'}</Text>
                    <Text style={{ color: getStatusLabel(selectedContract.status).color, fontSize: 13, fontWeight: '700' }}>
                      {locale === 'es' ? getStatusLabel(selectedContract.status).es.toUpperCase() : getStatusLabel(selectedContract.status).en.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* PDF preview placeholder */}
                <Text style={styles.sectionLabel}>{locale === 'es' ? 'Documento Legal' : 'Legal Document'}</Text>
                <View style={styles.pdfPlaceholder}>
                  <MaterialCommunityIcons name="file-pdf-box" size={32} color="#ff4444" />
                  <View>
                    <Text style={styles.pdfTitle}>contrato_arrendamiento_firmado.pdf</Text>
                    <Text style={styles.pdfSize}>142 KB</Text>
                  </View>
                </View>

              </ScrollView>
            )}

            {selectedContract && (
              <View style={styles.modalActions}>
                {selectedContract.status === 'pending' && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: accentColor }]} 
                    onPress={() => handleUpdateStatus(selectedContract.id, 'active')}
                  >
                    <Text style={styles.actionBtnText}>{locale === 'es' ? 'Activar (Firmar)' : 'Activate (Sign)'}</Text>
                  </TouchableOpacity>
                )}
                {selectedContract.status === 'draft' && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: accentColor }]} 
                    onPress={() => handleUpdateStatus(selectedContract.id, 'pending')}
                  >
                    <Text style={styles.actionBtnText}>{locale === 'es' ? 'Enviar a Firma' : 'Send for Signature'}</Text>
                  </TouchableOpacity>
                )}
                {selectedContract.status === 'active' && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]} 
                    onPress={() => handleUpdateStatus(selectedContract.id, 'expired')}
                  >
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>{locale === 'es' ? 'Marcar Expirado' : 'Mark Expired'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#12121a',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cardTenant: {
    color: '#888',
    fontSize: 12,
  },
  cardPrice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
  },
  cardDates: {
    color: '#555',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: '#555',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0c0c14',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  iconBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  boxTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  boxSub: {
    color: '#666',
    fontSize: 12,
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: '#777',
    fontSize: 13,
  },
  infoValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  pdfPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 12,
    marginBottom: 24,
  },
  pdfTitle: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },
  pdfSize: {
    color: '#555',
    fontSize: 10,
    marginTop: 2,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  actionBtn: {
    borderRadius: 10,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
