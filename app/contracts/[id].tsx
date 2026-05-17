import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ActivityIndicator, Alert, Linking, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  draft:                 { label: 'Borrador',   color: '#888',    bg: '#111',                    icon: 'pencil-outline' },
  pending_authorization: { label: 'Pendiente',  color: '#FFB800', bg: 'rgba(255,184,0,0.08)',    icon: 'clock-outline' },
  active:                { label: 'Activo',     color: '#49C788', bg: 'rgba(73,199,136,0.08)',   icon: 'check-circle-outline' },
  terminated:            { label: 'Terminado',  color: '#FF4B4B', bg: 'rgba(255,75,75,0.08)',    icon: 'close-circle-outline' },
};

const TYPE_LABELS: Record<string, string> = {
  roommate_agreement: 'Acuerdo de Roommate',
  rental_agreement:   'Contrato de Renta',
};

const OPTIONAL_CLAUSE_LABELS: Record<string, string> = {
  no_subletting:       'Sin subarrendamiento',
  guest_policy:        'Política de invitados (máx. 7 noches)',
  cleaning_rota:       'Turno de limpieza semanal',
  no_parties:          'Sin fiestas sin aviso de 24 h',
  parking_included:    'Estacionamiento incluido',
  internet_split:      'Internet dividido entre ocupantes',
  early_termination:   'Terminación anticipada',
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
  termination_date: string | null;
  created_at: string;
  updated_at: string;
  pdf_url: string | null;
  initiator_id: string;
  counterparty_id: string;
  initiator: { name: string } | null;
  counterparty: { name: string } | null;
};

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contract, setContract]   = useState<Contract | null>(null);
  const [loading, setLoading]     = useState(true);
  const [userId, setUserId]       = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { if (id) fetchContract(); }, [id]);

  const fetchContract = async () => {
    if (!contract) setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    setUserId(session?.user?.id || null);

    const { data } = await supabase
      .from('contracts')
      .select('*, initiator:initiator_id(name), counterparty:counterparty_id(name)')
      .eq('id', id)
      .single();

    setContract(data as any);
    setLoading(false);
  };

  const handleAccept = async () => {
    Alert.alert(
      'Aceptar contrato',
      '¿Confirmas que estás de acuerdo con todos los términos de este contrato?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            await supabase.from('contracts').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', id);
            fetchContract();
            Alert.alert('✅ Contrato activo', 'El contrato ahora está activo para ambas partes.');
          }
        }
      ]
    );
  };

  const handleTerminate = async () => {
    Alert.alert(
      'Terminar contrato',
      'Esta acción marcará el contrato como terminado. ¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Terminar',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('contracts').update({ status: 'terminated', termination_date: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() }).eq('id', id);
            fetchContract();
          }
        }
      ]
    );
  };

  const handleGenerateAndDownload = async () => {
    if (!contract) return;
    setGenerating(true);
    try {
      const c = contract.clauses || {};
      const initiatorName = contract.initiator?.name ?? 'Parte Iniciadora';
      const counterpartyName = contract.counterparty?.name ?? 'Contraparte';
      const effectiveDate = contract.effective_date ? new Date(contract.effective_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Por definir';

      // Build rows for the PDF
      const rows = [
        { label: 'Renta Mensual', val: c.rent ? `$${c.rent.amount} (Día ${c.rent.due_day})` : 'N/A' },
        { label: 'Depósito de Seguridad', val: c.security_deposit ? `$${c.security_deposit.amount}` : 'N/A' },
        { label: 'Mascotas', val: c.pets?.allowed ? 'Permitidas' : 'No permitidas' },
        { label: 'Fumar', val: c.smoking?.allowed ? 'Permitido' : 'No permitido' },
        { label: 'Visitas Nocturnas', val: c.visitors?.overnight_allowed ? `Máx. ${c.visitors.max_nights} noches` : 'No permitidas' },
        { label: 'Horas de Silencio', val: c.noise ? `${c.noise.quiet_hours_start} - ${c.noise.quiet_hours_end}` : 'N/A' },
        { label: 'Turno de Limpieza', val: c.cleaning?.schedule === 'daily' ? 'Diaria' : c.cleaning?.schedule === 'weekly' ? 'Semanal' : 'Quincenal' },
        { label: 'Aviso de Mudanza', val: c.move_out ? `${c.move_out.notice_days} días` : '30 días' },
      ];

      const customRows = (contract.selected_custom_clauses || []).map((key: string) => `
        <tr>
          <td style="padding:12px; border-bottom:1px solid #eaeaea; color:#333;" colspan="2">
            &bull; ${OPTIONAL_CLAUSE_LABELS[key] || key}
          </td>
        </tr>
      `).join('');

      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Contrato ${contract.id}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #222; margin: 0; padding: 40px; background: #fff; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #49C788; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #1a1a2e; font-size: 28px; letter-spacing: -0.5px; }
          .header p { color: #666; font-size: 14px; margin-top: 8px; }
          .badge { display: inline-block; background: #e0f2e9; color: #1e8751; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 12px; margin-top: 10px; }
          .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .party-box { width: 45%; padding: 20px; background: #fafafa; border-radius: 8px; border-left: 4px solid #49C788; }
          .party-box p { margin: 0; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
          .party-box h3 { margin: 8px 0 0; font-size: 20px; color: #1a1a2e; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { text-align: left; background: #1a1a2e; color: #fff; padding: 12px; font-size: 14px; }
          td { padding: 12px; border-bottom: 1px solid #eaeaea; font-size: 14px; color: #444; }
          td:first-child { font-weight: bold; color: #1a1a2e; width: 40%; }
          .disclaimer { font-size: 12px; color: #666; padding: 16px; background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; margin-top: 40px; line-height: 1.5; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
          .sig-line { width: 45%; border-top: 1px solid #333; padding-top: 10px; }
          .sig-line p { margin: 0; font-size: 14px; font-weight: bold; color: #1a1a2e; }
          .sig-line span { font-size: 12px; color: #888; }
          .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${TYPE_LABELS[contract.type] || 'Acuerdo'}</h1>
          <p>Generado vía RoommateFinder App</p>
          <div class="badge">ESTADO: ${STATUS_CONFIG[contract.status]?.label?.toUpperCase() || 'ACTIVO'}</div>
        </div>

        <div class="parties">
          <div class="party-box">
            <p>Iniciador</p>
            <h3>${initiatorName}</h3>
          </div>
          <div class="party-box">
            <p>Contraparte</p>
            <h3>${counterpartyName}</h3>
          </div>
        </div>

        <p style="font-size: 14px; color: #444; margin-bottom: 20px;">
          <strong>ID del Contrato:</strong> <span style="font-family: monospace;">${contract.id}</span><br>
          <strong>Fecha Efectiva:</strong> ${effectiveDate}
        </p>

        <table>
          <tr>
            <th colspan="2">Términos Acordados</th>
          </tr>
          ${rows.map(r => `<tr><td>${r.label}</td><td>${r.val}</td></tr>`).join('')}
          ${customRows ? `<tr><th colspan="2" style="background:#49C788;">Cláusulas Adicionales</th></tr>${customRows}` : ''}
        </table>

        <div class="disclaimer">
          <strong>Aviso Legal:</strong> Este documento fue generado a través de la plataforma RoommateFinder. RoommateFinder actúa únicamente como herramienta intermediaria y no sustituye el asesoramiento legal profesional. Las firmas electrónicas a continuación representan la aceptación de las partes dentro de la aplicación.
        </div>

        <div class="signatures">
          <div class="sig-line">
            <p>${initiatorName}</p>
            <span>Firmado electrónicamente (RoommateFinder)</span>
          </div>
          <div class="sig-line">
            <p>${counterpartyName}</p>
            <span>Firmado electrónicamente (RoommateFinder)</span>
          </div>
        </div>

        <div class="footer">
          Generado el ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })} &bull; Página 1 de 1
        </div>
      </body>
      </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      
      // Share/Download PDF
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Descargar Contrato' });

    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Ocurrió un error al generar el documento PDF.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={s.container}><ActivityIndicator color="#49C788" style={{ marginTop: 80 }} /></SafeAreaView>;
  }

  if (!contract) {
    return <SafeAreaView style={s.container}><Text style={{ color: '#fff', textAlign: 'center', marginTop: 80 }}>No encontrado.</Text></SafeAreaView>;
  }

  const st    = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
  const c     = contract.clauses || {};
  const isCP  = contract.counterparty_id === userId; // es la otra parte
  const isInit = contract.initiator_id === userId;
  const canAccept = isCP && contract.status === 'pending_authorization';
  const canTerminate = (isInit || isCP) && (contract.status === 'active' || contract.status === 'pending_authorization');

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#0d1117', '#000']} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Contrato</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* Status banner */}
      <View style={[s.statusBanner, { backgroundColor: st.bg, borderColor: st.color + '44' }]}>
        <MaterialCommunityIcons name={st.icon as any} size={18} color={st.color} />
        <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
        <Text style={s.statusDate}>
          Actualizado: {new Date(contract.updated_at).toLocaleDateString('es-MX')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroType}>{TYPE_LABELS[contract.type] || contract.type}</Text>
          <View style={s.partiesRow}>
            <View style={s.partyChip}>
              <MaterialCommunityIcons name="account" size={14} color="#49C788" />
              <Text style={s.partyName}>{contract.initiator?.name}</Text>
              <Text style={s.partyRole}>Iniciador</Text>
            </View>
            <MaterialCommunityIcons name="arrow-left-right" size={18} color="#333" />
            <View style={s.partyChip}>
              <MaterialCommunityIcons name="account" size={14} color="#FFB800" />
              <Text style={s.partyName}>{contract.counterparty?.name}</Text>
              <Text style={s.partyRole}>Contraparte</Text>
            </View>
          </View>
          {contract.effective_date && (
            <Text style={s.heroDate}>📅 Vigente desde: {contract.effective_date}</Text>
          )}
        </View>

        {/* Clauses */}
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
          <Row label="Silencio"      value={c.noise ? `${c.noise.quiet_hours_start} – ${c.noise.quiet_hours_end}` : '—'} />
          <Row label="Limpieza"      value={c.cleaning?.schedule === 'daily' ? 'Diaria' : c.cleaning?.schedule === 'weekly' ? 'Semanal' : 'Quincenal'} />
        </Section>

        <Section title="⚖️ Términos legales">
          <Row label="Preaviso mudanza"      value={c.move_out ? `${c.move_out.notice_days} días` : '30 días'} />
          <Row label="Aviso desalojo"        value={c.eviction ? `${c.eviction.notice_days} días` : '30 días'} />
          <Row label="Resolución disputas"   value={c.dispute?.method === 'mediation' ? 'Mediación' : 'Arbitraje'} />
          <Row label="Daños — inquilino"     value={c.damage?.tenant_responsible ? 'Responsable' : 'No responsable'} />
          <Row label="Desgaste normal"       value={c.damage?.normal_wear_exempt ? 'Exento ✓' : 'No exento'} />
          <Row label="Inspección entrada"    value={c.move_in?.inspection_required ? 'Requerida ✓' : 'No requerida'} />
          <Row label="Inspección salida"     value={c.move_out?.inspection_required ? 'Requerida ✓' : 'No requerida'} />
        </Section>

        {contract.selected_custom_clauses?.length > 0 && (
          <Section title="📋 Cláusulas adicionales">
            {contract.selected_custom_clauses.map((key: string) => (
              <Row key={key} label="•" value={OPTIONAL_CLAUSE_LABELS[key] || key} />
            ))}
          </Section>
        )}

        {/* Contract ID */}
        <View style={s.idRow}>
          <Text style={s.idLabel}>ID del contrato</Text>
          <Text style={s.idValue} numberOfLines={1}>{contract.id}</Text>
        </View>

        {/* Actions */}
        <View style={s.actionsCol}>
          {/* Accept (counterparty only, when pending) */}
          {canAccept && (
            <Pressable style={s.acceptBtn} onPress={handleAccept}>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#000" />
              <Text style={s.acceptBtnText}>Aceptar Contrato</Text>
            </Pressable>
          )}

          {/* Generate/Download document */}
          {(contract.status === 'active' || contract.status === 'pending_authorization') && (
            <Pressable style={s.downloadBtn} onPress={handleGenerateAndDownload} disabled={generating}>
              {generating
                ? <ActivityIndicator color="#49C788" />
                : <>
                    <MaterialCommunityIcons name="file-pdf-box" size={20} color="#49C788" />
                    <Text style={s.downloadBtnText}>Descargar PDF</Text>
                  </>
              }
            </Pressable>
          )}

          {/* Terminate */}
          {canTerminate && (
            <Pressable style={s.terminateBtn} onPress={handleTerminate}>
              <MaterialCommunityIcons name="close-circle-outline" size={20} color="#FF4B4B" />
              <Text style={s.terminateBtnText}>Terminar Contrato</Text>
            </Pressable>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
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
  container:      { flex: 1, backgroundColor: '#000' },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 8 },
  backBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  headerTitle:    { flex: 1, color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  statusBanner:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 4, borderRadius: 12, padding: 12, gap: 8, borderWidth: 1 },
  statusText:     { fontWeight: '700', fontSize: 14 },
  statusDate:     { color: '#555', fontSize: 12, marginLeft: 'auto' },
  scroll:         { paddingHorizontal: 20, paddingTop: 12 },
  hero:           { alignItems: 'center', paddingVertical: 20, gap: 10, marginBottom: 8 },
  heroType:       { color: '#fff', fontSize: 20, fontWeight: '800' },
  partiesRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  partyChip:      { alignItems: 'center', gap: 2 },
  partyName:      { color: '#fff', fontSize: 13, fontWeight: '700' },
  partyRole:      { color: '#555', fontSize: 11 },
  heroDate:       { color: '#49C788', fontSize: 13, fontWeight: '600' },
  section:        { marginBottom: 16 },
  sectionTitle:   { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  sectionBody:    { backgroundColor: '#0d1117', borderRadius: 14, borderWidth: 1, borderColor: '#1a1a2e', overflow: 'hidden' },
  row:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  rowLabel:       { color: '#666', fontSize: 13 },
  rowValue:       { color: '#fff', fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  idRow:          { backgroundColor: '#0d1117', borderRadius: 12, borderWidth: 1, borderColor: '#1a1a2e', padding: 14, marginBottom: 20 },
  idLabel:        { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  idValue:        { color: '#333', fontSize: 11, fontFamily: 'monospace' },
  actionsCol:     { gap: 10, marginBottom: 12 },
  acceptBtn:      { backgroundColor: '#49C788', borderRadius: 30, paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#49C788', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  acceptBtnText:  { color: '#000', fontWeight: '800', fontSize: 16 },
  downloadBtn:    { backgroundColor: 'rgba(73,199,136,0.1)', borderRadius: 30, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#49C788' },
  downloadBtnText:{ color: '#49C788', fontWeight: '700', fontSize: 15 },
  openUrlBtn:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 8 },
  openUrlText:    { color: '#555', fontSize: 13 },
  terminateBtn:   { backgroundColor: 'rgba(255,75,75,0.08)', borderRadius: 30, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: 'rgba(255,75,75,0.3)' },
  terminateBtnText:{ color: '#FF4B4B', fontWeight: '700', fontSize: 15 },
});
