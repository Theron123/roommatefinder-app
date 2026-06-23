import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    Modal,
    TouchableOpacity,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { validateNationalId } from 'idnumbers';

const COUNTRIES = [
  { code: 'CRI', flag: '🇨🇷', name: 'Costa Rica', placeholder: '9 digits' },
  { code: 'COL', flag: '🇨🇴', name: 'Colombia', placeholder: 'Cedula (6-10 digits)' },
  { code: 'MEX', flag: '🇲🇽', name: 'Mexico', placeholder: 'CURP (18 chars)' },
  { code: 'USA', flag: '🇺🇸', name: 'USA', placeholder: 'SSN / ID' },
  { code: 'CAN', flag: '🇨🇦', name: 'Canada', placeholder: 'SIN / ID' },
  { code: 'PAN', flag: '🇵🇦', name: 'Panama', placeholder: 'Cedula' },
  { code: 'ESP', flag: '🇪🇸', name: 'España', placeholder: 'DNI / NIE' },
  { code: 'ARG', flag: '🇦🇷', name: 'Argentina', placeholder: 'DNI' },
  { code: 'CHL', flag: '🇨🇱', name: 'Chile', placeholder: 'RUT' },
  { code: 'PER', flag: '🇵🇪', name: 'Perú', placeholder: 'DNI' },
  { code: 'ECU', flag: '🇪🇨', name: 'Ecuador', placeholder: 'Cédula' },
  { code: 'BRA', flag: '🇧🇷', name: 'Brasil', placeholder: 'CPF' },
  { code: 'URY', flag: '🇺🇾', name: 'Uruguay', placeholder: 'Cédula' },
  { code: 'VEN', flag: '🇻🇪', name: 'Venezuela', placeholder: 'Cédula' },
  { code: 'DOM', flag: '🇩🇴', name: 'Rep. Dominicana', placeholder: 'Cédula' },
  { code: 'GTM', flag: '🇬🇹', name: 'Guatemala', placeholder: 'DPI' },
  { code: 'HND', flag: '🇭🇳', name: 'Honduras', placeholder: 'DNI' },
  { code: 'SLV', flag: '🇸🇻', name: 'El Salvador', placeholder: 'DUI' },
  { code: 'NIC', flag: '🇳🇮', name: 'Nicaragua', placeholder: 'Cédula' },
  { code: 'GBR', flag: '🇬🇧', name: 'UK', placeholder: 'NINO / ID' },
  { code: 'FRA', flag: '🇫🇷', name: 'France', placeholder: 'ID' },
  { code: 'DEU', flag: '🇩🇪', name: 'Germany', placeholder: 'ID' },
  { code: 'ITA', flag: '🇮🇹', name: 'Italy', placeholder: 'ID' },
];

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('CRI');
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];

  const handleSignUp = async () => {
    setMessage({ text: '', type: '' });
    if (!email || !password || !name || !nationalId || !countryCode) {
      setMessage({ text: 'Please fill in all fields.', type: 'error' });
      return;
    }

    try {
      let isValid = false;
      const cleanCountry = countryCode.trim().toUpperCase();
      const cleanId = nationalId.trim();

      if (cleanCountry === 'CRI') {
        // Costa Rica cedula format: 9 digits
        isValid = /^\d{9}$/.test(cleanId);
      } else {
        const validation = validateNationalId(cleanCountry, cleanId);
        if (validation.errorMessage && validation.errorMessage.includes('Unsupported country code')) {
          // Generic fallback for unsupported countries (5 to 20 alphanumeric chars)
          isValid = /^[A-Z0-9-]{5,20}$/i.test(cleanId);
        } else {
          isValid = validation.isValid;
        }
      }

      if (!isValid) {
        setMessage({ text: 'Invalid National ID for the selected country.', type: 'error' });
        return;
      }
    } catch {
      setMessage({ text: 'Error validating ID.', type: 'error' });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
          country_code: countryCode.trim().toUpperCase(),
          national_id: nationalId.trim(),
        }
      }
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
      setLoading(false);
      return;
    }

    if (!data.session) {
      setMessage({ text: 'Account created! Please check your inbox to verify your email.', type: 'success' });
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        name: name.trim(),
        age: 20,
      });
      if (profileError) {
        console.error('Error al crear perfil en la base de datos:', profileError.message);
      }

      const { error: verificationError } = await supabase.from('verifications').insert({
        user_id: data.user.id,
        type: 'identity',
        status: 'pending',
        metadata: {
          country_code: countryCode.trim().toUpperCase(),
          national_id: nationalId.trim(),
        }
      });
      if (verificationError) {
        console.error('Error al guardar datos de verificación:', verificationError.message);
      }
    }

    setMessage({ text: 'Account created successfully! Redirecting...', type: 'success' });
    // New signups always go through role selection
    setTimeout(() => {
      router.replace('/role-select');
      setLoading(false);
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Roommate Finder</Text>

        {message.text ? (
          <View style={[styles.messageBox, message.type === 'error' ? styles.messageBoxError : styles.messageBoxSuccess]}>
            <Text style={[styles.messageText, message.type === 'error' ? styles.messageTextError : styles.messageTextSuccess]}>
              {message.text}
            </Text>
          </View>
        ) : null}

        <TextInput
          placeholder="Full Name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <View style={styles.idRow}>
          <Pressable 
            style={[styles.input, styles.countrySelector]} 
            onPress={() => setShowCountryPicker(true)}
          >
            <Text style={styles.countrySelectorText}>{selectedCountry.flag}</Text>
            <IconSymbol name="chevron.down" size={14} color="#999" />
          </Pressable>
          <TextInput
            placeholder={`ID / ${selectedCountry.placeholder}`}
            placeholderTextColor="#999"
            value={nationalId}
            onChangeText={setNationalId}
            style={[styles.input, styles.idInput]}
          />
        </View>

        <Modal visible={showCountryPicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <ScrollView>
                {COUNTRIES.map((c) => (
                  <TouchableOpacity 
                    key={c.code} 
                    style={styles.countryOption}
                    onPress={() => {
                      setCountryCode(c.code);
                      setShowCountryPicker(false);
                    }}
                  >
                    <Text style={styles.countryOptionFlag}>{c.flag}</Text>
                    <Text style={styles.countryOptionName}>{c.name}</Text>
                    {countryCode === c.code && (
                      <IconSymbol name="checkmark" size={18} color="#49C788" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Pressable style={styles.modalCloseBtn} onPress={() => setShowCountryPicker(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <TextInput
          placeholder="Email address"
          placeholderTextColor="#999"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            style={styles.passwordInput}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} hitSlop={8}>
            <IconSymbol name={showPassword ? "eye.slash.fill" : "eye.fill"} size={20} color="#999" />
          </Pressable>
        </View>

        <Pressable
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.toggleButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.toggleButtonText}>
            Already have an account? <Text style={styles.blueText}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    color: '#fff',
  },
  idRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countrySelector: {
    flex: 0.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  countrySelectorText: {
    fontSize: 22,
  },
  idInput: {
    flex: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: '70%',
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  countryOptionFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryOptionName: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  modalCloseBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 8,
  },
  modalCloseText: {
    color: '#fff',
    fontWeight: '600',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    color: '#fff',
  },
  eyeIcon: {
    padding: 14,
  },
  button: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#bbb',
    fontSize: 14,
  },
  blueText: {
    color: '#3b82f6', // Bright blue
    fontWeight: '600',
  },
  messageBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  messageBoxError: {
    backgroundColor: '#0a1a12',
    borderColor: '#ff4444',
  },
  messageBoxSuccess: {
    backgroundColor: '#0a1a0a',
    borderColor: '#00C9A7',
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
  },
  messageTextError: {
    color: '#ff4444',
  },
  messageTextSuccess: {
    color: '#00C9A7',
  },
});
