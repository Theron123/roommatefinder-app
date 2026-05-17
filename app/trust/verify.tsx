import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

const VERIFY_CONFIG: any = {
  identity: {
    title: 'Verificar Identidad',
    icon: 'face-recognition',
    desc: 'Necesitaremos una foto clara de tu identificación oficial (INE, Pasaporte) y una selfie en tiempo real para confirmar tu identidad.',
    btnLabel: 'Tomar Foto del Documento',
    color: '#0A84FF'
  },
  university: {
    title: 'Verificación Universitaria',
    icon: 'school',
    desc: 'Ingresa tu correo institucional (.edu o similar). Te enviaremos un código de verificación para confirmar que estudias allí.',
    btnLabel: 'Enviar Enlace',
    color: '#34C759'
  },
  workplace: {
    title: 'Verificar Trabajo',
    icon: 'briefcase',
    desc: 'Conecta tu correo corporativo o sube una constancia de trabajo reciente para obtener el badge de Profesional.',
    btnLabel: 'Enviar Código al Correo',
    color: '#5E5CE6'
  },
  income: {
    title: 'Verificar Ingresos',
    icon: 'cash-multiple',
    desc: 'Sube tu recibo de nómina más reciente o estado de cuenta. Esta información es 100% privada y solo se usará para confirmar solvencia.',
    btnLabel: 'Subir Documento PDF',
    color: '#FF9F0A'
  }
};

export default function VerificationWizard() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const config = VERIFY_CONFIG[type] || VERIFY_CONFIG.identity;
  
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const handleAction = async () => {
    if (type === 'identity' || type === 'income') {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
        submitVerification();
      }
    } else {
      if (!inputValue.includes('@')) {
        Alert.alert('Error', 'Ingresa un correo electrónico válido.');
        return;
      }
      submitVerification();
    }
  };

  const submitVerification = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Create verification request record
      await supabase.from('verifications').insert({
        user_id: session.user.id,
        type: type,
        status: 'pending',
        metadata: { input: inputValue, mock_image: imageUri ? true : false }
      });

      // Simulate auto-approval for demo purposes
      const updateData: any = {};
      if (type === 'identity') updateData.is_identity_verified = true;
      if (type === 'university') updateData.is_university_verified = true;
      if (type === 'workplace') updateData.is_workplace_verified = true;
      if (type === 'income') updateData.is_income_verified = true;

      // Increase trust score
      const { data: profile } = await supabase.from('profiles').select('trust_score').eq('id', session.user.id).single();
      const newScore = Math.min((profile?.trust_score || 20) + 20, 100);
      updateData.trust_score = newScore;

      await supabase.from('profiles').update(updateData).eq('id', session.user.id);

      Alert.alert(
        '¡Solicitud Enviada!',
        'Para propósitos de esta demostración, tu verificación ha sido aprobada instantáneamente.',
        [{ text: 'Genial', onPress: () => router.back() }]
      );

    } catch (e) {
      Alert.alert('Error', 'Hubo un problema al enviar la verificación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="close" size={24} color="#fff" />
        </Pressable>
      </View>

      <View style={s.content}>
        <View style={[s.iconBox, { backgroundColor: config.color + '22' }]}>
          <MaterialCommunityIcons name={config.icon} size={48} color={config.color} />
        </View>
        <Text style={s.title}>{config.title}</Text>
        <Text style={s.desc}>{config.desc}</Text>

        <View style={s.secureBadge}>
          <MaterialCommunityIcons name="lock" size={16} color="#34C759" />
          <Text style={s.secureText}>Encriptación 256-bit. Tus datos no se comparten.</Text>
        </View>

        {(type === 'university' || type === 'workplace') && (
          <View style={s.inputWrapper}>
            <Text style={s.inputLabel}>Correo electrónico</Text>
            <TextInput
              style={s.input}
              placeholder={type === 'university' ? "tu_nombre@universidad.edu" : "tu_nombre@empresa.com"}
              placeholderTextColor="#555"
              keyboardType="email-address"
              autoCapitalize="none"
              value={inputValue}
              onChangeText={setInputValue}
            />
          </View>
        )}
      </View>

      <View style={s.footer}>
        <Pressable 
          style={[s.mainBtn, { backgroundColor: config.color }]} 
          onPress={handleAction}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.mainBtnText}>{config.btnLabel}</Text>}
        </Pressable>
        <Text style={s.footerNote}>
          Al continuar, aceptas nuestros <Text style={{ textDecorationLine: 'underline' }}>Términos de Privacidad Biómetrica y Documental</Text>.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', marginTop: -60 },
  iconBox: { width: 100, height: 100, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  desc: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10, marginBottom: 24 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 8, marginBottom: 40 },
  secureText: { color: '#34C759', fontSize: 12, fontWeight: '600' },
  
  inputWrapper: { width: '100%', marginBottom: 20 },
  inputLabel: { color: '#888', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: '#111', color: '#fff', padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#333' },

  footer: { padding: 24, paddingBottom: 40 },
  mainBtn: { padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footerNote: { color: '#555', fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 }
});
