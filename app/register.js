import { auth, db } from '@/api/firebase';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { COLORS, FONTS, SIZES } from '@/constants/theme';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

const RegisterScreen = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nameError, setNameError] = useState('');
  const [surnameError, setSurnameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const getPushNotificationToken = async () => {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Bildirim izni verilmedi!');
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig.extra.eas.projectId,
      })).data;
    } else {
      Alert.alert('Fiziksel bir cihazda çalıştırılmalıdır.');
    }

    return token;
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
      setNameError('İsim alanı boş bırakılamaz.');
      isValid = false;
    }
    if (!surname) {
      setSurnameError('Soyisim alanı boş bırakılamaz.');
      isValid = false;
    }
    if (!email) {
      setEmailError('E-posta alanı boş bırakılamaz.');
      isValid = false;
    }
    if (!password) {
      setPasswordError('Şifre alanı boş bırakılamaz.');
      isValid = false;
    }

    if (!isValid) return;

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const pushToken = await getPushNotificationToken();

      // Save user data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
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
        },
        role: 'member',
        emailVerified: false,
      });

      // Email doğrulama gönder
      await sendEmailVerification(user);

      // Kullanıcıyı çıkış yap ki email doğrulaması sonrası temiz giriş yapabilsin
      await signOut(auth);

      Alert.alert(
        'Kayıt Başarılı!', 
        `${email} adresine doğrulama e-postası gönderildi. Lütfen e-postanızı kontrol edin ve doğrulama linkine tıklayın. Doğrulama sonrası giriş yapabilirsiniz.`,
        [
          {
            text: 'Tamam',
            onPress: () => router.replace('/login')
          }
        ]
      );
    } catch (error) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          setEmailError('Bu e-posta adresi zaten kullanılıyor.');
          break;
        case 'auth/invalid-email':
          setEmailError('Geçersiz e-posta adresi formatı.');
          break;
        case 'auth/weak-password':
          setPasswordError('Şifre en az 6 karakter olmalıdır.');
          break;
        default:
          Alert.alert('Hata', 'Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.');
          console.error(error);
          break;
      }
    } finally {
      setLoading(false);
    }
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
        <ScrollView contentContainerStyle={styles.innerContainer}>
        <Image source={require('../assets/images/medicinetrackerlogo.png')} style={styles.logo} />
        <Text style={styles.appName}>İlaç Takip</Text>
        <Text style={styles.title}>Kayıt Ol</Text>

        <TextInput
          style={[styles.input, nameError && styles.inputError]}
          placeholder="Adınız"
          value={name}
          onChangeText={setName}
          placeholderTextColor={COLORS.gray}
        />
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
        <TextInput
          style={[styles.input, surnameError && styles.inputError]}
          placeholder="Soyadınız"
          value={surname}
          onChangeText={setSurname}
          placeholderTextColor={COLORS.gray}
        />
        {surnameError ? <Text style={styles.errorText}>{surnameError}</Text> : null}
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

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <TouchableOpacity onPress={handleRegister} style={{width: '100%'}}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Kayıt Ol</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>Zaten hesabın var mı? </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.switchLink}>Giriş Yap</Text>
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
  }
});

export default RegisterScreen;
