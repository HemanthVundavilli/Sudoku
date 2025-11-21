// src/components/Board.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Cell from './Cell';

export default function Board({
  theme,
  initialGrid,
  currentGrid,
  selectedCell,
  conflictCells,
  onCellPress,
}) {
  const isConflict = (r, c) => conflictCells.has(`${r}-${c}`);

  return (
    <View
      style={[
        styles.board,
        {
          backgroundColor: theme.boardBackground,
          borderColor: theme.borderColor,
        },
      ]}
    >
      {currentGrid.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((value, colIndex) => {
            const isSelected =
              selectedCell &&
              selectedCell.row === rowIndex &&
              selectedCell.col === colIndex;
            const isFixed = initialGrid[rowIndex][colIndex] !== 0;

            const borderStyle = {
              borderTopWidth: rowIndex % 3 === 0 ? 2 : 1,
              borderLeftWidth: colIndex % 3 === 0 ? 2 : 1,
              borderRightWidth: colIndex === 8 ? 2 : 1,
              borderBottomWidth: rowIndex === 8 ? 2 : 1,
              borderColor: theme.borderColor,
            };

            return (
              <Cell
                key={colIndex}
                theme={theme}
                value={value}
                isFixed={isFixed}
                isSelected={isSelected}
                isConflict={isConflict(rowIndex, colIndex)}
                style={borderStyle}
                onPress={() => onCellPress(rowIndex, colIndex)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    aspectRatio: 1,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 2,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
});