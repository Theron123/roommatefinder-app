import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

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
  const [message, setMessage] = useState({ text: '', type: '' });

  const checkProfileAndRedirect = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (data && data.role) {
      router.replace('/(tabs)');
    } else {
      router.replace('/role-select');
    }
  };

  const handleSignIn = async () => {
    setMessage({ text: '', type: '' });
    if (!email || !password) {
      setMessage({ text: 'Please enter your email and password.', type: 'error' });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
      setLoading(false);
      return;
    }

    await checkProfileAndRedirect(data.user!.id);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Roommate Finder</Text>

      {message.text ? (
        <View style={[styles.messageBox, message.type === 'error' ? styles.messageBoxError : styles.messageBoxSuccess]}>
          <Text style={[styles.messageText, message.type === 'error' ? styles.messageTextError : styles.messageTextSuccess]}>
            {message.text}
          </Text>
        </View>
      ) : null}

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
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.toggleButton}
        onPress={() => router.push('/signup')}
        disabled={loading}
      >
        <Text style={styles.toggleButtonText}>
          Don't have an account? <Text style={styles.blueText}>Sign up here</Text>
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
