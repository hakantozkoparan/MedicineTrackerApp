import { auth, db } from '@/api/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';

import { COLORS, FONTS, SIZES } from '@/constants/theme';

interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  description: string;
  status: string;
  createdAt: any;
}

const AdminTicketsScreen = () => {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        router.replace('/login');
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (userData.role === 'admin') {
            setIsAdmin(true);
            // Fetch tickets only if admin
            const ticketsCollectionRef = collection(db, 'supportTickets');
            const q = query(ticketsCollectionRef, orderBy('createdAt', 'desc'));
            const unsubscribeTickets = onSnapshot(q, (querySnapshot) => {
              const fetchedTickets = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
              })) as SupportTicket[];
              setTickets(fetchedTickets);
              setLoading(false);
            }, (error) => {
              console.error("Error fetching tickets:", error);
              Alert.alert("Hata", "Destek talepleri alınırken bir sorun oluştu.");
              setLoading(false);
            });
            return () => unsubscribeTickets();
          } else {
            setIsAdmin(false);
            setLoading(false);
            Alert.alert("Erişim Reddedildi", "Bu sayfaya erişim yetkiniz yok.");
            router.back();
          }
        } else {
          setIsAdmin(false);
          setLoading(false);
          Alert.alert("Hata", "Kullanıcı bilgileri bulunamadı.");
          router.replace('/login');
        }
      }, (error) => {
        console.error("Error listening to user data:", error);
        Alert.alert("Hata", "Kullanıcı bilgileri alınırken bir sorun oluştu.");
        setLoading(false);
      });

      return () => unsubscribeUser();
    };

    checkAdminStatus();
  }, [router]);

  const renderTicketItem = ({ item }: { item: SupportTicket }) => (
    <View style={styles.card}>
      <Text style={styles.cardSubject}>{item.subject}</Text>
      <Text style={styles.cardDescription}>{item.description}</Text>
      <Text style={styles.cardInfo}>Gönderen: {item.userEmail}</Text>
      <Text style={styles.cardInfo}>Durum: {item.status}</Text>
      <Text style={styles.cardInfo}>Tarih: {new Date(item.createdAt?.toDate()).toLocaleString()}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.accessDeniedText}>Bu sayfaya erişim yetkiniz yok.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonAccessDenied}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Destek Talepleri</Text>
        <View style={{ width: 28 }} />
      </View>
      <FlatList
        data={tickets}
        renderItem={renderTicketItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={() => (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Henüz hiç destek talebi yok.</Text>
          </View>
        )}
      />
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
  listContentContainer: { paddingHorizontal: SIZES.large, paddingBottom: SIZES.large },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.large,
    marginBottom: SIZES.medium,
    padding: SIZES.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  cardSubject: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.large,
    color: COLORS.darkGray,
    marginBottom: SIZES.base / 2,
  },
  cardDescription: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.font,
    color: COLORS.gray,
    marginBottom: SIZES.base,
  },
  cardInfo: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: COLORS.darkGray,
  },
  accessDeniedText: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: SIZES.large,
  },
  backButtonAccessDenied: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.large,
    borderRadius: SIZES.radius,
  },
  backButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.medium,
  },
});

export default AdminTicketsScreen;
