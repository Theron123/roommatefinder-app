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

import { getLegalFramework, detectCountryCode } from '@/constants/legalFrameworks';
import { generateContractHTML, getContractTypeLabel, getOptionalClauseLabel } from '@/utils/contractPdfTemplate';
import { downloadLatexSourceFile } from '@/utils/contractLatexTemplate';

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

// Pantalla de detalle de un contrato: muestra sus cláusulas y permite aceptar, descargar el PDF firmado o terminarlo
export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [contract, setContract]   = useState<Contract | null>(null);
  const [loading, setLoading]     = useState(true);
  const [userId, setUserId]       = useState<string | null>(null);
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

  // Carga el contrato por id, incluyendo iniciador, participantes y el listado asociado
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

  // Pide confirmación, activa el contrato, genera su PDF firmado y lo sube al bucket privado 'contracts'
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

              // 2. Fetch the updated contract data
              const { data: updatedContract, error: fetchError } = await supabase
                .from('contracts')
                .select('*, initiator:initiator_id(name), contract_participants(user_id, profiles:user_id(name))')
                .eq('id', id)
                .single();

              if (fetchError || !updatedContract) {
                throw new Error("Failed to load updated contract");
              }

              // 3. Generate PDF HTML content
              const html = generateContractHTML(updatedContract, 'active', locale);

              // 4. Generate PDF file
              const fileName = `${updatedContract.id}.pdf`;
              if (Platform.OS === 'web') {
                try {
                  const webBlob = await generateWebPDFBlob(html, `contrato_${updatedContract.id}.pdf`);
                  const blobUri = URL.createObjectURL(webBlob);
                  await uploadToSupabase('contracts', fileName, blobUri, 'application/pdf');
                } catch (e) {
                  console.warn("Upload PDF on accept failed:", e);
                }
              } else {
                const { uri } = await Print.printToFileAsync({ html, base64: false });
                await uploadToSupabase('contracts', fileName, uri, 'application/pdf');
              }

              await supabase
                .from('contracts')
                .update({ pdf_url: fileName })
                .eq('id', id);

              await fetchContract();
              Alert.alert('✅ ' + (locale === 'es' ? 'Contrato activo' : 'Contract active'), t('contracts.accept_success'));
            } catch (err: any) {
              console.error("Error accepting contract and saving PDF:", err);
              Alert.alert('Error', locale === 'es' ? 'Ocurrió un error al activar el contrato.' : 'An error occurred while activating contract.');
            } finally {
              setGenerating(false);
            }
          }
        }
      ]
    );
  };

  // Pide confirmación y marca el contrato como terminado, registrando la fecha de terminación
  const handleTerminate = async () => {
    const doTerminate = async () => {
      setGenerating(true);
      try {
        await supabase
          .from('contracts')
          .update({
            status: 'terminated',
            termination_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        await fetchContract();
        if (Platform.OS === 'web') {
          alert(locale === 'es' ? 'Contrato terminado exitosamente.' : 'Contract terminated successfully.');
        } else {
          Alert.alert('✅ ' + (locale === 'es' ? 'Contrato terminado' : 'Contract terminated'));
        }
      } catch (e) {
        console.error("Error terminating contract:", e);
      } finally {
        setGenerating(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmWeb = window.confirm(
        locale === 'es' 
          ? '¿Estás seguro de que deseas terminar este contrato? Esta acción cancelará el acuerdo.' 
          : 'Are you sure you want to terminate this contract?'
      );
      if (confirmWeb) {
        await doTerminate();
      }
    } else {
      Alert.alert(
        t('contracts.terminate_confirm_title'),
        t('contracts.terminate_confirm_desc'),
        [
          { text: t('general.cancel'), style: 'cancel' },
          {
            text: locale === 'es' ? 'Terminar' : 'Terminate',
            style: 'destructive',
            onPress: doTerminate
          }
        ]
      );
    }
  };

  // Descarga/comparte el PDF del contrato
  const handleGenerateAndDownload = async () => {
    if (!contract) return;
    setGenerating(true);
    try {
      const html = generateContractHTML(contract, contract.status, locale);

      if (Platform.OS === 'web') {
        const fileName = `${contract.id}.pdf`;
        try {
          const webBlob = await generateWebPDFBlob(html, `contrato_${contract.id}.pdf`);
          
          if (contract.status === 'active') {
            try {
              const blobUri = URL.createObjectURL(webBlob);
              await uploadToSupabase('contracts', fileName, blobUri, 'application/pdf');
              await supabase.from('contracts').update({ pdf_url: fileName }).eq('id', contract.id);
              contract.pdf_url = fileName;
            } catch (uploadError) {
              console.error("Error uploading contract PDF on web:", uploadError);
            }
          }

          const downloadUrl = URL.createObjectURL(webBlob);
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
          console.warn("Blob generation failed, using Expo Print web fallback:", pdfErr);
          await Print.printAsync({ html });
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });

        if (contract.status === 'active') {
          const fileName = `${contract.id}.pdf`;
          try {
            await uploadToSupabase('contracts', fileName, uri, 'application/pdf');
            await supabase.from('contracts').update({ pdf_url: fileName }).eq('id', contract.id);
            contract.pdf_url = fileName;
          } catch (uploadError) {
            console.error("Error uploading active contract PDF on mobile:", uploadError);
          }
        }

        await Sharing.shareAsync(uri, { 
          UTI: '.pdf', 
          mimeType: 'application/pdf', 
          dialogTitle: locale === 'es' ? 'Descargar Contrato' : 'Download Contract' 
        });
      }
    } catch (err: any) {
      console.error("Generate error:", err);
      if (Platform.OS === 'web') {
        try {
          await Print.printAsync({ html: generateContractHTML(contract, contract.status) });
        } catch (fallbackErr) {
          alert(locale === 'es' ? `Error al descargar PDF: ${err?.message || 'Error desconocido'}` : 'An error occurred while generating the PDF.');
        }
      } else {
        Alert.alert(locale === 'es' ? 'Error' : 'Error', locale === 'es' ? 'Ocurrió un error al generar el documento PDF.' : 'An error occurred while generating the PDF document.');
      }
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
  const canTerminate = contract.status !== 'terminated';
  
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

          {/* Generate/Download PDF */}
          <Pressable style={s.downloadBtn} onPress={handleGenerateAndDownload} disabled={generating}>
            {generating
              ? <ActivityIndicator color="#49C788" />
              : <>
                  <MaterialCommunityIcons name="file-pdf-box" size={20} color="#49C788" />
                  <Text style={s.downloadBtnText}>{t('contracts.btn_download')}</Text>
                </>
            }
          </Pressable>

          {/* Download LaTeX Source (.tex) */}
          {Platform.OS === 'web' && (
            <Pressable 
              style={[s.downloadBtn, { backgroundColor: '#1e293b', borderColor: '#334155', marginTop: 8 }]} 
              onPress={() => downloadLatexSourceFile(contract, locale)}
            >
              <MaterialCommunityIcons name="code-braces" size={19} color="#49C788" />
              <Text style={[s.downloadBtnText, { color: '#ffffff' }]}>
                {locale === 'es' ? 'Descargar Fuente LaTeX (.tex)' : 'Download LaTeX (.tex)'}
              </Text>
            </Pressable>
          )}

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
