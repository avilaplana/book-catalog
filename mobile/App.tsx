import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

const HEALTH_URL = 'http://localhost:8000/v1/health';

type Result =
  | { state: 'loading' }
  | { state: 'ok'; status: string }
  | { state: 'error'; message: string };

export default function App() {
  const [result, setResult] = useState<Result>({ state: 'loading' });

  useEffect(() => {
    fetch(HEALTH_URL)
      .then((res) => res.json())
      .then((body: { status: string }) =>
        setResult({ state: 'ok', status: body.status }),
      )
      .catch((err: unknown) =>
        setResult({
          state: 'error',
          message: err instanceof Error ? err.message : String(err),
        }),
      );
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Backend health</Text>
      {result.state === 'loading' && <Text>…</Text>}
      {result.state === 'ok' && <Text style={styles.ok}>{result.status}</Text>}
      {result.state === 'error' && (
        <Text style={styles.error}>{result.message}</Text>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  ok: {
    fontSize: 24,
    color: '#0a0',
  },
  error: {
    fontSize: 14,
    color: '#a00',
    paddingHorizontal: 24,
    textAlign: 'center',
  },
});
