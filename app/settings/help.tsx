import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';

export default function HelpScreen() {
  const router = useRouter();
  const { locale } = useTranslation();
  const isEs = locale === 'es';

  // State for Accordions (FAQs)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // State for Contact Form
  const [category, setCategory] = useState<'general' | 'billing' | 'contracts' | 'reports'>('general');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedDoc, setAttachedDoc] = useState<{ name: string; uri: string; size?: number } | null>(null);

  const faqs = [
    {
      q_en: "How do I verify my identity?",
      q_es: "¿Cómo verifico mi identidad?",
      a_en: "Go to your Profile, tap the 'Trust & Safety Center', and choose 'Official ID'. Upload a photo of your Passport or National ID card and a selfie. The verification request will be processed immediately.",
      a_es: "Ve a tu Perfil, toca el 'Centro de Confianza' y elige 'Identidad Oficial'. Sube una foto de tu pasaporte o identificación y una selfie. La solicitud se procesará inmediatamente."
    },
    {
      q_en: "How do Smart Contracts work?",
      q_es: "¿Cómo funcionan los Contratos Inteligentes?",
      a_en: "You can propose a contract with any roommate you matched with in the Legal Hub. Once both parties review and accept the clauses inside the app, the contract is timestamped and marked as active.",
      a_es: "Puedes proponer un contrato a cualquier roommate con el que hayas hecho match en el Centro Legal. Una vez que ambas partes revisen y acepten las cláusulas en la app, el contrato se sella con marca de tiempo."
    },
    {
      q_en: "What should I do if a roommate breaks a rule?",
      q_es: "¿Qué hago si un roommate rompe una regla?",
      a_en: "If a roommate violates a clause in your active contract, you can go to the Conflict Resolution Center and file a mediation report. Our team will contact both parties to resolve it neutrally.",
      a_es: "Si un roommate incumple una cláusula de tu contrato activo, puedes ir al Centro de Resolución de Conflictos y enviar un reporte de mediación. Nuestro equipo mediará para resolverlo de forma neutral."
    },
    {
      q_en: "How is my Trust Score calculated?",
      q_es: "¿Cómo se calcula mi Trust Score?",
      a_en: "Your Trust Score starts at 20. It increases by 20 points for each verification you complete: Official ID (+20), Criminal Background (+20), Social Media (+20), and Phone Number (+20). Verifying all metrics reaches 100%!",
      a_es: "Tu Trust Score inicia en 20. Aumenta 20 puntos por cada verificación completada: Identidad Oficial (+20), Antecedentes Penales (+20), Redes Sociales (+20) y Número Telefónico (+20). Al verificar todos los parámetros alcanzas el 100%."
    }
  ];

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachedDoc({
          name: asset.name,
          uri: asset.uri,
          size: asset.size
        });
      }
    } catch (err) {
      console.log('Error picking document:', err);
    }
  };

  const handleSendTicket = () => {
    if (!message.trim() && !attachedDoc) {
      Alert.alert(
        isEs ? "Campos Vacíos" : "Empty Fields", 
        isEs ? "Por favor escribe un mensaje o adjunta un documento antes de enviar." : "Please write a message or attach a document before sending."
      );
      return;
    }

    setSending(true);
    setTimeout(() => {
      setSending(false);
      setMessage('');
      const docName = attachedDoc?.name;
      setAttachedDoc(null);
      
      Alert.alert(
        isEs ? "¡Reporte Enviado!" : "Report Sent!",
        isEs 
          ? (docName 
              ? `Hemos recibido tu reporte de soporte y el documento "${docName}". Te responderemos por correo electrónico en un lapso de 24 horas.`
              : "Hemos recibido tu solicitud de soporte. Te responderemos por correo electrónico en un lapso de 24 horas.")
          : (docName
              ? `We have received your support report and the document "${docName}". We will reply to your registered email address within 24 hours.`
              : "We have received your support request. We will reply to your registered email address within 24 hours.")
      );
    }, 1200);
  };

  const FaqItem = ({ index, q, a }: { index: number; q: string; a: string }) => {
    const isExpanded = expandedIndex === index;
    return (
      <View style={[styles.faqCard, isExpanded && styles.faqCardExpanded]}>
        <Pressable 
          style={({ pressed }) => [styles.faqHeader, pressed && styles.itemPressed]} 
          onPress={() => setExpandedIndex(isExpanded ? null : index)}
        >
          <Text style={[styles.faqQuestion, isExpanded && { color: '#49C788' }]}>{q}</Text>
          <MaterialCommunityIcons 
            name={isExpanded ? "minus" : "plus"} 
            size={20} 
            color={isExpanded ? "#49C788" : "#666"} 
          />
        </Pressable>
        {isExpanded && (
          <View style={styles.faqAnswerContainer}>
            <Text style={styles.faqAnswer}>{a}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#131824', '#000']} style={styles.header}>
        <Pressable 
          onPress={() => router.back()} 
          style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.title}>
          {isEs ? "Ayuda y Soporte" : "Help & Support"}
        </Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          {isEs ? "Preguntas Frecuentes" : "Frequently Asked Questions"}
        </Text>
        
        <View style={styles.faqContainer}>
          {faqs.map((faq, i) => (
            <FaqItem
              key={i}
              index={i}
              q={isEs ? faq.q_es : faq.q_en}
              a={isEs ? faq.a_es : faq.a_en}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>
          {isEs ? "Contáctanos" : "Contact Support"}
        </Text>
        <View style={styles.glassForm}>
          <Text style={styles.label}>{isEs ? "TIPO DE CONSULTA" : "CATEGORY"}</Text>
          
          <View style={styles.catRow}>
            {[
              { id: 'general', label_es: 'General', label_en: 'General' },
              { id: 'billing', label_es: 'Pagos', label_en: 'Billing' },
              { id: 'contracts', label_es: 'Contratos', label_en: 'Contracts' },
              { id: 'reports', label_es: 'Conflictos', label_en: 'Mediation' }
            ].map(cat => {
              const active = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.catChip, active && styles.catChipActive]}
                  onPress={() => setCategory(cat.id as any)}
                >
                  <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                    {isEs ? cat.label_es : cat.label_en}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>{isEs ? "DETALLES DE TU MENSAJE" : "MESSAGE DETAILS"}</Text>
          <TextInput
            multiline
            numberOfLines={5}
            style={styles.messageInput}
            placeholder={isEs ? "Describe el problema o duda detalladamente..." : "Describe your problem or question in detail..."}
            placeholderTextColor="#444"
            value={message}
            onChangeText={setMessage}
          />

          {/* Attached Document Preview */}
          {attachedDoc && (
            <View style={styles.attachedContainer}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color="#49C788" />
              <Text style={styles.attachedText} numberOfLines={1}>
                {attachedDoc.name} {attachedDoc.size ? `(${Math.round(attachedDoc.size / 1024)} KB)` : ''}
              </Text>
              <Pressable onPress={() => setAttachedDoc(null)}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#FF453A" />
              </Pressable>
            </View>
          )}

          {/* Attach Button */}
          <Pressable 
            style={({ pressed }) => [styles.attachBtn, pressed && { opacity: 0.8 }]}
            onPress={handlePickDocument}
          >
            <MaterialCommunityIcons name="paperclip" size={18} color="#49C788" style={{ marginRight: 6 }} />
            <Text style={styles.attachBtnText}>
              {isEs ? "Adjuntar Documento / Imagen" : "Attach Document / Image"}
            </Text>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed]}
            onPress={handleSendTicket}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.sendBtnText}>
                {isEs ? "Enviar Mensaje de Soporte" : "Submit Support Ticket"}
              </Text>
            )}
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btnPressed: {
    opacity: 0.8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#555',
    marginBottom: 12,
    marginTop: 24,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  faqContainer: {
    gap: 10,
  },
  faqCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  faqCardExpanded: {
    borderColor: 'rgba(73, 199, 136, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  itemPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    paddingRight: 10,
    lineHeight: 20,
  },
  faqAnswerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  faqAnswer: {
    fontSize: 13,
    color: '#888',
    lineHeight: 20,
    marginTop: 12,
  },
  glassForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 16,
  },
  label: {
    fontSize: 11,
    color: '#555',
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 1,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  catChipActive: {
    backgroundColor: 'rgba(73,199,136,0.12)',
    borderColor: '#49C788',
  },
  catChipText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#49C788',
    fontWeight: '700',
  },
  messageInput: {
    backgroundColor: '#05070a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    textAlignVertical: 'top',
    height: 120,
    marginBottom: 20,
  },
  sendBtn: {
    backgroundColor: '#49C788',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#49C788',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnPressed: {
    opacity: 0.9,
  },
  sendBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  attachBtnText: {
    color: '#49C788',
    fontSize: 13,
    fontWeight: '700',
  },
  attachedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(73, 199, 136, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(73, 199, 136, 0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    gap: 8,
  },
  attachedText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});
