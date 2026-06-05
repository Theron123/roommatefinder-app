import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View, Pressable, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const CONFLICT_REASONS = [
  { id: 'noise', label: 'Excessive Noise', icon: 'volume-high' },
  { id: 'cleaning', label: 'Lack of Cleanliness', icon: 'broom' },
  { id: 'payment', label: 'Late Payments', icon: 'cash-clock' },
  { id: 'damage', label: 'Property Damage', icon: 'home-alert' },
  { id: 'breach', label: 'Contract Breach', icon: 'file-alert' },
  { id: 'other', label: 'Other Problem', icon: 'alert-circle-outline' }
];

export default function ConflictResolutionCenter() {
  const { userId, userName, contractId } = useLocalSearchParams<{ userId?: string, userName?: string, contractId?: string }>();
  
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [evidenceAttached, setEvidenceAttached] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select the category of the problem.');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Insert dispute into a disputes or reports table
      // (Using user_reports for now, but ideal is a dedicated disputes table)
      await supabase.from('user_reports').insert({
        reporter_id: session.user.id,
        reported_id: userId || null,
        reason: selectedReason,
        description: description,
        // contract_id: contractId, // If we add this to schema
      });

      // Show success modal
      Alert.alert(
        'Resolution Ticket Created',
        'We have received your report. The Mediation Center will review the case and contact you shortly.',
        [
          { text: 'Got it', onPress: () => router.back() }
        ]
      );

    } catch (e) {
      Alert.alert('Error', 'There was a problem creating the ticket.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachEvidence = () => {
    // Mock for now
    setEvidenceAttached(!evidenceAttached);
  };

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={['#1a0a0a', '#000']} style={s.headerGradient}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>Conflict Resolution</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.targetCard}>
          <MaterialCommunityIcons name="scale-balance" size={28} color="#E53935" />
          <View style={{ flex: 1 }}>
            <Text style={s.targetTitle}>Starting mediation process</Text>
            {userName ? (
              <Text style={s.targetName}>Against: {userName}</Text>
            ) : (
              <Text style={s.targetName}>New General Report</Text>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>WHAT HAPPENED?</Text>
        <View style={s.reasonsGrid}>
          {CONFLICT_REASONS.map(reason => (
            <Pressable 
              key={reason.id} 
              style={[s.reasonBtn, selectedReason === reason.id && s.reasonBtnActive]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <View style={[s.iconWrap, selectedReason === reason.id && s.iconWrapActive]}>
                <MaterialCommunityIcons 
                   name={reason.icon as any} 
                  size={22} 
                  color={selectedReason === reason.id ? '#E53935' : '#888'} 
                />
              </View>
              <Text style={[s.reasonText, selectedReason === reason.id && s.reasonTextActive]}>
                {reason.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.sectionLabel}>INCIDENT DETAILS</Text>
        <View style={s.inputContainer}>
          <TextInput
            style={s.input}
            placeholder="Describe what happened objectively. When did it happen? Which contract rule was broken?"
            placeholderTextColor="#555"
            multiline
            numberOfLines={5}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <Text style={s.sectionLabel}>EVIDENCE (PHOTOS/VIDEOS)</Text>
        <Pressable 
          style={[s.evidenceBtn, evidenceAttached && s.evidenceBtnActive]} 
          onPress={handleAttachEvidence}
        >
          <MaterialCommunityIcons name={evidenceAttached ? "check-circle" : "camera-plus"} size={24} color={evidenceAttached ? "#49C788" : "#888"} />
          <View style={{ flex: 1 }}>
            <Text style={[s.evidenceTitle, evidenceAttached && { color: '#49C788' }]}>
              {evidenceAttached ? 'Evidence attached' : 'Upload multimedia evidence'}
            </Text>
            <Text style={s.evidenceSub}>
              {evidenceAttached ? '1 file ready to send' : 'Help our team understand better'}
            </Text>
          </View>
        </Pressable>

        <View style={s.safetyInfo}>
          <MaterialCommunityIcons name="shield-check" size={20} color="#49C788" />
          <View style={{ flex: 1 }}>
            <Text style={s.safetyTitle}>Fair Mediation</Text>
            <Text style={s.safetyText}>
              This report will initiate a mediation process. The other party will be notified in a neutral manner to seek an amicable solution before taking restrictive actions.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <Pressable 
          style={[s.mainBtn, !selectedReason && { opacity: 0.5 }]} 
          onPress={handleSubmit}
          disabled={loading || !selectedReason}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <MaterialCommunityIcons name="send" size={20} color="#000" />
              <Text style={s.mainBtnText}>Open Mediation Ticket</Text>
            </>
          )}
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
  
  targetCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', marginHorizontal: 20, padding: 16, borderRadius: 16, gap: 14, borderWidth: 1, borderColor: 'rgba(229, 57, 53, 0.3)' },
  targetTitle: { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  targetName: { color: '#fff', fontSize: 18, fontWeight: '800' },

  scroll: { padding: 20, paddingBottom: 100 },
  sectionLabel: { color: '#555', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12, marginTop: 10 },
  
  reasonsGrid: { gap: 10, marginBottom: 24 },
  reasonBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', padding: 14, borderRadius: 16, gap: 14, borderWidth: 1, borderColor: '#1a1a2e' },
  reasonBtnActive: { borderColor: '#E53935', backgroundColor: 'rgba(229, 57, 53, 0.08)' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  iconWrapActive: { backgroundColor: 'rgba(229, 57, 53, 0.15)' },
  reasonText: { color: '#aaa', fontSize: 15, fontWeight: '600' },
  reasonTextActive: { color: '#fff', fontWeight: '700' },

  inputContainer: { backgroundColor: '#0d1117', borderRadius: 16, borderWidth: 1, borderColor: '#1a1a2e', marginBottom: 24 },
  input: { color: '#fff', padding: 16, fontSize: 15, minHeight: 120, textAlignVertical: 'top' },
  
  evidenceBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', padding: 16, borderRadius: 16, gap: 14, borderWidth: 1, borderColor: '#1a1a2e', borderStyle: 'dashed' },
  evidenceBtnActive: { borderColor: '#49C788', borderStyle: 'solid', backgroundColor: 'rgba(73,199,136,0.05)' },
  evidenceTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  evidenceSub: { color: '#888', fontSize: 13 },

  safetyInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 32, padding: 16, backgroundColor: 'rgba(73,199,136,0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(73,199,136,0.2)' },
  safetyTitle: { color: '#49C788', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  safetyText: { color: '#888', fontSize: 13, lineHeight: 20 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 40, backgroundColor: 'rgba(0,0,0,0.9)' },
  mainBtn: { flexDirection: 'row', gap: 10, backgroundColor: '#E53935', padding: 18, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#E53935', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  mainBtnText: { color: '#000', fontSize: 16, fontWeight: '800' }
});
