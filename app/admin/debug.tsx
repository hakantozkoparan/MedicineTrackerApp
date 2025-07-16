import { auth, db } from '@/api/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { COLORS, FONTS, SIZES } from '@/constants/theme';

const DebugScreen = () => {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }

      // Admin kontrolü
      const userDocRef = doc(db, 'users', user.uid);
      const userDocUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setIsAdmin(userData.role === 'admin');
        } else {
          setIsAdmin(false);
        }
      }, (error) => {
        // Permission hatası veya kullanıcı çıkış yapmışsa sessizce handle et
        if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
          console.log('Kullanıcı çıkış yapmış, debug listener kapatılıyor.');
          setIsAdmin(false);
          return;
        }
        console.error('Debug snapshot error:', error);
      });

      return () => {
        try {
          userDocUnsubscribe();
        } catch (error) {
          console.log("Debug listener already unsubscribed");
        }
      };
    });

    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.log("Auth listener already unsubscribed in debug");
      }
    };
  }, []);

  const fixUserEmail = async () => {
    if (!isAdmin) {
      Alert.alert('Hata', 'Bu işlem için admin yetkisi gerekli.');
      return;
    }

    Alert.alert(
      'Email Doğrulama Düzeltme',
      'baybarsaltayme@gmail.com kullanıcısının emailVerified durumunu true yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            try {
              // Bu kullanıcının UID'sini bilmemiz gerekiyor
              // Önce users koleksiyonundan email ile bulalım
              const { collection, query, where, getDocs } = await import('firebase/firestore');
              
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('email', '==', 'baybarsaltayme@gmail.com'));
              const querySnapshot = await getDocs(q);
              
              if (querySnapshot.empty) {
                Alert.alert('Hata', 'Kullanıcı bulunamadı.');
                return;
              }

              const userDoc = querySnapshot.docs[0];
              const userRef = doc(db, 'users', userDoc.id);
              
              await updateDoc(userRef, {
                emailVerified: true,
                fixedBy: auth.currentUser?.email || 'admin',
                fixedAt: new Date()
              });

              Alert.alert('Başarılı!', 'Kullanıcının emailVerified durumu true yapıldı.');
            } catch (error: any) {
              console.error('Düzeltme hatası:', error);
              Alert.alert('Hata', 'İşlem başarısız: ' + error.message);
            }
          }
        }
      ]
    );
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Bu sayfaya erişim yetkiniz yok.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Debug Panel</Text>
        <View style={{ width: 28 }} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.description}>
          baybarsaltayme@gmail.com kullanıcısının emailVerified durumu false gözüküyor
          ancak manuel doğrulama yapılmış. Bu butona basarak düzeltebilirsiniz.
        </Text>
        
        <TouchableOpacity style={styles.fixButton} onPress={fixUserEmail}>
          <Ionicons name="build-outline" size={20} color={COLORS.white} />
          <Text style={styles.fixButtonText}>EmailVerified Durumunu Düzelt</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.large,
    paddingTop: SIZES.base,
    marginBottom: SIZES.large,
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
  content: {
    paddingHorizontal: SIZES.large,
  },
  description: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginBottom: SIZES.large,
    textAlign: 'center',
  },
  fixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.large,
    borderRadius: SIZES.medium,
    marginVertical: SIZES.medium,
  },
  fixButtonText: {
    marginLeft: SIZES.base,
    fontFamily: FONTS.bold,
    fontSize: SIZES.medium,
    color: COLORS.white,
  },
  errorText: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: 100,
  },
});

export default DebugScreen;
