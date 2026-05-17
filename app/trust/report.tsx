import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View, Pressable, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const REPORT_REASONS = [
  { id: 'scam', label: 'Estafa o Fraude Financiero', icon: 'currency-usd-off' },
  { id: 'fake_profile', label: 'Perfil Falso o Catfishing', icon: 'account-cancel' },
  { id: 'inappropriate', label: 'Mensajes Inapropiados / Acoso', icon: 'message-alert' },
  { id: 'spam', label: 'Spam o Publicidad', icon: 'bullhorn-outline' },
  { id: 'other', label: 'Otro', icon: 'dots-horizontal' }
];

export default function ReportProfile() {
  const { userId, userName } = useLocalSearchParams<{ userId: string, userName: string }>();
  
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Por favor selecciona un motivo para el reporte.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Create report
      await supabase.from('user_reports').insert({
        reporter_id: session.user.id,
        reported_id: userId,
        reason: selectedReason,
        description: description
      });

      // Optional: Ask to block user
      Alert.alert(
        'Reporte Enviado',
        'Gracias por mantener la comunidad segura. Nuestro equipo de moderación revisará esto pronto. ¿Deseas bloquear a este usuario?',
        [
          { text: 'No', style: 'cancel', onPress: () => router.back() },
          { 
            text: 'Sí, Bloquear', 
            style: 'destructive',
            onPress: async () => {
              await supabase.from('user_blocks').insert({ blocker_id: session.user.id, blocked_id: userId });
              Alert.alert('Bloqueado', 'El usuario ya no podrá contactarte.');
              router.back();
            } 
          }
        ]
      );

    } catch (e) {
      Alert.alert('Error', 'Hubo un problema al enviar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#FF453A22', '#000']} style={s.headerGradient}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>Reportar Perfil</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.targetCard}>
          <MaterialCommunityIcons name="shield-alert" size={32} color="#FF453A" />
          <View>
            <Text style={s.targetTitle}>Estás reportando a</Text>
            <Text style={s.targetName}>{userName || 'este usuario'}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.sectionLabel}>MOTIVO DEL REPORTE</Text>
        <View style={s.reasonsGrid}>
          {REPORT_REASONS.map(reason => (
            <Pressable 
              key={reason.id} 
              style={[s.reasonBtn, selectedReason === reason.id && s.reasonBtnActive]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <MaterialCommunityIcons 
                name={reason.icon as any} 
                size={20} 
                color={selectedReason === reason.id ? '#FF453A' : '#888'} 
              />
              <Text style={[s.reasonText, selectedReason === reason.id && s.reasonTextActive]}>
                {reason.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.sectionLabel}>DETALLES ADICIONALES (OPCIONAL)</Text>
        <TextInput
          style={s.input}
          placeholder="Proporciona más contexto o detalles sobre la situación..."
          placeholderTextColor="#555"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

        <View style={s.safetyInfo}>
          <MaterialCommunityIcons name="information" size={16} color="#888" />
          <Text style={s.safetyText}>
            Tu reporte es 100% anónimo. El usuario no será notificado sobre quién realizó el reporte.
          </Text>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <Pressable 
          style={[s.mainBtn, !selectedReason && { opacity: 0.5 }]} 
          onPress={handleSubmit}
          disabled={loading || !selectedReason}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.mainBtnText}>Enviar Reporte</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerGradient: { paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  
  targetCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', marginHorizontal: 20, padding: 16, borderRadius: 16, gap: 12, borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.3)' },
  targetTitle: { color: '#888', fontSize: 12, fontWeight: '600' },
  targetName: { color: '#fff', fontSize: 18, fontWeight: '800' },

  scroll: { padding: 20 },
  sectionLabel: { color: '#555', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12, marginTop: 10 },
  
  reasonsGrid: { gap: 10, marginBottom: 20 },
  reasonBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 16, borderRadius: 12, gap: 12, borderWidth: 1, borderColor: '#111' },
  reasonBtnActive: { borderColor: '#FF453A', backgroundColor: 'rgba(255, 69, 58, 0.05)' },
  reasonText: { color: '#aaa', fontSize: 14, fontWeight: '500' },
  reasonTextActive: { color: '#fff', fontWeight: '700' },

  input: { backgroundColor: '#111', color: '#fff', padding: 16, borderRadius: 12, fontSize: 14, minHeight: 120, textAlignVertical: 'top' },
  
  safetyInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 24, padding: 12, backgroundColor: '#0d1117', borderRadius: 8 },
  safetyText: { color: '#888', fontSize: 12, flex: 1, lineHeight: 18 },

  footer: { padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: '#111' },
  mainBtn: { backgroundColor: '#FF453A', padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
