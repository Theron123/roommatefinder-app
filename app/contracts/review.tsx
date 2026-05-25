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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
  contract_participants: { user: { name: string } | null }[];
};

const TYPE_LABELS: Record<string, string> = {
  roommate_agreement: 'Acuerdo de Roommate',
  rental_agreement:   'Contrato de Renta',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  draft:                 { label: 'Borrador',   color: '#888',    bg: '#111',                    icon: 'pencil-outline' },
  pending_authorization: { label: 'Pendiente',  color: '#FFB800', bg: 'rgba(255,184,0,0.08)',    icon: 'clock-outline' },
  active:                { label: 'Activo',     color: '#49C788', bg: 'rgba(73,199,136,0.08)',   icon: 'check-circle-outline' },
  terminated:            { label: 'Terminado',  color: '#FF4B4B', bg: 'rgba(255,75,75,0.08)',    icon: 'close-circle-outline' },
};

export default function ReviewContractScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading]   = useState(true);
  const [agreeTos, setAgreeTos] = useState(false);
  const [sending, setSending]   = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { if (id) fetchContract(); }, [id]);

  const fetchContract = async () => {
    const { data } = await supabase
      .from('contracts')
      .select('*, initiator:initiator_id(name), contract_participants(user:user_id(name))')
      .eq('id', id)
      .single();
    setContract(data as any);
    setLoading(false);
  };

  const handleGenerateAndDownload = async () => {
    if (!contract) return;
    setGenerating(true);
    try {
      const c = contract.clauses || {};
      const initiatorName = contract.initiator?.name ?? 'Parte Iniciadora';
      const counterparties = contract.contract_participants?.map(p => p.user?.name).filter(Boolean) || [];
      const counterpartyName = counterparties.join(', ') || 'Roommates';
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

        const signatureBlocks = contract.contract_participants?.map(p => `
          <div class="sig-line">
            <p>${p.user?.name || 'Roommate'}</p>
            <span>Firmado Electrónicamente (RoommateFinder App)</span>
          </div>
        `).join('') || `
          <div class="sig-line">
            <p>Contraparte</p>
            <span>Firmado Electrónicamente (RoommateFinder App)</span>
          </div>
        `;

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
              flex-wrap: wrap;
            }
            .party-box { 
              width: 48%; 
              padding: 18px; 
              background: #f8f9fa; 
              border-radius: 12px; 
              border: 1px solid #eee;
              border-left: 4px solid #49C788; 
              box-sizing: border-box;
              margin-bottom: 12px;
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
              flex-wrap: wrap;
            }
            .sig-line { 
              width: 48%; 
              border-top: 1px solid #cbd5e1; 
              padding-top: 12px; 
              box-sizing: border-box;
              margin-bottom: 20px;
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
            ${contract.contract_participants?.map(p => `
              <div class="party-box">
                <p>Contraparte Aceptante</p>
                <h3>${p.user?.name || 'Roommate'}</h3>
              </div>
            `).join('')}
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
            ${signatureBlocks}
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
            {contract.initiator?.name} → {contract.contract_participants?.map(p => p.user?.name).filter(Boolean).join(', ') || 'Roommates'}
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
          style={s.downloadBtn}
          onPress={handleGenerateAndDownload}
          disabled={generating}
        >
          {generating
            ? <ActivityIndicator color="#49C788" />
            : (
              <>
                <MaterialCommunityIcons name="file-pdf-box" size={20} color="#49C788" />
                <Text style={s.downloadBtnText}>Descargar Borrador PDF</Text>
              </>
            )
          }
        </Pressable>

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
  footer:          { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 34, backgroundColor: 'rgba(0,0,0,0.95)', gap: 10 },
  sendBtn:         { backgroundColor: '#49C788', borderRadius: 30, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#49C788', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  sendBtnDisabled: { backgroundColor: '#1a2a22', shadowOpacity: 0 },
  sendBtnText:     { color: '#000', fontWeight: '800', fontSize: 16 },
  downloadBtn:     { backgroundColor: 'rgba(73,199,136,0.1)', borderRadius: 30, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#49C788' },
  downloadBtnText: { color: '#49C788', fontWeight: '700', fontSize: 15 },
});
