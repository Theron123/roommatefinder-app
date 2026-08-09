import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTranslation } from '../../context/LanguageContext';

import { getLegalFramework, detectCountryCode } from '@/constants/legalFrameworks';
import { generateContractHTML } from '@/utils/contractPdfTemplate';

type Contract = {
  id: string;
  type: string;
  status: string;
  clauses: any;
  selected_custom_clauses: string[];
  effective_date: string | null;
  initiator: { name: string } | null;
  contract_participants: { user: { name: string } | null }[];
  listings?: {
    title?: string | null;
    address?: string | null;
  } | null;
};

// Pantalla de revisión de un contrato en borrador: muestra sus cláusulas, permite descargar el PDF y enviarlo a autorización
export default function ReviewContractScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading]   = useState(true);
  const [agreeTos, setAgreeTos] = useState(false);
  const [sending, setSending]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const { t, locale } = useTranslation();

  // Traduce la clave de una cláusula opcional del contrato a su etiqueta localizada
  const getOptionalClauseLabel = (key: string) => {
    const dict: Record<string, { en: string; es: string }> = {
      no_subletting:       { en: 'No subletting', es: 'Sin subarrendamiento' },
      guest_policy:        { en: 'Guest policy (max. 7 nights)', es: 'Política de invitados (máx. 7 noches)' },
      cleaning_rota:       { en: 'Weekly cleaning rotation', es: 'Turno de limpieza semanal' },
      no_parties:          { en: 'No parties without 24h notice', es: 'Sin fiestas sin aviso de 24 h' },
      parking_included:    { en: 'Parking included', es: 'Estacionamiento incluido' },
      internet_split:      { en: 'Internet split between occupants', es: 'Internet dividido entre ocupantes' },
      early_termination:   { en: 'Early termination (30 days notice)', es: 'Terminación anticipada con preaviso' },
      renters_insurance:   { en: 'Renter\'s insurance required', es: 'Seguro de inquilino requerido' },
      temperature_control: { en: 'Temperature control 68–78 °F', es: 'Control de temperatura 68–78 °F' },
    };
    return dict[key]?.[locale || 'es'] || key;
  };

  // Traduce el tipo de contrato a su etiqueta localizada
  const getContractTypeLabel = (type: string) => {
    if (type === 'roommate_agreement') {
      return locale === 'es' ? 'Acuerdo Privado de Roommate y Co-living' : 'Private Roommate & Co-living Agreement';
    }
    if (type === 'rental_agreement') {
      return locale === 'es' ? 'Contrato de Arrendamiento Habitacional' : 'Residential Lease Agreement';
    }
    return type;
  };

  // Devuelve etiqueta, color e ícono según el estado del contrato
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; icon: string }> = {
      draft:                 { label: locale === 'es' ? 'Borrador' : 'Draft',   color: '#888',    bg: '#111',                    icon: 'pencil-outline' },
      pending_authorization: { label: locale === 'es' ? 'Pendiente' : 'Pending',  color: '#FFB800', bg: 'rgba(255,184,0,0.08)',    icon: 'clock-outline' },
      active:                { label: locale === 'es' ? 'Activo' : 'Active',     color: '#49C788', bg: 'rgba(73,199,136,0.08)',   icon: 'check-circle-outline' },
      terminated:            { label: locale === 'es' ? 'Terminado' : 'Terminated',  color: '#FF4B4B', bg: 'rgba(255,75,75,0.08)',    icon: 'close-circle-outline' },
    };
    return configs[status] || configs.draft;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (id) fetchContract(); }, [id]);

  // Carga el contrato por id junto con el iniciador, los participantes y el inmueble
  const fetchContract = async () => {
    const { data } = await supabase
      .from('contracts')
      .select('*, initiator:initiator_id(name), contract_participants(user:user_id(name)), listings:listing_id(title, address)')
      .eq('id', id)
      .single();
    setContract(data as any);
    setLoading(false);
  };

  // Helper para generar el Blob del PDF en Web renderizando aisladamente en un contenedor del DOM
  const generateWebPDFBlob = async (htmlContent: string, fileName: string): Promise<Blob> => {
    let html2pdfFn: any = (window as any).html2pdf;

    if (!html2pdfFn) {
      try {
        const mod = await import('html2pdf.js');
        html2pdfFn = mod.default || mod;
        if (typeof html2pdfFn !== 'function' && (html2pdfFn as any)?.default) {
          html2pdfFn = (html2pdfFn as any).default;
        }
      } catch (e) {
        console.warn("Module import of html2pdf failed, fetching script tag", e);
      }
    }

    if (!html2pdfFn || typeof html2pdfFn !== 'function') {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).html2pdf) {
          html2pdfFn = (window as any).html2pdf;
          return resolve();
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => {
          html2pdfFn = (window as any).html2pdf;
          resolve();
        };
        script.onerror = () => reject(new Error("Failed to load html2pdf script from CDN"));
        document.head.appendChild(script);
      });
    }

    // Pass htmlContent directly to html2pdf to render cleanly at 100% opacity
    const opt = {
      margin: 0,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        logging: false, 
        useCORS: true
      },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    try {
      const worker = html2pdfFn().set(opt).from(htmlContent);
      let webBlob: Blob;
      if (typeof worker.outputPdf === 'function') {
        webBlob = await worker.outputPdf('blob');
      } else if (typeof worker.output === 'function') {
        webBlob = await worker.output('blob');
      } else {
        webBlob = await worker.toPdf().output('blob');
      }
      return webBlob;
    } catch (e) {
      console.error("Error in html2pdf generation:", e);
      throw e;
    }
  };

  // Arma el HTML detallado del contrato y lo exporta como PDF (descarga directa en web, share sheet en nativo)
  const handleGenerateAndDownload = async () => {
    if (!contract) return;
    setGenerating(true);
    try {
      const html = generateContractHTML(contract, contract.status, locale);

      if (Platform.OS === 'web') {
        try {
          const blob = await generateWebPDFBlob(html, `contrato_${contract.id}.pdf`);
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `contrato_${contract.id}.pdf`;
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
          }, 1000);
        } catch (pdfErr) {
          console.warn("Direct blob generation error:", pdfErr);
          if (Platform.OS === 'web') {
            alert(locale === 'es' ? 'No se pudo procesar la descarga del PDF. Por favor reintente.' : 'Could not process PDF download.');
          }
        }
      } else {
        // Generate PDF
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        
        // Share/Download PDF
        await Sharing.shareAsync(uri, { 
          UTI: '.pdf', 
          mimeType: 'application/pdf', 
          dialogTitle: locale === 'es' ? 'Descargar Contrato' : 'Download Contract' 
        });
      }

    } catch (err) {
      console.error("Generate error:", err);
      if (Platform.OS === 'web') {
        alert(locale === 'es' ? 'Ocurrió un error al generar el PDF.' : 'An error occurred while generating the PDF.');
      } else {
        Alert.alert(locale === 'es' ? 'Error' : 'Error', locale === 'es' ? 'Ocurrió un error al generar el documento PDF.' : 'An error occurred while generating the PDF document.');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Valida la aceptación de términos y cambia el estado del contrato a pending_authorization
  const handleSendForAuthorization = async () => {
    if (!agreeTos) {
      Alert.alert(t('contracts.tos_req'), t('contracts.tos_req_desc'));
      return;
    }
    setSending(true);
    const { error } = await supabase
      .from('contracts')
      .update({ status: 'pending_authorization', updated_at: new Date().toISOString() })
      .eq('id', id);
    setSending(false);

    if (error) {
      Alert.alert(t('general.error'), locale === 'es' ? 'No se pudo enviar. Por favor intenta de nuevo.' : 'Could not send. Please try again.');
      return;
    }
    Alert.alert(
      t('contracts.send_success_title'),
      t('contracts.send_success_desc'),
      [{ text: t('contracts.view_agreements'), onPress: () => router.replace('/contracts') }]
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
        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 80 }}>{t('contracts.not_found')}</Text>
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
        <Text style={s.headerTitle}>{t('contracts.review_title')}</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Contract hero */}
        <View style={s.hero}>
          <MaterialCommunityIcons name="file-sign" size={40} color="#49C788" />
          <Text style={s.heroType}>{getContractTypeLabel(contract.type)}</Text>
          <Text style={s.heroParties}>
            {contract.initiator?.name} → {contract.contract_participants?.map(p => p.user?.name).filter(Boolean).join(', ') || (locale === 'es' ? 'Roommates' : 'Roommates')}
          </Text>
          {contract.effective_date && (
            <Text style={s.heroDate}>{t('contracts.effective_from')}: {contract.effective_date}</Text>
          )}
        </View>

        {/* Sections */}
        <Section title={t('contracts.sec_financial')}>
          <Row label={t('contracts.labels.rent')}      value={c.rent ? `$${c.rent.amount}/${locale === 'es' ? 'mes' : 'month'}` : '—'} />
          <Row label={t('contracts.labels.due_day')}        value={c.rent ? `${locale === 'es' ? 'Día' : 'Day'} ${c.rent.due_day}` : '—'} />
          <Row label={t('contracts.labels.late_fee')}       value={c.rent ? `$${c.rent.late_fee}` : '—'} />
          <Row label={t('contracts.labels.deposit')}           value={c.security_deposit ? `$${c.security_deposit.amount}` : '—'} />
          <Row label={t('contracts.labels.deposit_return')} value={c.security_deposit ? `${c.security_deposit.return_days} ${locale === 'es' ? 'días' : 'days'}` : '—'} />
        </Section>

        <Section title={t('contracts.sec_cohabitation')}>
          <Row label={t('contracts.labels.pets')}      value={c.pets?.allowed ? t('contracts.labels.allowed_check') : t('contracts.labels.no')} />
          <Row label={t('contracts.labels.smoking')}         value={c.smoking?.allowed ? t('contracts.labels.allowed_check') : t('contracts.labels.no')} />
          <Row label={t('contracts.labels.guests')} value={c.visitors?.overnight_allowed ? (locale === 'es' ? `Sí, máx. ${c.visitors.max_nights} noches` : `Yes, max ${c.visitors.max_nights} nights`) : t('contracts.labels.no')} />
          <Row label={t('contracts.labels.quiet')} value={c.noise ? `${c.noise.quiet_hours_start} – ${c.noise.quiet_hours_end}` : '—'} />
          <Row label={t('contracts.labels.cleaning')}      value={c.cleaning?.schedule ? t(`contracts.cleaning_opts.${c.cleaning.schedule}`) : '—'} />
        </Section>

        <Section title={t('contracts.sec_legal')}>
          <Row label={t('contracts.labels.move_out')}    value={c.move_out ? `${c.move_out.notice_days} ${locale === 'es' ? 'días' : 'days'}` : (locale === 'es' ? '30 días' : '30 days')} />
          <Row label={t('contracts.labels.eviction')}   value={c.eviction ? `${c.eviction.notice_days} ${locale === 'es' ? 'días' : 'days'}` : (locale === 'es' ? '30 días' : '30 days')} />
          <Row label={t('contracts.labels.dispute')} value={c.dispute?.method ? t(`contracts.labels.${c.dispute.method}`) : '—'} />
          <Row label={t('contracts.labels.damage')} value={c.damage?.tenant_responsible ? t('contracts.labels.yes') : t('contracts.labels.no')} />
          <Row label={t('contracts.labels.wear')} value={c.damage?.normal_wear_exempt ? t('contracts.labels.yes') : t('contracts.labels.no')} />
          <Row label={t('contracts.labels.move_in_insp')}  value={c.move_in?.inspection_required ? t('contracts.labels.required_check') : t('contracts.labels.not_required')} />
          <Row label={t('contracts.labels.move_out_insp')}   value={c.move_out?.inspection_required ? t('contracts.labels.required_check') : t('contracts.labels.not_required')} />
          <Row label={t('contracts.labels.privacy')}          value={c.privacy?.no_recording ? t('contracts.labels.no_recordings') : t('contracts.labels.no_restriction')} />
        </Section>

        {contract.selected_custom_clauses?.length > 0 && (
          <Section title={t('contracts.sec_additional')}>
            {contract.selected_custom_clauses.map((key: string) => (
              <Row key={key} label="•" value={getOptionalClauseLabel(key)} />
            ))}
          </Section>
        )}

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <MaterialCommunityIcons name="shield-alert-outline" size={20} color="#FFB800" />
          <Text style={s.disclaimerText}>
            {t('contracts.disclaimer')}
          </Text>
        </View>

        {/* ToS checkbox */}
        <Pressable style={s.tosRow} onPress={() => setAgreeTos(!agreeTos)}>
          <View style={[s.checkbox, agreeTos && s.checkboxActive]}>
            {agreeTos && <MaterialCommunityIcons name="check" size={14} color="#000" />}
          </View>
          <Text style={s.tosText}>
            {locale === 'es' ? (
              <>
                Acepto los{' '}
                <Text style={{ color: '#49C788', fontWeight: '700' }} onPress={() => router.push('/terms')}>
                  Términos de Servicio
                </Text>{' '}
                y certifico que la información provista es verdadera.
              </>
            ) : (
              <>
                I agree to the{' '}
                <Text style={{ color: '#49C788', fontWeight: '700' }} onPress={() => router.push('/terms')}>
                  Terms of Service
                </Text>{' '}
                and certify that the information provided is true.
              </>
            )}
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
                <Text style={s.downloadBtnText}>{t('contracts.btn_download_draft')}</Text>
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
                <Text style={s.sendBtnText}>{t('contracts.btn_req_auth')}</Text>
              </>
            )
          }
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
// Bloque de sección con título y contenedor de filas, usado para agrupar cláusulas del contrato
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

// Fila simple de etiqueta/valor dentro de una Section
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
