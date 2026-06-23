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
import { useTranslation } from '../../context/LanguageContext';

type Match = { user_id: string; name: string };

export default function NewContractScreen() {
  const [step, setStep]             = useState(0);
  const [loading, setLoading]       = useState(false);
  const [matches, setMatches]       = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Step 1
  const [contractType, setContractType] = useState<'roommate_agreement' | 'rental_agreement'>('roommate_agreement');
  // Step 2
  const [selectedUsers, setSelectedUsers] = useState<Match[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggleUser = (user: Match) => {
    setSelectedUsers(prev => {
      if (prev.some(u => u.user_id === user.user_id)) {
        return prev.filter(u => u.user_id !== user.user_id);
      } else {
        return [...prev, user];
      }
    });
  };
  // Step 3
  const [rent, setRent]                 = useState('');
  const [dueDay, setDueDay]             = useState('1');
  const [deposit, setDeposit]           = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  const handleDateChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = '';
    
    if (cleaned.length <= 2) {
      formatted = cleaned;
    } else if (cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    
    setEffectiveDate(formatted);
  };
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
  }, [step, matches.length]);

  const loadMatches = async () => {
    setLoadingMatches(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoadingMatches(false); return; }
    const uid = session.user.id;

    const { data } = await supabase
      .from('matches')
      .select('user1, user2')
      .or(`user1.eq.${uid},user2.eq.${uid}`);

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

  const { t, locale } = useTranslation();

  const steps = [
    { title: t('contracts.steps.type'), icon: 'file-document-edit-outline' },
    { title: t('contracts.steps.roommate'), icon: 'account-search-outline' },
    { title: t('contracts.steps.finance'), icon: 'cash-multiple' },
    { title: t('contracts.steps.rules'), icon: 'home-heart' },
    { title: t('contracts.steps.addons'), icon: 'view-grid-plus-outline' },
  ];

  const optionalClauses = [
    { key: 'no_subletting',       label: locale === 'es' ? 'Sin subarrendamiento' : 'No subletting',          desc: locale === 'es' ? 'Queda prohibido subarrendar sin consentimiento.' : 'Subletting without consent is prohibited.' },
    { key: 'guest_policy',        label: locale === 'es' ? 'Política de invitados' : 'Guest policy',         desc: locale === 'es' ? 'Máximo 7 noches consecutivas de invitados.' : 'Maximum 7 consecutive nights for guests.' },
    { key: 'cleaning_rota',       label: locale === 'es' ? 'Turno de limpieza' : 'Cleaning rotation',             desc: locale === 'es' ? 'Rotación semanal de limpieza en áreas comunes.' : 'Weekly rotation in common areas.' },
    { key: 'no_parties',          label: locale === 'es' ? 'Sin fiestas sorpresa' : 'No surprise parties',          desc: locale === 'es' ? 'Reuniones grandes requieren aviso previo de 24h.' : 'Large gatherings require 24h advance notice.' },
    { key: 'parking_included',    label: locale === 'es' ? 'Estacionamiento' : 'Parking',               desc: locale === 'es' ? 'Incluye 1 espacio de estacionamiento sin costo extra.' : 'Includes 1 parking spot at no extra cost.' },
    { key: 'internet_split',      label: locale === 'es' ? 'Internet compartido' : 'Shared Internet',           desc: locale === 'es' ? 'El pago del servicio se divide por partes iguales.' : 'The payment is split equally.' },
  ];

  const handleAIGenerate = () => {
    setAiLoading(true);
    setTimeout(() => {
      setSelectedOptional(['guest_policy', 'cleaning_rota', 'no_parties']);
      setAiLoading(false);
      Alert.alert(t('contracts.ai_applied_title'), t('contracts.ai_applied_desc'));
    }, 1200);
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) return;
    if (!rent || !deposit || !effectiveDate) {
      Alert.alert(t('contracts.missing_fields'), t('contracts.missing_fields_desc'));
      return;
    }

    // Convertir DD/MM/AAAA a AAAA-MM-DD para Supabase
    const dateParts = effectiveDate.split('/');
    if (dateParts.length !== 3 || dateParts[0].length !== 2 || dateParts[1].length !== 2 || dateParts[2].length !== 4) {
      Alert.alert(t('contracts.invalid_date'), t('contracts.invalid_date_format'));
      return;
    }

    const day = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]);
    const year = parseInt(dateParts[2]);

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
      Alert.alert(t('contracts.invalid_date'), t('contracts.invalid_date_values'));
      return;
    }

    const formattedIsoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

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
      type:                   contractType,
      status:                 'draft',
      template_version:       'v2.0',
      clauses,
      selected_custom_clauses: selectedOptional,
      effective_date:         formattedIsoDate,
    }).select().single();

    if (error || !newContract) {
      setLoading(false);
      Alert.alert(t('general.error'), t('contracts.draft_error'));
      return;
    }

    // Guardar los participantes seleccionados en contract_participants
    const participantInserts = selectedUsers.map(u => ({
      contract_id: newContract.id,
      user_id: u.user_id
    }));

    const { error: partError } = await supabase
      .from('contract_participants')
      .insert(participantInserts);

    setLoading(false);
    if (partError) {
      Alert.alert(t('general.error'), t('contracts.participants_error'));
      return;
    }

    router.replace(`/contracts/${newContract.id}`);
  };

  const canNext = () => {
    if (step === 0) return !!contractType;
    if (step === 1) return selectedUsers.length > 0;
    if (step === 2) return !!rent && !!deposit && effectiveDate.length === 10;
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
          <Text style={s.headerTitle}>{t('contracts.create_title')}</Text>
          <Text style={s.stepCounter}>{step + 1} / {steps.length}</Text>
        </View>

        {/* Dynamic Progress Bar */}
        <View style={s.progressBarWrap}>
          <View style={[s.progressBar, { width: `${((step + 1) / steps.length) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          
          <View style={s.stepHeader}>
            <View style={s.stepIconWrap}>
              <MaterialCommunityIcons name={steps[step].icon as any} size={28} color="#49C788" />
            </View>
            <Text style={s.stepTitle}>{steps[step].title}</Text>
          </View>

          {/* ── STEP 0: Tipo ── */}
          {step === 0 && (
            <View style={s.stepContent}>
              <Text style={s.sectionHint}>{t('contracts.select_format')}</Text>
              {(['roommate_agreement', 'rental_agreement'] as const).map(type => (
                <Pressable
                  key={type}
                  style={[s.typeCard, contractType === type && s.typeCardActive]}
                  onPress={() => setContractType(type)}
                >
                  <LinearGradient 
                    colors={contractType === type ? ['rgba(73,199,136,0.15)', 'transparent'] : ['transparent', 'transparent']} 
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]} 
                  />
                  <MaterialCommunityIcons
                    name={type === 'roommate_agreement' ? 'account-group' : 'home-city-outline'}
                    size={32}
                    color={contractType === type ? '#49C788' : '#666'}
                  />
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={[s.typeTitle, contractType === type && { color: '#49C788' }]}>
                      {type === 'roommate_agreement' ? t('contracts.roommate_agreement') : t('contracts.rental_agreement')}
                    </Text>
                    <Text style={s.typeDesc}>
                      {type === 'roommate_agreement'
                        ? t('contracts.roommate_desc')
                        : t('contracts.rental_desc')}
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
              <Text style={s.sectionHint}>{t('contracts.who_signing')}</Text>

              {/* Buscador de Matches */}
              {matches.length > 0 && (
                <View style={s.searchContainer}>
                  <MaterialCommunityIcons name="magnify" size={20} color="#666" style={s.searchIcon} />
                  <TextInput
                    style={s.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={t('contracts.search_roommates')}
                    placeholderTextColor="#666"
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')}>
                      <MaterialCommunityIcons name="close" size={18} color="#666" />
                    </Pressable>
                  )}
                </View>
              )}

              {/* Píldoras de seleccionados */}
              {selectedUsers.length > 0 && (
                <View style={s.selectedPillsContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.selectedPillsScroll}>
                    {selectedUsers.map(user => (
                      <Pressable key={user.user_id} style={s.selectedPill} onPress={() => handleToggleUser(user)}>
                        <Text style={s.selectedPillText}>{user.name}</Text>
                        <MaterialCommunityIcons name="close-circle" size={16} color="#fff" style={{ marginLeft: 6 }} />
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {loadingMatches ? (
                <ActivityIndicator color="#49C788" style={{ marginTop: 40 }} />
              ) : matches.length === 0 ? (
                <View style={s.emptyState}>
                  <View style={s.emptyIconWrap}>
                    <MaterialCommunityIcons name="account-question-outline" size={40} color="#666" />
                  </View>
                  <Text style={s.emptyStateText}>{t('contracts.need_match')}</Text>
                </View>
              ) : (
                (() => {
                  const filtered = matches.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
                  if (filtered.length === 0) {
                    return (
                      <View style={s.emptyState}>
                        <Text style={{ color: '#666', textAlign: 'center', marginTop: 20 }}>{t('contracts.no_roommates_match')}</Text>
                      </View>
                    );
                  }
                  return filtered.map(m => {
                    const isSelected = selectedUsers.some(u => u.user_id === m.user_id);
                    return (
                      <Pressable
                        key={m.user_id}
                        style={[s.matchCard, isSelected && s.matchCardActive]}
                        onPress={() => handleToggleUser(m)}
                      >
                        <View style={[s.matchAvatar, isSelected && { backgroundColor: '#49C788' }]}>
                          <Text style={[s.matchInitial, isSelected && { color: '#000' }]}>{m.name[0]?.toUpperCase()}</Text>
                        </View>
                        <Text style={s.matchName}>{m.name}</Text>
                        <MaterialCommunityIcons 
                          name={isSelected ? "check-circle" : "circle-outline"} 
                          size={24} 
                          color={isSelected ? "#49C788" : "#333"} 
                        />
                      </Pressable>
                    );
                  });
                })()
              )}
            </View>
          )}

          {/* ── STEP 2: Finanzas ── */}
          {step === 2 && (
            <View style={s.stepContent}>
              <Text style={s.sectionHint}>{t('contracts.set_amounts')}</Text>
              
              <View style={s.inputGroup}>
                <Text style={s.fieldLabel}>{t('contracts.total_rent')}</Text>
                <View style={s.inputWrapper}>
                  <MaterialCommunityIcons name="currency-usd" size={20} color="#888" style={s.inputIcon} />
                  <TextInput style={s.inputWithIcon} value={rent} onChangeText={setRent} keyboardType="numeric" placeholder="1200" placeholderTextColor="#444" />
                </View>
              </View>

              <View style={s.inputGroup}>
                <Text style={s.fieldLabel}>{t('contracts.sec_deposit')}</Text>
                <View style={s.inputWrapper}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#888" style={s.inputIcon} />
                  <TextInput style={s.inputWithIcon} value={deposit} onChangeText={setDeposit} keyboardType="numeric" placeholder="2400" placeholderTextColor="#444" />
                </View>
              </View>

              <View style={s.row}>
                <View style={[s.inputGroup, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>{t('contracts.due_day')}</Text>
                  <TextInput style={s.input} value={dueDay} onChangeText={setDueDay} keyboardType="numeric" maxLength={2} placeholder={t('contracts.due_day_placeholder')} placeholderTextColor="#444" />
                </View>
                <View style={{ width: 16 }} />
                <View style={[s.inputGroup, { flex: 1.5 }]}>
                  <Text style={s.fieldLabel}>{t('contracts.start_date')}</Text>
                  <TextInput
                    style={s.input}
                    value={effectiveDate}
                    onChangeText={handleDateChange}
                    placeholder={locale === 'es' ? 'DD/MM/AAAA' : 'DD/MM/YYYY'}
                    placeholderTextColor="#444"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>
            </View>
          )}

          {/* ── STEP 3: Reglas ── */}
          {step === 3 && (
            <View style={s.stepContent}>
              <Text style={s.sectionHint}>{t('contracts.configure_policies')}</Text>
              <ToggleRow label={t('contracts.pets_allowed')} icon="dog" value={petsAllowed} onToggle={setPetsAllowed} />
              <ToggleRow label={t('contracts.smoking_allowed')} icon="smoking" value={smokingAllowed} onToggle={setSmokingAllowed} />
              <ToggleRow label={t('contracts.overnight_guests')} icon="weather-night" value={visitorsAllowed} onToggle={setVisitorsAllowed} />

              <View style={[s.inputGroup, { marginTop: 16 }]}>
                <Text style={s.fieldLabel}>{t('contracts.cleaning_schedule')}</Text>
                <View style={s.segmented}>
                  {(['daily', 'weekly', 'biweekly'] as const).map(opt => (
                    <Pressable
                      key={opt}
                      style={[s.segment, cleaningSchedule === opt && s.segmentActive]}
                      onPress={() => setCleaningSchedule(opt)}
                    >
                      <Text style={[s.segmentText, cleaningSchedule === opt && { color: '#000' }]}>
                        {t(`contracts.cleaning_opts.${opt}`)}
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
                <Text style={s.aiText}>{aiLoading ? t('contracts.ai_analyzing') : t('contracts.ai_suggest')}</Text>
              </Pressable>

              {optionalClauses.map(c => {
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
          {step < steps.length - 1 ? (
            <Pressable
              style={[s.nextBtn, !canNext() && s.nextBtnDisabled]}
              onPress={() => canNext() && setStep(step + 1)}
            >
              <Text style={s.nextBtnText}>{t('contracts.next_step')}</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#000" />
            </Pressable>
          ) : (
            <Pressable style={s.nextBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <MaterialCommunityIcons name="file-document-check" size={20} color="#000" />
                  <Text style={s.nextBtnText}>{t('contracts.save_send')}</Text>
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

  typeCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#1a1a2e', borderRadius: 24, padding: 20, position: 'relative' },
  typeCardActive:   { borderColor: '#49C788' },
  typeTitle:        { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  typeDesc:         { color: '#888', fontSize: 13, lineHeight: 18 },

  matchCard:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#1a1a2e', borderRadius: 24, padding: 16, gap: 12 },
  matchCardActive:  { borderColor: '#49C788', backgroundColor: 'rgba(73,199,136,0.05)' },
  matchAvatar:      { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  matchInitial:     { color: '#fff', fontWeight: '800', fontSize: 18 },
  matchName:        { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },

  emptyState:       { alignItems: 'center', paddingTop: 30, gap: 16 },
  emptyIconWrap:    { width: 80, height: 80, borderRadius: 40, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  emptyStateText:   { color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 22 },

  inputGroup:       { marginBottom: 8 },
  fieldLabel:       { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input:            { backgroundColor: '#0d1117', color: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#1a1a2e', fontSize: 16 },
  inputWrapper:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', borderRadius: 20, borderWidth: 1, borderColor: '#1a1a2e' },
  inputIcon:        { paddingLeft: 16 },
  inputWithIcon:    { flex: 1, color: '#fff', padding: 16, fontSize: 16 },
  row:              { flexDirection: 'row' },

  toggleRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#1a1a2e', gap: 12 },
  toggleIconWrap:   { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  toggleLabel:      { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1 },

  segmented:        { flexDirection: 'row', backgroundColor: '#0d1117', borderRadius: 20, borderWidth: 1, borderColor: '#1a1a2e', overflow: 'hidden' },
  segment:          { flex: 1, paddingVertical: 14, alignItems: 'center' },
  segmentActive:    { backgroundColor: '#49C788' },
  segmentText:      { color: '#888', fontWeight: '700', fontSize: 13 },

  aiBanner:         { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10, 132, 255, 0.1)', padding: 16, borderRadius: 30, gap: 10, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.2)' },
  aiText:           { color: '#0A84FF', fontSize: 13, fontWeight: '600', flex: 1 },

  clauseCard:       { backgroundColor: '#0d1117', borderWidth: 1, borderColor: '#1a1a2e', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  clauseCardActive: { borderColor: '#49C788', backgroundColor: 'rgba(73,199,136,0.05)' },
  clauseLabel:      { color: '#aaa', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  clauseDesc:       { color: '#666', fontSize: 13, lineHeight: 18 },

  footer:           { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 34, backgroundColor: 'rgba(0,0,0,0.95)' },
  nextBtn:          { backgroundColor: '#49C788', borderRadius: 30, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#49C788', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  nextBtnDisabled:  { backgroundColor: '#1a2a22', shadowOpacity: 0 },
  nextBtnText:      { color: '#000', fontWeight: '800', fontSize: 16 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1117', borderRadius: 20, borderWidth: 1, borderColor: '#1a1a2e', paddingHorizontal: 16, height: 50, marginBottom: 8 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  selectedPillsContainer: { height: 40, marginBottom: 8 },
  selectedPillsScroll: { gap: 8, alignItems: 'center' },
  selectedPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#49C788', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  selectedPillText: { color: '#000', fontWeight: '700', fontSize: 13 },
});
