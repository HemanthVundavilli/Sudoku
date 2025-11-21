// src/components/Cell.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function Cell({
  theme,
  value,
  isFixed,
  isSelected,
  isConflict,
  onPress,
  style,
}) {
  let backgroundColor = theme.cellBackground;
  if (isFixed) backgroundColor = theme.fixedCellBackground;
  if (isSelected) backgroundColor = theme.selectedCellBackground;
  if (isConflict) backgroundColor = theme.conflictCellBackground;

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        style,
        {
          backgroundColor,
        },
      ]}
      onPress={onPress}
      disabled={isFixed}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.text,
          {
            color: isConflict ? '#b91c1c' : theme.text,
            fontWeight: isFixed ? '700' : '500',
          },
        ]}
      >
        {value !== 0 ? value : ''}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
  },
});