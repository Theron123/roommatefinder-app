import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { mockCurrentUserConfig } from '@/lib/mockData';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const checkProfileAndRedirect = async (userId: string) => {
    // [MOCK] Bypassing Supabase check
    if (mockCurrentUserConfig.profile) {
      router.replace('/(tabs)');
    } else {
      router.replace('/preferences');
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);

    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert('Registration Failed', error.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        Alert.alert('Account Created!', 'Please check your inbox to verify your email address.');
        setIsRegistering(false);
        setLoading(false);
        return;
      }

      await checkProfileAndRedirect(data.user!.id);
      setLoading(false);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert('Login Failed', error.message);
        setLoading(false);
        return;
      }

      await checkProfileAndRedirect(data.user!.id);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Roommate Finder</Text>

      <TextInput
        placeholder="Email address"
        placeholderTextColor="#999"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#999"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <Pressable
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleAuth}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isRegistering ? 'Create Account' : 'Sign In'}
          </Text>
        )}
      </Pressable>

      <Pressable
        style={styles.toggleButton}
        onPress={() => setIsRegistering(!isRegistering)}
        disabled={loading}
      >
        <Text style={styles.toggleButtonText}>
          {isRegistering
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up here"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
