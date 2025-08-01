import { auth, db } from '@/api/firebase';
import SecurityManager from '@/utils/SecurityManager';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
    let unsubscribe: (() => void) | undefined;
    if (auth) {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          router.replace('/login');
          return;
        }

        // Admin kontrolü
        if (db) {
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
              setIsAdmin(false);
              return;
            }
            console.error('Debug snapshot error:', error);
          });

          return () => {
            try {
              userDocUnsubscribe();
            } catch (error) {
              // Hata olursa sessizce geç
            }
          };
        } else {
          setIsAdmin(false);
        }
      });
    }

    return () => {
      try {
        if (unsubscribe) unsubscribe();
      } catch (error) {
        // Hata olursa sessizce geç
      }
    };
  }, []);

  const clearMyDeviceSecurity = async () => {
    Alert.alert(
      'Cihaz Güvenlik Verileri Temizle',
      'Kendi cihazınızın tüm güvenlik kayıtlarını silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              const securityManager = SecurityManager.getInstance();
              const deviceId = await securityManager.getDeviceId();
              const success = await securityManager.unblockDevice(deviceId);
              
              if (success) {
                Alert.alert('Başarılı!', 'Cihazınızın güvenlik kayıtları temizlendi.');
              } else {
                Alert.alert('Hata', 'Güvenlik kayıtları temizlenemedi.');
              }
            } catch (error: any) {
              console.error('Güvenlik temizleme hatası:', error);
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
          Admin Debug Paneli - Güvenlik sistemi test ve yönetim araçları
        </Text>
        
        <TouchableOpacity 
          style={[styles.fixButton, { backgroundColor: COLORS.accent }]} 
          onPress={() => router.push('/admin/security-report')}
        >
          <Ionicons name="shield-outline" size={20} color={COLORS.white} />
          <Text style={styles.fixButtonText}>Güvenlik Raporu</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.fixButton, { backgroundColor: COLORS.success, marginTop: SIZES.medium }]} 
          onPress={clearMyDeviceSecurity}
        >
          <Ionicons name="key-outline" size={20} color={COLORS.white} />
          <Text style={styles.fixButtonText}>Kendi Cihaz Engelini Kaldır</Text>
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
    backgroundColor: COLORS.accent,
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
