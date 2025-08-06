import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useLocalization } from '@/hooks/useLocalization';

interface MedicalDisclaimerProps {
  style?: any;
  compact?: boolean;
}

const MedicalDisclaimer: React.FC<MedicalDisclaimerProps> = ({ style, compact = false }) => {
  const { t } = useLocalization();

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{t('medicalDisclaimer')}</Text>
      <Text style={styles.text}>{t('medicalDisclaimerText')}</Text>
      {!compact && (
        <Text style={styles.note}>{t('medicalDisclaimerNote')}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.lightWarning || '#FFF3CD',
    borderColor: COLORS.warning || '#FFC107',
    borderWidth: 1,
    borderRadius: SIZES.small,
    padding: SIZES.medium,
    marginVertical: SIZES.small,
  },
  title: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.bold,
    color: COLORS.warning || '#856404',
    marginBottom: SIZES.small,
  },
  text: {
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
    color: COLORS.dark || '#212529',
    lineHeight: 20,
    marginBottom: SIZES.small,
  },
  note: {
    fontSize: SIZES.small,
    fontFamily: FONTS.semiBold,
    color: COLORS.dark || '#212529',
    fontStyle: 'italic',
  },
});

export default MedicalDisclaimer;
