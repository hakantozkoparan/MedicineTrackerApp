import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';

interface UserInfoCardProps {
  userName: string;
  userSurname: string;
  userEmail: string;
}

const UserInfoCard: React.FC<UserInfoCardProps> = ({ userName, userSurname, userEmail }) => {
  const fullName = `${userName || ''} ${userSurname || ''}`.trim();

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Ionicons name="person-circle-outline" size={60} color={COLORS.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.name}>{fullName || 'Kullanıcı Adı'}</Text>
        {userEmail && <Text style={styles.email}>{userEmail}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SIZES.large,
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.large,
    marginTop: SIZES.medium,
    marginBottom: SIZES.large,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginRight: SIZES.medium,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.large,
    color: COLORS.darkGray,
  },
  email: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.font,
    color: COLORS.gray,
    marginTop: SIZES.base / 2,
  },

});

export default UserInfoCard;
