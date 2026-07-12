import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';

type CalendarEvent = {
  id: string;
  type: 'visit' | 'move_in' | 'expiration' | 'availability' | 'reminder';
  title: string;
  description: string;
  date: string;
  time?: string;
  apartment: string;
  color: string;
};

export default function CompanyCalendarScreen() {
  const [filterType, setFilterType] = useState<string>('all');
  const { locale } = useTranslation();
  const { accentColor } = useAdminTheme();

  const events: CalendarEvent[] = [
    {
      id: 'e1',
      type: 'visit',
      title: 'Visita de Propiedad: Carlos Mendoza',
      description: 'Mostrar áreas comunes y cochera del departamento.',
      date: '2026-07-15',
      time: '11:00 AM',
      apartment: 'Premium Suite Condesa',
      color: '#3b82f6',
    },
    {
      id: 'e2',
      type: 'move_in',
      title: 'Fecha de Mudanza: Sofía Vergara',
      description: 'Entrega de llaves y firma física del reglamento.',
      date: '2026-07-18',
      time: '09:30 AM',
      apartment: 'Loft Duplex Roma',
      color: '#49C788',
    },
    {
      id: 'e3',
      type: 'expiration',
      title: 'Expiración de Contrato: Juan Pérez',
      description: 'Fin del contrato forzoso. Enviar propuesta de renovación.',
      date: '2026-07-28',
      apartment: 'Studio Flat Polanco',
      color: '#ff4444',
    },
    {
      id: 'e4',
      type: 'availability',
      title: 'Liberación de Unidad',
      description: 'Mantenimiento preventivo tras desocupación.',
      date: '2026-07-22',
      apartment: 'Loft Condesa Vista Parque',
      color: '#06b6d4',
    },
    {
      id: 'e5',
      type: 'reminder',
      title: 'Seguimiento de Postulación: Mateo Díaz',
      description: 'Revisar si ya subió la documentación del aval bancario.',
      date: '2026-07-14',
      time: '04:00 PM',
      apartment: 'Studio Flat Polanco',
      color: '#ff9f0a',
    },
  ];

  const filteredEvents = events.filter((e) => {
    if (filterType === 'all') return true;
    return e.type === filterType;
  });

  const getEventIcon = (type: CalendarEvent['type']) => {
    const icons = {
      visit: 'eye-outline',
      move_in: 'truck-delivery-outline',
      expiration: 'file-clock-outline',
      availability: 'home-export-outline',
      reminder: 'bell-outline',
    };
    return icons[type] || 'calendar';
  };

  const handleEventPress = (event: CalendarEvent) => {
    Alert.alert(
      event.title,
      `${locale === 'es' ? 'Fecha:' : 'Date:'} ${event.date} ${event.time ? `(${event.time})` : ''}\n\n${locale === 'es' ? 'Departamento:' : 'Unit:'} ${event.apartment}\n\n${event.description}`
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{locale === 'es' ? 'Agenda Comercial' : 'Property Calendar'}</Text>
        <Text style={styles.pageSubtitle}>
          {locale === 'es' ? 'Monitorea visitas programadas, mudanzas y alertas de contratos.' : 'Track property showing schedules, tenant move-ins, and contract alerts.'}
        </Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
        {[
          { key: 'all', label: 'Todo', labelEn: 'All', color: accentColor },
          { key: 'visit', label: 'Visitas', labelEn: 'Visits', color: '#3b82f6' },
          { key: 'move_in', label: 'Mudanzas', labelEn: 'Move-ins', color: '#49C788' },
          { key: 'expiration', label: 'Expiraciones', labelEn: 'Expirations', color: '#ff4444' },
          { key: 'availability', label: 'Disponibilidad', labelEn: 'Availability', color: '#06b6d4' },
          { key: 'reminder', label: 'Recordatorios', labelEn: 'Reminders', color: '#ff9f0a' },
        ].map((btn) => {
          const active = filterType === btn.key;
          return (
            <TouchableOpacity
              key={btn.key}
              style={[styles.filterChip, active && { backgroundColor: btn.color + '15', borderColor: btn.color }]}
              onPress={() => setFilterType(btn.key)}
            >
              <Text style={[styles.filterChipText, active && { color: btn.color, fontWeight: '700' }]}>
                {locale === 'es' ? btn.label : btn.labelEn}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Agenda list */}
      <ScrollView style={styles.scrollList} contentContainerStyle={{ paddingBottom: 40 }}>
        {filteredEvents.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.eventCard, { borderLeftColor: item.color }]}
            onPress={() => handleEventPress(item)}
          >
            <View style={styles.eventCardHeader}>
              <View style={styles.eventAptContainer}>
                <MaterialCommunityIcons name="office-building" size={14} color="#666" />
                <Text style={styles.eventApt}>{item.apartment}</Text>
              </View>
              <Text style={styles.eventDate}>
                {item.date} {item.time && `| ${item.time}`}
              </Text>
            </View>

            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>

            <View style={styles.eventFooter}>
              <View style={[styles.typeBadge, { backgroundColor: item.color + '15' }]}>
                <MaterialCommunityIcons name={getEventIcon(item.type) as any} size={12} color={item.color} style={{ marginRight: 4 }} />
                <Text style={[styles.typeBadgeText, { color: item.color }]}>
                  {item.type.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#444" />
            </View>
          </TouchableOpacity>
        ))}

        {filteredEvents.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>
              {locale === 'es' ? 'No hay eventos en esta categoría' : 'No scheduled events'}
            </Text>
          </View>
        )}
      </ScrollView>
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
  filterScroll: {
    maxHeight: 52,
    marginVertical: 12,
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
    height: 40,
  },
  filterChip: {
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 32,
    justifyContent: 'center',
  },
  filterChipText: {
    color: '#666',
    fontSize: 11,
    fontWeight: '600',
  },
  scrollList: {
    paddingHorizontal: 20,
  },
  eventCard: {
    backgroundColor: '#12121a',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventAptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventApt: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  eventDate: {
    color: '#555',
    fontSize: 10,
    fontWeight: '600',
  },
  eventTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  eventDesc: {
    color: '#888',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
    paddingTop: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
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
