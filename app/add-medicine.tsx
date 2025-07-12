import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, SafeAreaView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '@/api/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function AddMedicineScreen() {
  const router = useRouter();
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');

  const handleSave = async () => {
    if (!medicineName) {
      Alert.alert('Eksik Bilgi', 'Lütfen ilaç adını girin.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
      router.replace('/login');
      return;
    }

    try {
      const medicinesCollectionRef = collection(db, 'users', user.uid, 'medicines');
      await addDoc(medicinesCollectionRef, {
        name: medicineName,
        dosage: dosage,
        frequency: frequency,
        createdAt: serverTimestamp(),
      });

      // Optionally, provide feedback to the user
      if (Platform.OS !== 'web') {
          Alert.alert('Başarılı', 'İlaç başarıyla eklendi.');
      }
      
      router.back();
    } catch (error) {
      console.error('Error adding medicine: ', error);
      Alert.alert('Hata', 'İlaç eklenirken bir hata oluştu.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Yeni İlaç Ekle</Text>
        <Button title="İptal" onPress={() => router.back()} />
      </View>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="İlaç Adı (örn: Parol)"
          value={medicineName}
          onChangeText={setMedicineName}
        />
        <TextInput
          style={styles.input}
          placeholder="Dozaj (örn: 500mg)"
          value={dosage}
          onChangeText={setDosage}
        />
        <TextInput
          style={styles.input}
          placeholder="Sıklık (örn: Günde 2 kez)"
          value={frequency}
          onChangeText={setFrequency}
        />
        <Button title="Kaydet" onPress={handleSave} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  form: {
    padding: 20,
    gap: 15,
  },
  input: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 16,
  },
});
