import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  icon: string;
  color: string;
  unread: boolean;
};

export default function CompanyNotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n1',
      title: 'Nueva Postulación Recibida',
      body: 'Mateo Díaz envió una solicitud de arrendamiento para Studio Flat Polanco.',
      time: 'Hace 2 horas',
      icon: 'clipboard-account',
      color: '#ff9f0a',
      unread: true,
    },
    {
      id: 'n2',
      title: 'Contrato Completado con Éxito',
      body: 'Sofía Vergara firmó el contrato de arrendamiento digital para Loft Duplex Roma.',
      time: 'Ayer',
      icon: 'file-check-outline',
      color: '#49C788',
      unread: true,
    },
    {
      id: 'n3',
      title: 'Propiedad Aprobada por el Sistema',
      body: 'Tu anuncio "Premium Suite Condesa" ha sido verificado y está activo en búsquedas.',
      time: 'Hace 2 días',
      icon: 'check-decagram-outline',
      color: '#3b82f6',
      unread: false,
    },
    {
      id: 'n4',
      title: 'Visita Programada para Mañana',
      body: 'Carlos Mendoza agendó una visita para Premium Suite Condesa a las 11:00 AM.',
      time: 'Hace 3 días',
      icon: 'calendar-clock',
      color: '#a855f7',
      unread: false,
    },
  ]);

  const { locale } = useTranslation();
  const { accentColor } = useAdminTheme();

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const handleToggleRead = (id: string) => {
    setNotifications(
      notifications.map(n => n.id === id ? { ...n, unread: !n.unread } : n)
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.pageTitle}>{locale === 'es' ? 'Alertas Comerciales' : 'PMS Notifications'}</Text>
            <Text style={styles.pageSubtitle}>
              {locale === 'es' ? 'Recibe avisos sobre visitas, contratos y postulaciones.' : 'Receive alerts on showing schedules, leases, and applications.'}
            </Text>
          </View>
          {notifications.some(n => n.unread) && (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text style={[styles.markReadText, { color: accentColor }]}>
                {locale === 'es' ? 'Leer todo' : 'Mark all read'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, item.unread && { backgroundColor: 'rgba(255,255,255,0.015)', borderColor: accentColor + '30' }]} 
            onPress={() => handleToggleRead(item.id)}
          >
            <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
              <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardTitle, item.unread && { fontWeight: '700' }]}>{item.title}</Text>
                {item.unread && (
                  <View style={[styles.unreadDot, { backgroundColor: accentColor }]} />
                )}
              </View>
              <Text style={styles.cardBody}>{item.body}</Text>
              <Text style={styles.cardTime}>{item.time}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bell-off-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>
              {locale === 'es' ? 'No tienes alertas pendientes' : 'No alerts available'}
            </Text>
          </View>
        }
      />
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  markReadText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#12121a',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardBody: {
    color: '#888',
    fontSize: 12,
    lineHeight: 16,
  },
  cardTime: {
    color: '#444',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
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
});
