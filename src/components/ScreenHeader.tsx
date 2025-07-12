import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';

interface ScreenHeaderProps {
  title: string;
  withBack?: boolean;
}

const ScreenHeader = ({ title, withBack = false }: ScreenHeaderProps) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {withBack && (
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={COLORS.darkGray} />
        </TouchableOpacity>
      )}
      <Text style={[styles.title, { marginLeft: withBack ? 0 : SIZES.large }]}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SIZES.medium,
    backgroundColor: COLORS.background, // Match the screen background
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingHorizontal: SIZES.medium,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.xxLarge,
    color: COLORS.darkGray,
  },
});

export default ScreenHeader;
