// src/components/NumberPad.js
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function NumberPad({ theme, onNumberPress, onErase }) {
  const renderButton = (label, onPress, extraStyle = {}) => (
    <TouchableOpacity
      key={label}
      style={[
        styles.button,
        {
          backgroundColor: theme.buttonBackground,
          borderColor: theme.buttonBorder,
        },
        extraStyle,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.buttonText, { color: theme.buttonText }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((num) =>
          renderButton(num, () => onNumberPress(num))
        )}
      </View>
      <View style={styles.row}>
        {[6, 7, 8, 9].map((num) =>
          renderButton(num, () => onNumberPress(num))
        )}
        {renderButton('Erase', onErase, {
          backgroundColor: theme.eraseButtonBackground,
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});