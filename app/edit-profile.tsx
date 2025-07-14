import { auth, db } from '@/api/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
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

const LabelWithInfo = ({ label, infoText }: { label: string; infoText: string }) => (
    <View style={styles.labelContainer}>
      <Text style={styles.label}>{label}</Text>
    </View>
);

const EditProfileScreen = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setName(userData.name || '');
        setSurname(userData.surname || '');
        setEmail(userData.email || '');
      } else {
        Alert.alert("Hata", "Kullanıcı bilgileri bulunamadı.");
        router.back();
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching user data:", error);
      Alert.alert("Hata", "Kullanıcı bilgileri alınırken bir sorun oluştu.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = 'Ad alanı zorunludur.';
    if (!surname.trim()) newErrors.surname = 'Soyad alanı zorunludur.';
    if (!email.trim()) newErrors.email = 'E-posta alanı zorunludur.';
    else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) newErrors.email = 'Geçerli bir e-posta adresi girin.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        name,
        surname,
        email,
      });

      Alert.alert('Başarılı', 'Hesap bilgileri güncellendi.');
      router.back();
    } catch (error) {
      console.error('Error updating profile: ', error);
      Alert.alert('Hata', 'Hesap bilgileri güncellenirken bir sorun oluştu.');
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Hesap Bilgilerini Düzenle</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.formGroup}>
          <LabelWithInfo label="Ad" infoText="Adınızı girin." />
          <TextInput
            style={[styles.input, errors.name ? styles.inputError : null]}
            placeholder="Adınız"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholderTextColor={COLORS.gray}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
        </View>
        <View style={styles.formGroup}>
          <LabelWithInfo label="Soyad" infoText="Soyadınızı girin." />
          <TextInput
            style={[styles.input, errors.surname ? styles.inputError : null]}
            placeholder="Soyadınız"
            value={surname}
            onChangeText={(text) => {
              setSurname(text);
              if (errors.surname) setErrors((prev) => ({ ...prev, surname: '' }));
            }}
            placeholderTextColor={COLORS.gray}
          />
          {errors.surname ? <Text style={styles.errorText}>{errors.surname}</Text> : null}
        </View>
        <View style={styles.formGroup}>
          <LabelWithInfo label="E-posta" infoText="E-posta adresinizi girin." />
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            placeholder="E-posta Adresiniz"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={COLORS.gray}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Kaydet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  labelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.base },
  infoIcon: { marginLeft: SIZES.base },
  label: { fontFamily: FONTS.bold, fontSize: SIZES.medium, color: COLORS.primary },
  input: { backgroundColor: COLORS.white, paddingHorizontal: SIZES.medium, paddingVertical: SIZES.medium, borderRadius: SIZES.base, fontFamily: FONTS.regular, fontSize: SIZES.medium, borderWidth: 1, borderColor: COLORS.gray },
  inputError: { borderColor: COLORS.danger },
  errorText: { color: COLORS.danger, marginTop: SIZES.base, fontSize: SIZES.small, fontFamily: FONTS.regular },
  saveButton: { backgroundColor: COLORS.accent, paddingVertical: SIZES.medium, paddingHorizontal: SIZES.medium, alignItems: 'center', justifyContent: 'center', borderRadius: SIZES.radius, marginTop: SIZES.large },
  saveButtonText: { fontFamily: FONTS.bold, fontSize: SIZES.medium, color: COLORS.white },
});

export default EditProfileScreen;
