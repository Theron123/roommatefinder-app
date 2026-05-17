import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

const OPTIONAL_CLAUSE_LABELS: Record<string, string> = {
  no_subletting:       'Sin subarrendamiento',
  guest_policy:        'Política de invitados (máx. 7 noches)',
  cleaning_rota:       'Turno de limpieza semanal',
  no_parties:          'Sin fiestas sin aviso de 24 h',
  parking_included:    'Estacionamiento incluido',
  internet_split:      'Internet dividido entre ocupantes',
  early_termination:   'Terminación anticipada (30 días + 1 mes)',
  renters_insurance:   'Seguro de inquilino requerido',
  temperature_control: 'Control de temperatura 68–78 °F',
};

type Contract = {
  id: string;
  type: string;
  status: string;
  clauses: any;
  selected_custom_clauses: string[];
  effective_date: string | null;
  initiator: { name: string } | null;
  counterparty: { name: string } | null;
};

const TYPE_LABELS: Record<string, string> = {
  roommate_agreement: 'Acuerdo de Roommate',
  rental_agreement:   'Contrato de Renta',
};

export default function ReviewContractScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading]   = useState(true);
  const [agreeTos, setAgreeTos] = useState(false);
  const [sending, setSending]   = useState(false);

  useEffect(() => { if (id) fetchContract(); }, [id]);

  const fetchContract = async () => {
    const { data } = await supabase
      .from('contracts')
      .select('*, initiator:initiator_id(name), counterparty:counterparty_id(name)')
      .eq('id', id)
      .single();
    setContract(data as any);
    setLoading(false);
  };

  const handleSendForAuthorization = async () => {
    if (!agreeTos) {
      Alert.alert('Acuerdo requerido', 'Debes aceptar los Términos de Servicio para continuar.');
      return;
    }
    setSending(true);
    const { error } = await supabase
      .from('contracts')
      .update({ status: 'pending_authorization', updated_at: new Date().toISOString() })
      .eq('id', id);
    setSending(false);

    if (error) {
      Alert.alert('Error', 'No se pudo enviar. Intenta de nuevo.');
      return;
    }
    Alert.alert(
      '¡Enviado! 🎉',
      'El contrato fue enviado a la otra parte para su autorización por correo electrónico.',
      [{ text: 'Ver contratos', onPress: () => router.replace('/contracts') }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator color="#49C788" style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!contract) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 80 }}>Contrato no encontrado.</Text>
      </SafeAreaView>
    );
  }

  const c = contract.clauses || {};

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#0d1117', '#000']} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Revisar Acuerdo</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Contract hero */}
        <View style={s.hero}>
          <MaterialCommunityIcons name="file-sign" size={40} color="#49C788" />
          <Text style={s.heroType}>{TYPE_LABELS[contract.type] || contract.type}</Text>
          <Text style={s.heroParties}>
            {contract.initiator?.name} → {contract.counterparty?.name}
          </Text>
          {contract.effective_date && (
            <Text style={s.heroDate}>Vigencia: {contract.effective_date}</Text>
          )}
        </View>

        {/* Sections */}
        <Section title="💰 Financiero">
          <Row label="Renta mensual"      value={c.rent ? `$${c.rent.amount}/mes` : '—'} />
          <Row label="Día de pago"        value={c.rent ? `Día ${c.rent.due_day}` : '—'} />
          <Row label="Cargo tardío"       value={c.rent ? `$${c.rent.late_fee}` : '—'} />
          <Row label="Depósito"           value={c.security_deposit ? `$${c.security_deposit.amount}` : '—'} />
          <Row label="Devolución depósito" value={c.security_deposit ? `${c.security_deposit.return_days} días` : '—'} />
        </Section>

        <Section title="🏠 Convivencia">
          <Row label="Mascotas"      value={c.pets?.allowed ? 'Permitidas ✓' : 'No permitidas'} />
          <Row label="Fumar"         value={c.smoking?.allowed ? 'Permitido ✓' : 'No permitido'} />
          <Row label="Visitas noct." value={c.visitors?.overnight_allowed ? `Sí, máx. ${c.visitors.max_nights} noches` : 'No'} />
          <Row label="Horas de silencio" value={c.noise ? `${c.noise.quiet_hours_start} – ${c.noise.quiet_hours_end}` : '—'} />
          <Row label="Limpieza"      value={c.cleaning?.schedule === 'daily' ? 'Diaria' : c.cleaning?.schedule === 'weekly' ? 'Semanal' : 'Quincenal'} />
        </Section>

        <Section title="⚖️ Términos legales">
          <Row label="Preaviso mudanza"    value={c.move_out ? `${c.move_out.notice_days} días` : '30 días'} />
          <Row label="Aviso de desalojo"   value={c.eviction ? `${c.eviction.notice_days} días` : '30 días'} />
          <Row label="Resolución de disputas" value={c.dispute?.method === 'mediation' ? 'Mediación' : 'Arbitraje'} />
          <Row label="Daños — inquilino resp." value={c.damage?.tenant_responsible ? 'Sí' : 'No'} />
          <Row label="Desgaste normal exento" value={c.damage?.normal_wear_exempt ? 'Sí' : 'No'} />
          <Row label="Inspección entrada"  value={c.move_in?.inspection_required ? 'Requerida ✓' : 'No requerida'} />
          <Row label="Inspección salida"   value={c.move_out?.inspection_required ? 'Requerida ✓' : 'No requerida'} />
          <Row label="Privacidad"          value={c.privacy?.no_recording ? 'Sin grabaciones ✓' : 'Sin restricción'} />
        </Section>

        {contract.selected_custom_clauses?.length > 0 && (
          <Section title="📋 Cláusulas adicionales">
            {contract.selected_custom_clauses.map((key: string) => (
              <Row key={key} label="•" value={OPTIONAL_CLAUSE_LABELS[key] || key} />
            ))}
          </Section>
        )}

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <MaterialCommunityIcons name="shield-alert-outline" size={20} color="#FFB800" />
          <Text style={s.disclaimerText}>
            Este documento es generado por RoommateFinder como intermediario. No sustituye un contrato revisado por abogado. Ambas partes lo firman de buena fe.
          </Text>
        </View>

        {/* ToS checkbox */}
        <Pressable style={s.tosRow} onPress={() => setAgreeTos(!agreeTos)}>
          <View style={[s.checkbox, agreeTos && s.checkboxActive]}>
            {agreeTos && <MaterialCommunityIcons name="check" size={14} color="#000" />}
          </View>
          <Text style={s.tosText}>
            Acepto los{' '}
            <Text style={{ color: '#49C788', fontWeight: '700' }} onPress={() => router.push('/terms')}>
              Términos de Servicio
            </Text>{' '}
            y doy fe de que la información proporcionada es verídica.
          </Text>
        </Pressable>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={s.footer}>
        <Pressable
          style={[s.sendBtn, !agreeTos && s.sendBtnDisabled]}
          onPress={handleSendForAuthorization}
          disabled={sending || !agreeTos}
        >
          {sending
            ? <ActivityIndicator color="#000" />
            : (
              <>
                <MaterialCommunityIcons name="send" size={20} color="#000" />
                <Text style={s.sendBtnText}>Solicitar Autorización</Text>
              </>
            )
          }
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#000' },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 8 },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  headerTitle:     { flex: 1, color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  scroll:          { paddingHorizontal: 20 },
  hero:            { alignItems: 'center', paddingVertical: 28, gap: 6 },
  heroType:        { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 8 },
  heroParties:     { color: '#888', fontSize: 14, marginTop: 2 },
  heroDate:        { color: '#49C788', fontSize: 13, fontWeight: '600', marginTop: 4 },
  section:         { marginBottom: 20 },
  sectionTitle:    { color: '#888', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  sectionBody:     { backgroundColor: '#0d1117', borderRadius: 14, borderWidth: 1, borderColor: '#1a1a2e', overflow: 'hidden' },
  row:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  rowLabel:        { color: '#666', fontSize: 13 },
  rowValue:        { color: '#fff', fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  disclaimer:      { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,184,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.25)', borderRadius: 12, padding: 14, marginBottom: 20, alignItems: 'flex-start' },
  disclaimerText:  { color: '#FFB800', fontSize: 12, lineHeight: 18, flex: 1 },
  tosRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  checkbox:        { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#333', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  checkboxActive:  { backgroundColor: '#49C788', borderColor: '#49C788' },
  tosText:         { color: '#888', fontSize: 13, lineHeight: 20, flex: 1 },
  footer:          { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 34, backgroundColor: 'rgba(0,0,0,0.95)' },
  sendBtn:         { backgroundColor: '#49C788', borderRadius: 30, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#49C788', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  sendBtnDisabled: { backgroundColor: '#1a2a22', shadowOpacity: 0 },
  sendBtnText:     { color: '#000', fontWeight: '800', fontSize: 16 },
});
