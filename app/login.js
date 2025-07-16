import { auth, db } from '@/api/firebase';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already authenticated (but don't redirect, let _layout handle it)
  useEffect(() => {
    const checkAuthState = async () => {
      // Simply set checking to false - let _layout.tsx handle all navigation
      setIsCheckingAuth(false);
    };

    checkAuthState();
  }, []);

  // Show minimal loading while initializing
  if (isCheckingAuth) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.container}
        >
          <LinearGradient
            colors={[COLORS.lightGreen, COLORS.white]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.innerContainer, { justifyContent: 'center' }]}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setEmailError('Şifre sıfırlama için e-posta adresinizi girin.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'Şifre Sıfırlama E-postası Gönderildi',
        `${email} adresine şifre sıfırlama talimatları gönderildi. Lütfen e-postanızı kontrol edin.`
      );
    } catch (error) {
      let errorMessage = 'Şifre sıfırlama e-postası gönderilirken bir hata oluştu.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Geçersiz e-posta adresi.';
          break;
      }
      
      Alert.alert('Hata', errorMessage);
    }
  };


  const handleLogin = () => {
    setEmailError('');
    setPasswordError('');
    setFormError('');


    if (!email || !password) {
      if (!email) setEmailError('E-posta alanı boş bırakılamaz.');
      if (!password) setPasswordError('Şifre alanı boş bırakılamaz.');
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        
        // Kullanıcının en güncel durumunu al
        await user.reload();
        const refreshedUser = auth.currentUser;
        
        // Firestore'dan kullanıcı bilgilerini kontrol et
        const userDocRef = doc(db, 'users', refreshedUser.uid);
        let userDoc;
        try {
          userDoc = await getDoc(userDocRef);
        } catch (firestoreError) {
          console.log('Firestore okuma hatası, sadece Firebase Auth kullanılacak:', firestoreError);
          userDoc = null;
        }
        
        let isEmailVerified = refreshedUser.emailVerified;
        let isManuallyVerified = false;
        
        // Firestore'da manuel doğrulama kontrolü
        if (userDoc && userDoc.exists()) {
          const userData = userDoc.data();
          // Manuel doğrulanmış kullanıcıları kontrol et - admin tarafından onaylanmış ve emailVerified true olmalı
          isManuallyVerified = userData.emailVerifiedBy === 'admin' && userData.emailVerifiedAt && userData.emailVerified === true;
          isEmailVerified = refreshedUser.emailVerified || isManuallyVerified;
          
          console.log('🔍 Login verification check:', {
            firebaseEmailVerified: refreshedUser.emailVerified,
            firestoreEmailVerified: userData.emailVerified,
            manuallyVerified: isManuallyVerified,
            emailVerifiedBy: userData.emailVerifiedBy,
            emailVerifiedAt: userData.emailVerifiedAt,
            finalEmailVerified: isEmailVerified,
            userEmail: refreshedUser.email
          });
        }
        
        // Email doğrulaması kontrolü (Firebase Auth veya manuel)
        if (!isEmailVerified) {
          // Email doğrulanmamış kullanıcıyı çıkış yap
          await signOut(auth);
          
          Alert.alert(
            'Email Doğrulaması Gerekli',
            'Hesabınızı kullanabilmek için e-posta adresinizi doğrulamanız gerekiyor. E-postanızı kontrol edin ve doğrulama linkine tıklayın.',
            [
              {
                text: 'Yeni Doğrulama E-postası Gönder',
                onPress: async () => {
                  try {
                    // Tekrar giriş yap sadece email göndermek için
                    const tempCredential = await signInWithEmailAndPassword(auth, email, password);
                    await sendEmailVerification(tempCredential.user);
                    await signOut(auth); // Hemen çıkış yap
                    Alert.alert(
                      'E-posta Gönderildi',
                      'Yeni doğrulama e-postası gönderildi. Lütfen e-postanızı kontrol edin ve doğrulama linkine tıklayın.'
                    );
                  } catch (error) {
                    Alert.alert('Hata', 'E-posta gönderilirken bir hata oluştu.');
                    console.error(error);
                  }
                }
              },
              {
                text: 'Tamam',
                style: 'cancel'
              }
            ]
          );
          return;
        }
        
        // Email doğrulandıysa Firestore'u güncelle ve normal giriş
        try {
          // Firestore'daki emailVerified durumunu güncelle
          if (userDoc && userDoc.exists()) {
            const userDocRef = doc(db, 'users', refreshedUser.uid);
            await updateDoc(userDocRef, {
              emailVerified: isEmailVerified,
              lastLoginAt: new Date(),
              ...(isManuallyVerified && { 
                manuallyVerifiedLogin: true,
                lastManuallyVerifiedLoginAt: new Date()
              })
            });
          }
          
          console.log(isManuallyVerified ? 
            '✅ Kullanıcı girişi başarılı (Manuel doğrulanmış email)' : 
            '✅ Kullanıcı girişi başarılı ve Firestore güncellendi'
          );
        } catch (firestoreError) {
          // Permission hatası veya kullanıcı çıkış yapmışsa sessizce handle et
          if (firestoreError.code === 'permission-denied' || firestoreError.code === 'unauthenticated') {
            console.log('Login Firestore güncelleme izni yok, devam ediliyor.');
          } else {
            console.log('Firestore güncelleme hatası:', firestoreError);
          }
          // Firestore hatası giriş işlemini durdurmaz
        }
        
        // Basit ve güvenilir navigation
        console.log('🚀 Login completed, navigating to main app');
        
        // Sadece ana tabs sayfasına yönlendir
        router.replace('/(tabs)');
      })
      .catch(error => {
        switch (error.code) {
          case 'auth/invalid-email':
            setEmailError('Lütfen geçerli bir e-posta adresi girin.');
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            setFormError('Geçersiz e-posta veya şifre.');
            break;
          default:
            setFormError('Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.');
            console.error(error);
        }
      });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.container}
      >
        <LinearGradient
          colors={[COLORS.lightGreen, COLORS.white]}
          style={StyleSheet.absoluteFillObject} // Position gradient behind content
        />
        <View style={styles.innerContainer}>
        <Image source={require('../assets/images/medicinetrackerlogo.png')} style={styles.logo} />
        <Text style={styles.appName}>İlaç Takip</Text>
        <Text style={styles.title}>Giriş Yap</Text>
        <TextInput
          style={[styles.input, emailError && styles.inputError]}
          placeholder="E-posta Adresiniz"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={COLORS.gray}
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        <TextInput
          style={[styles.input, passwordError && styles.inputError]}
          placeholder="Şifreniz"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={COLORS.gray}
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}
        
        <TouchableOpacity onPress={handleLogin} style={{width: '100%'}}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.secondary]}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Giriş Yap</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleForgotPassword} style={{marginTop: SIZES.medium}}>
          <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
        </TouchableOpacity>
        
        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>Hesabın yok mu? </Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.switchLink}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.lightGreen,
  },
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.large,
    width: '100%',
  },
  appName: {
    fontSize: 40,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: SIZES.medium,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: SIZES.medium,
  },
  title: {
    fontSize: 32,
    fontFamily: FONTS.semiBold,
    color: COLORS.darkGray,
    marginBottom: SIZES.extraLarge,
  },
  input: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderColor: COLORS.gray,
    borderWidth: 1,
    borderRadius: SIZES.base,
    padding: SIZES.medium,
    marginBottom: SIZES.medium,
    fontFamily: FONTS.regular, // Use Poppins Regular
    fontSize: SIZES.large,
    color: COLORS.darkGray,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    width: '100%',
    color: COLORS.danger,
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    marginBottom: SIZES.medium,
    paddingHorizontal: SIZES.base,
  },
  formErrorText: {
    color: COLORS.danger,
    fontFamily: FONTS.regular,
    fontSize: SIZES.medium,
    textAlign: 'center',
    marginBottom: SIZES.medium,
  },

  button: {
    width: '100%',
    padding: SIZES.medium,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.base,
    elevation: 2,
  },
  buttonText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold, // Use Poppins SemiBold
    fontSize: SIZES.large,
  },
  forgotPasswordText: {
    fontSize: SIZES.font,
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  switchContainer: {
    flexDirection: 'row',
    marginTop: SIZES.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: {
    fontSize: SIZES.font,
    color: COLORS.darkGray,
  },
  switchLink: {
    fontSize: SIZES.font,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginLeft: SIZES.base / 2,
  }
});

export default LoginScreen;
