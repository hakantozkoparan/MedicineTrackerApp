import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';

interface ProfileMenuItemProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  onPress: () => void;
  isDestructive?: boolean;
  textColor?: string;
}

const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({ icon, title, onPress, isDestructive = false, textColor }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.leftContainer}>
        <Ionicons name={icon} size={24} color={isDestructive ? COLORS.danger : (textColor || COLORS.primary)} />
        <Text style={[styles.title, isDestructive && styles.destructiveText, textColor && { color: textColor }]}>{title}</Text>
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
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.medium,
    color: COLORS.darkGray,
    marginLeft: SIZES.medium,
  },
  destructiveText: {
    color: COLORS.danger,
  },
});

export default ProfileMenuItem;
