import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getFirestore, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import PremiumModal from '@/components/PremiumModal';
import ProfileMenuItem from '@/components/ProfileMenuItem';
import UserInfoCard from '@/components/UserInfoCard';
import { useLocalization } from '@/hooks/useLocalization';
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
  const { t, currentLanguage, changeLanguage, getSupportedLanguages } = useLocalization();

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
            setIsAdmin(userData.role === 'admin');
          } else {
            setIsAdmin(false);
          }
        }, (error) => {
          // Permission hatası veya kullanıcı çıkış yapmışsa sessizce handle et
          if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
            return;
          }
          console.error("Profile snapshot error:", error);
        });

        return () => {
          try {
            docUnsubscribe();
          } catch (error) {
            // Hata olursa sessizce geç
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
        // Hata olursa sessizce geç
      }
    };
  }, [auth, router]);


  const handleSignOut = () => {
    Alert.alert(
      t('logout'),
      t('logoutConfirmMessage'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('logout'),
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/login');
            } catch (error) {
              console.error('Error signing out: ', error);
              Alert.alert(t('error'), t('logoutError'));
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  // Dil seçimi için flag ve isim eşleştirmesi
  const getLanguageDisplay = (langCode: string) => {
    switch (langCode) {
      case 'tr': return '🇹🇷 Türkçe';
      case 'en': return '🇺🇸 English';
      case 'es': return '🇪🇸 Español';
      case 'zh': return '🇨🇳 中文';
      case 'ru': return '🇷🇺 Русский';
      case 'hi': return '🇮🇳 हिन्दी';
      default: return '🇺🇸 English';
    }
  };

  const handleLanguageChange = () => {
    const languages = getSupportedLanguages();
    const buttons = languages.map(lang => ({
      text: `${lang.flag} ${lang.name}`,
      onPress: () => changeLanguage(lang.code as any),
      style: lang.code === currentLanguage ? 'default' : 'cancel' as any,
    }));

    Alert.alert(
      t('language'),
      t('selectLanguage'),
      [
        ...buttons,
        { text: t('cancel'), style: 'cancel' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile')}</Text>
        </View>
        
        <UserInfoCard userName={userName} userSurname={userSurname} userEmail={userEmail} />
        
        <View style={styles.menuContainer}>
          {/* Premium Status Menu Item */}
          <ProfileMenuItem
            icon="diamond-outline"
            title={isPremium ? t('premiumActive') : t('upgradeToPremium')}
            subtitle={
              isPremium 
                ? `${premiumStatus?.expirationDate ? new Date(premiumStatus.expirationDate).toLocaleDateString('tr-TR') : 'Aktif'} tarihine kadar`
                : t('limitlessPremium')
            }
            onPress={() => setPremiumModalVisible(true)}
            textColor={isPremium ? COLORS.success : COLORS.primary}
          />
          
          {/* Language Selection */}
          <ProfileMenuItem
            icon="language-outline"
            title={t('language')}
            subtitle={getLanguageDisplay(currentLanguage)}
            onPress={handleLanguageChange}
          />
          
          {isAdmin && (
            <ProfileMenuItem
              icon="people-outline"
              title={t('manageUsers')}
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
            title={t('editProfile')}
            onPress={() => router.push('/edit-profile')}
          />
          <ProfileMenuItem
            icon="help-circle-outline"
            title={t('contact')}
            onPress={() => router.push('/support-ticket')}
          />
          <View style={{marginTop: SIZES.large}} />
          <ProfileMenuItem
            icon="log-out-outline"
            title={t('logout')}
            onPress={handleSignOut}
            isDestructive
          />
        </View>
      </ScrollView>
      
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SIZES.large,
    paddingBottom: SIZES.extraLarge * 2, // Daha fazla boşluk ekle
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
    // flex kaldırıldı, padding eklendi
    paddingBottom: SIZES.extraLarge * 2,
  },
});