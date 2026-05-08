import { StyleSheet, Text, View } from 'react-native';

export function SearchScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Search</Text>
      <Text style={styles.body}>Coming in slice 1.2.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: '600' },
  body: { color: '#555' },
});
