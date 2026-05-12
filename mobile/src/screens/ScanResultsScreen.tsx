import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useIsbnLookup } from '../scan/use-isbn-lookup';
import { type BookSearchResult } from '../search/use-book-search';
import { BookRow } from '../ui/BookRow';
import { useToast } from '../ui/toast';

export type ScanResultsScreenProps = {
  isbn: string;
  searchBooks: (query: string) => Promise<BookSearchResult[]>;
  onSelectResult: (result: BookSearchResult) => void;
  onScanAgain: () => void;
};

const NETWORK_MESSAGE = "Couldn't reach the server. Tap to retry.";
const SERVER_MESSAGE = 'Something went wrong. Tap to retry.';
const EMPTY_MESSAGE = 'No book found for this barcode.';

export function ScanResultsScreen({
  isbn,
  searchBooks,
  onSelectResult,
  onScanAgain,
}: ScanResultsScreenProps) {
  const toast = useToast();
  const { status, results, retry } = useIsbnLookup({ isbn, searchBooks });

  const toastRef = useRef(toast);
  toastRef.current = toast;
  const retryRef = useRef(retry);
  retryRef.current = retry;

  useEffect(() => {
    if (status === 'network-error') {
      toastRef.current.show({
        message: NETWORK_MESSAGE,
        variant: 'error',
        onRetry: () => retryRef.current(),
      });
    } else if (status === 'server-error') {
      toastRef.current.show({
        message: SERVER_MESSAGE,
        variant: 'error',
        onRetry: () => retryRef.current(),
      });
    } else {
      toastRef.current.dismiss();
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (status === 'ready' && results.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{EMPTY_MESSAGE}</Text>
        <Pressable style={styles.button} onPress={onScanAgain}>
          <Text style={styles.buttonLabel}>Scan again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={results}
        keyExtractor={(item) => item.google_books_id}
        renderItem={({ item }) => (
          <BookRow
            coverUrl={item.cover_url}
            title={item.title}
            author={item.author}
            onPress={() => onSelectResult(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  emptyText: { color: '#555', textAlign: 'center', fontSize: 16 },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1a73e8',
  },
  buttonLabel: { color: 'white', fontSize: 16, fontWeight: '600' },
});
