import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '@/api/firebase';
import * as Notifications from 'expo-notifications';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '@/constants/theme';

interface Medicine {
  id: string;
  name: string;
  dosage: string;
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
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const user = auth.currentUser;
      if (!user) {
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
        console.error("Error fetching medicines:", error);
        setLoading(false);
      });
      return () => unsubscribe();
    }, [])
  );

  const handleDelete = async (item: Medicine) => {
    Alert.alert(
      "İlacı Sil",
      `"${item.name}" adlı ilacı silmek istediğinizden emin misiniz?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              if (item.notificationIds && item.notificationIds.length > 0) {
                for (const id of item.notificationIds) {
                  await Notifications.cancelScheduledNotificationAsync(id);
                }
              }
              const user = auth.currentUser;
              if (user) {
                const medicineRef = doc(db, `users/${user.uid}/medicines`, item.id);
                await updateDoc(medicineRef, {
                  isActive: false,
                  notificationsEnabled: false, // İlaç pasifleşince bildirimleri de kapat
                  notificationIds: [], // Tüm bildirim ID'lerini temizle
                });
              }
            } catch {
              Alert.alert("Hata", "İlaç silinirken bir sorun oluştu.");
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
          <TouchableOpacity onPress={() => handleDelete(item)} style={{ marginLeft: SIZES.medium }}>
            <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardText}><Text style={styles.boldText}>Dozaj:</Text> {item.dosage || 'Belirtilmemiş'}</Text>
        <Text style={styles.cardText}><Text style={styles.boldText}>Sıklık:</Text> Günde {item.frequency} defa</Text>
        <Text style={styles.cardText}>
          <Text style={styles.boldText}>Bildirimler:</Text> 
          <Text style={{ color: item.notificationsEnabled ? COLORS.success : COLORS.danger }}>
            {item.notificationsEnabled ? ' Açık' : ' Kapalı'}
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={medicines}
        renderItem={renderMedicineItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListHeaderComponent={
            <View style={styles.header}>
                <Text style={styles.title}>İlaçlarım</Text>
                <TouchableOpacity onPress={() => router.push('/add-medicine')}>
                    <Ionicons name="add-circle" size={32} color={COLORS.primary} />
                </TouchableOpacity>
            </View>
        }
        ListEmptyComponent={() => (
          <View style={styles.centered}>
            <Text style={styles.placeholderText}>Henüz hiç ilaç eklemediniz.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SIZES.large },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SIZES.large, paddingTop: SIZES.large, marginBottom: SIZES.base },
  title: { fontSize: SIZES.extraLarge, fontFamily: FONTS.bold, color: COLORS.accent },
  listContentContainer: { paddingBottom: SIZES.large },
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
});
