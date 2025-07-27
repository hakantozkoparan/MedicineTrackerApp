import { auth, db } from '@/api/firebase';
import BannerAd from '@/components/BannerAd';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, sendEmailVerification, signOut, updateEmail } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useLocalization } from '@/hooks/useLocalization';

const LabelWithInfo = ({ label, infoText }: { label: string; infoText: string }) => (
    <View style={styles.labelContainer}>
      <Text style={styles.label}>{label}</Text>
    </View>
);

const EditProfileScreen = () => {
  const router = useRouter();
  const { t, currentLanguage, languageVersion } = useLocalization();
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    const user = auth?.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }

    let unsubscribe: (() => void) | undefined;
    if (db) {
      const userDocRef = doc(db, 'users', user.uid);
      unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setName(userData.name || '');
          setSurname(userData.surname || '');
          setEmail(userData.email || user.email || '');
          setOriginalEmail(user.email || '');
          setIsAdmin(userData.role === 'admin');
          const isManuallyVerified = userData.emailVerifiedBy === 'admin' && userData.emailVerifiedAt && userData.emailVerified === true;
          const finalEmailVerified = user.emailVerified || isManuallyVerified;
          setEmailVerified(finalEmailVerified);
        } else {
          setName('');
          setSurname('');
          setEmail(user.email || '');
          setOriginalEmail(user.email || '');
          setIsAdmin(false);
          setEmailVerified(user.emailVerified);
        }
        setLoading(false);
      }, (error) => {
        if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
          setLoading(false);
          return;
        }
        console.error("Error fetching user data:", error);
        Alert.alert("Hata", "Kullanıcı bilgileri alınırken bir sorun oluştu.");
        setLoading(false);
      });
    }
    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          // Listener zaten kapalıysa hata vermesin
        }
      }
    };
  }, [router]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = t('firstNameRequired');
    if (!surname.trim()) newErrors.surname = t('lastNameRequired');
    if (!email.trim()) newErrors.email = t('emailProfileRequired');
    else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) newErrors.email = t('invalidEmailAddress');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Doğrulama maili yeniden gönder
  const resendVerificationEmail = async () => {
    const user = auth?.currentUser;
    if (!user) return;

    try {
      await sendEmailVerification(user);
      Alert.alert(
        t('verificationEmailSent'), 
        t('verificationEmailSentMessage').replace('{email}', user.email || '')
      );
    } catch (error: any) {
      console.error('Doğrulama maili gönderme hatası:', error);
      Alert.alert(t('error'), t('verificationEmailError'));
    }
  };

  // Admin tarafından manuel email doğrulama
  const manualEmailVerification = async () => {
    const user = auth?.currentUser;
    if (!user || !isAdmin) return;

    Alert.alert(
      t('manualEmailVerification'),
      t('manualEmailVerificationMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (!db) throw new Error('Firestore bağlantısı yok.');
              const userDocRef = doc(db, 'users', user.uid);
              await updateDoc(userDocRef, {
                emailVerified: true,
                emailVerifiedBy: 'admin',
                emailVerifiedAt: new Date()
              }).catch(async (firestoreError) => {
                if (firestoreError.code === 'not-found') {
                  await setDoc(userDocRef, {
                    name,
                    surname,
                    email,
                    uid: user.uid,
                    emailVerified: true,
                    emailVerifiedBy: 'admin',
                    emailVerifiedAt: new Date(),
                    createdAt: new Date()
                  });
                } else {
                  throw firestoreError;
                }
              });
              Alert.alert(
                t('success'), 
                t('manualVerificationSuccess'),
                [
                  {
                    text: t('ok'),
                    onPress: () => {
                      try {
                        router.back();
                      } catch (error) {
                        router.replace('/(tabs)/profile');
                      }
                    }
                  }
                ]
              );
            } catch (error: any) {
              Alert.alert(t('error'), t('manualVerificationError'));
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    const user = auth?.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }

    const emailChanged = originalEmail !== email;

    // E-posta değişiyorsa şifre isteyeceğiz
    if (emailChanged && !password) {
      setShowPasswordPrompt(true);
      return;
    }

    try {
      if (!db) throw new Error('Firestore bağlantısı yok.');
      const userDocRef = doc(db, 'users', user.uid);
      if (emailChanged) {
        const credential = EmailAuthProvider.credential(originalEmail, password);
        await reauthenticateWithCredential(user, credential);
        try {
          await updateEmail(user, email);
          await sendEmailVerification(user);
          await updateDoc(userDocRef, {
            name,
            surname,
            email,
            emailVerified: false,
            emailChangedAt: new Date()
          }).catch(async (firestoreError) => {
            if (firestoreError.code === 'not-found') {
              await setDoc(userDocRef, {
                name,
                surname,
                email,
                uid: user.uid,
                emailVerified: false,
                emailChangedAt: new Date(),
                createdAt: new Date()
              });
            } else {
              throw firestoreError;
            }
          });
          Alert.alert(
            t('emailUpdated'), 
            t('emailUpdateMessage').replace('{email}', email),
            [
              {
                text: t('ok'),
                onPress: async () => {
                  if (auth) {
                    await signOut(auth);
                  }
                  router.replace('/login');
                }
              }
            ]
          );
        } catch (emailError: any) {
          if (emailError.code === 'auth/email-already-in-use') {
            Alert.alert(t('error'), t('emailAlreadyExists'));
            setErrors(prev => ({ ...prev, email: t('emailAlreadyExists') }));
          } else if (emailError.code === 'auth/invalid-email') {
            Alert.alert(t('error'), t('invalidEmailProfileFormat'));
            setErrors(prev => ({ ...prev, email: t('invalidEmailAddress') }));
          } else if (emailError.code === 'auth/operation-not-allowed') {
            Alert.alert(
              t('emailChangeNotAllowed'),
              t('emailChangeNotAllowedMessage'),
              [{ text: t('ok') }]
            );
          } else {
            Alert.alert(t('error'), t('accountUpdateError') + ': ' + emailError.message);
          }
          return;
        }
      } else {
        await updateDoc(userDocRef, {
          name,
          surname,
          email,
        }).catch(async (firestoreError) => {
          if (firestoreError.code === 'not-found') {
            await setDoc(userDocRef, {
              name,
              surname,
              email,
              uid: user.uid,
              createdAt: new Date()
            });
          } else {
            throw firestoreError;
          }
        });
        Alert.alert(t('success'), t('accountInfoUpdated'));
        router.back();
      }
    } catch (error: any) {
      let errorMessage = t('accountUpdateError');
      if (error.code === 'auth/wrong-password') {
        errorMessage = t('wrongPassword');
        setErrors(prev => ({ ...prev, password: t('wrongPassword') }));
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = t('emailAlreadyExists');
        setErrors(prev => ({ ...prev, email: t('emailAlreadyExists') }));
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = t('invalidEmailAddress');
        setErrors(prev => ({ ...prev, email: t('invalidEmailAddress') }));
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = t('recentLoginRequiredMessage');
        Alert.alert(
          t('recentLoginRequired'),
          t('recentLoginRequiredMessage'),
          [
            {
              text: t('ok'),
              onPress: async () => {
                if (auth) {
                  await signOut(auth);
                }
                router.replace('/login');
              }
            }
          ]
        );
        return;
      }
      Alert.alert(t('error'), errorMessage);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container} key={`${currentLanguage}-${languageVersion}`}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('editProfileTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.formGroup}>
          <LabelWithInfo label={t('firstNameLabel')} infoText="Adınızı girin." />
          <TextInput
            style={[styles.input, errors.name ? styles.inputError : null]}
            placeholder={t('firstNamePlaceholder')}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholderTextColor={COLORS.gray}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
        </View>
        <View style={styles.formGroup}>
          <LabelWithInfo label={t('lastNameLabel')} infoText="Soyadınızı girin." />
          <TextInput
            style={[styles.input, errors.surname ? styles.inputError : null]}
            placeholder={t('lastNamePlaceholder')}
            value={surname}
            onChangeText={(text) => {
              setSurname(text);
              if (errors.surname) setErrors((prev) => ({ ...prev, surname: '' }));
            }}
            placeholderTextColor={COLORS.gray}
          />
          {errors.surname ? <Text style={styles.errorText}>{errors.surname}</Text> : null}
        </View>
        <View style={styles.formGroup}>
          <LabelWithInfo label={t('emailLabel')} infoText="E-posta adresinizi girin." />
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            placeholder={t('emailProfilePlaceholder')}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={COLORS.gray}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          
          {/* Email Doğrulama Durumu */}
          <View style={styles.emailStatusContainer}>
            <View style={styles.emailStatusRow}>
              <Ionicons 
                name={emailVerified ? "checkmark-circle" : "warning"} 
                size={20} 
                color={emailVerified ? COLORS.success : COLORS.warning} 
              />
              <Text style={[styles.emailStatusText, { color: emailVerified ? COLORS.success : COLORS.warning }]}>
                {emailVerified ? t('emailVerified') : t('emailNotVerified')}
              </Text>
            </View>
            
            {!emailVerified && (
              <TouchableOpacity 
                style={styles.resendButton} 
                onPress={resendVerificationEmail}
              >
                <Ionicons name="mail-outline" size={16} color={COLORS.primary} />
                <Text style={styles.resendButtonText}>{t('resendVerificationEmail')}</Text>
              </TouchableOpacity>
            )}
            
            {/* Admin Manuel Doğrulama */}
            {isAdmin && !emailVerified && (
              <TouchableOpacity 
                style={styles.adminButton} 
                onPress={manualEmailVerification}
              >
                <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.white} />
                <Text style={styles.adminButtonText}>{t('manualVerifyAdmin')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {showPasswordPrompt && (
          <View style={styles.formGroup}>
            <LabelWithInfo label={t('currentPasswordLabel')} infoText={t('currentPasswordInfo')} />
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              placeholder={t('currentPasswordPlaceholder')}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              secureTextEntry
              placeholderTextColor={COLORS.gray}
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>
        )}
        
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{t('save')}</Text>
        </TouchableOpacity>
        
        {showPasswordPrompt && (
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: COLORS.gray, marginTop: SIZES.base }]} 
            onPress={() => {
              setShowPasswordPrompt(false);
              setPassword('');
              setErrors(prev => ({ ...prev, password: '' }));
            }}
          >
            <Text style={styles.saveButtonText}>{t('cancel')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Banner Ad */}
      <BannerAd style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} />
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
  scrollContentContainer: { paddingHorizontal: SIZES.large, paddingBottom: 100 },
  formGroup: { marginBottom: SIZES.large },
  labelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.base },
  infoIcon: { marginLeft: SIZES.base },
  label: { fontFamily: FONTS.bold, fontSize: SIZES.medium, color: COLORS.primary },
  input: { backgroundColor: COLORS.white, paddingHorizontal: SIZES.medium, paddingVertical: SIZES.medium, borderRadius: SIZES.base, fontFamily: FONTS.regular, fontSize: SIZES.medium, borderWidth: 1, borderColor: COLORS.gray },
  inputError: { borderColor: COLORS.danger },
  errorText: { color: COLORS.danger, marginTop: SIZES.base, fontSize: SIZES.small, fontFamily: FONTS.regular },
  saveButton: { backgroundColor: COLORS.accent, paddingVertical: SIZES.medium, paddingHorizontal: SIZES.medium, alignItems: 'center', justifyContent: 'center', borderRadius: SIZES.radius, marginTop: SIZES.large },
  saveButtonText: { fontFamily: FONTS.bold, fontSize: SIZES.medium, color: COLORS.white },
  // Email doğrulama stilleri
  emailStatusContainer: {
    marginTop: SIZES.base,
    padding: SIZES.medium,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  emailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.base,
  },
  emailStatusText: {
    marginLeft: SIZES.base,
    fontFamily: FONTS.regular,
    fontSize: SIZES.medium,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.base,
    marginBottom: SIZES.base,
  },
  resendButtonText: {
    marginLeft: SIZES.base,
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.primary,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.base,
  },
  adminButtonText: {
    marginLeft: SIZES.base,
    fontFamily: FONTS.bold,
    fontSize: SIZES.small,
    color: COLORS.white,
  },
});

export default EditProfileScreen;
