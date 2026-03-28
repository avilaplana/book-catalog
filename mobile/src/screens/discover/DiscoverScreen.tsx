import React, { useState, useCallback } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ISBNScanner from '@/components/ISBNScanner';
import { booksApi } from '@/api/books';
import type { BookSearchResult } from '@/types';
import type { DiscoverStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'DiscoverHome'>;

export default function DiscoverScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isbnError, setIsbnError] = useState<string | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    setIsbnError(null);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await booksApi.search(q);
      setResults(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleScanResult = useCallback(async (isbn: string) => {
    setScanning(false);
    setLoading(true);
    setIsbnError(null);
    try {
      const book = await booksApi.lookupIsbn(isbn);
      if (book) {
        navigation.navigate('BookPreview', { book });
      } else {
        setIsbnError('Book not found by ISBN — search by title/author');
      }
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  if (scanning) {
    return <ISBNScanner onScanned={handleScanResult} onClose={() => setScanning(false)} />;
  }

  return (
    <View style={styles.container} testID="discover-screen" {...({ onScanResult: handleScanResult } as any)}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search title or author..."
          value={query}
          onChangeText={handleSearch}
        />
        <TouchableOpacity style={styles.scanButton} onPress={() => setScanning(true)}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>
      {isbnError && <Text style={styles.error}>{isbnError}</Text>}
      {loading && <ActivityIndicator style={{ marginTop: 24 }} color="#6c63ff" />}
      <FlatList
        data={results}
        keyExtractor={(item) => item.googleBooksId}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.result} onPress={() => navigation.navigate('BookPreview', { book: item })}>
            <Text style={styles.resultTitle}>{item.title}</Text>
            <Text style={styles.resultAuthor}>{item.authors?.[0] ?? 'Unknown'}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchRow: { flexDirection: 'row', padding: 16, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, height: 44 },
  scanButton: { width: 44, height: 44, backgroundColor: '#f3f4f6', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  scanButtonText: { fontSize: 20 },
  error: { color: '#f59e0b', paddingHorizontal: 16, marginBottom: 8, fontSize: 13 },
  result: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  resultTitle: { fontSize: 15, fontWeight: '600' },
  resultAuthor: { fontSize: 13, color: '#666', marginTop: 2 },
});
