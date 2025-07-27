import { auth, db } from '@/api/firebase';
import BannerAd from '@/components/BannerAd';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useLocalization } from '@/hooks/useLocalization';

const SupportTicketScreen = () => {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { t } = useLocalization();

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!subject.trim()) newErrors.subject = t('subjectRequired');
    if (!description.trim()) newErrors.description = t('messageRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    if (!auth || !db) {
      Alert.alert(t('error'), t('firebaseConnectionError'));
      router.replace('/login');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      Alert.alert(t('error'), t('supportTicketError'));
      router.replace('/login');
      return;
    }

    setLoading(true);
    try {
      const userDocRef = db ? doc(db, 'users', user.uid) : undefined;
      let userDocSnap;
      if (userDocRef) {
        userDocSnap = await getDoc(userDocRef);
      }
      let currentUserEmail = user.email; // Varsayılan olarak auth email

      if (userDocSnap && userDocSnap.exists()) {
        const userData = userDocSnap.data();
        currentUserEmail = userData.email || user.email; // Firestore'dan veya auth'dan al
      }

      if (!db) throw new Error('Firestore bağlantısı yok.');
      await addDoc(collection(db, 'supportTickets'), {
        userId: user.uid,
        userEmail: currentUserEmail,
        subject,
        description,
        status: 'open',
        createdAt: serverTimestamp(),
      });

      Alert.alert(t('success'), t('supportTicketSent'));
      setSubject('');
      setDescription('');
      router.back();
    } catch (error) {
      console.error('Error creating support ticket: ', error);
      Alert.alert(t('error'), t('supportTicketError'));
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
        <Text style={styles.title}>{t('supportTicket')}</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('subject')}</Text>
          <TextInput
            style={[styles.input, errors.subject ? styles.inputError : null]}
            placeholder={t('subjectTitle')}
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
          <Text style={styles.label}>{t('message')}</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.description ? styles.inputError : null]}
            placeholder={t('messageTitle')}
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
            <Text style={styles.sendButtonText}>{t('send')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Banner Ad */}
      <BannerAd style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} />
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
