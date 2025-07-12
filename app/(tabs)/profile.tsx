import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/api/firebase';
import { COLORS, SIZES } from '@/constants/theme';

import UserInfoCard from '@/components/UserInfoCard';
import ProfileMenuItem from '@/components/ProfileMenuItem';

export default function ProfileScreen() {
  const router = useRouter();
  const auth = getAuth();
  const [userName, setUserName] = useState('');
  const [userSurname, setUserSurname] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserName(userData.name);
          setUserSurname(userData.surname);
        }
        setUserEmail(user.email || '');
      } else {
        setUserName('');
        setUserSurname('');
        setUserEmail('');
      }
    });

    return () => unsubscribe();
  }, [auth]);

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

      <UserInfoCard userName={userName} userSurname={userSurname} userEmail={userEmail} />
      <View style={styles.menuContainer}>
        <ProfileMenuItem
          icon="person-outline"
          title="Hesap Bilgileri"
          onPress={() => Alert.alert('Menü', 'Hesap Bilgileri tıklandı.')}
        />
        <ProfileMenuItem
          icon="settings-outline"
          title="Uygulama Ayarları"
          onPress={() => Alert.alert('Menü', 'Uygulama Ayarları tıklandı.')}
        />
        <ProfileMenuItem
          icon="help-circle-outline"
          title="Yardım & Destek"
          onPress={() => Alert.alert('Menü', 'Yardım & Destek tıklandı.')}
        />
        <View style={{marginTop: SIZES.large}} />
        <ProfileMenuItem
          icon="log-out-outline"
          title="Çıkış Yap"
          onPress={handleSignOut}
          isDestructive
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  menuContainer: {
    flex: 1,
    paddingHorizontal: SIZES.large,
  },
});
