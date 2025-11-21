// src/screens/SudokuScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Board from '../components/Board';
import NumberPad from '../components/NumberPad';

// ---------- Helpers ----------
const cloneGrid = (grid) => grid.map((row) => [...row]);

const BASE_SOLUTION = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
};

// Randomly transform BASE_SOLUTION into a new valid solution
const generateSolutionGrid = () => {
  let grid = cloneGrid(BASE_SOLUTION);

  // swap rows within bands
  for (let band = 0; band < 3; band++) {
    const rows = [0, 1, 2].map((r) => r + band * 3);
    const shuffledRows = shuffle(rows);
    const newGrid = cloneGrid(grid);
    for (let i = 0; i < 3; i++) {
      newGrid[rows[i]] = grid[shuffledRows[i]];
    }
    grid = newGrid;
  }

  // swap columns within stacks
  for (let stack = 0; stack < 3; stack++) {
    const cols = [0, 1, 2].map((c) => c + stack * 3);
    const shuffledCols = shuffle(cols);
    const newGrid = cloneGrid(grid);
    for (let r = 0; r < 9; r++) {
      for (let i = 0; i < 3; i++) {
        newGrid[r][cols[i]] = grid[r][shuffledCols[i]];
      }
    }
    grid = newGrid;
  }

  // swap row bands
  {
    const bands = [0, 1, 2];
    const shuffledBands = shuffle(bands);
    const newGrid = cloneGrid(grid);
    for (let b = 0; b < 3; b++) {
      for (let r = 0; r < 3; r++) {
        newGrid[b * 3 + r] = grid[shuffledBands[b] * 3 + r];
      }
    }
    grid = newGrid;
  }

  // swap column stacks
  {
    const stacks = [0, 1, 2];
    const shuffledStacks = shuffle(stacks);
    const newGrid = cloneGrid(grid);
    for (let s = 0; s < 3; s++) {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 3; c++) {
          newGrid[r][s * 3 + c] = grid[r][shuffledStacks[s] * 3 + c];
        }
      }
    }
    grid = newGrid;
  }

  // digit permutation
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const map = {};
  for (let i = 0; i < 9; i++) map[i + 1] = digits[i];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      grid[r][c] = map[grid[r][c]];
    }
  }

  return grid;
};

// Generate puzzle from solution by removing cells based on difficulty
const generatePuzzle = (difficulty) => {
  const solution = generateSolutionGrid();
  const puzzle = cloneGrid(solution);

  let holes;
  if (difficulty === 'easy') holes = 40; // ~41 clues
  else if (difficulty === 'medium') holes = 50; // ~31 clues
  else holes = 60; // ~21 clues

  while (holes > 0) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      holes--;
    }
  }

  return { puzzle, solution };
};

// Conflict computation based on Sudoku rules
const computeConflicts = (grid) => {
  const conflictSet = new Set();

  // rows
  for (let r = 0; r < 9; r++) {
    const seen = {};
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      if (v === 0) continue;
      if (seen[v] !== undefined) {
        conflictSet.add(`${r}-${c}`);
        conflictSet.add(`${r}-${seen[v]}`);
      } else {
        seen[v] = c;
      }
    }
  }

  // columns
  for (let c = 0; c < 9; c++) {
    const seen = {};
    for (let r = 0; r < 9; r++) {
      const v = grid[r][c];
      if (v === 0) continue;
      if (seen[v] !== undefined) {
        conflictSet.add(`${r}-${c}`);
        conflictSet.add(`${seen[v]}-${c}`);
      } else {
        seen[v] = r;
      }
    }
  }

  // 3x3 boxes
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const seen = {};
      for (let r = br * 3; r < br * 3 + 3; r++) {
        for (let c = bc * 3; c < bc * 3 + 3; c++) {
          const v = grid[r][c];
          if (v === 0) continue;
          if (seen[v]) {
            const [pr, pc] = seen[v];
            conflictSet.add(`${r}-${c}`);
            conflictSet.add(`${pr}-${pc}`);
          } else {
            seen[v] = [r, c];
          }
        }
      }
    }
  }

  return conflictSet;
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const mm = m < 10 ? `0${m}` : `${m}`;
  const ss = s < 10 ? `0${s}` : `${s}`;
  return `${mm}:${ss}`;
};

const BEST_TIMES_KEY = 'SUDOKU_BEST_TIMES_V3';

const MAX_HINTS = {
  easy: 5,
  medium: 4,
  hard: 3,
};

// ---------- Themes ----------
const LIGHT_THEME = {
  name: 'light',
  background: '#f3f4f6',
  text: '#111827',
  headerText: '#111827',
  timerText: '#6b7280',
  boardBackground: '#ffffff',
  cellBackground: '#f9fafb',
  fixedCellBackground: '#e5e7eb',
  selectedCellBackground: '#e0f2fe',
  conflictCellBackground: '#fee2e2',
  borderColor: '#9ca3af',
  primary: '#2563eb',
  buttonBackground: '#ffffff',
  buttonText: '#111827',
  buttonBorder: '#d1d5db',
  eraseButtonBackground: '#fee2e2',
  hintButtonBackground: '#dcfce7',
  toggleBackground: '#2563eb',
  toggleText: '#ffffff',
  chipBackground: '#e5e7eb',
  modalBackground: 'rgba(0,0,0,0.5)',
  modalCard: '#ffffff',
};

const DARK_THEME = {
  name: 'dark',
  background: '#020617',
  text: '#e5e7eb',
  headerText: '#e5e7eb',
  timerText: '#9ca3af',
  boardBackground: '#020617',
  cellBackground: '#020617',
  fixedCellBackground: '#111827',
  selectedCellBackground: '#1d4ed8',
  conflictCellBackground: '#7f1d1d',
  borderColor: '#374151',
  primary: '#60a5fa',
  buttonBackground: '#020617',
  buttonText: '#e5e7eb',
  buttonBorder: '#4b5563',
  eraseButtonBackground: '#7f1d1d',
  hintButtonBackground: '#065f46',
  toggleBackground: '#111827',
  toggleText: '#e5e7eb',
  chipBackground: '#111827',
  modalBackground: 'rgba(0,0,0,0.6)',
  modalCard: '#020617',
};

// ---------- Component ----------
export default function SudokuScreen() {
  const [difficulty, setDifficulty] = useState('easy');
  const [initialGrid, setInitialGrid] = useState(cloneGrid(BASE_SOLUTION));
  const [currentGrid, setCurrentGrid] = useState(cloneGrid(BASE_SOLUTION));
  const [solutionGrid, setSolutionGrid] = useState(cloneGrid(BASE_SOLUTION));
  const [selectedCell, setSelectedCell] = useState(null);
  const [conflictCells, setConflictCells] = useState(new Set());
  const [seconds, setSeconds] = useState(0);
  const [gameId, setGameId] = useState(0);
  const [bestTimes, setBestTimes] = useState({
    easy: null,
    medium: null,
    hard: null,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingHints, setRemainingHints] = useState(MAX_HINTS[difficulty]);
  const [showMistakes, setShowMistakes] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);

  const theme = isDarkMode ? DARK_THEME : LIGHT_THEME;

  // Load best times
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(BEST_TIMES_KEY);
        if (stored) {
          setBestTimes(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Timer reset on new game
  useEffect(() => {
    setSeconds(0);
    setIsPaused(false);
  }, [gameId]);

  // Timer tick
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isPaused, gameId]);

  // First game
  useEffect(() => {
    startNewGame(difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveBestTimes = async (times) => {
    try {
      await AsyncStorage.setItem(BEST_TIMES_KEY, JSON.stringify(times));
    } catch {
      // ignore
    }
  };

  const startNewGame = useCallback(
    (diff) => {
      const { puzzle, solution } = generatePuzzle(diff);
      setDifficulty(diff);
      setInitialGrid(cloneGrid(puzzle));
      setCurrentGrid(cloneGrid(puzzle));
      setSolutionGrid(cloneGrid(solution));
      setSelectedCell(null);
      setRemainingHints(MAX_HINTS[diff]);
      setShowMistakes(true);
      const conflicts = computeConflicts(puzzle);
      setConflictCells(conflicts);
      setGameId((id) => id + 1);
      setMenuVisible(false);
    },
    []
  );

  const handleCellPress = (row, col) => {
    if (initialGrid[row][col] !== 0) return;
    setSelectedCell({ row, col });
  };

  const checkWin = (grid) => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== solutionGrid[r][c]) return false;
      }
    }
    return true;
  };

const handleNumberPress = (num) => {
  if (!selectedCell || isPaused) return;

  const { row, col } = selectedCell;
  // Do not edit fixed cells
  if (initialGrid[row][col] !== 0) return;

  // Put the value in the grid
  const newGrid = cloneGrid(currentGrid);
  newGrid[row][col] = num;

  // Calculate normal Sudoku conflicts (row/col/box)
  let conflicts = computeConflicts(newGrid);

  const cellKey = `${row}-${col}`;
  const isWrongBySolution = solutionGrid[row][col] !== num;

  // If mistakes are ON:
  // - keep normal conflicts
  // - also mark this cell as "wrong" if it doesn't match solution
  if (showMistakes && isWrongBySolution) {
    conflicts = new Set(conflicts); // copy to avoid mutating original
    conflicts.add(cellKey);
  }

  // Update grid and conflict set (Board + Cell will show red)
  setCurrentGrid(newGrid);
  setConflictCells(conflicts);

  // Win only if there are no conflicts and grid == solution
  const hasWon = conflicts.size === 0 && checkWin(newGrid);
  if (hasWon) handleWin();
};

  const handleErase = () => {
    if (!selectedCell || isPaused) return;
    const { row, col } = selectedCell;
    if (initialGrid[row][col] !== 0) return;

    const newGrid = cloneGrid(currentGrid);
    newGrid[row][col] = 0;

    const conflicts = computeConflicts(newGrid);
    setCurrentGrid(newGrid);
    setConflictCells(conflicts);
  };

  const handleHint = () => {
    if (isPaused) return;
    if (remainingHints <= 0) {
      Alert.alert('Hints', 'No hints left for this game.');
      return;
    }
    if (!selectedCell) {
      Alert.alert('Hints', 'Select an empty cell to use a hint.');
      return;
    }
    const { row, col } = selectedCell;
    if (initialGrid[row][col] !== 0) {
      Alert.alert('Hints', 'You cannot change a fixed cell.');
      return;
    }

    const correctValue = solutionGrid[row][col];
    if (correctValue === 0) {
      Alert.alert('Hints', 'No hint available for this cell.');
      return;
    }

    const newGrid = cloneGrid(currentGrid);
    newGrid[row][col] = correctValue;

    const conflicts = computeConflicts(newGrid);
    setCurrentGrid(newGrid);
    setConflictCells(conflicts);
    setRemainingHints((h) => h - 1);

    const hasWon = conflicts.size === 0 && checkWin(newGrid);
    if (hasWon) handleWin();
  };

    const handleWin = () => {
    const timeTaken = seconds;
    const previousBest = bestTimes[difficulty];
    const updated = { ...bestTimes };

    let message = `You solved the puzzle in ${formatTime(timeTaken)}.`;
    if (previousBest == null || timeTaken < previousBest) {
        updated[difficulty] = timeTaken;
        setBestTimes(updated);
        saveBestTimes(updated);
        message += '\nNew best time!';
    }

    Alert.alert(
        'Congratulations!',
        message,
        [
        {
            text: 'OK',
            onPress: () => {
            startNewGame(difficulty);
            },
        },
        ],
        { cancelable: false }
    );
    };

  const bestTimeText =
    bestTimes[difficulty] != null ? formatTime(bestTimes[difficulty]) : '--:--';

  const resetBestTimes = () => {
    const empty = { easy: null, medium: null, hard: null };
    setBestTimes(empty);
    saveBestTimes(empty);
  };

  const renderMenuDifficultyButton = (label, value) => {
    const active = difficulty === value;
    return (
      <TouchableOpacity
        key={value}
        style={[
          styles.menuDifficultyButton,
          {
            backgroundColor: active ? theme.primary : theme.chipBackground,
          },
        ]}
        onPress={() => startNewGame(value)}
      >
        <Text
          style={{
            color: active ? '#ffffff' : theme.text,
            fontWeight: '600',
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: theme.headerText }]}>
            Sudoku
          </Text>
          <Text style={[styles.subtitle, { color: theme.timerText }]}>
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ·{' '}
            {remainingHints} hints left
          </Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          {/* Simple hamburger icon */}
          <View
            style={[
              styles.menuLine,
              { backgroundColor: theme.headerText },
            ]}
          />
          <View
            style={[
              styles.menuLine,
              { backgroundColor: theme.headerText },
            ]}
          />
          <View
            style={[
              styles.menuLine,
              { backgroundColor: theme.headerText },
            ]}
          />
        </TouchableOpacity>
      </View>

      {/* Info row */}
      <View style={styles.infoRow}>
        <View style={styles.infoBlock}>
        <Text style={[styles.infoLabel, { color: theme.timerText }]}>
            Running Time
        </Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>
            {formatTime(seconds)}
        </Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={[styles.infoLabel, { color: theme.timerText }]}>
            Best ({difficulty})
          </Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>
            {bestTimeText}
          </Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={[styles.infoLabel, { color: theme.timerText }]}>
            Mistakes
          </Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>
            {showMistakes ? 'On' : 'Off'}
          </Text>
        </View>
      </View>

      {/* Board */}
      <Board
        theme={theme}
        initialGrid={initialGrid}
        currentGrid={currentGrid}
        selectedCell={selectedCell}
        conflictCells={showMistakes ? conflictCells : new Set()}
        onCellPress={handleCellPress}
      />

      {/* Control buttons */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            {
              backgroundColor: theme.buttonBackground,
              borderColor: theme.buttonBorder,
            },
          ]}
          onPress={() => startNewGame(difficulty)}
        >
          <Text style={{ color: theme.buttonText, fontWeight: '600' }}>
            New Game
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            {
              backgroundColor: theme.buttonBackground,
              borderColor: theme.buttonBorder,
            },
          ]}
          onPress={() => setIsPaused((p) => !p)}
        >
          <Text style={{ color: theme.buttonText, fontWeight: '600' }}>
            {isPaused ? 'Resume' : 'Pause'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            {
              backgroundColor: theme.hintButtonBackground,
              borderColor: theme.buttonBorder,
            },
          ]}
          onPress={handleHint}
        >
          <Text style={{ color: theme.buttonText, fontWeight: '600' }}>
            Hint
          </Text>
        </TouchableOpacity>
      </View>

      {/* Number pad */}
      <NumberPad
        theme={theme}
        onNumberPress={handleNumberPress}
        onErase={handleErase}
      />

      {/* Settings / Hamburger menu */}
      <Modal
        visible={menuVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={[
            styles.modalOverlay,
            { backgroundColor: theme.modalBackground },
          ]}
          onPress={() => setMenuVisible(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: theme.modalCard },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Settings
            </Text>

            <Text
              style={[styles.modalSectionTitle, { color: theme.timerText }]}
            >
              Difficulty
            </Text>
            <View style={styles.modalDifficultyRow}>
              {renderMenuDifficultyButton('Easy', 'easy')}
              {renderMenuDifficultyButton('Medium', 'medium')}
              {renderMenuDifficultyButton('Hard', 'hard')}
            </View>

            <View style={styles.modalSwitchRow}>
              <View>
                <Text style={[styles.modalSwitchLabel, { color: theme.text }]}>
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
              />
            </View>

            <View style={styles.modalSwitchRow}>
              <View>
                <Text style={[styles.modalSwitchLabel, { color: theme.text }]}>
                  Mistakes (instant feedback)
                </Text>
              </View>
              <Switch
                value={showMistakes}
                onValueChange={setShowMistakes}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.modalResetButton,
                {
                  borderColor: theme.buttonBorder,
                  backgroundColor: theme.buttonBackground,
                },
              ]}
              onPress={resetBestTimes}
            >
              <Text style={{ color: theme.buttonText, fontWeight: '600' }}>
                Reset Best Times
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalCloseButton,
                { backgroundColor: theme.primary },
              ]}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={{ color: '#ffffff', fontWeight: '600' }}>
                Close
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLine: {
    width: 22,
    height: 2,
    borderRadius: 1,
    marginVertical: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 6,
  },
  modalDifficultyRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  menuDifficultyButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  modalSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  modalSwitchLabel: {
    fontSize: 15,
  },
  modalResetButton: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCloseButton: {
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
});
