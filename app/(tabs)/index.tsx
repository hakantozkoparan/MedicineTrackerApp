import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { auth, db } from '@/api/firebase';
import { collection, query, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { signOut, User } from 'firebase/auth';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS, SIZES, FONTS } from '@/constants/theme';

// TypeScript interface for our medicine data
interface Medicine {
  id: string;
  name: string;
  dosage: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  // Properly type the medicines state with the Medicine interface
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  // useFocusEffect runs every time the screen is focused, setting up listeners
  useFocusEffect(
    useCallback(() => {
      const user = auth.currentUser;
      if (!user) return;

      // Set up a real-time listener for the user's name
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserName(docSnap.data().name || '');
        } else {
          console.log("No such user document!");
        }
      }, (error) => {
        console.error("Error listening to user data:", error);
        Alert.alert("Hata", "Kullanıcı bilgileri alınırken bir sorun oluştu.");
      });

      // Fetch medicines (can still be a one-time fetch)
      const fetchMedicines = async () => {
        try {
          const medicinesCollectionRef = collection(db, `users/${user.uid}/medicines`);
          const querySnapshot = await getDocs(medicinesCollectionRef);
          const userMedicines = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Medicine[];
          setMedicines(userMedicines);
        } catch (error) {
          console.error("Error fetching medicines:", error);
        }
      };

      fetchMedicines();

      // Cleanup function to unsubscribe from the listener when the screen is unfocused
      return () => {
        unsubscribeUser();
      };
    }, [])
  );

  const handleSignOut = () => {
    signOut(auth).catch(error => Alert.alert('Çıkış Hatası', error.message));
  };

  // Typed the render item parameter
  const renderMedicine = ({ item }: { item: Medicine }) => (
    <View style={styles.medicineCard}>
        <Text style={styles.medicineName}>{item.name}</Text>
        <Text style={styles.medicineDosage}>{item.dosage}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>{`Hoş Geldin, ${userName}!`}</Text>
        </View>

        <Text style={styles.subTitle}>Bugünkü İlaçların</Text>

        <FlatList
            data={medicines}
            renderItem={renderMedicine}
            keyExtractor={item => item.id}
            ListEmptyComponent={<Text style={styles.emptyText}>Bugün için ilacın yok.</Text>}
            contentContainerStyle={{ paddingBottom: 100 }}
        />
    </SafeAreaView>
  );
};

// A clean, corrected, and theme-aligned StyleSheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.large,
    paddingTop: SIZES.medium, // Add padding from the top of the safe area
    marginLeft: SIZES.large, // Force left margin
    marginRight: SIZES.large, // Add right margin for balance
  },
  title: {
    fontSize: SIZES.extraLarge,
    fontFamily: FONTS.bold, // Use Poppins Bold
    color: COLORS.accent,
    flexShrink: 1, // Allows text to shrink if needed
  },
  subTitle: {
    fontSize: SIZES.large,
    fontFamily: FONTS.semiBold, // Use Poppins SemiBold
    color: COLORS.darkGray,
    marginBottom: SIZES.medium,
    marginLeft: SIZES.large, // Force left margin
  },

  medicineCard: {
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
  medicineName: {
    fontSize: SIZES.large,
    fontFamily: FONTS.semiBold, // Use Poppins SemiBold
    color: COLORS.darkGray,
  },
  medicineDosage: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular, // Use Poppins Regular
    color: COLORS.gray,
    marginTop: SIZES.base / 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: SIZES.font,
    fontFamily: FONTS.regular, // Use Poppins Regular
    color: COLORS.gray,
  },

});


