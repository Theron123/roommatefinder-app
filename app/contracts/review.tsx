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
      early_termination:   { en: 'Early termination (30 days + 1 month)', es: 'Terminación anticipada' },
      renters_insurance:   { en: 'Renter\'s insurance required', es: 'Seguro de inquilino requerido' },
      temperature_control: { en: 'Temperature control 68–78 °F', es: 'Control de temperatura 68–78 °F' },
    };
    return dict[key]?.[locale] || key;
  };

  // Traduce el tipo de contrato a su etiqueta localizada
  const getContractTypeLabel = (type: string) => {
    if (type === 'roommate_agreement') {
      return locale === 'es' ? 'Acuerdo de Roommate' : 'Roommate Agreement';
    }
    if (type === 'rental_agreement') {
      return locale === 'es' ? 'Contrato de Renta' : 'Rental Agreement';
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

  // Carga el contrato por id junto con el iniciador y los participantes
  const fetchContract = async () => {
    const { data } = await supabase
      .from('contracts')
      .select('*, initiator:initiator_id(name), contract_participants(user:user_id(name))')
      .eq('id', id)
      .single();
    setContract(data as any);
    setLoading(false);
  };

  // Arma el HTML detallado del contrato y lo exporta como PDF (descarga directa en web, share sheet en nativo)
  const handleGenerateAndDownload = async () => {
    if (!contract) return;
    setGenerating(true);
    try {
      const c = contract.clauses || {};
      const initiatorName = contract.initiator?.name ?? (locale === 'es' ? 'Parte Iniciadora' : 'Initiating Party');
      const participants = contract.contract_participants || [];
      const counterpartyName = participants.map((p: any) => p.user?.name).filter(Boolean).join(', ') || (locale === 'es' ? 'Contraparte' : 'Counterparty');
      
      const effectiveDate = contract.effective_date 
        ? new Date(contract.effective_date).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) 
        : (locale === 'es' ? 'Por definir' : 'TBD');

      // Define structured sections for a premium, extremely detailed document
      const financialRows = locale === 'es' ? [
        { label: 'Renta Mensual', val: c.rent?.amount ? `$${c.rent.amount} / mes` : '—' },
        { label: 'Día de Vencimiento', val: c.rent?.due_day ? `Día ${c.rent.due_day} de cada mes` : '—' },
        { label: 'Cargo por Pago Tardío', val: c.rent?.late_fee ? `$${c.rent.late_fee}` : 'N/A' },
        { label: 'Depósito de Seguridad', val: c.security_deposit?.amount ? `$${c.security_deposit.amount}` : '—' },
        { label: 'Plazo de Devolución de Depósito', val: c.security_deposit?.return_days ? `${c.security_deposit.return_days} días hábiles` : '15 días hábiles' },
      ] : [
        { label: 'Monthly Rent', val: c.rent?.amount ? `$${c.rent.amount} / month` : '—' },
        { label: 'Due Date', val: c.rent?.due_day ? `Day ${c.rent.due_day} of each month` : '—' },
        { label: 'Late Payment Fee', val: c.rent?.late_fee ? `$${c.rent.late_fee}` : 'N/A' },
        { label: 'Security Deposit', val: c.security_deposit?.amount ? `$${c.security_deposit.amount}` : '—' },
        { label: 'Deposit Return Timeline', val: c.security_deposit?.return_days ? `${c.security_deposit.return_days} business days` : '15 business days' },
      ];

      const cohabitationRows = locale === 'es' ? [
        { label: 'Mascotas en la Propiedad', val: c.pets?.allowed ? 'Permitidas' : 'No permitidas' },
        { label: 'Fumar en Espacios Interiores', val: c.smoking?.allowed ? 'Permitido' : 'No permitido' },
        { label: 'Visitas y Alojamiento Nocturno', val: c.visitors?.overnight_allowed ? `Permitidas (máx. ${c.visitors.max_nights || 3} noches)` : 'No permitidas' },
        { label: 'Horario de Silencio Establecido', val: c.noise ? `${c.noise.quiet_hours_start} a ${c.noise.quiet_hours_end}` : '—' },
        { label: 'Programa de Limpieza Común', val: c.cleaning?.schedule === 'daily' ? 'Diario' : c.cleaning?.schedule === 'weekly' ? 'Semanal' : 'Quincenal' },
      ] : [
        { label: 'Pets on Property', val: c.pets?.allowed ? 'Allowed' : 'Not allowed' },
        { label: 'Smoking Indoors', val: c.smoking?.allowed ? 'Allowed' : 'Not allowed' },
        { label: 'Guests & Overnight Stays', val: c.visitors?.overnight_allowed ? `Allowed (max ${c.visitors.max_nights || 3} nights)` : 'Not allowed' },
        { label: 'Quiet Hours Schedule', val: c.noise ? `${c.noise.quiet_hours_start} to ${c.noise.quiet_hours_end}` : '—' },
        { label: 'Cleaning Schedule', val: c.cleaning?.schedule === 'daily' ? 'Daily' : c.cleaning?.schedule === 'weekly' ? 'Weekly' : 'Biweekly' },
      ];

      const legalRows = locale === 'es' ? [
        { label: 'Preaviso para Desocupación', val: c.move_out ? `${c.move_out.notice_days} días` : '30 días' },
        { label: 'Preaviso para Desalojo/Fin de Plazo', val: c.eviction ? `${c.eviction.notice_days} días` : '30 días' },
        { label: 'Resolución de Disputas', val: c.dispute?.method === 'mediation' ? 'Mediación formal de buena fe' : 'Arbitraje vinculante' },
        { label: 'Responsabilidad por Daños Locativos', val: c.damage?.tenant_responsible ? 'Cargo directo al inquilino causante' : 'Sujeto a negociación directa' },
        { label: 'Desgaste Natural por Uso Razonable', val: c.damage?.normal_wear_exempt ? 'Exento de cargos (uso cotidiano normal)' : 'Sujeto a evaluación' },
        { label: 'Inspección Obligatoria de Entrada', val: c.move_in?.inspection_required ? 'Requerida con reporte firmado' : 'Opcional' },
        { label: 'Inspección Obligatoria de Salida', val: c.move_out?.inspection_required ? 'Requerida con reporte firmado' : 'Opcional' },
        { label: 'Privacidad (Grabaciones)', val: c.privacy?.no_recording ? 'Prohibidas las grabaciones de voz/video sin consentimiento' : 'Sin restricciones específicas' },
      ] : [
        { label: 'Move-out Notice Period', val: c.move_out ? `${c.move_out.notice_days} days` : '30 days' },
        { label: 'Eviction Notice Period', val: c.eviction ? `${c.eviction.notice_days} days` : '30 days' },
        { label: 'Dispute Resolution', val: c.dispute?.method === 'mediation' ? 'Formal good-faith mediation' : 'Binding arbitration' },
        { label: 'Liability for Property Damage', val: c.damage?.tenant_responsible ? 'Charged to responsible tenant' : 'Subject to direct negotiation' },
        { label: 'Normal Wear and Tear Exemption', val: c.damage?.normal_wear_exempt ? 'Exempt from charges (normal daily use)' : 'Subject to evaluation' },
        { label: 'Mandatory Move-in Inspection', val: c.move_in?.inspection_required ? 'Required with signed report' : 'Optional' },
        { label: 'Mandatory Move-out Inspection', val: c.move_out?.inspection_required ? 'Required with signed report' : 'Optional' },
        { label: 'Privacy (Recordings)', val: c.privacy?.no_recording ? 'Voice/video recordings without consent prohibited' : 'No specific restrictions' },
      ];

      const customRows = (contract.selected_custom_clauses || []).map((key: string) => `
        <div class="custom-clause-item">&bull; ${getOptionalClauseLabel(key)}</div>
      `).join('');
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${locale === 'es' ? 'Contrato' : 'Contract'} ${contract.id}</title>
        <style>
          @page {
            size: letter;
            margin: 0;
          }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            color: #1e293b; 
            margin: 0; 
            padding: 0; 
            background: #fff; 
            line-height: 1.5;
          }
          .page-wrapper {
            padding: 100px 50px 80px 50px;
            position: relative;
            box-sizing: border-box;
            min-height: 100vh;
          }
          .wave-header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 120px;
            overflow: hidden;
            z-index: 10;
          }
          .wave-footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 100px;
            overflow: hidden;
            z-index: 10;
          }
          .metadata-table {
            width: 100%;
            border: none;
            margin-bottom: 30px;
            border-collapse: collapse;
          }
          .metadata-table td {
            border: none !important;
            padding: 0 0 8px 0 !important;
            background: none !important;
            vertical-align: middle;
          }
          .meta-line {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1.5px solid #49C788;
          }
          .contract-title {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 10px 0;
            font-family: Georgia, serif;
          }
          .intro-text {
            font-size: 12px;
            color: #475569;
            margin-bottom: 20px;
            text-align: justify;
            line-height: 1.6;
          }
          .parties-box {
            margin-bottom: 25px;
            font-size: 12px;
            color: #0f172a;
            border-left: 3px solid #49C788;
            padding-left: 12px;
            line-height: 1.6;
          }
          .section-header {
            font-size: 10px;
            font-weight: 800;
            color: #49C788;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 22px;
            margin-bottom: 6px;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .data-table td {
            padding: 7px 0 !important;
            border-bottom: 1px solid #f1f5f9 !important;
            font-size: 11.5px !important;
            background: none !important;
          }
          .data-table td.label {
            color: #475569;
            font-weight: 600;
            width: 50%;
          }
          .data-table td.value {
            color: #0f172a;
            font-weight: 700;
            text-align: right;
          }
          .signatures-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 40px;
          }
          .signatures-table td {
            border: none !important;
            padding: 0 !important;
            background: none !important;
            vertical-align: top;
          }
          .sig-line {
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
          }
          .sig-name {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
          }
          .sig-desc {
            font-size: 9px;
            color: #64748b;
            margin-top: 2px;
          }
          .sig-seal {
            margin-top: 4px;
            font-size: 7.5px;
            font-family: monospace;
            color: #10b981;
            background: #f0fdf4;
            padding: 1px 4px;
            border-radius: 4px;
            display: inline-block;
          }
          .contact-info {
            font-size: 8.5px;
            color: #64748b;
            text-align: center;
            margin-top: 30px;
            border-top: 1px solid #f1f5f9;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          <!-- SVG waves header -->
          <div class="wave-header">
            <svg viewBox="0 0 1440 120" preserveAspectRatio="none" style="width: 100%; height: 100%;">
              <path d="M0,0 C360,60 720,20 1080,80 C1260,110 1380,80 1440,50 L1440,0 L0,0 Z" fill="#bcf2d8" opacity="0.4"></path>
              <path d="M0,0 C360,50 720,80 1080,40 C1260,25 1380,60 1440,70 L1440,0 L0,0 Z" fill="#49C788"></path>
            </svg>
          </div>

          <table class="metadata-table">
            <tr>
              <td class="meta-line" style="width: 35%;">${locale === 'es' ? 'San José, Costa Rica' : 'RoommateFinder Legal'}</td>
              <td style="width: 30%; text-align: center;">
                <!-- Circle logo in teal -->
                <svg width="28" height="28" viewBox="0 0 100 100" style="display: inline-block; vertical-align: middle;">
                  <circle cx="50" cy="50" r="42" stroke="#49C788" stroke-width="8" fill="none" />
                  <path d="M50,18 L50,50 L78,50" stroke="#49C788" stroke-width="8" stroke-linecap="round" fill="none" />
                  <circle cx="50" cy="50" r="10" fill="#49C788" />
                </svg>
              </td>
              <td class="meta-line" style="width: 35%; text-align: right;">${effectiveDate}</td>
            </tr>
          </table>

          <h1 class="contract-title">${getContractTypeLabel(contract.type) || (locale === 'es' ? 'Acuerdo de Convivencia' : 'Co-living Agreement')}</h1>
          
          <p class="intro-text">
            ${locale === 'es' 
              ? `Por medio de la presente, se hace constar el acuerdo de roommate y convivencia celebrado y firmado electrónicamente de buena fe por ambas partes en la plataforma <strong>RoommateFinder</strong>. Este documento define los términos de convivencia, responsabilidades de pago y reglas del hogar acordadas mutuamente para la propiedad asociada, y constituye un acuerdo vinculante entre las partes.`
              : `This document certifies the roommate and co-living agreement entered into and digitally signed in good faith by both parties on the <strong>RoommateFinder</strong> platform. This document defines the co-living terms, payment responsibilities, and mutually agreed house rules.`
            }
          </p>

          <div class="parties-box">
            <strong>${locale === 'es' ? 'PARTES ACORDANTES:' : 'CONTRACTING PARTIES:'}</strong><br/>
            &bull; <strong>${locale === 'es' ? 'Parte Arrendadora / Iniciador:' : 'Agreement Initiator:'}</strong> ${initiatorName}<br/>
            &bull; <strong>${locale === 'es' ? 'Parte Inquilina / Roommate:' : 'Accepting Counterparty:'}</strong> ${counterpartyName}
          </div>

          <div class="section-header">💸 ${locale === 'es' ? 'Aspectos Financieros' : 'Financial Terms'}</div>
          <table class="data-table">
            ${financialRows.map(r => `<tr><td class="label">${r.label}</td><td class="value">${r.val}</td></tr>`).join('')}
          </table>

          <div class="section-header">🏠 ${locale === 'es' ? 'Convivencia y Reglas del Hogar' : 'Cohabitation & House Rules'}</div>
          <table class="data-table">
            ${cohabitationRows.map(r => `<tr><td class="label">${r.label}</td><td class="value">${r.val}</td></tr>`).join('')}
          </table>

          <div class="section-header">⚖️ ${locale === 'es' ? 'Cláusulas y Términos Legales' : 'Clauses & Legal Terms'}</div>
          <table class="data-table">
            ${legalRows.map(r => `<tr><td class="label">${r.label}</td><td class="value">${r.val}</td></tr>`).join('')}
          </table>

          ${customRows ? `
            <div class="section-header">📋 ${locale === 'es' ? 'Cláusulas Adicionales Acordadas' : 'Additional Agreed Clauses'}</div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 15px;">
              ${customRows}
            </div>
          ` : ''}

          <table class="signatures-table">
            <tr>
              <td style="width: 46%;">
                <div class="sig-line">
                  <div style="font-family: Georgia, serif; font-style: italic; font-size: 16px; color: #49C788; margin-bottom: 4px; height: 20px;">
                    ${initiatorName}
                  </div>
                  <p class="sig-name">${initiatorName}</p>
                  <span class="sig-desc">${locale === 'es' ? 'Firmado Electrónicamente' : 'Digitally Signed'} (RoommateFinder)</span>
                  ${contract.status === 'active' ? `<br/><div class="sig-seal">VERIFICADO &bull; ID: ${contract.id.slice(0, 8).toUpperCase()}</div>` : ''}
                </div>
              </td>
              <td style="width: 8%;"></td>
              <td style="width: 46%;">
                <div class="sig-line">
                  <div style="font-family: Georgia, serif; font-style: italic; font-size: 16px; color: #49C788; margin-bottom: 4px; height: 20px;">
                    ${counterpartyName}
                  </div>
                  <p class="sig-name">${counterpartyName}</p>
                  <span class="sig-desc">${locale === 'es' ? 'Firmado Electrónicamente' : 'Digitally Signed'} (RoommateFinder)</span>
                  ${contract.status === 'active' ? `<br/><div class="sig-seal">VERIFICADO &bull; ID: ${contract.id.slice(0, 8).toUpperCase()}</div>` : ''}
                </div>
              </td>
            </tr>
          </table>

          <div class="contact-info">
            RoommateFinder Legal Department &bull; info@roommatefinder.com &bull; www.roommatefinder.com
          </div>

          <!-- SVG waves footer -->
          <div class="wave-footer">
            <svg viewBox="0 0 1440 100" preserveAspectRatio="none" style="width: 100%; height: 100%;">
              <path d="M0,60 C360,20 720,80 1080,40 C1260,20 1380,50 1440,70 L1440,100 L0,100 Z" fill="#bcf2d8" opacity="0.4"></path>
              <path d="M0,45 C360,65 720,35 1080,75 C1260,85 1380,65 1440,50 L1440,100 L0,100 Z" fill="#49C788"></path>
            </svg>
          </div>
        </div>
      </body>
      </html>
      `;

      if (Platform.OS === 'web') {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;
        const opt = {
          margin:       0.4,
          filename:     `contrato_${contract.id}.pdf`,
          image:        { type: 'jpeg' as const, quality: 0.98 },
          html2canvas:  { scale: 2 },
          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
        };
        const blob = await html2pdf().set(opt).from(html).output('blob');
        
        // Trigger browser download
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `contrato_${contract.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
      console.error(err);
      Alert.alert(t('general.error'), locale === 'es' ? 'Ocurrió un error al generar el documento PDF.' : 'An error occurred while generating the PDF document.');
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
