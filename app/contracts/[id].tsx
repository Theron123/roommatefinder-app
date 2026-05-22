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

      // Define structured sections for a premium, extremely detailed document
      const financialRows = [
        { label: 'Renta Mensual', val: c.rent ? `$${c.rent.amount} / mes` : '—' },
        { label: 'Día de Vencimiento', val: c.rent ? `Día ${c.rent.due_day} de cada mes` : '—' },
        { label: 'Cargo por Pago Tardío', val: c.rent ? `$${c.rent.late_fee}` : '—' },
        { label: 'Depósito de Seguridad', val: c.security_deposit ? `$${c.security_deposit.amount}` : '—' },
        { label: 'Plazo para Devolución de Depósito', val: c.security_deposit ? `${c.security_deposit.return_days} días hábiles` : '—' },
      ];

      const cohabitationRows = [
        { label: 'Mascotas en la Propiedad', val: c.pets?.allowed ? 'Permitidas' : 'No permitidas' },
        { label: 'Fumar en Espacios Interiores', val: c.smoking?.allowed ? 'Permitido' : 'No permitido' },
        { label: 'Visitas y Alojamiento Nocturno', val: c.visitors?.overnight_allowed ? `Permitidas (máx. ${c.visitors.max_nights} noches)` : 'No permitidas' },
        { label: 'Horario de Silencio Establecido', val: c.noise ? `${c.noise.quiet_hours_start} a ${c.noise.quiet_hours_end}` : '—' },
        { label: 'Programa de Limpieza Común', val: c.cleaning?.schedule === 'daily' ? 'Diario' : c.cleaning?.schedule === 'weekly' ? 'Semanal' : 'Quincenal' },
      ];

      const legalRows = [
        { label: 'Preaviso para Desocupación', val: c.move_out ? `${c.move_out.notice_days} días` : '30 días' },
        { label: 'Preaviso para Desalojo/Fin de Plazo', val: c.eviction ? `${c.eviction.notice_days} días` : '30 días' },
        { label: 'Resolución de Disputas', val: c.dispute?.method === 'mediation' ? 'Mediación formal de buena fe' : 'Arbitraje vinculante' },
        { label: 'Responsabilidad por Daños Locativos', val: c.damage?.tenant_responsible ? 'Cargo directo al inquilino causante' : 'Sujeto a negociación directa' },
        { label: 'Desgaste Natural por Uso Razonable', val: c.damage?.normal_wear_exempt ? 'Exento de cargos (uso cotidiano normal)' : 'Sujeto a evaluación' },
        { label: 'Inspección Obligatoria de Entrada', val: c.move_in?.inspection_required ? 'Requerida con reporte firmado' : 'Opcional' },
        { label: 'Inspección Obligatoria de Salida', val: c.move_out?.inspection_required ? 'Requerida con reporte firmado' : 'Opcional' },
        { label: 'Privacidad (Grabaciones)', val: c.privacy?.no_recording ? 'Prohibidas las grabaciones de voz/video sin consentimiento' : 'Sin restricciones específicas' },
      ];

      const customRows = (contract.selected_custom_clauses || []).map((key: string) => `
        <div class="custom-clause-item">&bull; ${OPTIONAL_CLAUSE_LABELS[key] || key}</div>
      `).join('');

      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Contrato ${contract.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
          body { 
            font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif; 
            color: #2c3e50; 
            margin: 0; 
            padding: 50px; 
            background: #fff; 
            line-height: 1.6;
          }
          .header { 
            text-align: center; 
            margin-bottom: 40px; 
            border-bottom: 2px solid #eaeaea; 
            padding-bottom: 25px; 
            position: relative;
          }
          .header h1 { 
            margin: 0; 
            color: #0d1117; 
            font-size: 26px; 
            font-weight: 800;
            letter-spacing: -0.5px; 
          }
          .header p { 
            color: #7f8c8d; 
            font-size: 13px; 
            margin-top: 6px; 
            font-weight: 400;
          }
          .badge { 
            display: inline-block; 
            background: rgba(73, 199, 136, 0.12); 
            color: #27ae60; 
            padding: 6px 16px; 
            border-radius: 20px; 
            font-weight: 600; 
            font-size: 11px; 
            margin-top: 12px;
            letter-spacing: 0.5px;
            border: 1px solid rgba(73, 199, 136, 0.25);
          }
          .parties { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 35px; 
            gap: 20px;
          }
          .party-box { 
            width: 48%; 
            padding: 18px; 
            background: #f8f9fa; 
            border-radius: 12px; 
            border: 1px solid #eee;
            border-left: 4px solid #49C788; 
            box-sizing: border-box;
          }
          .party-box p { 
            margin: 0; 
            font-size: 11px; 
            color: #95a5a6; 
            text-transform: uppercase; 
            letter-spacing: 1.2px; 
            font-weight: 600; 
          }
          .party-box h3 { 
            margin: 6px 0 0; 
            font-size: 18px; 
            color: #2c3e50; 
            font-weight: 600;
          }
          .metadata-box {
            background: #fdfdfd;
            border: 1px dashed #e2e8f0;
            border-radius: 8px;
            padding: 14px 20px;
            margin-bottom: 30px;
            font-size: 13px;
            color: #4a5568;
          }
          .metadata-box strong { color: #0d1117; }
          .section-title {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #0d1117;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 6px;
            margin-top: 30px;
            margin-bottom: 12px;
            font-weight: 800;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px; 
          }
          td { 
            padding: 11px 14px; 
            border-bottom: 1px solid #f1f5f9; 
            font-size: 13.5px; 
            color: #475569; 
          }
          td:first-child { 
            font-weight: 600; 
            color: #1e293b; 
            width: 45%; 
          }
          .custom-clause-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px;
            margin-top: 10px;
            margin-bottom: 25px;
          }
          .custom-clause-item {
            font-size: 13.5px;
            color: #475569;
            padding: 6px 0;
            border-bottom: 1px dashed #f1f5f9;
          }
          .custom-clause-item:last-child {
            border-bottom: none;
          }
          .disclaimer { 
            font-size: 11.5px; 
            color: #7f8c8d; 
            padding: 16px 20px; 
            background: #fffdf5; 
            border: 1px solid #fef3c7; 
            border-radius: 10px; 
            margin-top: 35px; 
            line-height: 1.6; 
          }
          .disclaimer strong { color: #d97706; }
          .signatures { 
            display: flex; 
            justify-content: space-between; 
            margin-top: 50px; 
            gap: 20px;
          }
          .sig-line { 
            width: 48%; 
            border-top: 1px solid #cbd5e1; 
            padding-top: 12px; 
            box-sizing: border-box;
          }
          .sig-line p { 
            margin: 0; 
            font-size: 14px; 
            font-weight: 600; 
            color: #0d1117; 
          }
          .sig-line span { 
            font-size: 11px; 
            color: #94a3b8; 
          }
          .footer { 
            margin-top: 60px; 
            text-align: center; 
            font-size: 11px; 
            color: #94a3b8; 
            border-top: 1px solid #f1f5f9; 
            padding-top: 20px; 
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${TYPE_LABELS[contract.type] || 'Acuerdo de Convivencia'}</h1>
          <p>Acuerdo Digital Oficial &bull; Generado mediante RoommateFinder App</p>
          <div class="badge">ESTADO: ${STATUS_CONFIG[contract.status]?.label?.toUpperCase() || 'ACTIVO'}</div>
        </div>

        <div class="parties">
          <div class="party-box">
            <p>Iniciador del Acuerdo</p>
            <h3>${initiatorName}</h3>
          </div>
          <div class="party-box">
            <p>Contraparte Aceptante</p>
            <h3>${counterpartyName}</h3>
          </div>
        </div>

        <div class="metadata-box">
          <strong>Identificador Único:</strong> <span style="font-family: monospace; font-size:12px; color:#64748b;">${contract.id}</span><br>
          <strong>Fecha de Activación:</strong> ${effectiveDate}
        </div>

        <div class="section-title">💸 Puntos Financieros</div>
        <table>
          ${financialRows.map(r => `<tr><td>${r.label}</td><td>${r.val}</td></tr>`).join('')}
        </table>

        <div class="section-title">🏠 Convivencia y Reglas del Hogar</div>
        <table>
          ${cohabitationRows.map(r => `<tr><td>${r.label}</td><td>${r.val}</td></tr>`).join('')}
        </table>

        <div class="section-title">⚖️ Cláusulas y Términos Legales</div>
        <table>
          ${legalRows.map(r => `<tr><td>${r.label}</td><td>${r.val}</td></tr>`).join('')}
        </table>

        ${customRows ? `
          <div class="section-title">📋 Cláusulas Adicionales Acordadas</div>
          <div class="custom-clause-box">
            ${customRows}
          </div>
        ` : ''}

        <div class="disclaimer">
          <strong>Aviso de Responsabilidad Legal:</strong> Este contrato constituye un acuerdo privado vinculante acordado libremente y firmado digitalmente de buena fe por ambas partes en la plataforma RoommateFinder. RoommateFinder actúa únicamente como un servicio tecnológico intermediario para facilitar la negociación de convivencia y no es responsable del cumplimiento del contrato, no proporciona asesoría legal ni asume ninguna responsabilidad civil o penal derivada de este documento.
        </div>

        <div class="signatures">
          <div class="sig-line">
            <p>${initiatorName}</p>
            <span>Firmado Electrónicamente (RoommateFinder App)</span>
          </div>
          <div class="sig-line">
            <p>${counterpartyName}</p>
            <span>Firmado Electrónicamente (RoommateFinder App)</span>
          </div>
        </div>

        <div class="footer">
          Generado automáticamente el ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })} &bull; Copia Digital Válida &bull; Página 1 de 1
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
          <Pressable style={s.downloadBtn} onPress={handleGenerateAndDownload} disabled={generating}>
            {generating
              ? <ActivityIndicator color="#49C788" />
              : <>
                  <MaterialCommunityIcons name="file-pdf-box" size={20} color="#49C788" />
                  <Text style={s.downloadBtnText}>Descargar PDF</Text>
                </>
            }
          </Pressable>

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
