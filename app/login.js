import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '@/api/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { COLORS, SIZES, FONTS } from '@/constants/theme';

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');


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
      .then(() => {
        // Login successful, the onAuthStateChanged listener in _layout.tsx will handle navigation.
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <LinearGradient
        colors={[COLORS.lightGreen, COLORS.white]}
        style={StyleSheet.absoluteFillObject} // Position gradient behind content
      />
      <View style={styles.innerContainer}>
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
        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>Hesabın yok mu? </Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.switchLink}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
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
