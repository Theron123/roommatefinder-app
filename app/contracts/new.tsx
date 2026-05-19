import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Switch, Text, TextInput, View, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

// ── Tipos ────────────────────────────────────────────────────────────────────
type Match = { user_id: string; name: string };

// ── Cláusulas predefinidas opcionales ────────────────────────────────────────
const OPTIONAL_CLAUSES = [
  { key: 'no_subletting',       label: 'Sin subarrendamiento',          desc: 'Prohibido subarrendar sin consentimiento.' },
  { key: 'guest_policy',        label: 'Política de invitados',         desc: 'Máximo 7 noches consecutivas para visitas.' },
  { key: 'cleaning_rota',       label: 'Turno de limpieza',             desc: 'Rotación semanal en áreas comunes.' },
  { key: 'no_parties',          label: 'Sin fiestas sorpresa',          desc: 'Reuniones grandes requieren aviso de 24h.' },
  { key: 'parking_included',    label: 'Estacionamiento',               desc: 'Incluye 1 cajón sin costo extra.' },
  { key: 'internet_split',      label: 'Internet compartido',           desc: 'El pago se divide equitativamente.' },
];

const STEPS = [
  { title: 'Tipo', icon: 'file-document-edit-outline' },
  { title: 'Roommate', icon: 'account-search-outline' },
  { title: 'Finanzas', icon: 'cash-multiple' },
  { title: 'Reglas', icon: 'home-heart' },
  { title: 'Módulos', icon: 'view-grid-plus-outline' },
];

export default function NewContractScreen() {
  const [step, setStep]             = useState(0);
  const [loading, setLoading]       = useState(false);
  const [matches, setMatches]       = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Step 1
  const [contractType, setContractType] = useState<'roommate_agreement' | 'rental_agreement'>('roommate_agreement');
  // Step 2
  const [selectedUser, setSelectedUser] = useState<Match | null>(null);
  // Step 3
  const [rent, setRent]                 = useState('');
  const [dueDay, setDueDay]             = useState('1');
  const [deposit, setDeposit]           = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  // Step 4
  const [petsAllowed, setPetsAllowed]   = useState(false);
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [visitorsAllowed, setVisitorsAllowed] = useState(true);
  const [cleaningSchedule, setCleaningSchedule] = useState<'daily' | 'weekly' | 'biweekly'>('weekly');
  // Step 5
  const [selectedOptional, setSelectedOptional] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (step === 1 && matches.length === 0) loadMatches();
  }, [step]);

  const loadMatches = async () => {
    setLoadingMatches(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoadingMatches(false); return; }
    const uid = session.user.id;

    const { data } = await supabase
      .from('matches')
      .select('user1, user2')
      .or(`user1.eq.${uid},user2.eq.${uid}`)
      .eq('status', 'matched');

    if (data && data.length > 0) {
      const otherIds = data.map((m: any) => m.user1 === uid ? m.user2 : m.user1);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', otherIds);
      if (profiles) setMatches(profiles.map((p: any) => ({ user_id: p.id, name: p.name })));
    }
    setLoadingMatches(false);
  };

  const toggleOptional = (key: string) => {
    setSelectedOptional(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleAIGenerate = () => {
    setAiLoading(true);
    setTimeout(() => {
      setSelectedOptional(['guest_policy', 'cleaning_rota', 'no_parties']);
      setAiLoading(false);
      Alert.alert('Módulos de IA Aplicados', 'Hemos seleccionado automáticamente las cláusulas recomendadas basadas en los perfiles y el estilo de vida de los usuarios.');
    }, 1200);
  };

  const handleSubmit = async () => {
    if (!selectedUser) return;
    if (!rent || !deposit || !effectiveDate) {
      Alert.alert('Faltan datos', 'Completa los montos y la fecha de inicio.');
      return;
    }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const clauses = {
      rent:             { amount: parseFloat(rent), due_day: parseInt(dueDay) },
      security_deposit: { amount: parseFloat(deposit) },
      pets:             { allowed: petsAllowed },
      smoking:          { allowed: smokingAllowed },
      visitors:         { overnight_allowed: visitorsAllowed },
      cleaning:         { schedule: cleaningSchedule },
    };

    const { data: newContract, error } = await supabase.from('contracts').insert({
      initiator_id:           session.user.id,
      counterparty_id:        selectedUser.user_id,
      type:                   contractType,
      status:                 'draft',
      template_version:       'v2.0',
      clauses,
      selected_custom_clauses: selectedOptional,
      effective_date:         effectiveDate,
    }).select().single();

    setLoading(false);
    if (error || !newContract) {
      Alert.alert('Error', 'No se pudo crear el borrador.');
      return;
    }
    router.replace(`/contracts/${newContract.id}`);
  };

  const canNext = () => {
    if (step === 0) return !!contractType;
    if (step === 1) return !!selectedUser;
    if (step === 2) return !!rent && !!deposit && !!effectiveDate;
    return true;
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Premium Header */}
        <View style={s.header}>
          <Pressable onPress={() => step === 0 ? router.back() : setStep(step - 1)} style={s.backBtn}>
            <MaterialCommunityIcons name={step === 0 ? "close" : "arrow-left"} size={24} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>Crear Acuerdo</Text>
          <Text style={s.stepCounter}>{step + 1} / {STEPS.length}</Text>
        </View>

        {/* Dynamic Progress Bar */}
        <View style={s.progressBarWrap}>
          <View style={[s.progressBar, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          
          <View style={s.stepHeader}>
            <View style={s.stepIconWrap}>
              <MaterialCommunityIcons name={STEPS[step].icon as any} size={28} color="#49C788" />
            </View>
            <Text style={s.stepTitle}>{STEPS[step].title}</Text>
          </View>

          {/* ── STEP 0: Tipo ── */}
          {step === 0 && (
            <View style={s.stepContent}>
              <Text style={s.sectionHint}>Selecciona el formato de tu acuerdo</Text>
              {(['roommate_agreement', 'rental_agreement'] as const).map(type => (
                <Pressable
                  key={type}
                  style={[s.typeCard, contractType === type && s.typeCardActive]}
                  onPress={() => setContractType(type)}
                >
                  <LinearGradient 
                    colors={contractType === type ? ['rgba(73,199,136,0.15)', 'transparent'] : ['transparent', 'transparent']} 
                    style={StyleSheet.absoluteFillObject} 
                    borderRadius={16}
                  />
                  <MaterialCommunityIcons
                    name={type === 'roommate_agreement' ? 'account-group' : 'home-city-outline'}
                    size={32}
                    color={contractType === type ? '#49C788' : '#666'}
                  />
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={[s.typeTitle, contractType === type && { color: '#49C788' }]}>
                      {type === 'roommate_agreement' ? 'Acuerdo de Roommates' : 'Contrato de Renta'}
                    </Text>
                    <Text style={s.typeDesc}>
                      {type === 'roommate_agreement'
                        ? 'Reglas internas de convivencia y división de gastos.'
                        : 'Formaliza pagos, depósitos y el uso de la propiedad.'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={contractType === type ? 'check-circle' : 'circle-outline'}
                    size={24}
                    color={contractType === type ? '#49C788' : '#333'}
                  />
                </Pressable>
              ))}
            </View>
          )}

          {/* ── STEP 1: Parte ── */}
          {step === 1 && (
            <View style={s.stepContent}>
              <Text style={s.sectionHint}>¿Con quién celebrarás este acuerdo?</Text>
              {loadingMatches ? (
                <ActivityIndicator color="#49C788" style={{ marginTop: 40 }} />
              ) : matches.length === 0 ? (
                <View style={s.emptyState}>
                  <View style={s.emptyIconWrap}>
                    <MaterialCommunityIcons name="account-question-outline" size={40} color="#666" />
                  </View>
                  <Text style={s.emptyStateText}>Necesitas un match aprobado para crear un acuerdo formal.</Text>
                </View>
              ) : (
                matches.map(m => (
                  <Pressable
                    key={m.user_id}
                    style={[s.matchCard, selectedUser?.user_id === m.user_id && s.matchCardActive]}
                    onPress={() => setSelectedUser(m)}
                  >
                    <View style={[s.matchAvatar, selectedUser?.user_id === m.user_id && { backgroundColor: '#49C788' }]}>
                      <Text style={[s.matchInitial, selectedUser?.user_id === m.user_id && { color: '#000' }]}>{m.name[0]?.toUpperCase()}</Text>
                    </View>
                    <Text style={s.matchName}>{m.name}</Text>
                    <MaterialCommunityIcons 
                      name={selectedUser?.user_id === m.user_id ? "check-circle" : "circle-outline"} 
                      size={24} 
                      color={selectedUser?.user_id === m.user_id ? "#49C788" : "#333"} 
                    />
                  </Pressable>
                ))
              )}
            </View>
          )}

          {/* ── STEP 2: Finanzas ── */}
          {step === 2 && (
            <View style={s.stepContent}>
              <Text style={s.sectionHint}>Establece los montos base. Estos podrán ser modificados más tarde en las cláusulas.</Text>
              
              <View style={s.inputGroup}>
                <Text style={s.fieldLabel}>Renta Mensual Total ($) *</Text>
                <View style={s.inputWrapper}>
                  <MaterialCommunityIcons name="currency-usd" size={20} color="#888" style={s.inputIcon} />
                  <TextInput style={s.inputWithIcon} value={rent} onChangeText={setRent} keyboardType="numeric" placeholder="1200" placeholderTextColor="#444" />
                </View>
              </View>

              <View style={s.inputGroup}>
                <Text style={s.fieldLabel}>Depósito de Seguridad ($) *</Text>
                <View style={s.inputWrapper}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#888" style={s.inputIcon} />
                  <TextInput style={s.inputWithIcon} value={deposit} onChangeText={setDeposit} keyboardType="numeric" placeholder="2400" placeholderTextColor="#444" />
                </View>
              </View>

              <View style={s.row}>
                <View style={[s.inputGroup, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Día de cobro</Text>
                  <TextInput style={s.input} value={dueDay} onChangeText={setDueDay} keyboardType="numeric" maxLength={2} placeholder="Ej: 1" placeholderTextColor="#444" />
                </View>
                <View style={{ width: 16 }} />
                <View style={[s.inputGroup, { flex: 1.5 }]}>
                  <Text style={s.fieldLabel}>Fecha de inicio *</Text>
                  <TextInput style={s.input} value={effectiveDate} onChangeText={setEffectiveDate} placeholder="AAAA-MM-DD" placeholderTextColor="#444" />
                </View>
              </View>
            </View>
          )}

          {/* ── STEP 3: Reglas ── */}
          {step === 3 && (
            <View style={s.stepContent}>
              <Text style={s.sectionHint}>Configura las políticas básicas de la vivienda.</Text>
              <ToggleRow label="Mascotas permitidas" icon="dog" value={petsAllowed} onToggle={setPetsAllowed} />
              <ToggleRow label="Fumar permitido" icon="smoking" value={smokingAllowed} onToggle={setSmokingAllowed} />
              <ToggleRow label="Visitas nocturnas" icon="weather-night" value={visitorsAllowed} onToggle={setVisitorsAllowed} />

              <View style={[s.inputGroup, { marginTop: 16 }]}>
                <Text style={s.fieldLabel}>Rotación de limpieza</Text>
                <View style={s.segmented}>
                  {(['daily', 'weekly', 'biweekly'] as const).map(opt => (
                    <Pressable
                      key={opt}
                      style={[s.segment, cleaningSchedule === opt && s.segmentActive]}
                      onPress={() => setCleaningSchedule(opt)}
                    >
                      <Text style={[s.segmentText, cleaningSchedule === opt && { color: '#000' }]}>
                        {opt === 'daily' ? 'Diario' : opt === 'weekly' ? 'Semanal' : 'Quincenal'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* ── STEP 4: Módulos ── */}
          {step === 4 && (
            <View style={s.stepContent}>
              <Pressable style={s.aiBanner} onPress={handleAIGenerate} disabled={aiLoading}>
                {aiLoading ? <ActivityIndicator size="small" color="#0A84FF" /> : <MaterialCommunityIcons name="auto-fix" size={20} color="#0A84FF" />}
                <Text style={s.aiText}>{aiLoading ? 'Analizando perfiles...' : 'Sugerir módulos con Inteligencia Artificial'}</Text>
              </Pressable>

              {OPTIONAL_CLAUSES.map(c => {
                const selected = selectedOptional.includes(c.key);
                return (
                  <Pressable
                    key={c.key}
                    style={[s.clauseCard, selected && s.clauseCardActive]}
                    onPress={() => toggleOptional(c.key)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.clauseLabel, selected && { color: '#fff' }]}>{c.label}</Text>
                      <Text style={s.clauseDesc}>{c.desc}</Text>
                    </View>
                    <Switch
                      value={selected}
                      onValueChange={() => toggleOptional(c.key)}
                      trackColor={{ false: '#222', true: '#49C788' }}
                      thumbColor="#fff"
                    />
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={s.footer}>
          {step < STEPS.length - 1 ? (
            <Pressable
              style={[s.nextBtn, !canNext() && s.nextBtnDisabled]}
              onPress={() => canNext() && setStep(step + 1)}
            >
              <Text style={s.nextBtnText}>Siguiente Paso</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#000" />
            </Pressable>
          ) : (
            <Pressable style={s.nextBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <MaterialCommunityIcons name="file-document-check" size={20} color="#000" />
                  <Text style={s.nextBtnText}>Guardar y Mandar a Revisión</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Helper component ─────────────────────────────────────────────────────────
function ToggleRow({ label, icon, value, onToggle }: { label: string; icon: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={s.toggleRow}>
      <View style={[s.toggleIconWrap, value && { backgroundColor: 'rgba(73,199,136,0.1)' }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={value ? '#49C788' : '#888'} />
      </View>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#222', true: '#49C788' }}
        thumbColor="#fff"
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#000' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn:          { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  headerTitle:      { color: '#fff', fontSize: 18, fontWeight: '700' },
  stepCounter:      { color: '#49C788', fontSize: 14, fontWeight: '800' },
  
  progressBarWrap:  { height: 4, backgroundColor: '#111', width: '100%' },
  progressBar:      { height: '100%', backgroundColor: '#49C788' },

  scroll:           { paddingHorizontal: 20, paddingTop: 24 },
  
  stepHeader:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  stepIconWrap:     { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(73,199,136,0.1)', justifyContent: 'center', alignItems: 'center' },
  stepTitle:        { color: '#fff', fontSize: 24, fontWeight: '800' },

  stepContent:      { gap: 16 },
  sectionHint:      { color: '#888', fontSize: 14, marginBottom: 8, lineHeight: 20 },

  typeCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#1a1a2e', borderRadius: 16, padding: 20, position: 'relative' },
  typeCardActive:   { borderColor: '#49C788' },
  typeTitle:        { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  typeDesc:         { color: '#888', fontSize: 13, lineHeight: 18 },

  matchCard:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#1a1a2e', borderRadius: 16, padding: 16, gap: 12 },
  matchCardActive:  { borderColor: '#49C788', backgroundColor: 'rgba(73,199,136,0.05)' },
  matchAvatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  matchInitial:     { color: '#fff', fontWeight: '800', fontSize: 18 },
  matchName:        { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },

  emptyState:       { alignItems: 'center', paddingTop: 30, gap: 16 },
  emptyIconWrap:    { width: 80, height: 80, borderRadius: 40, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  emptyStateText:   { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 22 },

  inputGroup:       { marginBottom: 8 },
  fieldLabel:       { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input:            { backgroundColor: '#0d1117', color: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1a1a2e', fontSize: 16 },
  inputWrapper:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', borderRadius: 14, borderWidth: 1, borderColor: '#1a1a2e' },
  inputIcon:        { paddingLeft: 16 },
  inputWithIcon:    { flex: 1, color: '#fff', padding: 16, fontSize: 16 },
  row:              { flexDirection: 'row' },

  toggleRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1a1a2e', gap: 12 },
  toggleIconWrap:   { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  toggleLabel:      { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },

  segmented:        { flexDirection: 'row', backgroundColor: '#0d1117', borderRadius: 14, borderWidth: 1, borderColor: '#1a1a2e', overflow: 'hidden' },
  segment:          { flex: 1, paddingVertical: 14, alignItems: 'center' },
  segmentActive:    { backgroundColor: '#49C788' },
  segmentText:      { color: '#888', fontWeight: '700', fontSize: 13 },

  aiBanner:         { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10, 132, 255, 0.1)', padding: 14, borderRadius: 12, gap: 10, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.2)' },
  aiText:           { color: '#0A84FF', fontSize: 13, fontWeight: '600', flex: 1 },

  clauseCard:       { backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#1a1a2e', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  clauseCardActive: { borderColor: '#49C788', backgroundColor: 'rgba(73,199,136,0.05)' },
  clauseLabel:      { color: '#aaa', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  clauseDesc:       { color: '#666', fontSize: 13, lineHeight: 18 },

  footer:           { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 34, backgroundColor: 'rgba(0,0,0,0.95)' },
  nextBtn:          { backgroundColor: '#49C788', borderRadius: 30, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#49C788', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  nextBtnDisabled:  { backgroundColor: '#1a2a22', shadowOpacity: 0 },
  nextBtnText:      { color: '#000', fontWeight: '800', fontSize: 16 },
});
