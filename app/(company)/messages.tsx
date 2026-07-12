import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from '../../context/LanguageContext';
import { useAdminTheme } from '../../context/AdminThemeContext';

type ChatThread = {
  id: string;
  sender: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  archived: boolean;
  apartment: string;
};

const TEMPLATES = [
  { key: 't1', title: 'Agendar Visita', text: 'Hola! Nos encantaría mostrarte el departamento. ¿Qué día de esta semana te queda mejor para coordinar una visita?' },
  { key: 't2', title: 'Confirmar Requisitos', text: 'Hola, gracias por tu interés. Para continuar con la postulación solicitamos identificación oficial, comprobante de ingresos de los últimos 3 meses y un aval bancario.' },
  { key: 't3', title: 'Apartamento Arrendado', text: 'Hola. Agradecemos mucho tu postulación, pero te informamos que la unidad ya ha sido arrendada. Te avisaremos si liberamos otra similar.' },
];

export default function CompanyMessagesScreen() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'archived'>('inbox');
  const [threads, setTracks] = useState<ChatThread[]>([
    { id: '1', sender: 'Carlos Mendoza', avatar: 'C', lastMessage: 'Me gustaría visitar el departamento el miércoles por la tarde, ¿es posible?', time: '2:15 PM', unread: true, archived: false, apartment: 'Premium Suite Condesa' },
    { id: '2', sender: 'Mateo Díaz', avatar: 'M', lastMessage: 'Claro, subiré el comprobante de ingresos hoy mismo.', time: 'Ayer', unread: false, archived: false, apartment: 'Studio Flat Polanco' },
    { id: '3', sender: 'Sofía Vergara', avatar: 'S', lastMessage: 'Gracias por enviarme la copia del contrato activo.', time: 'Hace 3 días', unread: false, archived: true, apartment: 'Loft Duplex Roma' },
  ]);

  // Quick reply modal
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [replyText, setReplyText] = useState('');

  const { locale } = useTranslation();
  const { accentColor } = useAdminTheme();

  const handleOpenChat = (thread: ChatThread) => {
    setSelectedThread(thread);
    setReplyText('');
    setModalVisible(true);
  };

  const handleSend = () => {
    if (!replyText.trim()) return;
    Alert.alert(locale === 'es' ? 'Mensaje Enviado' : 'Message Sent', replyText);
    
    // Update thread unread status
    if (selectedThread) {
      setTracks(
        threads.map(t => t.id === selectedThread.id ? { ...t, unread: false, lastMessage: `Tú: ${replyText.trim()}`, time: 'Ahora' } : t)
      );
    }
    setModalVisible(false);
  };

  const handleArchive = (id: string) => {
    setTracks(
      threads.map(t => t.id === id ? { ...t, archived: !t.archived } : t)
    );
  };

  const selectTemplate = (text: string) => {
    setReplyText(text);
  };

  const filteredThreads = threads.filter(t => activeTab === 'inbox' ? !t.archived : t.archived);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{locale === 'es' ? 'Bandeja de Mensajes PMS' : 'PMS Inbox'}</Text>
        <Text style={styles.pageSubtitle}>
          {locale === 'es' ? 'Responde a postulantes e interesados de forma rápida.' : 'Reply to applicants and leads in real time.'}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'inbox' && { borderBottomColor: accentColor }]}
          onPress={() => setActiveTab('inbox')}
        >
          <Text style={[styles.tabText, activeTab === 'inbox' && { color: accentColor, fontWeight: '700' }]}>
            {locale === 'es' ? 'Bandeja de Entrada' : 'Inbox'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'archived' && { borderBottomColor: accentColor }]}
          onPress={() => setActiveTab('archived')}
        >
          <Text style={[styles.tabText, activeTab === 'archived' && { color: accentColor, fontWeight: '700' }]}>
            {locale === 'es' ? 'Archivados' : 'Archived'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Message List */}
      <FlatList
        data={filteredThreads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.card, item.unread && { borderLeftColor: accentColor, borderLeftWidth: 3 }]}>
            <TouchableOpacity style={styles.cardMain} onPress={() => handleOpenChat(item)}>
              <View style={[styles.avatar, { borderColor: accentColor + '20' }]}>
                <Text style={[styles.avatarText, { color: accentColor }]}>{item.avatar}</Text>
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.senderName}>{item.sender}</Text>
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>
                <Text style={styles.aptLabel}>{item.apartment}</Text>
                <Text style={styles.messagePreview} numberOfLines={1}>{item.lastMessage}</Text>
              </View>
            </TouchableOpacity>
            
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleArchive(item.id)}>
                <MaterialCommunityIcons 
                  name={item.archived ? 'package-up' : 'package-down'} 
                  size={18} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="message-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>
              {locale === 'es' ? 'No hay mensajes en esta bandeja' : 'No messages found'}
            </Text>
          </View>
        }
      />

      {/* Chat Thread Modal */}
      {selectedThread && (
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{selectedThread.sender}</Text>
                  <Text style={styles.modalSub}>{selectedThread.apartment}</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>

              <View style={styles.chatArea}>
                {/* Last received bubble */}
                <View style={styles.receivedBubble}>
                  <Text style={styles.bubbleText}>{selectedThread.lastMessage}</Text>
                  <Text style={styles.bubbleTime}>{selectedThread.time}</Text>
                </View>
              </View>

              {/* Templates drawer */}
              <View style={styles.templatesContainer}>
                <Text style={styles.templatesLabel}>{locale === 'es' ? 'Respuestas Rápidas' : 'Quick Reply Templates'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatesScroll}>
                  {TEMPLATES.map(temp => (
                    <TouchableOpacity 
                      key={temp.key} 
                      style={styles.templateChip}
                      onPress={() => selectTemplate(temp.text)}
                    >
                      <Text style={styles.templateChipText}>{temp.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Input container */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={replyText}
                  onChangeText={setReplyText}
                  placeholder={locale === 'es' ? 'Escribe tu respuesta...' : 'Type a reply...'}
                  placeholderTextColor="#555"
                  multiline
                />
                <TouchableOpacity style={[styles.sendBtn, { backgroundColor: accentColor }]} onPress={handleSend}>
                  <MaterialCommunityIcons name="send" size={18} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  card: {
    backgroundColor: '#12121a',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  timeText: {
    color: '#444',
    fontSize: 10,
    fontWeight: '600',
  },
  aptLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '600',
  },
  messagePreview: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  cardActions: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionBtn: {
    padding: 6,
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
    height: '80%',
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
    fontSize: 15,
    fontWeight: '700',
  },
  modalSub: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  chatArea: {
    flex: 1,
    padding: 20,
    backgroundColor: '#07070c',
  },
  receivedBubble: {
    backgroundColor: '#161622',
    borderColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  bubbleText: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTime: {
    color: '#444',
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
    fontWeight: '600',
  },
  templatesContainer: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    backgroundColor: '#0c0c14',
  },
  templatesLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  templatesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  templateChip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  templateChipText: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
