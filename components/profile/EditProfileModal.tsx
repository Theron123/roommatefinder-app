import React from 'react';
import { StyleSheet, View, Text, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  name: string;
  onChangeName: (text: string) => void;
  age: string;
  onChangeAge: (text: string) => void;
  bio: string;
  onChangeBio: (text: string) => void;
  onSave: () => void;
  t: any;
}

export default function EditProfileModal({
  visible,
  onClose,
  name,
  onChangeName,
  age,
  onChangeAge,
  bio,
  onChangeBio,
  onSave,
  t,
}: EditProfileModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('myprofile.edit_profile_title') || 'Editar Perfil'}</Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={20} color="#fff" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Name Input */}
              <Text style={styles.label}>{t('myprofile.name_label') || 'Nombre'}</Text>
              <TextInput
                value={name}
                onChangeText={onChangeName}
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="#555"
              />

              {/* Age Input */}
              <Text style={styles.label}>{t('myprofile.age_label') || 'Edad'}</Text>
              <TextInput
                value={age}
                onChangeText={onChangeAge}
                style={styles.input}
                placeholder="Age"
                placeholderTextColor="#555"
                keyboardType="numeric"
                maxLength={2}
              />

              {/* Bio Input */}
              <Text style={styles.label}>{t('myprofile.about_me') || 'Sobre mí'}</Text>
              <TextInput
                value={bio}
                onChangeText={onChangeBio}
                style={[styles.input, styles.textArea]}
                placeholder={t('myprofile.write_bio') || 'Escribe tu biografía...'}
                placeholderTextColor="#555"
                multiline
                numberOfLines={4}
              />

              {/* Save button */}
              <Pressable onPress={onSave} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>{t('general.save') || 'Guardar'}</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0d1117',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#202c33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  label: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#202c33',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: '#49C788',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 30,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
