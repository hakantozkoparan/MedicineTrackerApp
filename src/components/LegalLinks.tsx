import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet, Linking, Alert } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useLocalization } from '@/hooks/useLocalization';

interface LegalLinksProps {
  showTitle?: boolean;
  style?: any;
}

const LegalLinks: React.FC<LegalLinksProps> = ({ showTitle = true, style }) => {
  const { t } = useLocalization();

  const openPrivacyPolicy = () => {
    const url = 'https://github.com/hakantozkoparan/MedicineTrackerApp/blob/main/docs/PRIVACY_POLICY_EN.md';
    Linking.openURL(url).catch(() => {
      Alert.alert(t('error'), 'Privacy policy could not be opened.');
    });
  };

  const openTermsOfUse = () => {
    // Terms of Use dokümanını oluşturmamız gerekecek
    const url = 'https://github.com/hakantozkoparan/MedicineTrackerApp/blob/main/docs/TERMS_OF_USE.md';
    Linking.openURL(url).catch(() => {
      Alert.alert(t('error'), 'Terms of use could not be opened.');
    });
  };

  return (
    <View style={[styles.container, style]}>
      {showTitle && (
        <Text style={styles.title}>{t('legalInformation')}</Text>
      )}
      
      <TouchableOpacity onPress={openPrivacyPolicy} style={styles.linkButton}>
        <Text style={styles.linkText}>{t('privacyPolicy')}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={openTermsOfUse} style={styles.linkButton}>
        <Text style={styles.linkText}>{t('termsOfUse')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SIZES.medium,
  },
  title: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.semiBold,
    color: COLORS.accent,
    marginBottom: SIZES.small,
  },
  linkButton: {
    paddingVertical: SIZES.small,
  },
  linkText: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
});

export default LegalLinks;
