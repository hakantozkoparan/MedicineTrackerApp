import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '@/constants/theme';
import ScreenHeader from '@/components/ScreenHeader';

export default function MedicinesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="İlaçlarım" />
        <TouchableOpacity style={styles.addButton} onPress={() => { /* İlaç ekleme modal'ını aç */ }}>
          <Ionicons name="add-circle" size={40} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholderText}>Henüz hiç ilaç eklemediniz.</Text>
        <Text style={styles.placeholderSubText}>Başlamak için + butonuna dokunun.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: SIZES.large, // Only add padding to the right for the button
  },
  addButton: {
    padding: SIZES.base,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: SIZES.large,
    fontFamily: FONTS.semiBold,
    color: COLORS.darkGray,
    marginBottom: SIZES.small,
  },
  placeholderSubText: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
});
