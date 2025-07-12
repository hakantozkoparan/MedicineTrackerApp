import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { COLORS, SIZES, FONTS } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type Option = {
  label: string;
  value: string | number;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

type OptionSelectorProps = {
  options: Option[];
  selectedValue: string | number | null;
  onSelect: (value: string | number) => void;
  containerStyle?: StyleProp<ViewStyle>;
};

const OptionSelector = ({ options, selectedValue, onSelect, containerStyle }: OptionSelectorProps) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {options.map((option) => {
        const isSelected = selectedValue === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              isSelected && styles.selectedOption,
              // Adjust width for frequency options
              options.length > 4 && { minWidth: '30%' }
            ]}
            onPress={() => onSelect(option.value)}
          >
            {option.icon && (
              <MaterialCommunityIcons
                name={option.icon}
                size={24}
                color={isSelected ? COLORS.white : COLORS.primary}
                style={styles.icon}
              />
            )}
            <Text style={[styles.optionText, isSelected && styles.selectedText]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SIZES.large,
  },
  optionButton: {
    backgroundColor: COLORS.white,
    paddingVertical: SIZES.medium,
    paddingHorizontal: SIZES.medium,
    borderRadius: SIZES.base,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.base,
    minWidth: '48%', // Default for 2 columns
    flexGrow: 1,
    marginHorizontal: '1%',
  },
  selectedOption: {
    backgroundColor: COLORS.primary,
  },
  icon: {
    marginRight: SIZES.base,
  },
  optionText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.medium,
    color: COLORS.primary,
  },
  selectedText: {
    color: COLORS.white,
  },
});

export default OptionSelector;
