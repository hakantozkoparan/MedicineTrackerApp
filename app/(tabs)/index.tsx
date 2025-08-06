import { auth, db } from '@/api/firebase';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useLocalization } from '@/hooks/useLocalization';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, SafeAreaView, StyleSheet, Switch, Text, View } from 'react-native';

// TypeScript interface for our medicine data
interface Medicine {
  id: string;
  name: string;
  dosage: string;
  userFor: string;
  type: string;
  notificationsEnabled: boolean;
  doseTimes: string[];
  notificationIds?: string[];
}

const getMedicineIcon = (type: string): React.ComponentProps<typeof MaterialCommunityIcons>['name'] => {
  switch (type) {
    case 'Hap':
      return 'pill';
    case 'Şurup':
      return 'bottle-tonic-plus-outline';
    case 'İğne':
      return 'needle';
    default:
      return 'medical-bag';
  }
};

export default function HomeScreen() {
  const { t } = useLocalization();

  const [userName, setUserName] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  // Uygulama açıldığında badge'i sıfırla
  React.useEffect(() => {
    Notifications.setBadgeCountAsync(0);
  }, []);

  const toggleMedicineStatus = async (medicine: Medicine) => {
    if (!auth || !db) return;
    const user = auth.currentUser;
    if (!user) return;

    const newNotificationsEnabled = !medicine.notificationsEnabled;
    const medicineRef = doc(db, `users/${user.uid}/medicines`, medicine.id);

    try {
      await updateDoc(medicineRef, {
        notificationsEnabled: newNotificationsEnabled,
      });

      if (newNotificationsEnabled) {
        // Schedule new notifications
        const newNotificationIds: string[] = [];
        for (const doseTime of medicine.doseTimes) {
          const [hour, minute] = doseTime.split(':').map(Number);
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: ' İlaç Hatırlatma',
              body: `${medicine.name} ilacınızı alma zamanı!`,
              sound: 'default',
              badge: 1,
              data: {
                medicineName: medicine.name,
                doseTime,
                type: 'medicine_reminder'
              }
            },
            trigger: {
              type: 'calendar',
              hour,
              minute,
              repeats: true
            } as any
          });
          if (notificationId) {
            newNotificationIds.push(notificationId);
          }
        }
        await updateDoc(medicineRef, { notificationIds: newNotificationIds });
      } else {
        // Cancel existing notifications
        if (medicine.notificationIds && medicine.notificationIds.length > 0) {
          for (const notificationId of medicine.notificationIds) {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
          }
        }
        await updateDoc(medicineRef, { notificationIds: [] });
      }
    } catch (error) {
      Alert.alert("Hata", "İlaç durumu güncellenirken bir sorun oluştu.");
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!auth || !db) return;
      const user = auth.currentUser;
      if (!user) return;

      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const name = docSnap.data().name || '';
          setUserName(name);
        } else {
          // No such user document!
        }
      }, (error) => {
        Alert.alert("Hata", "Kullanıcı bilgileri alınırken bir sorun oluştu.");
      });

      const medicinesCollectionRef = collection(db, `users/${user.uid}/medicines`);
      const q = query(medicinesCollectionRef, where('notificationsEnabled', '==', true));
      const unsubscribeMedicines = onSnapshot(q, (querySnapshot) => {
        const userMedicines = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Medicine[];
        setMedicines(userMedicines);
      }, (error) => {
        console.error("İlaç değişiklikleri takip hatası:", error);
        
        // Eğer permission hatası varsa (kullanıcı silinmiş olabilir), sessizce geç
        if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
          setMedicines([]);
          return;
        }
        
        Alert.alert("Hata", "İlaçlar alınırken bir sorun oluştu.");
      });

      return () => {
        unsubscribeUser();
        unsubscribeMedicines();
      };
    }, [])
  );

  const renderMedicine = ({ item }: { item: Medicine }) => (
    <View style={styles.medicineCard}>
      <MaterialCommunityIcons name={getMedicineIcon(item.type)} size={24} color={COLORS.primary} style={styles.medicineIcon} />
      <View style={styles.medicineDetails}>
        <Text style={styles.medicineName}>
          {item.userFor && item.userFor !== 'Ben' ? `${item.name} - ${item.userFor}` : item.name}
        </Text>
        {item.doseTimes && item.doseTimes.length > 0 && (
          <Text style={styles.medicineTimes}>{item.doseTimes.join(', ')}</Text>
        )}
      </View>
      <Switch
        trackColor={{ false: COLORS.lightGray, true: COLORS.secondary }}
        thumbColor={item.notificationsEnabled ? COLORS.primary : COLORS.gray}
        onValueChange={() => toggleMedicineStatus(item)}
        value={item.notificationsEnabled}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('welcomeMessage')}, {userName || '...'}</Text>
        </View>

        <Text style={styles.subTitle}>{t('todayReminders')}</Text>
        {medicines.length > 0 && (
          <View style={styles.infoContainer}>
            <MaterialCommunityIcons name="information" size={SIZES.font} color={COLORS.gray} style={styles.infoIconText} />
            <Text style={styles.infoText}>{t('medicineToggleWarning')}</Text>
          </View>
        )}

        <FlatList
            data={medicines}
            renderItem={renderMedicine}
            keyExtractor={item => item.id}
            ListEmptyComponent={<Text style={styles.emptyText}>{t('noRemindersToday')}</Text>}
            contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: SIZES.large,
  },
  header: {
    paddingTop: SIZES.large,
    marginBottom: SIZES.large,
  },
  title: {
    fontSize: SIZES.extraLarge,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
  },
  subTitle: {
    fontSize: SIZES.large,
    fontFamily: FONTS.semiBold,
    color: COLORS.darkGray,
    marginBottom: SIZES.medium,
  },
  infoText: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: '#FFA500',
    flexShrink: 1,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.medium,
  },
  infoIconText: {
    marginRight: SIZES.small / 2,
    color: '#FFA500',
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: SIZES.medium,
    borderRadius: SIZES.base,
    marginBottom: SIZES.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  medicineIcon: {
    marginRight: SIZES.medium,
  },
  medicineDetails: {
    flex: 1,
    marginRight: SIZES.medium,
  },
  medicineName: {
    fontSize: SIZES.large,
    fontFamily: FONTS.semiBold,
    color: COLORS.darkGray,
  },
  medicineTimes: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.accent,
    marginTop: SIZES.base / 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
});


