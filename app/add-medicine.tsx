import { auth, db } from '@/api/firebase';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import OptionSelector, { Option } from '@/components/OptionSelector';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

// Request notification permissions on app load
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Function to schedule a notification for a specific time
const scheduleReminder = async (medicineName: string, doseTime: string) => {
  try {
    const [hours, minutes] = doseTime.split(':').map(Number);
    const now = new Date();
    let notificationTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    // If the notification time has already passed for today, schedule for tomorrow
    if (notificationTime <= now) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'İlaç hatırlatıcı',
        body: `İlaçınızı almayı unutmayın: ${medicineName}`,
        sound: true,
      },
      trigger: {
        type: 'daily',
        hour: hours,
        minute: minutes,
        repeats: true,
      } as any,
    });
  } catch (error) {
    console.error('Bildirim ayarlanırken hata oluştu:', error);
  }
};

const medicineTypes: Option[] = [
  { label: 'Hap', value: 'Hap', icon: 'pill' },
  { label: 'Şurup', value: 'Şurup', icon: 'bottle-tonic-plus-outline' },
  { label: 'İğne', value: 'İğne', icon: 'needle' },
  { label: 'Diğer', value: 'Diğer', icon: 'medical-bag' },
];

const frequencyOptions: Option[] = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
  { label: '6', value: 6 },
];

const getCurrentTime = () => {
  return new Date().toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AddMedicineScreen = () => {
  const router = useRouter();

  // Request notification permissions
  useEffect(() => {
    const requestPermissions = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('İzin Gerekli', 'Bildirimler için izin vermeniz gerekiyor.');
      }
    };
    requestPermissions();
  }, []);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [type, setType] = useState<string | number | null>('Hap');
  const [frequency, setFrequency] = useState<number | null>(1);
  const [doseTimes, setDoseTimes] = useState<string[]>([getCurrentTime()]);

  // Time Picker State
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [currentDoseIndex, setCurrentDoseIndex] = useState(0);

  useEffect(() => {
    if (frequency) {
      const newDoseTimes = Array.from({ length: frequency }, (_, i) => {
        return doseTimes[i] || getCurrentTime(); // Keep existing time or default to current time
      });
      setDoseTimes(newDoseTimes);
    } else {
      setDoseTimes([]);
    }
  }, [frequency]);

  const handleTimePress = (index: number) => {
    const [hours, minutes] = doseTimes[index].split(':').map(Number);
    const newDate = new Date();
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    setPickerDate(newDate);
    setCurrentDoseIndex(index);
    setShowPicker(true);
  };

  const onChangeTime = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
        setShowPicker(false);
        return;
    }
    const currentDate = selectedDate || pickerDate;
    setPickerDate(currentDate);
  };

  const handleConfirmTime = () => {
    const newTime = pickerDate.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const newDoseTimes = [...doseTimes];
    newDoseTimes[currentDoseIndex] = newTime;
    setDoseTimes(newDoseTimes);
    setShowPicker(false);
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'İlaç adı boş bırakılamaz.');
      return;
    }
    if (!type) {
      Alert.alert('Hata', 'Lütfen bir ilaç türü seçin.');
      return;
    }
    if (!frequency) {
      Alert.alert('Hata', 'Lütfen ilacın günde kaç defa alınacağını seçin.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Hata', 'İlaç eklemek için giriş yapmalısınız.');
      router.replace('/login');
      return;
    }

    try {
      // Schedule notifications for each dose time
      doseTimes.forEach(doseTime => {
        scheduleReminder(name, doseTime);
      });

      await addDoc(collection(db, 'users', user.uid, 'medicines'), {
        name,
        dosage,
        type,
        frequency,
        doseTimes,
        createdAt: serverTimestamp(),
      });
      Alert.alert('Başarılı', 'İlaç başarıyla eklendi ve hatırlatıcılar ayarlandı.');
      router.back();
    } catch (error) {
      console.error('Error adding medicine: ', error);
      Alert.alert('Hata', 'İlaç eklenirken bir sorun oluştu.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>İlaç Adı</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: Parol"
            value={name}
            onChangeText={setName}
            placeholderTextColor={COLORS.gray}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Dozaj Bilgisi</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: 500mg, 10ml"
            value={dosage}
            onChangeText={setDosage}
            placeholderTextColor={COLORS.gray}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>İlaç Türü</Text>
          <OptionSelector
            options={medicineTypes}
            selectedValue={type}
            onSelect={setType}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Günde Kaç Defa</Text>
          <OptionSelector
            options={frequencyOptions}
            selectedValue={frequency}
            onSelect={(value: string | number) => setFrequency(value as number)}
          />
        </View>

        {doseTimes.length > 0 && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Doz Saatleri</Text>
            {doseTimes.map((time, index) => (
              <View key={index} style={styles.doseTimeRow}>
                <Text style={styles.doseTimeLabel}>{`${index + 1}. Doz Saati`}</Text>
                <TouchableOpacity onPress={() => handleTimePress(index)} style={styles.timeButton}>
                  <Text style={styles.timeButtonText}>{time}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Kaydet</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={showPicker}
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Doz Saati Seçin</Text>
            <DateTimePicker
              testID="dateTimePicker"
              value={pickerDate}
              mode={'time'}
              is24Hour={true}
              display="spinner"
              onChange={onChangeTime}
              themeVariant="light"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowPicker(false)}>
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleConfirmTime}>
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContentContainer: {
    padding: SIZES.large,
    paddingBottom: 100, // Ensure content is not hidden behind the save button
  },
  formGroup: {
    marginBottom: SIZES.large,
  },
  label: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.medium,
    color: COLORS.primary,
    marginBottom: SIZES.base,
  },
  input: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.medium,
    borderRadius: SIZES.base,
    fontFamily: FONTS.regular,
    fontSize: SIZES.medium,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  doseTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: SIZES.medium,
    borderRadius: SIZES.base,
    marginBottom: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  doseTimeLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.medium,
    color: COLORS.darkGray,
  },
  timeButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.base,
  },
  timeButtonText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.medium,
    color: COLORS.white,
  },
  saveButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.accent,
    padding: SIZES.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.large,
    color: COLORS.white,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.medium,
    padding: SIZES.large,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.large,
    marginBottom: SIZES.large,
    color: COLORS.primary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: SIZES.medium,
  },
  modalButton: {
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.large,
    borderRadius: SIZES.base,
    backgroundColor: COLORS.gray,
  },
  modalButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.medium,
    color: COLORS.darkGray,
  },
  confirmButton: {
    backgroundColor: COLORS.accent,
  },
  confirmButtonText: {
    color: COLORS.white,
  },
});

export default AddMedicineScreen;
