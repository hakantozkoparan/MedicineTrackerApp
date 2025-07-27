import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

export type DropdownOption = {
  label: string;
  value: string | number;
};

type DropdownSelectorProps = {
  options: DropdownOption[];
  selectedValue: string | number | null;
  onSelect: (value: string | number) => void;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

const DropdownSelector = ({ 
  options, 
  selectedValue, 
  onSelect, 
  placeholder = "Seçiniz...",
  containerStyle 
}: DropdownSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(option => option.value === selectedValue);

  const handleSelect = (value: string | number) => {
    onSelect(value);
    setIsOpen(false);
  };

  const renderOption = ({ item }: { item: DropdownOption }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        item.value === selectedValue && styles.selectedOptionItem
      ]}
      onPress={() => handleSelect(item.value)}
    >
      <Text style={[
        styles.optionText,
        item.value === selectedValue && styles.selectedOptionText
      ]}>
        {item.label}
      </Text>
      {item.value === selectedValue && (
        <Ionicons name="checkmark" size={20} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsOpen(true)}
      >
        <Text style={[
          styles.buttonText,
          !selectedOption && styles.placeholderText
        ]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons 
          name={isOpen ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={COLORS.gray} 
        />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seçim Yapın</Text>
                <TouchableOpacity onPress={() => setIsOpen(false)}>
                  <Ionicons name="close" size={24} color={COLORS.gray} />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={options}
                renderItem={renderOption}
                keyExtractor={(item) => item.value.toString()}
                style={styles.optionsList}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.base,
  },
  dropdownButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    borderRadius: SIZES.base,
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.medium,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  buttonText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.font,
    color: COLORS.darkGray,
    flex: 1,
  },
  placeholderText: {
    color: COLORS.gray,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxHeight: '60%',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.medium,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.large,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    backgroundColor: COLORS.background,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.large,
    color: COLORS.darkGray,
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.large,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  selectedOptionItem: {
    backgroundColor: COLORS.background,
  },
  optionText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.font,
    color: COLORS.darkGray,
    flex: 1,
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: SIZES.large,
  },
});

export default DropdownSelector;
