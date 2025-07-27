import { auth, db } from '@/api/firebase';
import BannerAd from '@/components/BannerAd';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import DropdownSelector, { DropdownOption } from '@/components/DropdownSelector';
import OptionSelector, { Option } from '@/components/OptionSelector';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useLocalization } from '@/hooks/useLocalization';

const scheduleReminder = async (
  medicineName: string, 
  doseTime: string, 
  userFor: string, 
  t: any
): Promise<string | null> => {
  try {
    const [hour, minute] = doseTime.split(':').map(Number);
    
    // Bildirim metni kişiye göre ayarla
    const notificationBody = userFor === 'Ben' 
      ? t('medicineReminderBodySelf').replace('{medicineName}', medicineName)
      : t('medicineReminderBodyOther').replace('{medicineName}', medicineName).replace('{userFor}', userFor);
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: t('medicineReminderTitle'),
        body: notificationBody,
        sound: 'default',
        badge: 1,
        data: {
          medicineName,
          doseTime,
          userFor,
          type: 'medicine_reminder'
        }
      },
      trigger: {
        type: 'calendar',
        hour: Number(hour),
        minute: Number(minute),
        repeats: true
      } as any
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

const userOptions: DropdownOption[] = [
  { label: 'Ben', value: 'Ben' },
  { label: 'Anne', value: 'Anne' },
  { label: 'Baba', value: 'Baba' },
  { label: 'Anneanne', value: 'Anneanne' },
  { label: 'Babaanne', value: 'Babaanne' },
  { label: 'Dede', value: 'Dede' },
  { label: 'Kardeş', value: 'Kardeş' },
  { label: 'Eş', value: 'Eş' },
  { label: 'Çocuk', value: 'Çocuk' },
  { label: 'Akraba', value: 'Akraba' },
  { label: 'Diğer', value: 'Diğer' },
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

const EditMedicineScreen = () => {
  const router = useRouter();
  const { t, currentLanguage, languageVersion } = useLocalization();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [originalNotificationIds, setOriginalNotificationIds] = useState<string[]>([]);

  // Dynamic medicine types based on localization
  const medicineTypes: Option[] = [
    { label: t('tabletType'), value: 'Hap', icon: 'pill' },
    { label: t('syrupType'), value: 'Şurup', icon: 'bottle-tonic-plus-outline' },
    { label: t('injectionType'), value: 'İğne', icon: 'needle' },
    { label: t('otherType'), value: 'Diğer', icon: 'medical-bag' },
  ];

  // Dynamic user options based on localization
  const userOptions: DropdownOption[] = [
    { label: t('meUser'), value: 'Ben' },
    { label: t('motherUser'), value: 'Anne' },
    { label: t('fatherUser'), value: 'Baba' },
    { label: t('grandmotherUser'), value: 'Anneanne' },
    { label: t('grandmotherPaternalUser'), value: 'Babaanne' },
    { label: t('grandfatherUser'), value: 'Dede' },
    { label: t('siblingUser'), value: 'Kardeş' },
    { label: t('spouseUser'), value: 'Eş' },
    { label: t('childUser'), value: 'Çocuk' },
    { label: t('relativeUser'), value: 'Akraba' },
    { label: t('otherUser'), value: 'Diğer' },
  ];

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [userFor, setUserFor] = useState<string | number | null>('Ben');
  const [type, setType] = useState<string | number | null>(null);
  const [frequency, setFrequency] = useState<number | null>(null);
  const [doseTimes, setDoseTimes] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [currentDoseIndex, setCurrentDoseIndex] = useState(0);

  useEffect(() => {
    if (!id || !auth || !db) return;
    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }

    const docRef = doc(db, 'users', user.uid, 'medicines', id);
    getDoc(docRef).then(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setName(data.name);
        setDosage(data.dosage);
        setUserFor(data.userFor || 'Ben');
        setType(data.type);
        setFrequency(data.frequency);
        setDoseTimes(data.doseTimes || []);
        setNotificationsEnabled(data.notificationsEnabled !== undefined ? data.notificationsEnabled : true);
        setOriginalNotificationIds(data.notificationIds || []);
      } else {
        Alert.alert("Hata", "İlaç bulunamadı.");
        router.back();
      }
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (loading) return;
    if (frequency) {
      const newDoseTimes = Array.from({ length: frequency }, (_, i) => doseTimes[i] || getCurrentTime());
      setDoseTimes(newDoseTimes);
    } else {
      setDoseTimes([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequency, loading]);

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
    if (!name.trim()) newErrors.name = t('medicineNameRequired');
    if (!dosage.trim()) newErrors.dosage = t('dosageRequired');
    if (!userFor) newErrors.userFor = t('userSelectionRequired');
    if (!type) newErrors.type = t('medicineTypeRequired');
    if (!frequency) newErrors.frequency = t('frequencySelectionRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async () => {
    if (!id || !validate()) return;

    if (notificationsEnabled) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('permissionRequired'),
          t('notificationPermissionMessage')
        );
        return;
      }
    }

    if (!auth || !db) {
      Alert.alert(t('error'), t('firebaseConnectionError'));
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }

    try {
      for (const notificationId of originalNotificationIds) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      }

      const newNotificationIds: string[] = [];
      if (notificationsEnabled) {
        for (const doseTime of doseTimes) {
          const notificationId = await scheduleReminder(name, doseTime, userFor as string, t);
          if (notificationId) {
            newNotificationIds.push(notificationId);
          }
        }
      }

      const docRef = doc(db, 'users', user.uid, 'medicines', id);
      await updateDoc(docRef, {
        name,
        dosage,
        userFor,
        type,
        frequency,
        doseTimes,
        notificationsEnabled,
        notificationIds: newNotificationIds,
      });

      Alert.alert(t('success'), t('medicineUpdated'));
      router.back();
    } catch (error) {
      console.error("İlaç güncellenirken hata oluştu: ", error);
      Alert.alert(t('error'), t('accountUpdateError'));
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} key={`${currentLanguage}-${languageVersion}`}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('editMedicine')}</Text>
        <View style={{ width: 28}} />
      </View>

      {/* Banner Ad - Header altında */}
      <BannerAd />

      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.formGroup}>
          <LabelWithInfo label={t('medicineName')} infoText={t('medicineNameInfo')} />
          <TextInput
            style={[styles.input, errors.name ? styles.inputError : null]}
            placeholder={t('medicineNamePlaceholder')}
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
          <LabelWithInfo label={t('medicineUserLabel')} infoText={t('medicineUserInfo')} />
          <DropdownSelector
            options={userOptions}
            selectedValue={userFor}
            onSelect={(value) => {
              setUserFor(value);
              if (errors.userFor) setErrors((prev) => ({ ...prev, userFor: '' }));
            }}
            placeholder={t('selectUser')}
          />
          {errors.userFor ? <Text style={styles.errorText}>{errors.userFor}</Text> : null}
        </View>
        
        <View style={styles.formGroup}>
          <LabelWithInfo label={t('dosageLabel')} infoText={t('dosageInfo')} />
          <TextInput
            style={[styles.input, errors.dosage ? styles.inputError : null]}
            placeholder={t('dosagePlaceholder')}
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
          <LabelWithInfo label={t('medicineTypeLabel')} infoText={t('medicineTypeInfo')} />
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
          <LabelWithInfo label={t('frequencyLabel')} infoText={t('frequencyInfo')} />
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
            <LabelWithInfo label={t('doseTimesLabel')} infoText={t('doseTimesInfo')} />
            {doseTimes.map((time, index) => (
              <View key={index} style={styles.doseTimeRow}>
                <Text style={styles.doseTimeLabel}>{`${index + 1}. ${t('doseTimeLabel')}`}</Text>
                <TouchableOpacity onPress={() => handleTimePress(index)} style={styles.timeButton}>
                  <Text style={styles.timeButtonText}>{time}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View style={styles.formGroup}>
            <LabelWithInfo label={t('remindersLabel')} infoText={t('remindersInfo')} />
            <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>{t('useReminders')}</Text>
                <Switch
                    trackColor={{ false: COLORS.lightGray, true: COLORS.secondary }}
                    thumbColor={notificationsEnabled ? COLORS.primary : COLORS.gray}
                    onValueChange={setNotificationsEnabled}
                    value={notificationsEnabled}
                />
            </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
        <Text style={styles.saveButtonText}>{t('save')}</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={showPicker}
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('selectDoseTime')}</Text>
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
                <Text style={styles.modalButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleConfirmTime}>
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>{t('ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
});

export default EditMedicineScreen;
