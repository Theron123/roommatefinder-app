import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View, Platform
} from 'react-native';
import { uploadToSupabase } from '@/utils/file';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from '../../context/LanguageContext';

type Contract = {
  id: string;
  type: string;
  status: string;
  clauses: any;
  selected_custom_clauses: string[] | null;
  effective_date: string | null;
  termination_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  pdf_url: string | null;
  initiator_id: string | null;
  initiator: { name: string } | null;
  contract_participants?: { user_id: string; profiles: { name: string } }[];
  listings?: {
    id: string;
    title: string | null;
    address: string | null;
    price: number | null;
    user_id: string | null;
    profiles: { name: string } | null;
  } | null;
};

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contract, setContract]   = useState<Contract | null>(null);
  const [loading, setLoading]     = useState(true);
  const [userId, setUserId]       = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const { t, locale } = useTranslation();

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

  const getContractTypeLabel = (type: string) => {
    if (type === 'roommate_agreement') {
      return locale === 'es' ? 'Acuerdo de Roommate' : 'Roommate Agreement';
    }
    if (type === 'rental_agreement') {
      return locale === 'es' ? 'Contrato de Renta' : 'Rental Agreement';
    }
    return type;
  };

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

  const fetchContract = async () => {
    if (!contract) setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    setUserId(session?.user?.id || null);

    const { data } = await supabase
      .from('contracts')
      .select('*, initiator:initiator_id(name), contract_participants(user_id, profiles(name)), listings:listing_id(id, title, address, price, user_id, profiles(name))')
      .eq('id', id)
      .single();

    setContract(data as any);
    setLoading(false);
  };

  const generateContractHTML = (contractData: Contract, activeStatus: string) => {
    const c = contractData.clauses || {};
    const initiatorName = contractData.initiator?.name ?? (locale === 'es' ? 'Parte Iniciadora' : 'Initiating Party');
    const participants = contractData.contract_participants || [];
    const counterpartyName = participants.map((p: any) => p.profiles?.name).join(', ') || (locale === 'es' ? 'Contraparte' : 'Counterparty');
    
    const effectiveDate = contractData.effective_date 
      ? new Date(contractData.effective_date).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) 
      : (locale === 'es' ? 'Por definir' : 'TBD');

    const financialRows = locale === 'es' ? [
      { label: 'Renta Mensual', val: c.rent ? `$${c.rent.amount} / mes` : '—' },
      { label: 'Día de Vencimiento', val: c.rent ? `Día ${c.rent.due_day} de cada mes` : '—' },
      { label: 'Cargo por Pago Tardío', val: c.rent ? `$${c.rent.late_fee}` : '—' },
      { label: 'Depósito de Seguridad', val: c.security_deposit ? `$${c.security_deposit.amount}` : '—' },
      { label: 'Plazo para Devolución de Depósito', val: c.security_deposit ? `${c.security_deposit.return_days} días hábiles` : '—' },
    ] : [
      { label: 'Monthly Rent', val: c.rent ? `$${c.rent.amount} / month` : '—' },
      { label: 'Due Date', val: c.rent ? `Day ${c.rent.due_day} of each month` : '—' },
      { label: 'Late Payment Fee', val: c.rent ? `$${c.rent.late_fee}` : '—' },
      { label: 'Security Deposit', val: c.security_deposit ? `$${c.security_deposit.amount}` : '—' },
      { label: 'Deposit Return Timeline', val: c.security_deposit ? `${c.security_deposit.return_days} business days` : '—' },
    ];

    const cohabitationRows = locale === 'es' ? [
      { label: 'Mascotas en la Propiedad', val: c.pets?.allowed ? 'Permitidas' : 'No permitidas' },
      { label: 'Fumar en Espacios Interiores', val: c.smoking?.allowed ? 'Permitido' : 'No permitido' },
      { label: 'Visitas y Alojamiento Nocturno', val: c.visitors?.overnight_allowed ? `Permitidas (máx. ${c.visitors.max_nights} noches)` : 'No permitidas' },
      { label: 'Horario de Silencio Establecido', val: c.noise ? `${c.noise.quiet_hours_start} a ${c.noise.quiet_hours_end}` : '—' },
      { label: 'Programa de Limpieza Común', val: c.cleaning?.schedule === 'daily' ? 'Diario' : c.cleaning?.schedule === 'weekly' ? 'Semanal' : 'Quincenal' },
    ] : [
      { label: 'Pets on Property', val: c.pets?.allowed ? 'Allowed' : 'Not allowed' },
      { label: 'Smoking Indoors', val: c.smoking?.allowed ? 'Allowed' : 'Not allowed' },
      { label: 'Guests & Overnight Stays', val: c.visitors?.overnight_allowed ? `Allowed (max ${c.visitors.max_nights} nights)` : 'Not allowed' },
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

    const customRows = (contractData.selected_custom_clauses || []).map((key: string) => `
      <div class="custom-clause-item">&bull; ${getOptionalClauseLabel(key)}</div>
    `).join('');

    const statusConfig = getStatusConfig(activeStatus);

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${locale === 'es' ? 'Contrato' : 'Contract'} ${contractData.id}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
        body { 
          font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif; 
          color: #1e293b; 
          margin: 0; 
          padding: 40px; 
          background: #fff; 
          line-height: 1.5;
        }
        .header-banner {
          background: #0f172a;
          color: #ffffff;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 30px;
        }
        .header-banner h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
          text-transform: uppercase;
        }
        .header-banner p {
          margin: 8px 0 0 0;
          font-size: 13px;
          color: #94a3b8;
        }
        .badge {
          display: inline-block;
          background: ${statusConfig.color};
          color: #ffffff;
          padding: 6px 14px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 11px;
          margin-top: 12px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .parties {
          display: flex;
          justify-content: space-between;
          margin-bottom: 25px;
          gap: 15px;
        }
        .party-box {
          width: 48%;
          padding: 15px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          border-top: 4px solid #10b981;
          box-sizing: border-box;
        }
        .party-box p {
          margin: 0;
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
        }
        .party-box h3 {
          margin: 4px 0 0;
          font-size: 16px;
          color: #0f172a;
          font-weight: 700;
        }
        .metadata-box {
          background: #f1f5f9;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 25px;
          font-size: 12px;
          color: #475569;
          border-left: 4px solid #64748b;
        }
        .section-title {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #0f172a;
          border-bottom: 2px solid #cbd5e1;
          padding-bottom: 4px;
          margin-top: 25px;
          margin-bottom: 10px;
          font-weight: 800;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
          color: #334155;
        }
        td:first-child {
          font-weight: 600;
          color: #0f172a;
          width: 40%;
        }
        .custom-clause-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
        }
        .custom-clause-item {
          font-size: 13px;
          color: #334155;
          padding: 4px 0;
          border-bottom: 1px dashed #e2e8f0;
        }
        .custom-clause-item:last-child {
          border-bottom: none;
        }
        .disclaimer {
          font-size: 11px;
          color: #64748b;
          padding: 12px 16px;
          background: #fffbeb;
          border: 1px solid #fef3c7;
          border-radius: 8px;
          margin-top: 30px;
          line-height: 1.5;
        }
        .disclaimer strong { color: #b45309; }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          gap: 15px;
        }
        .sig-line {
          width: 48%;
          border-top: 1px solid #94a3b8;
          padding-top: 10px;
          box-sizing: border-box;
        }
        .sig-line p {
          margin: 0;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }
        .sig-line span {
          font-size: 10px;
          color: #64748b;
        }
        .sig-seal {
          margin-top: 4px;
          font-size: 9px;
          font-family: monospace;
          color: #10b981;
          background: #f0fdf4;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 10px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header-banner">
        <h1>${getContractTypeLabel(contractData.type) || (locale === 'es' ? 'Acuerdo de Convivencia' : 'Co-living Agreement')}</h1>
        <p>${locale === 'es' ? 'Acuerdo Digital Oficial &bull; Generado mediante RoommateFinder App' : 'Official Digital Agreement &bull; Generated via RoommateFinder App'}</p>
        <div class="badge" style="background-color: ${statusConfig.color};">${statusConfig.label}</div>
      </div>

      <div class="parties">
        <div class="party-box">
          <p>${locale === 'es' ? 'Iniciador del Acuerdo' : 'Agreement Initiator'}</p>
          <h3>${initiatorName}</h3>
        </div>
        <div class="party-box">
          <p>${locale === 'es' ? 'Contraparte Aceptante' : 'Accepting Counterparty'}</p>
          <h3>${counterpartyName}</h3>
        </div>
      </div>

      <div class="metadata-box">
        <strong>${locale === 'es' ? 'Identificador Único' : 'Unique Identifier'}:</strong> <span style="font-family: monospace; font-size:12px;">${contractData.id}</span><br>
        <strong>${locale === 'es' ? 'Fecha de Activación' : 'Activation Date'}:</strong> ${effectiveDate}
      </div>

      <div class="section-title">${locale === 'es' ? '💸 Puntos Financieros' : '💸 Financial Terms'}</div>
      <table>
        ${financialRows.map(r => `<tr><td>${r.label}</td><td>${r.val}</td></tr>`).join('')}
      </table>

      <div class="section-title">${locale === 'es' ? '🏠 Convivencia y Reglas del Hogar' : '🏠 Cohabitation & House Rules'}</div>
      <table>
        ${cohabitationRows.map(r => `<tr><td>${r.label}</td><td>${r.val}</td></tr>`).join('')}
      </table>

      <div class="section-title">${locale === 'es' ? '⚖️ Cláusulas y Términos Legales' : '⚖️ Clauses & Legal Terms'}</div>
      <table>
        ${legalRows.map(r => `<tr><td>${r.label}</td><td>${r.val}</td></tr>`).join('')}
      </table>

      ${customRows ? `
        <div class="section-title">${locale === 'es' ? '📋 Cláusulas Adicionales Acordadas' : '📋 Additional Agreed Clauses'}</div>
        <div class="custom-clause-box">
          ${customRows}
        </div>
      ` : ''}

      <div class="disclaimer">
        ${locale === 'es' 
          ? `<strong>Aviso de Responsabilidad Legal:</strong> Este contrato constituye un acuerdo privado vinculante acordado libremente y firmado digitalmente de buena fe por ambas partes en la plataforma RoommateFinder. RoommateFinder actúa únicamente como un servicio tecnológico intermediario para facilitar la negociación de convivencia y no es responsable del cumplimiento del contrato, no proporciona asesoría legal ni asume ninguna responsabilidad civil o penal derivada de este documento.`
          : `<strong>Legal Disclaimer:</strong> This contract constitutes a private binding agreement freely entered into and digitally signed in good faith by both parties on the RoommateFinder platform. RoommateFinder acts solely as an intermediary technology service to facilitate co-living negotiations and is not responsible for contract enforcement, does not provide legal advice, and assumes no civil or criminal liability arising from this document.`
        }
      </div>

      <div class="signatures">
        <div class="sig-line">
          <p>${initiatorName}</p>
          <span>${locale === 'es' ? 'Firmado Electrónicamente (RoommateFinder App)' : 'Digitally Signed (RoommateFinder App)'}</span>
          ${activeStatus === 'active' ? `<br/><div class="sig-seal">VERIFICADO &bull; ID: ${contractData.id.slice(0, 8)}</div>` : ''}
        </div>
        <div class="sig-line">
          <p>${counterpartyName}</p>
          <span>${locale === 'es' ? 'Firmado Electrónicamente (RoommateFinder App)' : 'Digitally Signed (RoommateFinder App)'}</span>
          ${activeStatus === 'active' ? `<br/><div class="sig-seal">VERIFICADO &bull; ID: ${contractData.id.slice(0, 8)}</div>` : ''}
        </div>
      </div>

      <div class="footer">
        ${locale === 'es' 
          ? `Generado automáticamente el ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })} &bull; Copia Digital Válida`
          : `Automatically generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} &bull; Valid Digital Copy`
        }
      </div>
    </body>
    </html>
    `;
  };

  const handleAccept = async () => {
    Alert.alert(
      t('contracts.accept_confirm_title'),
      t('contracts.accept_confirm_desc'),
      [
        { text: t('general.cancel'), style: 'cancel' },
        {
          text: t('general.confirm'),
          onPress: async () => {
            setGenerating(true);
            try {
              // 1. Update contract status to active
              const { error: updateError } = await supabase
                .from('contracts')
                .update({ status: 'active', updated_at: new Date().toISOString() })
                .eq('id', id);
              
              if (updateError) throw updateError;

              // 2. Fetch the updated contract data (so we have correct initiator and participant profiles, etc.)
              const { data: updatedContract, error: fetchError } = await supabase
                .from('contracts')
                .select('*, initiator:initiator_id(name), contract_participants(user_id, profiles:user_id(name))')
                .eq('id', id)
                .single();

              if (fetchError || !updatedContract) {
                throw new Error("Failed to load updated contract");
              }

              // 3. Generate PDF HTML content (which will now show "Active" status, etc.)
              const html = generateContractHTML(updatedContract, 'active');

              // 4. Generate PDF file
              const fileName = `${updatedContract.id}.pdf`;
              if (Platform.OS === 'web') {
                const html2pdfModule = await import('html2pdf.js');
                const html2pdf = html2pdfModule.default || html2pdfModule;
                const opt = {
                  margin:       0.4,
                  filename:     `contrato_${updatedContract.id}.pdf`,
                  image:        { type: 'jpeg' as const, quality: 0.98 },
                  html2canvas:  { scale: 2 },
                  jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
                };
                const webBlob = await html2pdf().set(opt).from(html).output('blob');
                const blobUri = URL.createObjectURL(webBlob);
                await uploadToSupabase('contracts', fileName, blobUri, 'application/pdf');
              } else {
                const { uri } = await Print.printToFileAsync({ html, base64: false });
                await uploadToSupabase('contracts', fileName, uri, 'application/pdf');
              }

              const { data: publicUrlData } = supabase.storage.from('contracts').getPublicUrl(fileName);
              const publicUrl = publicUrlData.publicUrl;

              // 6. Update contract record with pdf_url
              await supabase
                .from('contracts')
                .update({ pdf_url: publicUrl })
                .eq('id', id);

              // 7. Refresh local contract state
              await fetchContract();
              
              Alert.alert('✅ ' + (locale === 'es' ? 'Contrato activo' : 'Contract active'), t('contracts.accept_success'));
            } catch (err: any) {
              console.error("Error accepting contract and saving PDF:", err);
              Alert.alert('Error', locale === 'es' ? 'Ocurrió un error al activar y guardar el contrato.' : 'An error occurred while activating and saving the contract.');
            } finally {
              setGenerating(false);
            }
          }
        }
      ]
    );
  };

  const handleTerminate = async () => {
    Alert.alert(
      t('contracts.terminate_confirm_title'),
      t('contracts.terminate_confirm_desc'),
      [
        { text: t('general.cancel'), style: 'cancel' },
        {
          text: locale === 'es' ? 'Terminar' : 'Terminate',
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
      // If we already have a saved PDF, download/share it directly!
      if (contract.pdf_url) {
        if (Platform.OS === 'web') {
          // Open PDF in a new tab for easy viewing/downloading
          window.open(contract.pdf_url, '_blank');
        } else {
          // On mobile, download from storage and share
          const localPath = `${FileSystem.cacheDirectory}contrato_${contract.id}.pdf`;
          // Download the file
          const { uri } = await FileSystem.downloadAsync(contract.pdf_url, localPath);
          await Sharing.shareAsync(uri, { 
            UTI: '.pdf', 
            mimeType: 'application/pdf', 
            dialogTitle: locale === 'es' ? 'Descargar Contrato' : 'Download Contract' 
          });
        }
        setGenerating(false);
        return;
      }

      // If no pdf_url is saved yet (e.g. legacy contract or draft), generate it on-the-fly:
      const html = generateContractHTML(contract, contract.status);

      let localUri: string | null = null;

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
        const webBlob = await html2pdf().set(opt).from(html).output('blob');
        
        // On web, if it's active, let's save it to Supabase using uploadToSupabase helper
        if (contract.status === 'active') {
          const fileName = `${contract.id}.pdf`;
          const blobUri = URL.createObjectURL(webBlob);
          try {
            await uploadToSupabase('contracts', fileName, blobUri, 'application/pdf');
            const { data: publicUrlData } = supabase.storage.from('contracts').getPublicUrl(fileName);
            await supabase.from('contracts').update({ pdf_url: publicUrlData.publicUrl }).eq('id', contract.id);
            contract.pdf_url = publicUrlData.publicUrl; // update local ref
          } catch (uploadError) {
            console.error("Error uploading contract PDF on web:", uploadError);
          }
        }

        // Trigger browser download
        const downloadUrl = contract.pdf_url || URL.createObjectURL(webBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `contrato_${contract.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        localUri = uri;

        // On mobile, if it's active, let's upload it to Supabase using uploadToSupabase helper
        if (contract.status === 'active') {
          const fileName = `${contract.id}.pdf`;
          try {
            await uploadToSupabase('contracts', fileName, uri, 'application/pdf');
            const { data: publicUrlData } = supabase.storage.from('contracts').getPublicUrl(fileName);
            await supabase.from('contracts').update({ pdf_url: publicUrlData.publicUrl }).eq('id', contract.id);
            contract.pdf_url = publicUrlData.publicUrl; // update local ref
          } catch (uploadError) {
            console.error("Error uploading active contract PDF on mobile:", uploadError);
          }
        }

        await Sharing.shareAsync(localUri, { 
          UTI: '.pdf', 
          mimeType: 'application/pdf', 
          dialogTitle: locale === 'es' ? 'Descargar Contrato' : 'Download Contract' 
        });
      }
    } catch (err) {
      console.error(err);
      Alert.alert(locale === 'es' ? 'Error' : 'Error', locale === 'es' ? 'Ocurrió un error al generar el documento PDF.' : 'An error occurred while generating the PDF document.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={s.container}><ActivityIndicator color="#49C788" style={{ marginTop: 80 }} /></SafeAreaView>;
  }

  if (!contract) {
    return <SafeAreaView style={s.container}><Text style={{ color: '#fff', textAlign: 'center', marginTop: 80 }}>{t('contracts.not_found')}</Text></SafeAreaView>;
  }

  const st    = getStatusConfig(contract.status);
  const c     = contract.clauses || {};
  const isCP  = contract.contract_participants?.some((p: any) => p.user_id === userId); // es la otra parte
  const isInit = contract.initiator_id === userId;
  const canAccept = isCP && contract.status === 'pending_authorization';
  const canTerminate = (isInit || isCP) && (contract.status === 'active' || contract.status === 'pending_authorization');
  
  const counterpartyNames = (contract.contract_participants || []).map((p: any) => p.profiles?.name).join(', ');

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#0d1117', '#000']} style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>{t('contracts.detail_title')}</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* Status banner */}
      <View style={[s.statusBanner, { backgroundColor: st.bg, borderColor: st.color + '44' }]}>
        <MaterialCommunityIcons name={st.icon as any} size={18} color={st.color} />
        <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
        <Text style={s.statusDate}>
          {t('contracts.updated')}: {new Date(contract.updated_at || '').toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroType}>{getContractTypeLabel(contract.type)}</Text>
          <View style={s.partiesRow}>
            <View style={s.partyChip}>
              <MaterialCommunityIcons name="account" size={14} color="#49C788" />
              <Text style={s.partyName}>{contract.initiator?.name}</Text>
              <Text style={s.partyRole}>{t('contracts.party_initiator')}</Text>
            </View>
            <MaterialCommunityIcons name="arrow-left-right" size={18} color="#333" />
            <View style={s.partyChip}>
              <MaterialCommunityIcons name="account-group" size={14} color="#FFB800" />
              <Text style={s.partyName}>{counterpartyNames || (locale === 'es' ? 'Contraparte' : 'Counterparty')}</Text>
              <Text style={s.partyRole}>{(contract.contract_participants?.length ?? 0) > 1 ? (locale === 'es' ? 'Contrapartes' : 'Counterparties') : (locale === 'es' ? 'Contraparte' : 'Counterparty')}</Text>
            </View>
          </View>
          {contract.effective_date && (
            <Text style={s.heroDate}>{locale === 'es' ? '📅 Vigente desde: ' : '📅 Effective from: '}{contract.effective_date}</Text>
          )}
        </View>

        {/* Tarjeta de Alojamiento Solicitado */}
        {contract.listings && (
          <View style={s.accommodationCard}>
            <View style={s.accommodationCardHeader}>
              <MaterialCommunityIcons name="home-city" size={18} color="#49C788" />
              <Text style={s.accommodationCardLabel}>{locale === 'es' ? 'Propiedad Relacionada' : 'Associated Property'}</Text>
            </View>
            <View style={s.accommodationCardBody}>
              <Text style={s.accommodationCardTitle}>{contract.listings.title}</Text>
              <Text style={s.accommodationCardAddress}>{contract.listings.address}</Text>
              <View style={s.accommodationCardFooter}>
                <Text style={s.accommodationCardPrice}>
                  ${contract.listings.price?.toLocaleString()}/{locale === 'es' ? 'mes' : 'mo'}
                </Text>
                {contract.listings.profiles?.name && (
                  <Text style={s.accommodationCardOwner}>
                    {locale === 'es' ? 'Arrendador: ' : 'Host: '}{contract.listings.profiles.name}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Clauses */}
        <Section title={t('contracts.sec_financial')}>
          <Row label={t('contracts.labels.rent')}      value={c.rent ? `$${c.rent.amount}/${locale === 'es' ? 'mes' : 'mo'}` : '—'} />
          <Row label={t('contracts.labels.due_day')}   value={c.rent ? (locale === 'es' ? `Día ${c.rent.due_day}` : `Day ${c.rent.due_day}`) : '—'} />
          <Row label={t('contracts.labels.late_fee')}  value={c.rent ? `$${c.rent.late_fee}` : '—'} />
          <Row label={t('contracts.labels.deposit')}   value={c.security_deposit ? `$${c.security_deposit.amount}` : '—'} />
          <Row label={t('contracts.labels.deposit_return')} value={c.security_deposit ? `${c.security_deposit.return_days} ${locale === 'es' ? 'días' : 'days'}` : '—'} />
        </Section>

        <Section title={t('contracts.sec_cohabitation')}>
          <Row label={t('contracts.labels.pets')}      value={c.pets?.allowed ? t('contracts.labels.allowed_check') : (locale === 'es' ? 'No permitidas' : 'Not allowed')} />
          <Row label={t('contracts.labels.smoking')}   value={c.smoking?.allowed ? t('contracts.labels.allowed_check') : (locale === 'es' ? 'No permitido' : 'Not allowed')} />
          <Row label={t('contracts.labels.guests')}    value={c.visitors?.overnight_allowed ? (locale === 'es' ? `Sí, máx. ${c.visitors.max_nights} noches` : `Yes, max ${c.visitors.max_nights} nights`) : (locale === 'es' ? 'No' : 'No')} />
          <Row label={t('contracts.labels.quiet')}     value={c.noise ? `${c.noise.quiet_hours_start} – ${c.noise.quiet_hours_end}` : '—'} />
          <Row label={t('contracts.labels.cleaning')}  value={c.cleaning?.schedule ? t('contracts.cleaning_opts.' + c.cleaning.schedule) : '—'} />
        </Section>

        <Section title={t('contracts.sec_legal')}>
          <Row label={t('contracts.labels.move_out')}  value={c.move_out ? `${c.move_out.notice_days} ${locale === 'es' ? 'días' : 'days'}` : (locale === 'es' ? '30 días' : '30 days')} />
          <Row label={t('contracts.labels.eviction')}  value={c.eviction ? `${c.eviction.notice_days} ${locale === 'es' ? 'días' : 'days'}` : (locale === 'es' ? '30 días' : '30 days')} />
          <Row label={t('contracts.labels.dispute')}   value={c.dispute?.method ? t('contracts.labels.' + c.dispute.method) : '—'} />
          <Row label={t('contracts.labels.damage')}    value={c.damage?.tenant_responsible ? t('contracts.labels.responsible') : t('contracts.labels.not_responsible')} />
          <Row label={t('contracts.labels.wear')}      value={c.damage?.normal_wear_exempt ? t('contracts.labels.exempt') : t('contracts.labels.not_exempt')} />
          <Row label={t('contracts.labels.move_in_insp')} value={c.move_in?.inspection_required ? t('contracts.labels.required_check') : t('contracts.labels.not_required')} />
          <Row label={t('contracts.labels.move_out_insp')} value={c.move_out?.inspection_required ? t('contracts.labels.required_check') : t('contracts.labels.not_required')} />
        </Section>

        {(contract.selected_custom_clauses?.length ?? 0) > 0 && (
          <Section title={t('contracts.sec_additional')}>
            {contract.selected_custom_clauses?.map((key: string) => (
              <Row key={key} label="•" value={getOptionalClauseLabel(key)} />
            ))}
          </Section>
        )}

        {/* Contract ID */}
        <View style={s.idRow}>
          <Text style={s.idLabel}>{t('contracts.contract_id')}</Text>
          <Text style={s.idValue} numberOfLines={1}>{contract.id}</Text>
        </View>

        {/* Actions */}
        <View style={s.actionsCol}>
          {/* Accept (counterparty only, when pending) */}
          {canAccept && (
            <Pressable style={s.acceptBtn} onPress={handleAccept}>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#000" />
              <Text style={s.acceptBtnText}>{t('contracts.btn_accept')}</Text>
            </Pressable>
          )}

          {/* Generate/Download document */}
          <Pressable style={s.downloadBtn} onPress={handleGenerateAndDownload} disabled={generating}>
            {generating
              ? <ActivityIndicator color="#49C788" />
              : <>
                  <MaterialCommunityIcons name="file-pdf-box" size={20} color="#49C788" />
                  <Text style={s.downloadBtnText}>{t('contracts.btn_download')}</Text>
                </>
            }
          </Pressable>

          {/* Terminate */}
          {canTerminate && (
            <Pressable style={s.terminateBtn} onPress={handleTerminate}>
              <MaterialCommunityIcons name="close-circle-outline" size={20} color="#FF4B4B" />
              <Text style={s.terminateBtnText}>{t('contracts.btn_terminate')}</Text>
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
  accommodationCard: { backgroundColor: '#0d1117', borderRadius: 14, borderWidth: 1, borderColor: '#1a1a2e', padding: 14, marginBottom: 16, gap: 10 },
  accommodationCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accommodationCardLabel: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  accommodationCardBody: { gap: 4 },
  accommodationCardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  accommodationCardAddress: { color: '#888', fontSize: 12 },
  accommodationCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  accommodationCardPrice: { color: '#49C788', fontSize: 13, fontWeight: '700' },
  accommodationCardOwner: { color: '#555', fontSize: 11, fontWeight: '500' },
});
