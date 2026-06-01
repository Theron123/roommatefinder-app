import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

const VERIFY_CONFIG: any = {
  identity: {
    title: 'Verify Identity',
    icon: 'face-recognition',
    desc: 'We will need a clear photo of your official ID (Passport, National ID) and a real-time selfie to confirm your identity.',
    btnLabel: 'Take Document Photo',
    color: '#0A84FF'
  },
  university: {
    title: 'University Verification',
    icon: 'school',
    desc: 'Enter your institutional email (.edu or similar). We will send a verification code to confirm you study there.',
    btnLabel: 'Send Link',
    color: '#34C759'
  },
  workplace: {
    title: 'Verify Employment',
    icon: 'briefcase',
    desc: 'Connect your corporate email or upload a recent employment certificate to get the Professional badge.',
    btnLabel: 'Send Code to Email',
    color: '#5E5CE6'
  },
  income: {
    title: 'Verify Income',
    icon: 'cash-multiple',
    desc: 'Upload your most recent pay stub or bank statement. This information is 100% private and will only be used to confirm solvency.',
    btnLabel: 'Upload PDF Document',
    color: '#FF9F0A'
  },
  social: {
    title: 'Connect Social Media',
    icon: 'instagram',
    desc: 'Link your Instagram or Facebook account to show you are a real person and build greater trust in the community.',
    btnLabel: 'Connect with Instagram',
    color: '#E1306C'
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
        submitVerification();
      }
    } else if (type === 'social') {
      submitVerification();
    } else {
      if (!inputValue.includes('@')) {
        Alert.alert('Error', 'Please enter a valid email address.');
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
      if (type === 'social') updateData.is_social_verified = true;

      // Increase trust score
      const { data: profile } = await supabase.from('profiles').select('trust_score').eq('id', session.user.id).single();
      const newScore = Math.min((profile?.trust_score || 20) + 20, 100);
      updateData.trust_score = newScore;

      await supabase.from('profiles').update(updateData).eq('id', session.user.id);

      Alert.alert(
        'Request Sent!',
        'For demonstration purposes, your verification has been approved instantly.',
        [{ text: 'Awesome', onPress: () => router.back() }]
      );

    } catch (e) {
      Alert.alert('Error', 'There was a problem submitting the verification.');
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
          <Text style={s.secureText}>256-bit encryption. Your data is not shared.</Text>
        </View>

        {(type === 'university' || type === 'workplace') && (
          <View style={s.inputWrapper}>
            <Text style={s.inputLabel}>Email address</Text>
            <TextInput
              style={s.input}
              placeholder={type === 'university' ? "your_name@university.edu" : "your_name@company.com"}
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
          By continuing, you agree to our <Text style={{ textDecorationLine: 'underline' }}>Biometric and Document Privacy Terms</Text>.
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
  iconBox: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  desc: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10, marginBottom: 24 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 8, marginBottom: 40 },
  secureText: { color: '#34C759', fontSize: 12, fontWeight: '600' },
  
  inputWrapper: { width: '100%', marginBottom: 20 },
  inputLabel: { color: '#888', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: '#111', color: '#fff', padding: 16, borderRadius: 20, fontSize: 16, borderWidth: 1, borderColor: '#333' },

  footer: { padding: 24, paddingBottom: 40 },
  mainBtn: { padding: 18, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footerNote: { color: '#555', fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 }
});
