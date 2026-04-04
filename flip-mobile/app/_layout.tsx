import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  const [testData, setTestData] = useState('Fetching...');

  useEffect(() => {
    async function testConnection() {
      try {
        // Test your existing Next.js API
        const res = await fetch('https://flip-black-two.vercel.app/api/v1/price/Charizard-Base-Set');
        const data = await res.json();
        setTestData(`Charizard Price: $${data.price}`);
      } catch (err) {
        setTestData('Connection Failed');
      }
    }
    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.terminalText}>› TERMINAL_MOBILE_v1.0</Text>
      <Text style={styles.dataText}>{testData}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminalText: {
    color: '#e8ff47',
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  dataText: {
    color: '#fff',
    fontSize: 20,
  },
});