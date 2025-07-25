import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, getFirestore, query } from 'firebase/firestore';
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

const SendNotificationScreen = () => {
  const router = useRouter();
  const auth = getAuth();
  const firestore = getFirestore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = 'Başlık alanı zorunludur.';
    if (!body.trim()) newErrors.body = 'İçerik alanı zorunludur.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Hata', 'Bildirim göndermek için giriş yapmalısınız.');
      router.replace('/login');
      return;
    }

    setLoading(true);
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);

      const pushTokens: string[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.pushToken) {
          pushTokens.push(userData.pushToken);
        }
      });

      if (pushTokens.length === 0) {
        Alert.alert('Uyarı', 'Bildirim gönderilecek kullanıcı bulunamadı.');
        return;
      }

      const messages = [];
      for (const token of pushTokens) {
        messages.push({
          to: token,
          sound: 'default',
          title: title,
          body: body,
          data: { someData: 'goes here' },
        });
      }

      const chunks = [];
      const chunkSize = 100; // Expo Push API'sinin izin verdiği maksimum toplu boyut
      for (let i = 0; i < messages.length; i += chunkSize) {
        chunks.push(messages.slice(i, i + chunkSize));
      }

      for (const chunk of chunks) {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Push notification error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
          throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }

        // Success response'u da logla
        const responseData = await response.json();
        console.log('Push notification success:', responseData);
      }

      Alert.alert('Başarılı', `${pushTokens.length} kullanıcıya bildirim başarıyla gönderildi.`);
      setTitle('');
      setBody('');
      router.back();
    } catch (error) {
      console.error('Error sending notifications: ', error);
      Alert.alert('Hata', 'Bildirim gönderilirken bir sorun oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
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
        <Text style={styles.title}>Bildirim Gönder</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Başlık</Text>
          <TextInput
            style={[styles.input, errors.title ? styles.inputError : null]}
            placeholder="Bildirim Başlığı"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
            }}
            placeholderTextColor={COLORS.gray}
          />
          {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>İçerik</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.body ? styles.inputError : null]}
            placeholder="Bildirim İçeriği"
            value={body}
            onChangeText={(text) => {
              setBody(text);
              if (errors.body) setErrors((prev) => ({ ...prev, body: '' }));
            }}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            placeholderTextColor={COLORS.gray}
          />
          {errors.body ? <Text style={styles.errorText}>{errors.body}</Text> : null}
        </View>

        <TouchableOpacity style={styles.sendButton} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.sendButtonText}>Bildirim Gönder</Text>
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

export default SendNotificationScreen;
