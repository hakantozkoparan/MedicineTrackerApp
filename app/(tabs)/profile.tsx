import { db } from '@/api/firebase';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import ProfileMenuItem from '@/components/ProfileMenuItem';
import UserInfoCard from '@/components/UserInfoCard';

export default function ProfileScreen() {
  const router = useRouter();
  const auth = getAuth();
  const [userName, setUserName] = useState('');
  const [userSurname, setUserSurname] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        
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
        });

        return () => docUnsubscribe();
      } else {
        setUserName('');
        setUserSurname('');
        setUserEmail('');
        setIsAdmin(false);
        router.replace('/login');
      }
    });

    return () => unsubscribeAuth();
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