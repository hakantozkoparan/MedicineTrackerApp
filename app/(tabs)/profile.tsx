import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getFirestore, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import PremiumModal from '@/components/PremiumModal';
import ProfileMenuItem from '@/components/ProfileMenuItem';
import UserInfoCard from '@/components/UserInfoCard';
import usePremiumLimit from '@/hooks/usePremiumLimit';

export default function ProfileScreen() {
  const router = useRouter();
  const auth = getAuth();
  const firestore = getFirestore();
  const [userName, setUserName] = useState('');
  const [userSurname, setUserSurname] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);

  const { isPremium, medicineCount, premiumStatus, refreshPremiumStatus } = usePremiumLimit();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(firestore, 'users', user.uid);
        
        const docUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setUserName(userData.name || '');
            setUserSurname(userData.surname || '');
            setUserEmail(userData.email || '');
            setIsAdmin(userData.role === 'admin'); // Rolü kontrol et
          } else {
            console.log("Kullanıcı belgesi bulunamadı!");
            setIsAdmin(false);
          }
        }, (error) => {
          // Permission hatası veya kullanıcı çıkış yapmışsa sessizce handle et
          if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
            console.log("Kullanıcı çıkış yapmış veya yetki yok, profile listener kapatılıyor.");
            return;
          }
          console.error("Profile snapshot error:", error);
        });

        return () => {
          try {
            docUnsubscribe();
          } catch (error) {
            console.log("Profile listener already unsubscribed");
          }
        };
      } else {
        setUserName('');
        setUserSurname('');
        setUserEmail('');
        setIsAdmin(false);
        router.replace('/login');
      }
    });

    return () => {
      try {
        unsubscribeAuth();
      } catch (error) {
        console.log("Auth listener already unsubscribed");
      }
    };
  }, [auth, router]);


  const handleSignOut = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        {
          text: 'Vazgeç',
          style: 'cancel',
        },
        {
          text: 'Çıkış Yap',
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/login');
            } catch (error) {
              console.error('Error signing out: ', error);
              Alert.alert('Hata', 'Çıkış yaparken bir sorun oluştu.');
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
        </View>
        
        <UserInfoCard userName={userName} userSurname={userSurname} userEmail={userEmail} />
        
        <View style={styles.menuContainer}>
          {/* Premium Status Menu Item */}
          <ProfileMenuItem
            icon="diamond-outline"
            title={isPremium ? "Premium Aktif" : "Premium'a Geç"}
            subtitle={
              isPremium 
                ? `${premiumStatus?.expirationDate ? new Date(premiumStatus.expirationDate).toLocaleDateString('tr-TR') : 'Aktif'} tarihine kadar`
                : "Sınırsız ilaç ekleyin ve daha fazlası"
            }
            onPress={() => setPremiumModalVisible(true)}
            textColor={isPremium ? COLORS.success : COLORS.primary}
          />
          
          {isAdmin && (
            <ProfileMenuItem
              icon="people-outline"
              title="Kullanıcı Yönetimi"
              onPress={() => router.push('/admin/manage-users')}
              textColor={COLORS.danger} // Kırmızı renk
            />
          )}
          {isAdmin && (
            <ProfileMenuItem
              icon="build-outline"
              title="Debug Panel"
              onPress={() => router.push('/admin/debug')}
              textColor={COLORS.warning} // Sarı renk
            />
          )}
          {isAdmin && (
            <ProfileMenuItem
              icon="mail-outline"
              title="Bildirim Gönder"
              onPress={() => router.push('/admin/send-notification')}
              textColor={COLORS.danger} // Kırmızı renk
            />
          )}
          {isAdmin && (
            <ProfileMenuItem
              icon="settings-outline"
              title="Talepler"
              onPress={() => router.push('/admin/tickets')}
              textColor={COLORS.danger} // Kırmızı renk
            />
          )}
          <ProfileMenuItem
            icon="person-outline"
            title="Hesap Bilgileri"
            onPress={() => router.push('/edit-profile')}
          />
          <ProfileMenuItem
            icon="help-circle-outline"
            title="Yardım & Destek"
            onPress={() => router.push('/support-ticket')}
          />
          <View style={{marginTop: SIZES.large}} />
          <ProfileMenuItem
            icon="log-out-outline"
            title="Çıkış Yap"
            onPress={handleSignOut}
            isDestructive
          />
        </View>
      </View>
      
      {/* Premium Modal */}
      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
        onPurchaseSuccess={() => {
          refreshPremiumStatus();
          setPremiumModalVisible(false);
        }}
        currentMedicineCount={medicineCount} // Gerçek ilaç sayısını geç
      />
    </SafeAreaView>
  );
}

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
  menuContainer: {
    flex: 1,
  },
});