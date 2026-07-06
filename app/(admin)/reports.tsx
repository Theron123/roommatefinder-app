import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, ScrollView,
  TextInput, Share, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Report = {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter_id: string;
  reported_id: string;
};

type ProfileItem = {
  id: string;
  name: string | null;
  role: string | null;
  trust_score: number | null;
  created_at: string;
  is_identity_verified: boolean;
};

type ListingItem = {
  id: string;
  title: string | null;
  price: number | null;
  status: string | null;
  created_at: string;
};

type ContractItem = {
  id: string;
  status: string;
  created_at: string;
  listings: { title: string | null; user_id: string | null } | null;
};

type SwipeItem = {
  id: string;
  liked: boolean;
  created_at: string;
};

type MatchItem = {
  id: string;
  status: string | null;
  created_at: string;
};

type AuditItem = {
  timestamp: string;
  action: string;
  adminName: string;
  entityType: string;
  entityId: string;
};

const COMPLAINT_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'];
const TABS = ['overview', 'users', 'accommodations', 'contracts', 'roommates', 'complaints', 'audit', 'insights'];

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending'); // Para la pestaña de Denuncias
  const [search, setSearch] = useState('');

  // Datos Raw
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [swipes, setSwipes] = useState<SwipeItem[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [complaints, setComplaints] = useState<Report[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);

  // Filtros de fecha
  const [dateFilter, setDateFilter] = useState<'all' | '30days' | '7days'>('all');

  const { locale, t } = useTranslation();
  const { accentColor } = useAdminTheme();

  const STATUS_COLOR: Record<string, string> = {
    pending: '#f97316', reviewed: '#3b82f6', resolved: accentColor, dismissed: '#555',
  };

  // Carga unificada de datos para analíticas
  const fetchAnalyticsData = async () => {
    try {
      // 1. Usuarios
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, name, role, trust_score, created_at, is_identity_verified');
      setProfiles((usersData as ProfileItem[]) || []);

      // 2. Alojamientos
      const { data: listData } = await supabase
        .from('listings')
        .select('id, title, price, status, created_at');
      setListings((listData as ListingItem[]) || []);

      // 3. Contratos
      const { data: contractData } = await supabase
        .from('contracts')
        .select('id, status, created_at, listings:listing_id(title, user_id)');
      setContracts((contractData as unknown as ContractItem[]) || []);

      // 4. Roommates (Swipes y Matches)
      const { data: swipesData } = await supabase.from('swipes').select('id, liked, created_at');
      setSwipes((swipesData as SwipeItem[]) || []);

      const { data: matchesData } = await supabase.from('matches').select('id, status, created_at');
      setMatches((matchesData as MatchItem[]) || []);

      // 5. Denuncias (Abuse Reports)
      const { data: complaintsData } = await supabase
        .from('user_reports')
        .select('id, reason, description, status, created_at, reporter_id, reported_id')
        .order('created_at', { ascending: false });
      setComplaints((complaintsData as Report[]) || []);

      // 6. Cargar Logs de Auditoría desde AsyncStorage
      await fetchLocalAuditLogs();

    } catch (e) {
      console.error('Error cargando analíticas de la plataforma:', e);
    }
  };

  // Carga logs de auditoría de AsyncStorage de los otros módulos
  const fetchLocalAuditLogs = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const auditKeys = keys.filter(k => k.startsWith('admin_user_audit:') || k.startsWith('admin_property_audit:') || k.startsWith('admin_contract_audit:'));
      
      if (auditKeys.length === 0) {
        setAuditLogs([]);
        return;
      }

      const pairs = await AsyncStorage.multiGet(auditKeys);
      const logs: AuditItem[] = [];

      pairs.forEach(([key, val]) => {
        if (!val) return;
        try {
          const parsed = JSON.parse(val);
          const parts = key.split(':');
          const type = parts[0].replace('admin_', '').replace('_audit', '');
          const id = parts[1];

          if (Array.isArray(parsed)) {
            parsed.forEach(log => {
              logs.push({
                timestamp: log.timestamp || new Date().toISOString(),
                action: log.action || 'Acción administrativa',
                adminName: log.adminName || 'Admin',
                entityType: type,
                entityId: id,
              });
            });
          }
        } catch (err) {
          console.error('Error al parsear log individual:', err);
        }
      });

      // Ordenar por fecha descendente
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(logs);
    } catch (e) {
      console.error('Error al recuperar logs de AsyncStorage:', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await fetchAnalyticsData();
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Moderación de denuncia existente (Preservado)
  const updateComplaintStatus = (id: string, newStatus: string) => {
    Alert.alert(
      t('general.confirm', 'Confirm'),
      t('admin.reports.update_msg', 'Mark as "{status}"?').replace('{status}', newStatus),
      [
        { text: t('general.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('general.confirm', 'Confirm'),
          onPress: async () => {
            await supabase.from('user_reports').update({ status: newStatus }).eq('id', id);
            loadData();
          },
        },
      ]
    );
  };

  // Filtrado por fecha auxiliar
  const filterByDate = <T extends { created_at: string }>(list: T[]): T[] => {
    if (dateFilter === 'all') return list;
    const limit = new Date();
    limit.setDate(limit.getDate() - (dateFilter === '30days' ? 30 : 7));
    return list.filter(item => new Date(item.created_at) >= limit);
  };

  // Cálculos de métricas procesadas
  const processedProfiles = filterByDate(profiles);
  const processedListings = filterByDate(listings);
  const processedContracts = filterByDate(contracts);
  const processedSwipes = filterByDate(swipes);
  const processedMatches = filterByDate(matches);

  const totalUsers = processedProfiles.length;
  const seekersCount = processedProfiles.filter(p => p.role === 'seeker').length;
  const landlordsCount = processedProfiles.filter(p => p.role === 'landlord').length;
  const adminsCount = processedProfiles.filter(p => p.role === 'admin').length;
  const verifiedUsersCount = processedProfiles.filter(p => p.is_identity_verified).length;

  const totalProps = processedListings.length;
  const activeProps = processedListings.filter(l => l.status === 'active' || l.status === 'available').length;
  const occupiedProps = processedListings.filter(l => l.status === 'inactive').length;
  const availableProps = processedListings.filter(l => l.status === 'available').length;

  const totalCon = processedContracts.length;
  const approvedCon = processedContracts.filter(c => c.status === 'active').length;
  const pendingCon = processedContracts.filter(c => c.status === 'pending_authorization').length;
  const rejectedCon = processedContracts.filter(c => c.status === 'terminated').length;

  const occupancyRate = totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0;
  const conversionRate = processedSwipes.length > 0 ? Math.round((processedMatches.length / processedSwipes.length) * 100) : 0;

  // Crecimiento de usuarios por mes (Visualizador de barras)
  const getUserGrowthByMonth = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const buckets: Record<string, number> = {};

    profiles.forEach(p => {
      if (!p.created_at) return;
      const date = new Date(p.created_at);
      const label = `${months[date.getMonth()]} ${date.getFullYear()}`;
      buckets[label] = (buckets[label] || 0) + 1;
    });

    const sortedLabels = Object.keys(buckets).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).slice(-6);
    return sortedLabels.map(label => ({
      label,
      value: buckets[label]
    }));
  };

  // Insights automáticos de la plataforma
  const generateInsights = () => {
    const list: { type: 'warning' | 'success' | 'info'; title: string; desc: string; icon: string }[] = [];

    if (occupancyRate < 35) {
      list.push({
        type: 'warning',
        title: locale === 'es' ? 'Ocupación Crítica' : 'Low Occupancy Rate',
        desc: locale === 'es' ? `La ocupación del inventario está al ${occupancyRate}%. Considera promover anuncios destacados.` : `Inventory occupancy is at ${occupancyRate}%. Consider promoting featured listings.`,
        icon: 'home-alert-outline'
      });
    } else if (occupancyRate > 75) {
      list.push({
        type: 'success',
        title: locale === 'es' ? 'Alta Demanda Inmobiliaria' : 'High Occupancy Performance',
        desc: locale === 'es' ? `Excelente nivel de ocupación (${occupancyRate}%). Habilita importación masiva para captar propietarios.` : `Great occupancy levels (${occupancyRate}%). Enable bulk import to attract new landlords.`,
        icon: 'trending-up'
      });
    }

    if (pendingCon > 3) {
      list.push({
        type: 'warning',
        title: locale === 'es' ? 'Cuello de Botella en Contratos' : 'Contract Authorization Delay',
        desc: locale === 'es' ? `Hay ${pendingCon} solicitudes de contrato pendientes de autorización. Agiliza la moderación para evitar abandonos.` : `There are ${pendingCon} contract requests waiting for approval. Act fast to avoid user churn.`,
        icon: 'file-clock-outline'
      });
    }

    const unverifiedRate = totalUsers > 0 ? Math.round(((totalUsers - verifiedUsersCount) / totalUsers) * 100) : 0;
    if (unverifiedRate > 50) {
      list.push({
        type: 'info',
        title: locale === 'es' ? 'Alto Índice de Usuarios Sin Verificar' : 'Unverified User Alert',
        desc: locale === 'es' ? `El ${unverifiedRate}% de los usuarios no tiene identificación verificada. Promueve el uso de verificación de identidad.` : `${unverifiedRate}% of users lack identity verification. Promote identity checks.`,
        icon: 'shield-alert-outline'
      });
    }

    if (profiles.length > 5) {
      list.push({
        type: 'success',
        title: locale === 'es' ? 'Crecimiento de Comunidad' : 'Active Growth Trend',
        desc: locale === 'es' ? `La plataforma registra un total de ${profiles.length} perfiles. El ecosistema está expandiéndose.` : `The platform counts ${profiles.length} total profiles. The community is expanding.`,
        icon: 'account-plus-outline'
      });
    }

    return list;
  };

  // Exportar reportes compartibles por CSV
  const exportToCSV = (section: string) => {
    let content = '';
    let filename = '';

    if (section === 'users') {
      content = 'ID,Nombre,Rol,Confianza,Verificado,FechaRegistro\n';
      profiles.forEach(p => {
        content += `"${p.id}","${p.name || 'Sin nombre'}","${p.role || 'Sin rol'}",${p.trust_score || 0},${p.is_identity_verified},"${p.created_at}"\n`;
      });
      filename = 'Reporte_Usuarios.csv';
    } else if (section === 'listings') {
      content = 'ID,Titulo,Precio,Estado,FechaPublicacion\n';
      listings.forEach(l => {
        content += `"${l.id}","${l.title || 'Sin titulo'}",${l.price || 0},"${l.status || 'available'}","${l.created_at}"\n`;
      });
      filename = 'Reporte_Alojamientos.csv';
    } else if (section === 'contracts') {
      content = 'ID,Estado,Propiedad,FechaCreacion\n';
      contracts.forEach(c => {
        content += `"${c.id}","${c.status}","${c.listings?.title || 'Sin asignar'}","${c.created_at}"\n`;
      });
      filename = 'Reporte_Contratos.csv';
    } else {
      content = 'Fecha,Modulo,Admin,Accion\n';
      auditLogs.forEach(a => {
        content += `"${a.timestamp}","${a.entityType}","${a.adminName}","${a.action}"\n`;
      });
      filename = 'Reporte_Auditoria.csv';
    }

    Share.share({
      message: content,
      title: filename
    });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const translateType = (tabKey: string) => {
    const dict: Record<string, string> = {
      overview: locale === 'es' ? 'Resumen' : 'Dashboard',
      users: locale === 'es' ? 'Usuarios' : 'Users',
      accommodations: locale === 'es' ? 'Alojamientos' : 'Properties',
      contracts: locale === 'es' ? 'Contratos' : 'Contracts',
      roommates: locale === 'es' ? 'Roommates' : 'Activity',
      complaints: locale === 'es' ? 'Denuncias' : 'Complaints',
      audit: locale === 'es' ? 'Auditoría' : 'Audit',
      insights: locale === 'es' ? 'Recomendaciones' : 'Insights',
    };
    return dict[tabKey] || tabKey;
  };

  // RENDER: Pestaña Overview / Dashboard
  const renderOverview = () => {
    const growth = getUserGrowthByMonth();
    return (
      <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false}>
        {/* KPI Panel */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{locale === 'es' ? 'Indicadores Clave de Rendimiento' : 'Key Performance Indicators'}</Text>
        </View>
        
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <MaterialCommunityIcons name="account-group-outline" size={20} color={accentColor} />
            <Text style={styles.kpiVal}>{totalUsers}</Text>
            <Text style={styles.kpiLabel}>{locale === 'es' ? 'Usuarios Registrados' : 'Registered Users'}</Text>
          </View>
          <View style={styles.kpiCard}>
            <MaterialCommunityIcons name="home-city-outline" size={20} color="#06b6d4" />
            <Text style={styles.kpiVal}>{totalProps}</Text>
            <Text style={styles.kpiLabel}>{locale === 'es' ? 'Alojamientos Totales' : 'Accommodations'}</Text>
          </View>
          <View style={styles.kpiCard}>
            <MaterialCommunityIcons name="file-document-outline" size={20} color="#eab308" />
            <Text style={styles.kpiVal}>{totalCon}</Text>
            <Text style={styles.kpiLabel}>{locale === 'es' ? 'Solicitudes Contratos' : 'Contract Requests'}</Text>
          </View>
          <View style={styles.kpiCard}>
            <MaterialCommunityIcons name="chart-donut" size={20} color="#10b981" />
            <Text style={styles.kpiVal}>{occupancyRate}%</Text>
            <Text style={styles.kpiLabel}>{locale === 'es' ? 'Tasa de Ocupación' : 'Occupancy Rate'}</Text>
          </View>
        </View>

        {/* Visual Charts built using pure Responsive Flexbox layout */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{locale === 'es' ? 'Crecimiento de Usuarios (Últimos meses)' : 'User Registrations Growth'}</Text>
          {growth.length === 0 ? (
            <Text style={styles.emptyChartText}>{locale === 'es' ? 'Sin datos de registro suficientes.' : 'No registration data.'}</Text>
          ) : (
            <View style={styles.barChartContainer}>
              {growth.map((g, idx) => {
                const max = Math.max(...growth.map(i => i.value), 1);
                const pct = (g.value / max) * 80; // 80% height max
                return (
                  <View key={idx} style={styles.barCol}>
                    <Text style={styles.barValText}>{g.value}</Text>
                    <View style={[styles.barFill, { height: `${pct}%`, backgroundColor: accentColor }]} />
                    <Text style={styles.barLabel} numberOfLines={1}>{g.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{locale === 'es' ? 'Distribución por Estado de Alojamientos' : 'Accommodation Status Distribution'}</Text>
          <View style={styles.distributionContainer}>
            <View style={styles.distRow}>
              <Text style={styles.distLabel}>{locale === 'es' ? 'Disponibles' : 'Available'}</Text>
              <Text style={styles.distVal}>{availableProps} ({totalProps > 0 ? Math.round((availableProps/totalProps)*100) : 0}%)</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${totalProps > 0 ? (availableProps/totalProps)*100 : 0}%`, backgroundColor: '#06b6d4' }]} />
            </View>

            <View style={[styles.distRow, { marginTop: 12 }]}>
              <Text style={styles.distLabel}>{locale === 'es' ? 'Alquilados / Ocupados' : 'Occupied / Leased'}</Text>
              <Text style={styles.distVal}>{occupiedProps} ({totalProps > 0 ? Math.round((occupiedProps/totalProps)*100) : 0}%)</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${totalProps > 0 ? (occupiedProps/totalProps)*100 : 0}%`, backgroundColor: accentColor }]} />
            </View>

            <View style={[styles.distRow, { marginTop: 12 }]}>
              <Text style={styles.distLabel}>{locale === 'es' ? 'Inactivos / Pendientes' : 'Pending / Draft'}</Text>
              <Text style={styles.distVal}>{(totalProps - availableProps - occupiedProps)} ({totalProps > 0 ? Math.round(((totalProps - availableProps - occupiedProps)/totalProps)*100) : 0}%)</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${totalProps > 0 ? ((totalProps - availableProps - occupiedProps)/totalProps)*100 : 0}%`, backgroundColor: '#555' }]} />
            </View>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{locale === 'es' ? 'Estado de Contratos Formalizados' : 'Contracts Approval Health'}</Text>
          <View style={styles.donutPlaceholder}>
            <View style={styles.legendRow}>
              <View style={styles.legendCol}>
                <View style={[styles.bullet, { backgroundColor: '#10b981' }]} />
                <Text style={styles.bulletLabel}>{locale === 'es' ? 'Activos' : 'Approved'}: {approvedCon}</Text>
              </View>
              <View style={styles.legendCol}>
                <View style={[styles.bullet, { backgroundColor: '#f97316' }]} />
                <Text style={styles.bulletLabel}>{locale === 'es' ? 'Pendientes' : 'Pending'}: {pendingCon}</Text>
              </View>
              <View style={styles.legendCol}>
                <View style={[styles.bullet, { backgroundColor: '#ff4444' }]} />
                <Text style={styles.bulletLabel}>{locale === 'es' ? 'Terminados' : 'Rejected'}: {rejectedCon}</Text>
              </View>
            </View>
            <View style={styles.stackedBar}>
              <View style={{ flex: approvedCon || 1, backgroundColor: '#10b981' }} />
              <View style={{ flex: pendingCon || 0, backgroundColor: '#f97316' }} />
              <View style={{ flex: rejectedCon || 0, backgroundColor: '#ff4444' }} />
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // RENDER: Pestaña Usuarios
  const renderUsers = () => {
    const list = processedProfiles.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()));
    return (
      <View style={styles.tabContentContainer}>
        <View style={styles.searchBarRow}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={18} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder={locale === 'es' ? 'Buscar usuario...' : 'Search user...'}
              placeholderTextColor="#555"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={() => exportToCSV('users')}>
            <MaterialCommunityIcons name="download" size={18} color="#fff" />
            <Text style={styles.exportText}>{locale === 'es' ? 'Exportar CSV' : 'CSV'}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.tableRowCard}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.name || 'Sin Nombre'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.is_identity_verified ? '#10b98115' : '#ff444415' }]}>
                  <Text style={[styles.statusText, { color: item.is_identity_verified ? '#10b981' : '#ff4444', fontSize: 9 }]}>
                    {item.is_identity_verified ? (locale === 'es' ? 'VERIFICADO' : 'VERIFIED') : (locale === 'es' ? 'SIN VERIFICAR' : 'UNVERIFIED')}
                  </Text>
                </View>
              </View>
              <Text style={styles.rowSub}>ID: {item.id.slice(0, 8)}... | Rol: {item.role?.toUpperCase() || 'SEEKER'}</Text>
              <Text style={styles.rowFooter}>Trust Score: {item.trust_score || 0}/100 | Reg: {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>{locale === 'es' ? 'No se encontraron usuarios.' : 'No users found.'}</Text>}
        />
      </View>
    );
  };

  // RENDER: Pestaña Alojamientos
  const renderAccommodations = () => {
    const list = processedListings.filter(l => !search || l.title?.toLowerCase().includes(search.toLowerCase()));
    return (
      <View style={styles.tabContentContainer}>
        <View style={styles.searchBarRow}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={18} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder={locale === 'es' ? 'Buscar propiedad...' : 'Search property...'}
              placeholderTextColor="#555"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={() => exportToCSV('listings')}>
            <MaterialCommunityIcons name="download" size={18} color="#fff" />
            <Text style={styles.exportText}>{locale === 'es' ? 'Exportar CSV' : 'CSV'}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.tableRowCard}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.title || 'Sin Título'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'inactive' ? '#ff444415' : '#10b98115' }]}>
                  <Text style={[styles.statusText, { color: item.status === 'inactive' ? '#ff4444' : '#10b981', fontSize: 9 }]}>
                    {item.status?.toUpperCase() || 'AVAILABLE'}
                  </Text>
                </View>
              </View>
              <Text style={styles.rowSub}>Precio: ${item.price}/mes | ID: {item.id.slice(0, 8)}...</Text>
              <Text style={styles.rowFooter}>Registrado: {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>{locale === 'es' ? 'No se encontraron alojamientos.' : 'No listings found.'}</Text>}
        />
      </View>
    );
  };

  // RENDER: Pestaña Contratos
  const renderContractsTab = () => {
    const list = processedContracts.filter(c => !search || c.listings?.title?.toLowerCase().includes(search.toLowerCase()));
    return (
      <View style={styles.tabContentContainer}>
        <View style={styles.searchBarRow}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={18} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder={locale === 'es' ? 'Buscar por propiedad...' : 'Search by property...'}
              placeholderTextColor="#555"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={() => exportToCSV('contracts')}>
            <MaterialCommunityIcons name="download" size={18} color="#fff" />
            <Text style={styles.exportText}>{locale === 'es' ? 'Exportar CSV' : 'CSV'}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.tableRowCard}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.listings?.title || 'Contrato sin asignar'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#10b98115' : item.status === 'terminated' ? '#ff444415' : '#f9731615' }]}>
                  <Text style={[styles.statusText, { color: item.status === 'active' ? '#10b981' : item.status === 'terminated' ? '#ff4444' : '#f97316', fontSize: 9 }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.rowSub}>ID Contrato: {item.id.slice(0, 8)}...</Text>
              <Text style={styles.rowFooter}>Creado el: {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>{locale === 'es' ? 'No se encontraron contratos.' : 'No contracts found.'}</Text>}
        />
      </View>
    );
  };

  // RENDER: Pestaña Roommates
  const renderRoommates = () => {
    return (
      <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{locale === 'es' ? 'Métricas de Emparejamiento (Match)' : 'Roommate Matching Activity'}</Text>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <MaterialCommunityIcons name="gesture-swipe" size={20} color={accentColor} />
            <Text style={styles.kpiVal}>{processedSwipes.length}</Text>
            <Text style={styles.kpiLabel}>{locale === 'es' ? 'Deslices (Swipes)' : 'Total Swipes'}</Text>
          </View>
          <View style={styles.kpiCard}>
            <MaterialCommunityIcons name="heart-flash" size={20} color="#10b981" />
            <Text style={styles.kpiVal}>{processedSwipes.filter(s => s.liked).length}</Text>
            <Text style={styles.kpiLabel}>{locale === 'es' ? 'Likes Enviados' : 'Likes Sent'}</Text>
          </View>
          <View style={styles.kpiCard}>
            <MaterialCommunityIcons name="account-heart-outline" size={20} color="#06b6d4" />
            <Text style={styles.kpiVal}>{processedMatches.length}</Text>
            <Text style={styles.kpiLabel}>{locale === 'es' ? 'Matches Logrados' : 'Roommate Matches'}</Text>
          </View>
          <View style={styles.kpiCard}>
            <MaterialCommunityIcons name="percent" size={20} color="#eab308" />
            <Text style={styles.kpiVal}>{conversionRate}%</Text>
            <Text style={styles.kpiLabel}>{locale === 'es' ? 'Conversión de Match' : 'Match Conv. Rate'}</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{locale === 'es' ? 'Tasa de Interacciones de Compatibilidad' : 'Interactions breakdown'}</Text>
          <View style={styles.distributionContainer}>
            <View style={styles.distRow}>
              <Text style={styles.distLabel}>{locale === 'es' ? 'Likes' : 'Likes'}</Text>
              <Text style={styles.distVal}>{processedSwipes.filter(s => s.liked).length} deslices</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${processedSwipes.length > 0 ? (processedSwipes.filter(s => s.liked).length/processedSwipes.length)*100 : 0}%`, backgroundColor: '#10b981' }]} />
            </View>

            <View style={[styles.distRow, { marginTop: 12 }]}>
              <Text style={styles.distLabel}>{locale === 'es' ? 'Dislikes / Pases' : 'Dislikes / Passes'}</Text>
              <Text style={styles.distVal}>{processedSwipes.filter(s => !s.liked).length} deslices</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${processedSwipes.length > 0 ? (processedSwipes.filter(s => !s.liked).length/processedSwipes.length)*100 : 0}%`, backgroundColor: '#ff4444' }]} />
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  // RENDER: Pestaña Denuncias (Abuse Reports) - Preservado
  const renderComplaints = () => {
    const list = complaints.filter(r => r.status === filterStatus);
    return (
      <View style={styles.tabContentContainer}>
        {/* Filtros locales de estado de denuncias */}
        <View style={styles.complaintFilterRow}>
          {COMPLAINT_STATUSES.map(s => (
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

        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
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
                  {COMPLAINT_STATUSES
                    .filter(s => s !== item.status)
                    .map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.actionBtn, { borderColor: STATUS_COLOR[s] + '66' }]}
                        onPress={() => updateComplaintStatus(item.id, s)}
                      >
                        <Text style={[styles.actionText, { color: STATUS_COLOR[s] }]}>{s}</Text>
                      </TouchableOpacity>
                    ))
                  }
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {locale === 'es' ? `No hay reportes en estado "${filterStatus}".` : `No reports with status "${filterStatus}".`}
            </Text>
          }
        />
      </View>
    );
  };

  // RENDER: Pestaña Auditoría (Historial AsyncStorage)
  const renderAudit = () => {
    return (
      <View style={styles.tabContentContainer}>
        <View style={styles.searchBarRow}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={18} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder={locale === 'es' ? 'Buscar en bitácora...' : 'Search logs...'}
              placeholderTextColor="#555"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={() => exportToCSV('audit')}>
            <MaterialCommunityIcons name="download" size={18} color="#fff" />
            <Text style={styles.exportText}>{locale === 'es' ? 'Exportar CSV' : 'CSV'}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={auditLogs.filter(a => !search || a.action.toLowerCase().includes(search.toLowerCase()) || a.entityType.toLowerCase().includes(search.toLowerCase()))}
          keyExtractor={(item, idx) => idx.toString()}
          renderItem={({ item }) => (
            <View style={styles.tableRowCard}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.action}</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#111', borderColor: '#222', borderWidth: 1 }]}>
                  <Text style={[styles.statusText, { color: '#888', fontSize: 9 }]}>
                    {item.entityType.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.rowSub}>ID Entidad: {item.entityId.slice(0, 8)}... | Admin: {item.adminName}</Text>
              <Text style={styles.rowFooter}>{formatDate(item.timestamp)}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>{locale === 'es' ? 'No hay logs de auditoría locales.' : 'No audit logs recorded.'}</Text>}
        />
      </View>
    );
  };

  // RENDER: Pestaña Insights & Exportar
  const renderInsights = () => {
    const list = generateInsights();
    return (
      <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{locale === 'es' ? 'Detecciones e Insights Automáticos' : 'Platform Insights & Recommendations'}</Text>
        
        {list.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="check-decagram" size={48} color="#10b981" />
            <Text style={styles.emptyText}>{locale === 'es' ? 'El sistema no detectó anomalías o cuellos de botella.' : 'No platform bottlenecks detected.'}</Text>
          </View>
        ) : (
          list.map((item, idx) => {
            const color = item.type === 'warning' ? '#f97316' : item.type === 'success' ? '#10b981' : '#3b82f6';
            return (
              <View key={idx} style={[styles.insightCard, { borderColor: color + '30' }]}>
                <View style={[styles.insightIconBox, { backgroundColor: color + '15' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={24} color={color} />
                </View>
                <View style={styles.insightBody}>
                  <Text style={[styles.insightTitle, { color }]}>{item.title}</Text>
                  <Text style={styles.insightDesc}>{item.desc}</Text>
                </View>
              </View>
            );
          })
        )}

        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>{locale === 'es' ? 'Descarga de Reportes Consolidados' : 'Export System Reports'}</Text>
        <View style={styles.exportList}>
          <TouchableOpacity style={styles.exportRowBtn} onPress={() => exportToCSV('users')}>
            <MaterialCommunityIcons name="account-group" size={20} color="#fff" />
            <View style={styles.exportRowTextCol}>
              <Text style={styles.exportRowTitle}>{locale === 'es' ? 'Base de Usuarios' : 'Users Database'}</Text>
              <Text style={styles.exportRowSub}>{locale === 'es' ? 'Exportar registros, roles y nivel de verificación' : 'Export credentials, roles and verification status'}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportRowBtn} onPress={() => exportToCSV('listings')}>
            <MaterialCommunityIcons name="home-city" size={20} color="#fff" />
            <View style={styles.exportRowTextCol}>
              <Text style={styles.exportRowTitle}>{locale === 'es' ? 'Inventario de Alojamientos' : 'Accommodations Inventory'}</Text>
              <Text style={styles.exportRowSub}>{locale === 'es' ? 'Exportar precios, estado físico y fechas de carga' : 'Export price, vacancy status and upload timestamps'}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportRowBtn} onPress={() => exportToCSV('contracts')}>
            <MaterialCommunityIcons name="file-document" size={20} color="#fff" />
            <View style={styles.exportRowTextCol}>
              <Text style={styles.exportRowTitle}>{locale === 'es' ? 'Historial Contractual' : 'Contracts Ledger'}</Text>
              <Text style={styles.exportRowSub}>{locale === 'es' ? 'Exportar aprobaciones, estados y alojamientos vinculados' : 'Export contract logs, approved requests and link IDs'}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportRowBtn} onPress={() => exportToCSV('audit')}>
            <MaterialCommunityIcons name="clipboard-text-clock" size={20} color="#fff" />
            <View style={styles.exportRowTextCol}>
              <Text style={styles.exportRowTitle}>{locale === 'es' ? 'Bitácora de Auditoría' : 'Audit Timeline'}</Text>
              <Text style={styles.exportRowSub}>{locale === 'es' ? 'Exportar todas las acciones administrativas locales' : 'Export all administrator actions from local timeline'}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#555" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>{locale === 'es' ? 'Reportes y Analíticas' : 'Platform Analytics'}</Text>
      </View>

      {/* Date Filter Selection */}
      {activeTab !== 'complaints' && activeTab !== 'insights' && (
        <View style={styles.dateFilterContainer}>
          {['all', '30days', '7days'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.dateFilterChip, dateFilter === filter && { backgroundColor: accentColor }]}
              onPress={() => setDateFilter(filter as any)}
            >
              <Text style={[styles.dateFilterText, dateFilter === filter && { color: '#000', fontWeight: '700' }]}>
                {filter === 'all' ? (locale === 'es' ? 'Histórico' : 'All Time') :
                 filter === '30days' ? (locale === 'es' ? 'Últimos 30 días' : 'Last 30 days') :
                 (locale === 'es' ? 'Últimos 7 días' : 'Last 7 days')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Navigation Tab Bar */}
      <View style={styles.navBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navBarScroll}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab(tab);
                setSearch('');
              }}
            >
              <Text style={[styles.tabBtnText, activeTab === tab && { color: accentColor }]}>
                {translateType(tab)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Dynamic Content Rendering */}
      {loading && !refreshing ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.loadingText}>{locale === 'es' ? 'Cargando indicadores en caliente...' : 'Calculating real-time KPIs...'}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'accommodations' && renderAccommodations()}
          {activeTab === 'contracts' && renderContractsTab()}
          {activeTab === 'roommates' && renderRoommates()}
          {activeTab === 'complaints' && renderComplaints()}
          {activeTab === 'audit' && renderAudit()}
          {activeTab === 'insights' && renderInsights()}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  topBar: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#111' },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  
  // Date filter
  dateFilterContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, backgroundColor: '#070707', borderBottomWidth: 1, borderBottomColor: '#111' },
  dateFilterChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  dateFilterText: { color: '#888', fontSize: 11, fontWeight: '500' },

  // Nav tab bar
  navBar: { borderBottomWidth: 1, borderBottomColor: '#1a1a1a', backgroundColor: '#080808' },
  navBarScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  tabBtnActive: { borderColor: '#fff' },
  tabBtnText: { color: '#777', fontSize: 12, fontWeight: '600' },

  // Loader
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#666', fontSize: 13 },

  // Scroll Tab Views
  tabScroll: { flex: 1, padding: 16 },
  tabContentContainer: { flex: 1 },

  // Overview dashboard styles
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 12, letterSpacing: 0.3 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  kpiCard: { flex: 1, minWidth: '45%', backgroundColor: '#111', borderRadius: 10, padding: 14, gap: 6, borderWidth: 1, borderColor: '#1a1a1a' },
  kpiVal: { fontSize: 20, fontWeight: '800', color: '#fff' },
  kpiLabel: { fontSize: 11, color: '#666', fontWeight: '500' },

  // Responsive Chart Card
  chartCard: { backgroundColor: '#111', borderRadius: 12, padding: 16, borderColor: '#1a1a1a', marginBottom: 16, borderWidth: 1 },
  chartTitle: { fontSize: 13, fontWeight: '700', color: '#ccc', marginBottom: 16 },
  
  // Bar Chart styles
  emptyChartText: { color: '#444', textAlign: 'center', paddingVertical: 20, fontSize: 13 },
  barChartContainer: { flexDirection: 'row', height: 120, alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 10 },
  barCol: { alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' },
  barValText: { color: '#888', fontSize: 9, marginBottom: 4, fontWeight: '600' },
  barFill: { width: 14, borderRadius: 4, minHeight: 4 },
  barLabel: { color: '#555', fontSize: 9, marginTop: 6, width: '100%', textAlign: 'center' },

  // Distribution progress bar style
  distributionContainer: { gap: 6 },
  distRow: { flexDirection: 'row', justifyContent: 'space-between' },
  distLabel: { color: '#888', fontSize: 12 },
  distVal: { color: '#fff', fontSize: 12, fontWeight: '700' },
  progressBarBg: { height: 7, backgroundColor: '#161616', borderRadius: 4, width: '100%', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  // Stacked bar chart
  donutPlaceholder: { gap: 12 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bullet: { width: 8, height: 8, borderRadius: 4 },
  bulletLabel: { color: '#777', fontSize: 11 },
  stackedBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', width: '100%' },

  // Table row styles (lists)
  searchBarRow: { flexDirection: 'row', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', backgroundColor: '#070707', alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 8, paddingHorizontal: 12, height: 38, borderWidth: 1, borderColor: '#1c1c1e' },
  searchInput: { flex: 1, color: '#fff', fontSize: 13, padding: 0 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', borderWidth: 1, borderColor: '#222', borderRadius: 8, height: 38, paddingHorizontal: 12, gap: 6 },
  exportText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  
  tableRowCard: { backgroundColor: '#111', padding: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', gap: 4 },
  rowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rowTitle: { color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 },
  rowSub: { color: '#888', fontSize: 12 },
  rowFooter: { color: '#555', fontSize: 10, marginTop: 2 },

  // Complaints / Denuncias (Abuse Reports) - Preserved
  complaintFilterRow: { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', flexWrap: 'wrap', backgroundColor: '#070707' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#222', backgroundColor: '#111' },
  filterText: { color: '#888', fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  listContent: { padding: 16, gap: 12 },
  card: { backgroundColor: '#111', borderRadius: 12, padding: 16, gap: 10, borderWidth: 1, borderColor: '#1a1a1a', margin: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardHeaderLeft: { flex: 1, gap: 3 },
  reason: { color: '#fff', fontWeight: '600', fontSize: 15 },
  meta: { color: '#555', fontSize: 11 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  description: { color: '#aa1111', fontSize: 13, lineHeight: 18 }, // Coloreado especial para reportes
  noDesc: { color: '#333', fontSize: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  date: { color: '#444', fontSize: 11 },
  actions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  actionText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  emptyText: { textAlign: 'center', color: '#555', marginTop: 60, fontSize: 14 },

  // Insight Cards
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  insightCard: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, padding: 16, gap: 14, marginBottom: 12, borderWidth: 1, alignItems: 'flex-start' },
  insightIconBox: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  insightBody: { flex: 1, gap: 4 },
  insightTitle: { fontSize: 14, fontWeight: '800' },
  insightDesc: { color: '#888', fontSize: 12, lineHeight: 18 },

  // Export list
  exportList: { gap: 10, marginTop: 12 },
  exportRowBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, padding: 16, gap: 14, borderWidth: 1, borderColor: '#1a1a1a' },
  exportRowTextCol: { flex: 1, gap: 4 },
  exportRowTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  exportRowSub: { color: '#666', fontSize: 11 },
});
