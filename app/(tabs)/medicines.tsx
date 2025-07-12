import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '@/api/firebase';
import { COLORS, SIZES, FONTS } from '@/constants/theme';

// Define the structure of a medicine object
interface Medicine {
  id: string;
  name: string;
  dosage: string;
  type: 'Tablet' | 'Kapsül' | 'Şurup' | 'Damla' | 'Krem';
  frequency: number;
  doseTimes: string[];
  createdAt: any; // To order by creation time
}

export default function MedicinesScreen() {
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
      const q = query(medicinesCollectionRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userMedicines = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Medicine[];
        setMedicines(userMedicines);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching medicines:", error);
        setLoading(false);
      });

      // Cleanup listener on screen blur
      return () => unsubscribe();
    }, [])
  );

  const renderMedicineItem = ({ item }: { item: Medicine }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardSubtitle}>{`${item.dosage} - ${item.type}`}</Text>
      <View style={styles.timeContainer}>
        {item.doseTimes.map((time, index) => (
          <View key={index} style={styles.timeChip}>
            <Text style={styles.timeText}>{time}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.content]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={medicines}
        renderItem={renderMedicineItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={() => (
          <View style={styles.content}>
            <Text style={styles.placeholderText}>Henüz hiç ilaç eklemediniz.</Text>
            <Text style={styles.placeholderSubText}>Başlamak için sağ üstteki + butonuna dokunun.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.large,
  },
  listContentContainer: {
    padding: SIZES.large,
    paddingTop: SIZES.base, // A bit of space from the header
  },
  placeholderText: {
    fontSize: SIZES.large,
    fontFamily: FONTS.semiBold,
    color: COLORS.darkGray,
    marginBottom: SIZES.small,
    textAlign: 'center',
  },
  placeholderSubText: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    textAlign: 'center',
  },
  // Card Styles
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.medium,
    marginBottom: SIZES.large,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.large,
    color: COLORS.darkGray,
  },
  cardSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    marginTop: SIZES.base,
    marginBottom: SIZES.medium,
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeChip: {
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.small,
    marginRight: SIZES.base,
    marginBottom: SIZES.base,
  },
  timeText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.font,
    color: COLORS.primary,
  },
});
