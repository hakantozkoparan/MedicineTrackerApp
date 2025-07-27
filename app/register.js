import { auth, db } from '@/api/firebase';
import SimpleCaptcha from '@/components/SimpleCaptcha';
import { useLocalization } from '@/hooks/useLocalization';
import SecurityManager from '@/utils/SecurityManager';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { COLORS, FONTS, SIZES } from '@/constants/theme';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

const RegisterScreen = () => {
  const router = useRouter();
  const { t } = useLocalization();
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameError, setNameError] = useState('');
  const [surnameError, setSurnameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaResetTrigger, setCaptchaResetTrigger] = useState(0);
  const [allowTracking, setAllowTracking] = useState(false); // Tracking consent

  // Firebase konfigürasyon kontrolü
  React.useEffect(() => {
    // Firebase configuration check completed
  }, []);

  const getPushNotificationToken = async () => {
    try {
      
      if (!Device.isDevice) {
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return null; // Hata yerine null döndür
      }
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      return tokenData.data;
      
    } catch (error) {
      console.error('❌ Push notification token alma hatası:', error);
      console.error('Hata detayları:', {
        code: error.code,
        message: error.message,
        name: error.name
      });
      // APS hatası olsa bile kayıt işlemine devam et
      return null;
    }
  };

  const handleRegister = async () => {
    // Clear previous errors
    setNameError('');
    setSurnameError('');
    setEmailError('');
    setPasswordError('');

    // Basic validation
    let isValid = true;
    if (!name) {
      setNameError(t('nameRequired'));
      isValid = false;
    }
    if (!surname) {
      setSurnameError(t('surnameRequired'));
      isValid = false;
    }
    if (!email) {
      setEmailError(t('emailRequired'));
      isValid = false;
    }
    if (!password) {
      setPasswordError(t('passwordRequired'));
      isValid = false;
    }

    if (!isCaptchaVerified) {
      Alert.alert(t('warning'), t('completeSecurityVerification'));
      return;
    }

    if (!isValid) return;

    // Güvenlik kontrolü
    try {
      const securityManager = SecurityManager.getInstance();
      const securityCheck = await securityManager.checkSecurityLimits('register', email);
      
      if (!securityCheck.allowed) {
        Alert.alert(t('warning'), securityCheck.reason);
        return;
      }
    } catch (error) {
      console.error('Güvenlik kontrolü hatası:', error);
    }

    setLoading(true);
    try {
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const pushToken = await getPushNotificationToken();

      // Save user data to Firestore
      const userData = {
        name: name,
        surname: surname,
        email: email,
        pushToken: pushToken || null,
        createdAt: new Date(),
        appVersion: Constants.expoConfig.version,
        deviceInfo: {
          osName: Device.osName,
          osVersion: Device.osVersion,
          deviceName: Device.deviceName,
          locale: Localization.getLocales()[0]?.languageTag || 'en-US',
          region: Localization.getLocales()[0]?.regionCode || 'US',
          timezone: Localization.getCalendars()[0]?.timeZone || 'UTC',
        },
        role: 'member',
        emailVerified: false,
        trackingConsent: allowTracking, // Kullanıcının tracking consent'i
        trackingConsentDate: allowTracking ? new Date() : null,
      };
      
      try {
        await setDoc(doc(db, 'users', user.uid), userData);
      } catch (firestoreError) {
        console.error('❌ Firestore kayıt hatası:', {
          code: firestoreError.code,
          message: firestoreError.message,
          userId: user.uid,
          errorDetails: firestoreError
        });
        throw firestoreError; // Ana hata yakalama bloğuna aktarıldı
      }

      // Email doğrulama gönder
      await sendEmailVerification(user);

      // Kullanıcıyı çıkış yap ki email doğrulaması sonrası temiz giriş yapabilsin
      await signOut(auth);

      // Başarılı kayıt kaydı
      try {
        const securityManager = SecurityManager.getInstance();
        await securityManager.recordAttempt('register', true, email);
      } catch (error) {
        console.error('❌ Başarılı kayıt kaydı hatası:', error);
      }

      Alert.alert(
        t('accountCreatedSuccess'),
        t('emailVerificationSent'),
        [
          {
            text: t('ok'),
            onPress: () => router.replace('/login')
          }
        ]
      );
    } catch (error) {
      console.error('❌ Register işlemi hatası:', {
        code: error.code,
        message: error.message,
        email: email,
        errorDetails: error
      });
      
      // Reset captcha on failed registration attempt
      setCaptchaResetTrigger(prev => prev + 1);
      setIsCaptchaVerified(false);
      
      // Başarısız kayıt kaydı
      try {
        const securityManager = SecurityManager.getInstance();
        await securityManager.recordAttempt('register', false, email);
      } catch (securityError) {
        console.error('❌ Başarısız kayıt kaydı hatası:', securityError);
      }
      
      // Daha detaylı hata mesajları
      switch (error.code) {
        case 'auth/email-already-in-use':
          setEmailError(t('emailAlreadyInUse'));
          Alert.alert(t('error'), t('emailAlreadyInUse'));
          break;
        case 'auth/invalid-email':
          setEmailError(t('invalidEmailFormat'));
          break;
        case 'auth/weak-password':
          setPasswordError(t('passwordMinLength'));
          break;
        case 'auth/network-request-failed':
          Alert.alert(t('error'), t('networkError'));
          break;
        case 'auth/too-many-requests':
          Alert.alert(t('error'), t('tooManyRequests'));
          break;
        case 'firestore/permission-denied':
          Alert.alert(t('error'), t('firestorePermissionDenied'));
          break;
        case 'firestore/unavailable':
          Alert.alert(t('error'), t('firestoreUnavailable'));
          break;
        default:
          Alert.alert(
            t('unexpectedError'),
            t('registrationErrorDetails').replace('{code}', error.code || 'bilinmiyor').replace('{message}', error.message || 'Detay yok')
          );
          console.error('Unhandled registration error:', error);
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.lightGreen} translucent={false} />
      <LinearGradient
        colors={[COLORS.lightGreen, COLORS.white]}
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.innerContainer}>
        <Image source={require('../assets/images/medicinetrackerlogo.png')} style={styles.logo} />
        <Text style={styles.appName}>{t('appName')}</Text>
        <Text style={styles.title}>{t('registerTitle')}</Text>

        <TextInput
          style={[styles.input, nameError && styles.inputError]}
          placeholder={t('firstName')}
          value={name}
          onChangeText={setName}
          placeholderTextColor={COLORS.gray}
        />
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
        <TextInput
          style={[styles.input, surnameError && styles.inputError]}
          placeholder={t('lastName')}
          value={surname}
          onChangeText={setSurname}
          placeholderTextColor={COLORS.gray}
        />
        {surnameError ? <Text style={styles.errorText}>{surnameError}</Text> : null}
        <TextInput
          style={[styles.input, emailError && styles.inputError]}
          placeholder={t('email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={COLORS.gray}
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        <TextInput
          style={[styles.input, passwordError && styles.inputError]}
          placeholder={t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={COLORS.gray}
        />
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        <SimpleCaptcha 
          onVerified={setIsCaptchaVerified}
          resetTrigger={captchaResetTrigger}
        />

        {/* Tracking Consent Checkbox */}
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => setAllowTracking(!allowTracking)}
        >
          <View style={[styles.checkbox, allowTracking && styles.checkboxChecked]}>
            {allowTracking && <Text style={styles.checkboxTick}>✓</Text>}
          </View>
          <Text style={styles.checkboxText}>
            {t('trackingConsentMessage')}
          </Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <TouchableOpacity onPress={handleRegister} style={{width: '100%'}}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.button}
            >
              <Text style={styles.buttonText}>{t('registerButton')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>{t('alreadyHaveAccount')} </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.switchLink}>{t('login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    flexGrow: 1, 
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
    fontFamily: FONTS.regular,
    fontSize: SIZES.large,
    color: COLORS.darkGray,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    marginBottom: SIZES.medium,
    marginLeft: SIZES.base,
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
    fontFamily: FONTS.semiBold, 
    fontSize: SIZES.large,
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
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: SIZES.medium,
    paddingHorizontal: SIZES.small,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.gray,
    borderRadius: 4,
    marginRight: SIZES.small,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxTick: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxText: {
    flex: 1,
    fontSize: SIZES.small,
    color: COLORS.darkGray,
    lineHeight: 18,
  },
});

export default RegisterScreen;
