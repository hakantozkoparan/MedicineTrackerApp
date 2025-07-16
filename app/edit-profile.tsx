import { auth, db } from '@/api/firebase';
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

const LabelWithInfo = ({ label, infoText }: { label: string; infoText: string }) => (
    <View style={styles.labelContainer}>
      <Text style={styles.label}>{label}</Text>
    </View>
);

const EditProfileScreen = () => {
  const router = useRouter();
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
    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setName(userData.name || '');
        setSurname(userData.surname || '');
        setEmail(userData.email || user.email || '');
        setOriginalEmail(user.email || '');
        setIsAdmin(userData.role === 'admin');
        
        // Hibrit email verification kontrolü
        const isManuallyVerified = userData.emailVerifiedBy === 'admin' && userData.emailVerifiedAt && userData.emailVerified === true;
        const finalEmailVerified = user.emailVerified || isManuallyVerified;
        setEmailVerified(finalEmailVerified);
        
        console.log('📝 Edit-profile verification check:', {
          firebaseEmailVerified: user.emailVerified,
          firestoreEmailVerified: userData.emailVerified,
          manuallyVerified: isManuallyVerified,
          emailVerifiedBy: userData.emailVerifiedBy,
          emailVerifiedAt: userData.emailVerifiedAt,
          finalEmailVerified: finalEmailVerified,
          userEmail: user.email
        });
      } else {
        console.log("No such user document!");
        // Kullanıcı belgesi yoksa, Firebase Auth'daki bilgileri kullan
        setName('');
        setSurname('');
        setEmail(user.email || '');
        setOriginalEmail(user.email || '');
        setIsAdmin(false);
        setEmailVerified(user.emailVerified);
      }
      setLoading(false);
    }, (error) => {
      // Permission hatası veya kullanıcı çıkış yapmışsa sessizce handle et
      if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
        console.log("Kullanıcı çıkış yapmış veya yetki yok, listener kapatılıyor.");
        setLoading(false);
        return;
      }
      console.error("Error fetching user data:", error);
      Alert.alert("Hata", "Kullanıcı bilgileri alınırken bir sorun oluştu.");
      setLoading(false);
    });

    return () => {
      try {
        unsubscribe();
      } catch (error) {
        // Listener zaten kapalıysa hata vermesin
        console.log("Listener already unsubscribed");
      }
    };
  }, [router]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = 'Ad alanı zorunludur.';
    if (!surname.trim()) newErrors.surname = 'Soyad alanı zorunludur.';
    if (!email.trim()) newErrors.email = 'E-posta alanı zorunludur.';
    else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) newErrors.email = 'Geçerli bir e-posta adresi girin.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Doğrulama maili yeniden gönder
  const resendVerificationEmail = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await sendEmailVerification(user);
      Alert.alert(
        'Doğrulama Maili Gönderildi!', 
        `${user.email} adresine yeni bir doğrulama maili gönderildi. Lütfen e-posta kutunuzu ve spam klasörünüzü kontrol edin.`
      );
    } catch (error: any) {
      console.error('Doğrulama maili gönderme hatası:', error);
      Alert.alert('Hata', 'Doğrulama maili gönderilirken bir hata oluştu.');
    }
  };

  // Admin tarafından manuel email doğrulama
  const manualEmailVerification = async () => {
    const user = auth.currentUser;
    if (!user || !isAdmin) return;

    Alert.alert(
      'Manuel Email Doğrulama',
      'Bu kullanıcının email adresini manuel olarak doğrulanmış olarak işaretlemek istediğinizden emin misiniz?\n\n⚠️ Bu işlem geri alınamaz!',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          style: 'destructive',
          onPress: async () => {
            try {
              // Firestore'da güncelle
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
                'Başarılı!', 
                'Email adresi manuel olarak doğrulandı. Kullanıcı artık giriş yapabilir.',
                [
                  {
                    text: 'Tamam',
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
              console.error('Manuel doğrulama hatası:', error);
              Alert.alert('Hata', 'Manuel doğrulama işlemi başarısız oldu.');
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

    const user = auth.currentUser;
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
      const userDocRef = doc(db, 'users', user.uid);

      // E-posta değiştiyse Firebase Authentication'ı güncelle
      if (emailChanged) {
        // Önce kullanıcıyı yeniden kimlik doğrulaması yap
        const credential = EmailAuthProvider.credential(originalEmail, password);
        await reauthenticateWithCredential(user, credential);
        
        try {
          // Firebase Authentication'da email'i güncelle
          await updateEmail(user, email);
          
          // Email güncellendi, yeni email'e doğrulama gönder
          await sendEmailVerification(user);
          
          // Firestore'daki kullanıcı bilgilerini güncelle
          await updateDoc(userDocRef, {
            name,
            surname,
            email,
            emailVerified: false, // Yeni email doğrulanmamış
            emailChangedAt: new Date()
          }).catch(async (firestoreError) => {
            // Belge yoksa oluştur
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
            'Email Güncellendi!', 
            `E-posta adresiniz ${email} olarak güncellendi ve yeni adresinize doğrulama e-postası gönderildi.\n\nLütfen yeni e-posta adresinizi doğrulayın. Doğrulama sonrası yeni email ile giriş yapabileceksiniz.\n\nŞimdi çıkış yapılacak.`,
            [
              {
                text: 'Tamam',
                onPress: async () => {
                  await signOut(auth);
                  router.replace('/login');
                }
              }
            ]
          );
        } catch (emailError: any) {
          console.error('Email güncelleme hatası:', emailError);
          
          if (emailError.code === 'auth/email-already-in-use') {
            Alert.alert('Hata', 'Bu e-posta adresi zaten başka bir hesap tarafından kullanılıyor.');
            setErrors(prev => ({ ...prev, email: 'Bu e-posta adresi zaten kullanımda.' }));
          } else if (emailError.code === 'auth/invalid-email') {
            Alert.alert('Hata', 'Geçersiz e-posta adresi formatı.');
            setErrors(prev => ({ ...prev, email: 'Geçersiz e-posta adresi.' }));
          } else if (emailError.code === 'auth/operation-not-allowed') {
            Alert.alert(
              'Email Değişikliği Mümkün Değil',
              'Firebase yapılandırması nedeniyle email değişikliği şu anda desteklenmiyor. Lütfen yönetici ile iletişime geçin.',
              [{ text: 'Tamam' }]
            );
          } else {
            Alert.alert('Hata', 'Email güncellenirken bir hata oluştu: ' + emailError.message);
          }
          return;
        }
      } else {
        // E-posta değişmiyorsa sadece diğer bilgileri güncelle
        await updateDoc(userDocRef, {
          name,
          surname,
          email,
        }).catch(async (firestoreError) => {
          // Belge yoksa oluştur
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

        Alert.alert('Başarılı', 'Hesap bilgileri güncellendi.');
        router.back();
      }
    } catch (error: any) {
      console.error('Error updating profile: ', error);
      
      let errorMessage = 'Hesap bilgileri güncellenirken bir sorun oluştu.';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Girdiğiniz şifre hatalı.';
        setErrors(prev => ({ ...prev, password: 'Girdiğiniz şifre hatalı.' }));
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta adresi zaten kullanımda.';
        setErrors(prev => ({ ...prev, email: 'Bu e-posta adresi zaten kullanımda.' }));
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi.';
        setErrors(prev => ({ ...prev, email: 'Geçersiz e-posta adresi.' }));
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Güvenlik nedeniyle yeniden giriş yapmanız gerekiyor.';
        Alert.alert(
          'Yeniden Giriş Gerekli',
          'Güvenlik nedeniyle yeniden giriş yapmanız gerekiyor.',
          [
            {
              text: 'Tamam',
              onPress: async () => {
                await signOut(auth);
                router.replace('/login');
              }
            }
          ]
        );
        return;
      }
      
      Alert.alert('Hata', errorMessage);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Hesap Bilgilerini Düzenle</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.formGroup}>
          <LabelWithInfo label="Ad" infoText="Adınızı girin." />
          <TextInput
            style={[styles.input, errors.name ? styles.inputError : null]}
            placeholder="Adınız"
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
          <LabelWithInfo label="Soyad" infoText="Soyadınızı girin." />
          <TextInput
            style={[styles.input, errors.surname ? styles.inputError : null]}
            placeholder="Soyadınız"
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
          <LabelWithInfo label="E-posta" infoText="E-posta adresinizi girin." />
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            placeholder="E-posta Adresiniz"
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
                {emailVerified ? 'Email Doğrulanmış ✓' : 'Email Doğrulanmamış ⚠️'}
              </Text>
            </View>
            
            {!emailVerified && (
              <TouchableOpacity 
                style={styles.resendButton} 
                onPress={resendVerificationEmail}
              >
                <Ionicons name="mail-outline" size={16} color={COLORS.primary} />
                <Text style={styles.resendButtonText}>Doğrulama Maili Gönder</Text>
              </TouchableOpacity>
            )}
            
            {/* Admin Manuel Doğrulama */}
            {isAdmin && !emailVerified && (
              <TouchableOpacity 
                style={styles.adminButton} 
                onPress={manualEmailVerification}
              >
                <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.white} />
                <Text style={styles.adminButtonText}>Manuel Doğrula (Admin)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {showPasswordPrompt && (
          <View style={styles.formGroup}>
            <LabelWithInfo label="Mevcut Şifre" infoText="E-posta değişikliği için mevcut şifrenizi girin." />
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              placeholder="Mevcut Şifreniz"
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
          <Text style={styles.saveButtonText}>Kaydet</Text>
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
            <Text style={styles.saveButtonText}>İptal</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
