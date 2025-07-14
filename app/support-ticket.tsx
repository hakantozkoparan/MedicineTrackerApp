import { auth, db } from '@/api/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';

import { COLORS, FONTS, SIZES } from '@/constants/theme';

const SupportTicketScreen = () => {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!subject.trim()) newErrors.subject = 'Konu alanı zorunludur.';
    if (!description.trim()) newErrors.description = 'Açıklama alanı zorunludur.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Hata', 'Destek talebi oluşturmak için giriş yapmalısınız.');
      router.replace('/login');
      return;
    }

    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      let currentUserEmail = user.email; // Varsayılan olarak auth email

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        currentUserEmail = userData.email || user.email; // Firestore'dan veya auth'dan al
      }

      await addDoc(collection(db, 'supportTickets'), {
        userId: user.uid,
        userEmail: currentUserEmail,
        subject,
        description,
        status: 'open',
        createdAt: serverTimestamp(),
      });

      Alert.alert('Başarılı', 'Destek talebiniz başarıyla oluşturuldu.');
      setSubject('');
      setDescription('');
      router.back();
    } catch (error) {
      console.error('Error creating support ticket: ', error);
      Alert.alert('Hata', 'Destek talebi oluşturulurken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Destek Talebi Oluştur</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Konu</Text>
          <TextInput
            style={[styles.input, errors.subject ? styles.inputError : null]}
            placeholder="Talebinizin konusu"
            value={subject}
            onChangeText={(text) => {
              setSubject(text);
              if (errors.subject) setErrors((prev) => ({ ...prev, subject: '' }));
            }}
            placeholderTextColor={COLORS.gray}
          />
          {errors.subject ? <Text style={styles.errorText}>{errors.subject}</Text> : null}
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.description ? styles.inputError : null]}
            placeholder="Talebinizin detaylı açıklaması"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
            }}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            placeholderTextColor={COLORS.gray}
          />
          {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
        </View>

        <TouchableOpacity style={styles.sendButton} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.sendButtonText}>Gönder</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.base,
    marginBottom: SIZES.base,
  },
  backButton: {
    padding: SIZES.base,
  },
  title: {
    fontSize: SIZES.extraLarge,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
    textAlign: 'center',
  },
  scrollContentContainer: { paddingHorizontal: SIZES.large, paddingBottom: 100 },
  formGroup: { marginBottom: SIZES.large },
  label: { fontFamily: FONTS.bold, fontSize: SIZES.medium, color: COLORS.primary, marginBottom: SIZES.base / 2 },
  input: { backgroundColor: COLORS.white, paddingHorizontal: SIZES.medium, paddingVertical: SIZES.medium, borderRadius: SIZES.base, fontFamily: FONTS.regular, fontSize: SIZES.medium, borderWidth: 1, borderColor: COLORS.gray },
  inputError: { borderColor: COLORS.danger },
  textArea: { height: 120, },
  errorText: { color: COLORS.danger, marginTop: SIZES.base, fontSize: SIZES.small, fontFamily: FONTS.regular },
  sendButton: { backgroundColor: COLORS.accent, paddingVertical: SIZES.medium, paddingHorizontal: SIZES.large, alignItems: 'center', justifyContent: 'center', borderRadius: SIZES.radius, marginTop: SIZES.large },
  sendButtonText: { fontFamily: FONTS.bold, fontSize: SIZES.medium, color: COLORS.white },
});

export default SupportTicketScreen;
