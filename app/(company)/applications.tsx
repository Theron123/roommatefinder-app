import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';

type Application = {
  id: string;
  applicant: string;
  apartment: string;
  status: 'pending' | 'accepted' | 'rejected' | 'review_needed';
  verifStatus: 'verified' | 'unverified';
  date: string;
  notes?: string;
};

export default function CompanyApplicationsScreen() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  
  // Detail modal
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { locale } = useTranslation();
  const { accentColor } = useAdminTheme();

  const loadApplications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;
      const appsKey = `company_apps:${userId}`;
      
      const saved = await AsyncStorage.getItem(appsKey);
      if (saved) {
        setApps(JSON.parse(saved));
      } else {
        // Initialize default mock apps
        const mockApps: Application[] = [
          { id: '1', applicant: 'Carlos Mendoza', apartment: 'Premium Suite Condesa', status: 'pending', verifStatus: 'verified', date: '2026-07-11', notes: 'Buscando rentar por un periodo de 12 meses. Adjuntó comprobante de ingresos.' },
          { id: '2', applicant: 'Sofía Vergara', apartment: 'Loft Duplex Roma', status: 'accepted', verifStatus: 'verified', date: '2026-07-10', notes: 'Renta corporativa pagada por adelantado.' },
          { id: '3', applicant: 'Mateo Díaz', apartment: 'Studio Flat Polanco', status: 'pending', verifStatus: 'unverified', date: '2026-07-12', notes: 'Estudiante de maestría. Aún no sube su aval bancario.' },
        ];
        await AsyncStorage.setItem(appsKey, JSON.stringify(mockApps));
        setApps(mockApps);
      }
    } catch (e) {
      console.error('Error loading applications:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadApplications();
  };

  const updateAppStatus = async (appId: string, newStatus: Application['status']) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;
      const appsKey = `company_apps:${userId}`;

      const updated = apps.map((a) => {
        if (a.id === appId) {
          return { ...a, status: newStatus };
        }
        return a;
      });

      await AsyncStorage.setItem(appsKey, JSON.stringify(updated));
      setApps(updated);
      if (selectedApp?.id === appId) {
        setSelectedApp({ ...selectedApp, status: newStatus });
      }

      // Log activity
      const auditLog = {
        timestamp: new Date().toISOString(),
        action: `Postulación de ${selectedApp?.applicant || 'Inquilino'} cambiada a "${newStatus}"`,
        adminName: 'PMS Hub',
      };
      const existingLogs = await AsyncStorage.getItem(`admin_user_audit:${userId}`);
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      await AsyncStorage.setItem(`admin_user_audit:${userId}`, JSON.stringify([auditLog, ...logs]));

      Alert.alert(locale === 'es' ? 'Éxito' : 'Success', locale === 'es' ? 'Estado de postulación actualizado.' : 'Application status updated.');
    } catch (e) {
      console.error('Error updating application status:', e);
    }
  };

  const handleRequestInfo = () => {
    Alert.alert(
      locale === 'es' ? 'Solicitar Información' : 'Request Info',
      locale === 'es' 
        ? 'Se ha enviado un mensaje al solicitante solicitando comprobación adicional de ingresos y referencias.'
        : 'A message has been sent to the applicant requesting additional proof of income and references.'
    );
  };

  const handleContact = () => {
    Alert.alert(
      locale === 'es' ? 'Contacto PMS' : 'PMS Contact',
      locale === 'es'
        ? `Canal de chat abierto con ${selectedApp?.applicant}. Puedes enviarle un mensaje directo.`
        : `Chat channel opened with ${selectedApp?.applicant}. You can send a direct message.`
    );
  };

  const filteredApps = apps.filter((a) => {
    if (filterTab === 'all') return true;
    return a.status === filterTab;
  });

  const getStatusBadge = (status: Application['status']) => {
    const config = {
      pending: { color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)', es: 'Pendiente', en: 'Pending' },
      accepted: { color: '#49C788', bg: 'rgba(73,199,136,0.12)', es: 'Aceptado', en: 'Accepted' },
      rejected: { color: '#ff4444', bg: 'rgba(255,68,68,0.12)', es: 'Rechazado', en: 'Rejected' },
      review_needed: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', es: 'En Revisión', en: 'In Review' },
    };
    const c = config[status] || config.pending;
    return (
      <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.color + '20' }]}>
        <Text style={[styles.badgeText, { color: c.color }]}>{locale === 'es' ? c.es : c.en}</Text>
      </View>
    );
  };

  const getVerifBadge = (status: Application['verifStatus']) => {
    const isV = status === 'verified';
    return (
      <View style={[styles.badge, { backgroundColor: isV ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.02)', borderColor: isV ? '#06b6d4' : '#333' }]}>
        <Text style={[styles.badgeText, { color: isV ? '#06b6d4' : '#666' }]}>
          {isV ? (locale === 'es' ? 'Verificado' : 'Verified') : (locale === 'es' ? 'No Verif' : 'Unverified')}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{locale === 'es' ? 'Solicitudes de Inquilinos' : 'Tenant Applications'}</Text>
        <Text style={styles.pageSubtitle}>
          {locale === 'es' ? 'Revisa perfiles, comprobación de ingresos y aprueba inquilinos.' : 'Review tenant profiles, verified status, and approve rental applications.'}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['all', 'pending', 'accepted', 'rejected'] as const).map((tab) => {
          const active = filterTab === tab;
          const labels = { all: 'Todas', pending: 'Pendientes', accepted: 'Aceptadas', rejected: 'Rechazadas' };
          const labelsEn = { all: 'All', pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected' };
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, active && { borderBottomColor: accentColor }]}
              onPress={() => setFilterTab(tab)}
            >
              <Text style={[styles.tabText, active && { color: accentColor, fontWeight: '700' }]}>
                {locale === 'es' ? labels[tab] : labelsEn[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <FlatList
          data={filteredApps}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => { setSelectedApp(item); setModalVisible(true); }}>
              <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.applicant}</Text>
                  <Text style={styles.userSub}>{locale === 'es' ? 'Aplica para:' : 'Applies to:'} <Text style={{ color: '#fff', fontWeight: '600' }}>{item.apartment}</Text></Text>
                </View>
                {getStatusBadge(item.status)}
              </View>
              <View style={styles.cardFooter}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {getVerifBadge(item.verifStatus)}
                  <Text style={styles.dateText}>{item.date}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>
                {locale === 'es' ? 'No hay postulaciones en esta pestaña' : 'No applications in this tab'}
              </Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{locale === 'es' ? 'Detalle de Postulación' : 'Application Details'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {selectedApp && (
              <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 32 }}>
                
                {/* Profile Header */}
                <View style={styles.modalUserBox}>
                  <View style={[styles.avatar, { borderColor: accentColor + '30' }]}>
                    <Text style={[styles.avatarText, { color: accentColor }]}>{selectedApp.applicant[0]}</Text>
                  </View>
                  <View>
                    <Text style={styles.modalUserName}>{selectedApp.applicant}</Text>
                    <Text style={styles.modalUserRole}>{locale === 'es' ? 'Postulante verificado' : 'Verified applicant'}</Text>
                  </View>
                </View>

                {/* Info Card */}
                <View style={styles.glassCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{locale === 'es' ? 'Departamento:' : 'Apartment:'}</Text>
                    <Text style={styles.infoValue}>{selectedApp.apartment}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{locale === 'es' ? 'Fecha de Solicitud:' : 'Submitted Date:'}</Text>
                    <Text style={styles.infoValue}>{selectedApp.date}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{locale === 'es' ? 'Verificación de Identidad:' : 'Identity Check:'}</Text>
                    <Text style={{ color: selectedApp.verifStatus === 'verified' ? '#06b6d4' : '#ff4444', fontSize: 13, fontWeight: '700' }}>
                      {selectedApp.verifStatus === 'verified' ? 'COMPLETADO' : 'PENDIENTE'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{locale === 'es' ? 'Estado General:' : 'Overall Status:'}</Text>
                    {getStatusBadge(selectedApp.status)}
                  </View>
                </View>

                {/* Notes */}
                <Text style={styles.sectionLabel}>{locale === 'es' ? 'Mensaje / Notas del Aplicante' : 'Applicant Notes'}</Text>
                <View style={styles.notesCard}>
                  <Text style={styles.notesText}>{selectedApp.notes || 'Ninguna nota ingresada.'}</Text>
                </View>

                {/* Fast Communication */}
                <View style={styles.commGrid}>
                  <TouchableOpacity style={styles.commBtn} onPress={handleRequestInfo}>
                    <MaterialCommunityIcons name="file-question-outline" size={18} color={accentColor} />
                    <Text style={[styles.commBtnText, { color: accentColor }]}>{locale === 'es' ? 'Pedir Datos' : 'Request Info'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.commBtn} onPress={handleContact}>
                    <MaterialCommunityIcons name="message-outline" size={18} color={accentColor} />
                    <Text style={[styles.commBtnText, { color: accentColor }]}>{locale === 'es' ? 'Enviar Mensaje' : 'Send Message'}</Text>
                  </TouchableOpacity>
                </View>

              </ScrollView>
            )}

            {selectedApp && (
              <View style={styles.modalActions}>
                {selectedApp.status === 'pending' ? (
                  <>
                    <TouchableOpacity 
                      style={[styles.rejectBtn, { backgroundColor: 'rgba(255,68,68,0.1)' }]} 
                      onPress={() => updateAppStatus(selectedApp.id, 'rejected')}
                    >
                      <Text style={styles.rejectBtnText}>{locale === 'es' ? 'Rechazar' : 'Reject'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.acceptBtn, { backgroundColor: accentColor }]} 
                      onPress={() => updateAppStatus(selectedApp.id, 'accepted')}
                    >
                      <Text style={styles.acceptBtnText}>{locale === 'es' ? 'Aceptar' : 'Accept'}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity 
                    style={[styles.resetBtn, { backgroundColor: '#1b1b24' }]} 
                    onPress={() => updateAppStatus(selectedApp.id, 'pending')}
                  >
                    <Text style={styles.resetBtnText}>{locale === 'es' ? 'Restablecer a Pendiente' : 'Reset to Pending'}</Text>
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
    fontSize: 12,
    fontWeight: '600',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
    gap: 4,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  userSub: {
    color: '#666',
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
  },
  dateText: {
    color: '#444',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
    alignSelf: 'center',
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
  modalUserBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalUserName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalUserRole: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
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
  notesCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  notesText: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 18,
  },
  commGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  commBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  commBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    borderRadius: 10,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(255,68,68,0.2)',
    borderWidth: 1,
  },
  rejectBtnText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptBtn: {
    flex: 1,
    borderRadius: 10,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetBtn: {
    flex: 1,
    borderRadius: 10,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
