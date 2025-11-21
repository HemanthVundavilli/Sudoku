// app/index.js
import { SafeAreaView, StatusBar } from 'react-native';
import SudokuScreen from './src/screens/SudokuScreen';

export default function Index() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <SudokuScreen />
    </SafeAreaView>
  );
}