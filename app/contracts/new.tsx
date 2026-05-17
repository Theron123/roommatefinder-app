import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

// ── Tipos ────────────────────────────────────────────────────────────────────
type Match = { user_id: string; name: string };

// ── Cláusulas predefinidas opcionales ────────────────────────────────────────
const OPTIONAL_CLAUSES = [
  { key: 'no_subletting',       label: 'Sin subarrendamiento',          desc: 'Queda prohibido subarrendar la habitación sin consentimiento escrito.' },
  { key: 'guest_policy',        label: 'Política de invitados',         desc: 'Los invitados no pueden quedarse más de 7 noches consecutivas.' },
  { key: 'cleaning_rota',       label: 'Turno de limpieza',             desc: 'Las áreas comunes se limpiarán en rotación semanal acordada.' },
  { key: 'no_parties',          label: 'Sin fiestas sin aviso',         desc: 'Reuniones de más de 5 personas requieren aviso previo de 24 h.' },
  { key: 'parking_included',    label: 'Estacionamiento incluido',      desc: 'Se incluye un lugar de estacionamiento sin costo adicional.' },
  { key: 'internet_split',      label: 'Internet dividido',             desc: 'El costo de internet se dividirá entre todos los ocupantes.' },
  { key: 'early_termination',   label: 'Terminación anticipada',        desc: 'Se requiere aviso de 30 días y penalización de 1 mes de renta.' },
  { key: 'renters_insurance',   label: 'Seguro de inquilino requerido', desc: 'Cada ocupante debe contar con seguro de inquilino vigente.' },
  { key: 'temperature_control', label: 'Control de temperatura',        desc: 'El termostato se mantendrá entre 68–78 °F por consenso.' },
];

const STEPS = [
  'Tipo de contrato',
  'Seleccionar parte',
  'Términos principales',
  'Reglas de convivencia',
  'Cláusulas adicionales',
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
  const [lateFee, setLateFee]           = useState('50');
  const [deposit, setDeposit]           = useState('');
  const [returnDays, setReturnDays]     = useState('30');
  const [effectiveDate, setEffectiveDate] = useState('');
  // Step 4
  const [petsAllowed, setPetsAllowed]   = useState(false);
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [quietStart, setQuietStart]     = useState('22:00');
  const [quietEnd, setQuietEnd]         = useState('08:00');
  const [visitorsAllowed, setVisitorsAllowed] = useState(true);
  const [maxNights, setMaxNights]       = useState('7');
  const [cleaningSchedule, setCleaningSchedule] = useState<'daily' | 'weekly' | 'biweekly'>('weekly');
  // Step 5
  const [selectedOptional, setSelectedOptional] = useState<string[]>([]);

  useEffect(() => {
    if (step === 1) loadMatches();
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

  const handleSubmit = async () => {
    if (!selectedUser) return;
    if (!rent || !deposit || !effectiveDate) {
      Alert.alert('Campos incompletos', 'Por favor llena todos los campos requeridos.');
      return;
    }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const clauses = {
      rent:             { amount: parseFloat(rent), due_day: parseInt(dueDay), late_fee: parseFloat(lateFee) },
      security_deposit: { amount: parseFloat(deposit), return_days: parseInt(returnDays) },
      pets:             { allowed: petsAllowed, deposit: 0 },
      smoking:          { allowed: smokingAllowed },
      noise:            { quiet_hours_start: quietStart, quiet_hours_end: quietEnd },
      visitors:         { overnight_allowed: visitorsAllowed, max_nights: parseInt(maxNights) },
      cleaning:         { schedule: cleaningSchedule, shared_areas: true },
      damage:           { tenant_responsible: true, normal_wear_exempt: true },
      dispute:          { method: 'mediation', jurisdiction: 'local' },
      eviction:         { notice_days: 30, cause_required: true },
      privacy:          { common_areas_only: true, no_recording: true },
      move_in:          { date: effectiveDate, inspection_required: true },
      move_out:         { notice_days: 30, inspection_required: true },
    };

    const { data: newContract, error } = await supabase.from('contracts').insert({
      initiator_id:           session.user.id,
      counterparty_id:        selectedUser.user_id,
      type:                   contractType,
      status:                 'draft',
      template_version:       'v1.0',
      clauses,
      selected_custom_clauses: selectedOptional,
      effective_date:         effectiveDate,
    }).select().single();

    setLoading(false);
    if (error || !newContract) {
      Alert.alert('Error', 'No se pudo crear el contrato. Intenta de nuevo.');
      return;
    }
    router.replace(`/contracts/review?id=${newContract.id}`);
  };

  const canNext = () => {
    if (step === 0) return !!contractType;
    if (step === 1) return !!selectedUser;
    if (step === 2) return !!rent && !!deposit && !!effectiveDate;
    return true;
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#0d1117', '#000']} style={s.header}>
        <Pressable onPress={() => step === 0 ? router.back() : setStep(step - 1)} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Nuevo Acuerdo</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* Progress */}
      <View style={s.progressWrap}>
        {STEPS.map((label, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={[s.progressDot, i <= step && s.progressDotActive, i < step && s.progressDotDone]}>
              {i < step
                ? <MaterialCommunityIcons name="check" size={14} color="#000" />
                : <Text style={[s.progressNum, i <= step && { color: '#000' }]}>{i + 1}</Text>
              }
            </View>
            {i < STEPS.length - 1 && (
              <View style={[s.progressLine, i < step && s.progressLineDone]} />
            )}
          </View>
        ))}
      </View>
      <Text style={s.stepLabel}>{STEPS[step]}</Text>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── STEP 0: Tipo ── */}
        {step === 0 && (
          <View style={s.stepContent}>
            {(['roommate_agreement', 'rental_agreement'] as const).map(type => (
              <Pressable
                key={type}
                style={[s.typeCard, contractType === type && s.typeCardActive]}
                onPress={() => setContractType(type)}
              >
                <MaterialCommunityIcons
                  name={type === 'roommate_agreement' ? 'account-group' : 'home-city-outline'}
                  size={36}
                  color={contractType === type ? '#49C788' : '#444'}
                />
                <Text style={[s.typeTitle, contractType === type && { color: '#49C788' }]}>
                  {type === 'roommate_agreement' ? 'Acuerdo de Roommate' : 'Contrato de Renta'}
                </Text>
                <Text style={s.typeDesc}>
                  {type === 'roommate_agreement'
                    ? 'Entre compañeros de habitación para regular convivencia y gastos compartidos.'
                    : 'Entre arrendador e inquilino para formalizar condiciones de renta.'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── STEP 1: Parte ── */}
        {step === 1 && (
          <View style={s.stepContent}>
            <Text style={s.sectionHint}>Selecciona con quién deseas crear este acuerdo:</Text>
            {loadingMatches ? (
              <ActivityIndicator color="#49C788" style={{ marginTop: 40 }} />
            ) : matches.length === 0 ? (
              <View style={s.emptyState}>
                <MaterialCommunityIcons name="account-question-outline" size={48} color="#222" />
                <Text style={s.emptyStateText}>No tienes matches aún.{'\n'}Necesitas un match para crear un acuerdo.</Text>
              </View>
            ) : (
              matches.map(m => (
                <Pressable
                  key={m.user_id}
                  style={[s.matchCard, selectedUser?.user_id === m.user_id && s.matchCardActive]}
                  onPress={() => setSelectedUser(m)}
                >
                  <View style={s.matchAvatar}>
                    <Text style={s.matchInitial}>{m.name[0]?.toUpperCase()}</Text>
                  </View>
                  <Text style={s.matchName}>{m.name}</Text>
                  {selectedUser?.user_id === m.user_id && (
                    <MaterialCommunityIcons name="check-circle" size={22} color="#49C788" />
                  )}
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* ── STEP 2: Términos principales ── */}
        {step === 2 && (
          <View style={s.stepContent}>
            <Text style={s.fieldLabel}>Renta mensual ($) *</Text>
            <TextInput style={s.input} value={rent} onChangeText={setRent} keyboardType="numeric" placeholder="Ej: 1200" placeholderTextColor="#444" />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Día de pago</Text>
                <TextInput style={s.input} value={dueDay} onChangeText={setDueDay} keyboardType="numeric" maxLength={2} placeholder="1" placeholderTextColor="#444" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Cargo tardío ($)</Text>
                <TextInput style={s.input} value={lateFee} onChangeText={setLateFee} keyboardType="numeric" placeholder="50" placeholderTextColor="#444" />
              </View>
            </View>

            <Text style={s.fieldLabel}>Depósito de seguridad ($) *</Text>
            <TextInput style={s.input} value={deposit} onChangeText={setDeposit} keyboardType="numeric" placeholder="Ej: 2400" placeholderTextColor="#444" />

            <Text style={s.fieldLabel}>Días para devolución del depósito</Text>
            <TextInput style={s.input} value={returnDays} onChangeText={setReturnDays} keyboardType="numeric" placeholder="30" placeholderTextColor="#444" />

            <Text style={s.fieldLabel}>Fecha de inicio (AAAA-MM-DD) *</Text>
            <TextInput style={s.input} value={effectiveDate} onChangeText={setEffectiveDate} placeholder="2026-06-01" placeholderTextColor="#444" />
          </View>
        )}

        {/* ── STEP 3: Reglas ── */}
        {step === 3 && (
          <View style={s.stepContent}>
            <ToggleRow label="Mascotas permitidas" emoji="🐾" value={petsAllowed} onToggle={setPetsAllowed} />
            <ToggleRow label="Fumar permitido" emoji="🚬" value={smokingAllowed} onToggle={setSmokingAllowed} />
            <ToggleRow label="Visitas nocturnas" emoji="🌙" value={visitorsAllowed} onToggle={setVisitorsAllowed} />

            {visitorsAllowed && (
              <>
                <Text style={s.fieldLabel}>Máximo de noches seguidas</Text>
                <TextInput style={s.input} value={maxNights} onChangeText={setMaxNights} keyboardType="numeric" placeholder="7" placeholderTextColor="#444" />
              </>
            )}

            <Text style={s.fieldLabel}>Silencio desde (HH:MM)</Text>
            <TextInput style={s.input} value={quietStart} onChangeText={setQuietStart} placeholder="22:00" placeholderTextColor="#444" />

            <Text style={s.fieldLabel}>Silencio hasta (HH:MM)</Text>
            <TextInput style={s.input} value={quietEnd} onChangeText={setQuietEnd} placeholder="08:00" placeholderTextColor="#444" />

            <Text style={s.fieldLabel}>Turno de limpieza</Text>
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
        )}

        {/* ── STEP 4: Cláusulas opcionales ── */}
        {step === 4 && (
          <View style={s.stepContent}>
            <Text style={s.sectionHint}>Selecciona las cláusulas adicionales que aplican:</Text>
            {OPTIONAL_CLAUSES.map(c => {
              const selected = selectedOptional.includes(c.key);
              return (
                <Pressable
                  key={c.key}
                  style={[s.clauseCard, selected && s.clauseCardActive]}
                  onPress={() => toggleOptional(c.key)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.clauseLabel, selected && { color: '#49C788' }]}>{c.label}</Text>
                    <Text style={s.clauseDesc}>{c.desc}</Text>
                  </View>
                  <MaterialCommunityIcons
                    name={selected ? 'check-circle' : 'circle-outline'}
                    size={22}
                    color={selected ? '#49C788' : '#333'}
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
            <Text style={s.nextBtnText}>Siguiente</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#000" />
          </Pressable>
        ) : (
          <Pressable style={s.nextBtn} onPress={handleSubmit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#000" />
              : <><Text style={s.nextBtnText}>Revisar y Enviar</Text><MaterialCommunityIcons name="send" size={20} color="#000" /></>
            }
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Helper component ─────────────────────────────────────────────────────────
function ToggleRow({ label, emoji, value, onToggle }: { label: string; emoji: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleEmoji}>{emoji}</Text>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#1a1a2e', true: 'rgba(73,199,136,0.4)' }}
        thumbColor={value ? '#49C788' : '#333'}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#000' },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 8 },
  backBtn:          { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  headerTitle:      { flex: 1, color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  progressWrap:     { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, alignItems: 'flex-start', position: 'relative' },
  progressDot:      { width: 28, height: 28, borderRadius: 14, backgroundColor: '#111', borderWidth: 2, borderColor: '#222', justifyContent: 'center', alignItems: 'center' },
  progressDotActive:{ backgroundColor: '#49C788', borderColor: '#49C788' },
  progressDotDone:  { backgroundColor: '#49C788', borderColor: '#49C788' },
  progressNum:      { color: '#555', fontSize: 12, fontWeight: '700' },
  progressLine:     { position: 'absolute', top: 30, left: '60%', right: '-40%', height: 2, backgroundColor: '#1a1a2e' },
  progressLineDone: { backgroundColor: '#49C788' },
  stepLabel:        { color: '#49C788', fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 8, letterSpacing: 0.5 },
  scroll:           { paddingHorizontal: 20 },
  stepContent:      { gap: 12 },
  sectionHint:      { color: '#888', fontSize: 14, marginBottom: 4 },
  typeCard:         { backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#1a1a2e', borderRadius: 16, padding: 20, alignItems: 'center', gap: 10 },
  typeCardActive:   { borderColor: '#49C788', backgroundColor: 'rgba(73,199,136,0.07)' },
  typeTitle:        { color: '#fff', fontSize: 17, fontWeight: '700' },
  typeDesc:         { color: '#666', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  matchCard:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#1a1a2e', borderRadius: 14, padding: 14, gap: 12 },
  matchCardActive:  { borderColor: '#49C788', backgroundColor: 'rgba(73,199,136,0.07)' },
  matchAvatar:      { width: 42, height: 42, borderRadius: 21, backgroundColor: '#49C788', justifyContent: 'center', alignItems: 'center' },
  matchInitial:     { color: '#000', fontWeight: '800', fontSize: 18 },
  matchName:        { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
  emptyState:       { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyStateText:   { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  fieldLabel:       { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input:            { backgroundColor: '#0d1117', color: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1a1a2e', fontSize: 15 },
  row:              { flexDirection: 'row' },
  toggleRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1a1a2e', gap: 10 },
  toggleEmoji:      { fontSize: 20 },
  toggleLabel:      { color: '#fff', fontSize: 15, flex: 1 },
  segmented:        { flexDirection: 'row', backgroundColor: '#0d1117', borderRadius: 12, borderWidth: 1, borderColor: '#1a1a2e', overflow: 'hidden' },
  segment:          { flex: 1, paddingVertical: 12, alignItems: 'center' },
  segmentActive:    { backgroundColor: '#49C788' },
  segmentText:      { color: '#888', fontWeight: '600', fontSize: 13 },
  clauseCard:       { backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#1a1a2e', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  clauseCardActive: { borderColor: '#49C788', backgroundColor: 'rgba(73,199,136,0.05)' },
  clauseLabel:      { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  clauseDesc:       { color: '#555', fontSize: 12, lineHeight: 18 },
  footer:           { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 34, backgroundColor: 'rgba(0,0,0,0.95)' },
  nextBtn:          { backgroundColor: '#49C788', borderRadius: 30, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#49C788', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  nextBtnDisabled:  { backgroundColor: '#1a2a22', shadowOpacity: 0 },
  nextBtnText:      { color: '#000', fontWeight: '800', fontSize: 16 },
});
