import { auth, db } from '@/api/firebase';
import SimpleCaptcha from '@/components/SimpleCaptcha';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import SecurityManager from '@/utils/SecurityManager';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaResetTrigger, setCaptchaResetTrigger] = useState(0);
  
  // Support modal states
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportEmailError, setSupportEmailError] = useState('');
  const [supportSubjectError, setSupportSubjectError] = useState('');
  const [supportMessageError, setSupportMessageError] = useState('');
  const [isSupportCaptchaVerified, setIsSupportCaptchaVerified] = useState(false);
  const [supportCaptchaResetTrigger, setSupportCaptchaResetTrigger] = useState(0);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

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

  // Push notification token güncelleme fonksiyonu
  const updatePushNotificationToken = async (userId) => {
    try {
      
      if (!Device.isDevice) {
        return;
      }

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      if (tokenData.data) {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          pushToken: tokenData.data,
          pushTokenUpdatedAt: new Date()
        });
      }
    } catch (error) {
      // Hata olsa bile login işlemini durdurma
    }
  };

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
    }  };

  // Support form validation
  const validateSupportForm = () => {
    let isValid = true;
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!supportEmail.trim()) {
      setSupportEmailError('Email adresi gereklidir');
      isValid = false;
    } else if (!emailRegex.test(supportEmail)) {
      setSupportEmailError('Geçerli bir email adresi girin');
      isValid = false;
    } else {
      setSupportEmailError('');
    }
    
    // Subject validation
    if (!supportSubject.trim()) {
      setSupportSubjectError('Konu başlığı gereklidir');
      isValid = false;
    } else if (supportSubject.trim().length < 5) {
      setSupportSubjectError('Konu başlığı en az 5 karakter olmalıdır');
      isValid = false;
    } else {
      setSupportSubjectError('');
    }
    
    // Message validation
    if (!supportMessage.trim()) {
      setSupportMessageError('Mesaj içeriği gereklidir');
      isValid = false;
    } else if (supportMessage.trim().length < 10) {
      setSupportMessageError('Mesaj en az 10 karakter olmalıdır');
      isValid = false;
    } else {
      setSupportMessageError('');
    }
    
    return isValid;
  };

  // Submit support request
  const handleSupportSubmit = async () => {
    if (!validateSupportForm()) {
      return;
    }
    
    if (!isSupportCaptchaVerified) {
      Alert.alert('Hata', 'Lütfen captcha doğrulamasını tamamlayın.');
      return;
    }
    
    setIsSubmittingSupport(true);
    
    try {
      // Önce günlük talep limitini kontrol et
      const securityManager = SecurityManager.getInstance();
      const limitCheck = await securityManager.checkSupportTicketLimit();
      
      if (!limitCheck.allowed) {
        Alert.alert('Limit Aşıldı', limitCheck.reason);
        setIsSubmittingSupport(false);
        return;
      }
      
      // Support ticket verilerini hazırla
      const ticketData = {
        email: supportEmail.trim(),
        subject: supportSubject.trim(),
        message: supportMessage.trim(),
        status: 'open',
        priority: 'normal',
        source: 'login_page', // Nereden geldiğini belirt
      };
      
      // SecurityManager ile kaydet (cihaz ID'si otomatik eklenir)
      const success = await securityManager.recordSupportTicket(ticketData);
      
      if (success) {
        Alert.alert(
          'Başarılı!', 
          'Destek talebiniz başarıyla gönderildi. En kısa sürede size geri dönüş yapacağız.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                // Modal'ı kapat ve formu temizle
                setShowSupportModal(false);
                setSupportEmail('');
                setSupportSubject('');
                setSupportMessage('');
                setIsSupportCaptchaVerified(false);
                setSupportCaptchaResetTrigger(prev => prev + 1);
              }
            }
          ]
        );
      } else {
        Alert.alert('Hata', 'Destek talebi gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
      }
      
    } catch (error) {
      Alert.alert('Hata', 'Destek talebi gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const handleLogin = async () => {
    setEmailError('');
    setPasswordError('');
    setFormError('');

    if (!email || !password) {
      if (!email) setEmailError('E-posta alanı boş bırakılamaz.');
      if (!password) setPasswordError('Şifre alanı boş bırakılamaz.');
      return;
    }

    if (!isCaptchaVerified) {
      setFormError('Lütfen güvenlik doğrulamasını tamamlayın.');
      return;
    }

    // Güvenlik kontrolü - GEÇICI OLARAK DEVRE DIŞI
    try {
      const securityManager = SecurityManager.getInstance();
      const securityCheck = await securityManager.checkSecurityLimits('login', email);
      
      if (!securityCheck.allowed) {
        // setFormError(securityCheck.reason);
        // return;
      }
    } catch (error) {
      // Güvenlik kontrolü hatası - sessizce devam et
    }

    signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        
        // Auth ve db null kontrolü
        if (!auth || !db) {
          Alert.alert('Hata', 'Firebase bağlantısı kurulamadı.');
          return;
        }
        
        // Kullanıcının en güncel durumunu al
        await user.reload();
        const refreshedUser = auth.currentUser;
        
        // Firestore'dan kullanıcı bilgilerini kontrol et
        const userDocRef = doc(db, 'users', refreshedUser.uid);
        let userDoc;
        try {
          userDoc = await getDoc(userDocRef);
        } catch (firestoreError) {
          userDoc = null;
        }
        
        let isEmailVerified = refreshedUser.emailVerified;
        let isManuallyVerified = false;
        
        // Firestore'dan kullanıcı verilerini kontrol et
        let userData = null;
        if (userDoc && userDoc.exists()) {
          userData = userDoc.data();
          
          // Manuel doğrulama kontrolü - admin tarafından doğrulanmış mı?
          isManuallyVerified = userData?.emailVerifiedBy === 'admin' && !!(userData?.emailVerifiedAt);
          
          // HERHANGI BİRİ TRUE İSE KULLANICI DOĞRULANMIŞTır:
          // 1. Firebase Auth emailVerified
          // 2. Admin tarafından manuel doğrulama
          // 3. Firestore'da emailVerified true
          isEmailVerified = refreshedUser.emailVerified || isManuallyVerified || userData?.emailVerified === true;
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
          
          // Push notification token'ı güncelle (background'da)
          updatePushNotificationToken(refreshedUser.uid).catch(error => {
            // Push token güncelleme arka planda başarısız
          });
        } catch (firestoreError) {
          // Permission hatası veya kullanıcı çıkış yapmışsa sessizce handle et
          if (firestoreError.code === 'permission-denied' || firestoreError.code === 'unauthenticated') {
            // Login Firestore güncelleme izni yok, devam ediliyor.
          } else {
            // Firestore güncelleme hatası
          }
          // Firestore hatası giriş işlemini durdurmaz
        }
        
        // Basit ve güvenilir navigation
        
        // Başarılı giriş kaydı
        try {
          const securityManager = SecurityManager.getInstance();
          await securityManager.recordAttempt('login', true, email);
        } catch (error) {
          // Başarılı giriş kaydı hatası - sessizce devam et
        }
        
        // Sadece ana tabs sayfasına yönlendir
        router.replace('/(tabs)');
      })
      .catch(async (error) => {
        // Reset captcha on failed login attempt
        setCaptchaResetTrigger(prev => prev + 1);
        setIsCaptchaVerified(false);
        
        // Başarısız giriş kaydı
        try {
          const securityManager = SecurityManager.getInstance();
          await securityManager.recordAttempt('login', false, email);
        } catch (securityError) {
          // Başarısız giriş kaydı hatası - sessizce devam et
        }
        
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
        }
      });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={COLORS.lightGreen} translucent={false} />
      <LinearGradient
        colors={[COLORS.lightGreen, COLORS.white]}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* İletişim butonu - sağ üst köşe */}
      <View style={styles.topRightContainer}>
        <TouchableOpacity 
          onPress={() => setShowSupportModal(true)}
          style={styles.contactLink}
        >
          <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
          <Text style={styles.contactLinkText}>İletişim</Text>
        </TouchableOpacity>
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.container}
      >
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

        <SimpleCaptcha 
          onVerified={setIsCaptchaVerified}
          resetTrigger={captchaResetTrigger}
        />

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
      
      {/* Support Modal */}
      <Modal
        visible={showSupportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSupportModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowSupportModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>İletişim</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalDescription}>
              Bir sorun mu yaşıyorsunuz? Size yardımcı olmak için buradayız. 
              Lütfen aşağıdaki formu doldurun, en kısa sürede size geri dönüş yapalım.
            </Text>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Email Adresiniz *</Text>
              <TextInput
                style={[styles.modalInput, supportEmailError ? styles.modalInputError : null]}
                placeholder="ornek@email.com"
                placeholderTextColor={COLORS.gray}
                value={supportEmail}
                onChangeText={setSupportEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {supportEmailError ? (
                <Text style={styles.modalErrorText}>{supportEmailError}</Text>
              ) : null}
            </View>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Konu Başlığı *</Text>
              <TextInput
                style={[styles.modalInput, supportSubjectError ? styles.modalInputError : null]}
                placeholder="Sorunun kısa açıklaması"
                placeholderTextColor={COLORS.gray}
                value={supportSubject}
                onChangeText={setSupportSubject}
                maxLength={100}
              />
              {supportSubjectError ? (
                <Text style={styles.modalErrorText}>{supportSubjectError}</Text>
              ) : null}
            </View>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Mesajınız *</Text>
              <TextInput
                style={[styles.modalTextArea, supportMessageError ? styles.modalInputError : null]}
                placeholder="Sorunuzu detaylı bir şekilde açıklayın..."
                placeholderTextColor={COLORS.gray}
                value={supportMessage}
                onChangeText={setSupportMessage}
                multiline
                numberOfLines={6}
                maxLength={1000}
                textAlignVertical="top"
              />
              {supportMessageError ? (
                <Text style={styles.modalErrorText}>{supportMessageError}</Text>
              ) : null}
            </View>
            
            <View style={styles.modalCaptchaContainer}>
              <SimpleCaptcha
                onVerified={setIsSupportCaptchaVerified}
                resetTrigger={supportCaptchaResetTrigger}
              />
            </View>
            
            <TouchableOpacity
              style={[
                styles.modalSubmitButton,
                (!isSupportCaptchaVerified || isSubmittingSupport) && styles.modalSubmitButtonDisabled
              ]}
              onPress={handleSupportSubmit}
              disabled={!isSupportCaptchaVerified || isSubmittingSupport}
            >
              {isSubmittingSupport ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.modalSubmitButtonText}>
                  Destek Talebi Gönder
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  },
  topRightContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: SIZES.large,
    zIndex: 1,
  },
  contactLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.base / 2,
    paddingHorizontal: SIZES.base,
  },
  contactLinkText: {
    color: COLORS.primary,
    fontSize: SIZES.small,
    fontFamily: FONTS.semiBold,
    marginLeft: SIZES.base / 2,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: SIZES.large,
    color: COLORS.darkGray,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: SIZES.extraLarge,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  modalHeaderSpacer: {
    width: 30,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: SIZES.large,
  },
  modalDescription: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    color: COLORS.darkGray,
    textAlign: 'center',
    marginVertical: SIZES.large,
    lineHeight: 24,
  },
  modalInputContainer: {
    marginBottom: SIZES.large,
  },
  modalLabel: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.semiBold,
    color: COLORS.darkGray,
    marginBottom: SIZES.base,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.medium,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.white,
  },
  modalTextArea: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.medium,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.white,
    height: 120,
  },
  modalInputError: {
    borderColor: COLORS.danger,
  },
  modalErrorText: {
    color: COLORS.danger,
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
    marginTop: SIZES.base / 2,
  },
  modalCaptchaContainer: {
    marginBottom: SIZES.large,
    alignItems: 'center',
  },
  modalSubmitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.medium,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.xxLarge,
  },
  modalSubmitButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  modalSubmitButtonText: {
    color: COLORS.white,
    fontSize: SIZES.large,
    fontFamily: FONTS.semiBold,
  }
});

export default LoginScreen;
