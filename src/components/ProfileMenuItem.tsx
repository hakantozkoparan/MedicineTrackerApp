import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, SIZES } from '../constants/theme';

interface ProfileMenuItemProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  onPress: () => void;
  isDestructive?: boolean;
  textColor?: string;
}

const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({ icon, title, subtitle, onPress, isDestructive = false, textColor }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.leftContainer}>
        <Ionicons name={icon} size={24} color={isDestructive ? COLORS.danger : (textColor || COLORS.primary)} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, isDestructive && styles.destructiveText, textColor && { color: textColor }]}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {!isDestructive && (
        <Ionicons name="chevron-forward-outline" size={22} color={COLORS.gray} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.large,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: SIZES.medium,
    flex: 1,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.medium,
    color: COLORS.darkGray,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginTop: 2,
  },
  destructiveText: {
    color: COLORS.danger,
  },
});

export default ProfileMenuItem;
