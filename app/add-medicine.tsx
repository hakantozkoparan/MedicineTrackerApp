import { auth, db } from '@/api/firebase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import OptionSelector, { Option } from '@/components/OptionSelector';
import PremiumModal from '@/components/PremiumModal';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import usePremiumLimit from '@/hooks/usePremiumLimit';

const scheduleReminder = async (medicineName: string, doseTime: string): Promise<string | null> => {
  try {
    const [hour, minute] = doseTime.split(':').map(Number);
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'İlaç Hatırlatma',
        body: `${medicineName} ilacınızı alma zamanı!`,
        sound: 'default',
      },
      trigger: { 
        hour: Number(hour), 
        minute: Number(minute),
        repeats: true
      } as any,
    });
    return identifier;
  } catch (error) {
    console.error(`Bildirim ayarlanırken hata oluştu (${doseTime}):`, error);
    return null;
  }
};

const medicineTypes: Option[] = [
  { label: 'Hap', value: 'Hap', icon: 'pill' },
  { label: 'Şurup', value: 'Şurup', icon: 'bottle-tonic-plus-outline' },
  { label: 'İğne', value: 'İğne', icon: 'needle' },
  { label: 'Diğer', value: 'Diğer', icon: 'medical-bag' },
];

const frequencyOptions: Option[] = Array.from({ length: 6 }, (_, i) => ({ label: (i + 1).toString(), value: i + 1 }));

const getCurrentTime = () => new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

const LabelWithInfo = ({ label, infoText }: { label: string; infoText: string }) => (
    <View style={styles.labelContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity onPress={() => Alert.alert(label, infoText)} style={styles.infoIcon}>
        <Ionicons name="information-circle-outline" size={22} color={COLORS.secondary} />
      </TouchableOpacity>
    </View>
);

const AddMedicineScreen = () => {
  const router = useRouter();
  const { canAddMedicine, medicineCount, medicineLimit, loading: limitLoading, refreshPremiumStatus } = usePremiumLimit();

  const [premiumModalVisible, setPremiumModalVisible] = useState(false);

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    };
    requestPermissions();
  }, []);

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [type, setType] = useState<string | number | null>('Hap');
  const [frequency, setFrequency] = useState<number | null>(1);
  const [doseTimes, setDoseTimes] = useState<string[]>([getCurrentTime()]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [currentDoseIndex, setCurrentDoseIndex] = useState(0);

  useEffect(() => {
    if (frequency) {
      const newDoseTimes = Array.from({ length: frequency }, (_, i) => doseTimes[i] || getCurrentTime());
      setDoseTimes(newDoseTimes);
    } else {
      setDoseTimes([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const newTime = pickerDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const newDoseTimes = [...doseTimes];
    newDoseTimes[currentDoseIndex] = newTime;
    setDoseTimes(newDoseTimes);
    setShowPicker(false);
  }

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = 'İlaç adı zorunludur.';
    if (!dosage.trim()) newErrors.dosage = 'Dozaj bilgisi zorunludur.';
    if (!type) newErrors.type = 'İlaç türü seçmek zorunludur.';
    if (!frequency) newErrors.frequency = 'Sıklık seçmek zorunludur.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // Premium limit kontrolü
    if (!canAddMedicine) {
      setPremiumModalVisible(true);
      return;
    }

    if (!validate()) {
      return;
    }

    if (notificationsEnabled) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'İzin Gerekli',
          'Hatırlatıcıların çalışması için bildirim izinlerine ihtiyaç var. Lütfen ayarlardan izinleri etkinleştirin.'
        );
        return;
      }
    }

    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }
    try {
      const notificationIds: string[] = [];
      if (notificationsEnabled) {
        for (const doseTime of doseTimes) {
          const notificationId = await scheduleReminder(name, doseTime);
          if (notificationId) {
            notificationIds.push(notificationId);
          }
        }
      }

      await addDoc(collection(db, 'users', user.uid, 'medicines'), {
        name,
        dosage,
        type,
        frequency,
        doseTimes,
        notificationsEnabled,
        notificationIds,
        createdAt: serverTimestamp(),
        isActive: true,
      });

      Alert.alert('Başarılı', `İlaç başarıyla eklendi. ${notificationsEnabled ? 'Hatırlatıcılar ayarlandı.' : 'Hatırlatıcılar kapalı.'}`);
      router.back();
    } catch (error) {
      console.error('Error adding medicine: ', error);
      Alert.alert('Hata', 'İlaç eklenirken bir sorun oluştu.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>İlaç Ekle</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        {/* Premium Limit Uyarısı */}
        {!limitLoading && medicineLimit && medicineCount >= medicineLimit && (
          <View style={styles.limitWarning}>
            <Ionicons name="warning" size={24} color={COLORS.warning} />
            <View style={styles.limitWarningText}>
              <Text style={styles.limitWarningTitle}>Ücretsiz Plan Limiti</Text>
              <Text style={styles.limitWarningDescription}>
                Ücretsiz planda maksimum {medicineLimit} ilaç ekleyebilirsiniz. 
                Sınırsız ilaç eklemek için Premium'a geçin.
              </Text>
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => setPremiumModalVisible(true)}
              >
                <Text style={styles.upgradeButtonText}>Premium'a Geç</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.formGroup}>
          <LabelWithInfo label="İlaç Adı" infoText="Takip etmek istediğiniz ilacın adını girin (örn: Parol, Aspirin)." />
          <TextInput
            style={[styles.input, errors.name ? styles.inputError : null]}
            placeholder="Örn: Parol"
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
          <LabelWithInfo label="Dozaj Bilgisi" infoText="Her bir dozda ne kadar ilaç alınacağını belirtin (örn: 500 mg, 1 tablet, 10 ml)." />
          <TextInput
            style={[styles.input, errors.dosage ? styles.inputError : null]}
            placeholder="Örn: 500mg, 10ml"
            value={dosage}
            onChangeText={(text) => {
              setDosage(text);
              if (errors.dosage) setErrors((prev) => ({ ...prev, dosage: '' }));
            }}
            placeholderTextColor={COLORS.gray}
          />
          {errors.dosage ? <Text style={styles.errorText}>{errors.dosage}</Text> : null}
        </View>
        <View style={styles.formGroup}>
          <LabelWithInfo label="İlaç Türü" infoText="İlacınızın formunu seçin (Tablet, Şurup, Krem vb.)." />
          <OptionSelector
            options={medicineTypes}
            selectedValue={type}
            onSelect={(value) => {
              setType(value);
              if (errors.type) setErrors((prev) => ({ ...prev, type: '' }));
            }}
          />
          {errors.type ? <Text style={styles.errorText}>{errors.type}</Text> : null}
        </View>
        <View style={styles.formGroup}>
          <LabelWithInfo label="Günde Kaç Defa" infoText="İlacınızı 24 saat içinde kaç defa almanız gerektiğini belirtin." />
          <OptionSelector
            options={frequencyOptions}
            selectedValue={frequency}
            onSelect={(value) => {
              setFrequency(value as number);
              if (errors.frequency) setErrors((prev) => ({ ...prev, frequency: '' }));
            }}
          />
          {errors.frequency ? <Text style={styles.errorText}>{errors.frequency}</Text> : null}
        </View>
        {doseTimes.length > 0 && (
          <View style={styles.formGroup}>
            <LabelWithInfo label="Doz Saatleri" infoText="İlacınızı almanız gereken saatleri seçin. Her saat için bir hatırlatma oluşturulur." />
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
        <View style={styles.formGroup}>
            <LabelWithInfo label="Hatırlatıcılar" infoText="Bu seçenek aktifse, doz saatlerinde hatırlatma bildirimi gönderilir." />
            <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>İlacı kullanıyorum (Bildirimleri Aç)</Text>
                <Switch
                    trackColor={{ false: COLORS.lightGray, true: COLORS.secondary }}
                    thumbColor={notificationsEnabled ? COLORS.primary : COLORS.gray}
                    onValueChange={setNotificationsEnabled}
                    value={notificationsEnabled}
                />
            </View>
        </View>
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

      {/* Premium Modal */}
      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        onPurchaseSuccess={() => {
          refreshPremiumStatus();
          setPremiumModalVisible(false);
        }}
        currentMedicineCount={medicineCount}
      />
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
  labelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.base },
  infoIcon: { marginLeft: SIZES.base },
  label: { fontFamily: FONTS.bold, fontSize: SIZES.medium, color: COLORS.primary },
  input: { backgroundColor: COLORS.white, paddingHorizontal: SIZES.medium, paddingVertical: SIZES.medium, borderRadius: SIZES.base, fontFamily: FONTS.regular, fontSize: SIZES.medium, borderWidth: 1, borderColor: COLORS.gray },
  inputError: { borderColor: COLORS.danger },
  errorText: { color: COLORS.danger, marginTop: SIZES.base, fontSize: SIZES.small, fontFamily: FONTS.regular },
  doseTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, padding: SIZES.medium, borderRadius: SIZES.base, marginBottom: SIZES.base, borderWidth: 1, borderColor: COLORS.gray },
  doseTimeLabel: { fontFamily: FONTS.semiBold, fontSize: SIZES.medium, color: COLORS.darkGray },
  timeButton: { backgroundColor: COLORS.secondary, paddingVertical: SIZES.base, paddingHorizontal: SIZES.medium, borderRadius: SIZES.base },
  timeButtonText: { fontFamily: FONTS.bold, fontSize: SIZES.medium, color: COLORS.white },
  toggleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, padding: SIZES.medium, borderRadius: SIZES.base, borderWidth: 1, borderColor: COLORS.gray },
  toggleLabel: { fontFamily: FONTS.semiBold, fontSize: SIZES.medium, color: COLORS.darkGray },
  saveButton: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.accent, padding: SIZES.large, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { fontFamily: FONTS.bold, fontSize: SIZES.large, color: COLORS.white },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: COLORS.white, borderRadius: SIZES.medium, padding: SIZES.large, width: '85%', alignItems: 'center' },
  modalTitle: { fontFamily: FONTS.bold, fontSize: SIZES.large, marginBottom: SIZES.large, color: COLORS.primary },
  modalActions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: SIZES.medium },
  modalButton: { paddingVertical: SIZES.base, paddingHorizontal: SIZES.large, borderRadius: SIZES.base, backgroundColor: COLORS.gray },
  modalButtonText: { fontFamily: FONTS.semiBold, fontSize: SIZES.medium, color: COLORS.darkGray },
  confirmButton: { backgroundColor: COLORS.accent },
  confirmButtonText: { color: COLORS.white },
  
  // Premium limit warning styles
  limitWarning: {
    backgroundColor: COLORS.lightWarning,
    flexDirection: 'row',
    padding: SIZES.medium,
    borderRadius: SIZES.base,
    marginBottom: SIZES.large,
    alignItems: 'flex-start',
  },
  limitWarningText: {
    flex: 1,
    marginLeft: SIZES.base,
  },
  limitWarningTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.medium,
    color: COLORS.warning,
    marginBottom: 4,
  },
  limitWarningDescription: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.darkGray,
    lineHeight: 18,
    marginBottom: SIZES.base,
  },
  upgradeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.base,
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
});

export default AddMedicineScreen;