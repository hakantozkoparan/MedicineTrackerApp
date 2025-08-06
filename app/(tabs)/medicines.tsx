import { auth, db } from '@/api/firebase';
import PremiumModal from '@/components/PremiumModal';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useLocalization } from '@/hooks/useLocalization';
import usePremiumLimit from '@/hooks/usePremiumLimit';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  userFor: string;
  type: string;
  frequency: number;
  doseTimes: string[];
  notificationsEnabled: boolean;
  notificationIds?: string[];
  createdAt: any;
  isActive: boolean;
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

export default function MedicinesScreen() {
  const router = useRouter();
  const { t, currentLanguage, languageVersion } = useLocalization();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  
  const { 
    isPremium, 
    medicineCount, 
    medicineLimit, 
    canAddMedicine, 
    remainingMedicines, 
    refreshPremiumStatus 
  } = usePremiumLimit();

  useFocusEffect(
    useCallback(() => {
      const user = auth?.currentUser;
      if (!user || !auth || !db) {
        setLoading(false);
        return;
      }
      const medicinesCollectionRef = collection(db, `users/${user.uid}/medicines`);
      const q = query(medicinesCollectionRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userMedicines = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Medicine[];
        setMedicines(userMedicines);
        setLoading(false);
      }, (error) => {
        console.error("İlaç değişiklikleri takip hatası:", error);
        
        // Eğer permission hatası varsa (kullanıcı silinmiş olabilir), listener'ı kapat
        if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
          setMedicines([]);
          setLoading(false);
          return;
        }
        
        setLoading(false);
      });
      return () => unsubscribe();
    }, [])
  );

  const handleDelete = async (item: Medicine) => {
    Alert.alert(
      t('deleteMedicineTitle'),
      `"${item.name}" ${t('deleteMedicineConfirm')}`,
      [
        { text: t('cancelDelete'), style: "cancel" },
        {
          text: t('confirmDelete'),
          style: "destructive",
          onPress: async () => {
            try {
              if (item.notificationIds && item.notificationIds.length > 0) {
                for (const id of item.notificationIds) {
                  await Notifications.cancelScheduledNotificationAsync(id);
                }
              }
              const user = auth?.currentUser;
              if (user && auth && db) {
                const medicineRef = doc(db, `users/${user.uid}/medicines`, item.id);
                await updateDoc(medicineRef, {
                  isActive: false,
                  notificationsEnabled: false, // İlaç pasifleşince bildirimleri de kapat
                  notificationIds: [], // Tüm bildirim ID'lerini temizle
                });
              }
            } catch {
              Alert.alert(t('error'), t('errorDeletingMedicine'));
            }
          },
        },
      ]
    );
  };

  const handleEdit = (item: Medicine) => {
    router.push(`/edit-medicine/${item.id}`);
  };

  const renderMedicineItem = ({ item }: { item: Medicine }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleGroup}>
          <MaterialCommunityIcons name={getMedicineIcon(item.type)} size={24} color={COLORS.primary} style={styles.medicineIcon} />
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={() => handleEdit(item)}>
            <Ionicons name="create-outline" size={24} color={COLORS.darkGray} />
          </TouchableOpacity>
          {isPremium && (
            <TouchableOpacity onPress={() => handleDelete(item)} style={{ marginLeft: SIZES.medium }}>
              <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardText}><Text style={styles.boldText}>{t('userLabel')}:</Text> {item.userFor || t('meUser')}</Text>
        <Text style={styles.cardText}><Text style={styles.boldText}>{t('dosage')}:</Text> {item.dosage || 'Belirtilmemiş'}</Text>
        <Text style={styles.cardText}><Text style={styles.boldText}>{t('frequency')}:</Text> {t('frequencyTimesPerDay')} {item.frequency} {t('timesSuffix')}</Text>
        <Text style={styles.cardText}>
          <Text style={styles.boldText}>{t('notificationStatus')}:</Text> 
          <Text style={{ color: item.notificationsEnabled ? COLORS.success : COLORS.danger }}>
            {item.notificationsEnabled ? ` ${t('notificationOn')}` : ` ${t('notificationOff')}`}
          </Text>
        </Text>
      </View>

      <View style={styles.timeContainer}>
        {item.doseTimes.map((time, index) => (
          <View key={index} style={styles.timeChip}>
            <Ionicons name="time-outline" size={14} color={COLORS.white} />
            <Text style={styles.timeText}>{time}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const handleAddMedicine = () => {
    if (!canAddMedicine) {
      setPremiumModalVisible(true);
    } else {
      router.push('/add-medicine');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} key={`${currentLanguage}-${languageVersion}`}>
      <FlatList
        data={medicines}
        renderItem={renderMedicineItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListHeaderComponent={
            <View style={styles.headerContainer}>
              <View style={styles.header}>
                <Text style={styles.title}>{t('medicines')}</Text>
                <TouchableOpacity onPress={handleAddMedicine}>
                    <Ionicons name="add-circle" size={32} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              
              {/* Premium Status Info */}
              {!isPremium && (
                <View style={styles.premiumCard}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.premiumGradient}
                  >
                    <View style={styles.premiumHeader}>
                      <View style={styles.premiumIconContainer}>
                        <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
                      </View>
                      <View style={styles.premiumTextContainer}>
                        <Text style={styles.premiumTitle}>{t('upgradeTitle')}</Text>
                        <Text style={styles.premiumSubtitle}>{t('unlimitedMedicines')}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.limitContainer}>
                      <View style={styles.limitBar}>
                        <View 
                          style={[
                            styles.limitProgress, 
                            { width: `${(medicineCount / (medicineLimit || 1)) * 100}%` }
                          ]} 
                        />
                      </View>
                      <Text style={styles.limitText}>
                        {medicineCount}/{medicineLimit} {t('medicinesUsing')}
                      </Text>
                    </View>

                    {medicineCount >= (medicineLimit || 0) && (
                      <TouchableOpacity 
                        style={styles.premiumCTA}
                        onPress={() => setPremiumModalVisible(true)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="rocket-launch" size={20} color="#FFFFFF" />
                        <Text style={styles.premiumCTAText}>{t('startNow')}</Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                    
                    {medicineCount < (medicineLimit || 0) && (
                      <TouchableOpacity 
                        style={styles.premiumCTASecondary}
                        onPress={() => setPremiumModalVisible(true)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="star-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.premiumCTASecondaryText}>{t('explorePremium')}</Text>
                      </TouchableOpacity>
                    )}
                  </LinearGradient>
                </View>
              )}
            </View>
        }
        ListEmptyComponent={() => (
          <View style={styles.centered}>
            <Text style={styles.placeholderText}>
              {t('noMedicinesAdded')}
            </Text>
          </View>
        )}
      />
      
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
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SIZES.large },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SIZES.large, paddingTop: SIZES.large, marginBottom: SIZES.base },
  title: { fontSize: SIZES.extraLarge, fontFamily: FONTS.bold, color: COLORS.accent },
  listContentContainer: { paddingBottom: SIZES.extraLarge + SIZES.large },
  placeholderText: { fontSize: SIZES.font, fontFamily: FONTS.regular, color: COLORS.gray, textAlign: 'center' },
  
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.large,
    marginBottom: SIZES.large,
    padding: SIZES.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SIZES.small,
    marginBottom: SIZES.small,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  medicineIcon: {
    marginRight: SIZES.small,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.large,
    color: COLORS.darkGray,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBody: {
    paddingVertical: SIZES.base,
  },
  cardText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.font,
    color: COLORS.darkGray,
    marginBottom: SIZES.base,
  },
  boldText: {
    fontFamily: FONTS.semiBold,
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SIZES.base,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary, // Arka plan ana renk
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.small,
    marginRight: SIZES.base,
    marginBottom: SIZES.base,
  },
  timeText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.font,
    color: COLORS.white, // Yazı rengi beyaz
    marginLeft: SIZES.base / 2,
  },
  
  // Premium Card Styles
  headerContainer: {
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.large,
  },
  premiumCard: {
    marginTop: SIZES.extraLarge,
    marginBottom: SIZES.extraLarge,
    borderRadius: SIZES.medium,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  premiumGradient: {
    backgroundColor: '#667eea', // Modern gradient rengi
    padding: SIZES.large,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.medium,
  },
  premiumIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.medium,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.large,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  premiumSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.font,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  limitContainer: {
    marginBottom: SIZES.large,
  },
  limitBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginBottom: SIZES.base,
    overflow: 'hidden',
  },
  limitProgress: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  limitText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  premiumCTA: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: SIZES.medium,
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.large,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  premiumCTAText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.font,
    color: '#FFFFFF',
    marginHorizontal: SIZES.base,
  },
  premiumCTASecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: SIZES.medium,
    paddingVertical: SIZES.small,
    paddingHorizontal: SIZES.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  premiumCTASecondaryText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: SIZES.base,
  },
});
