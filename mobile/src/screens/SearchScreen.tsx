import { useEffect, useRef } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useBookSearch,
  type BookSearchResult,
} from '../search/use-book-search';
import { useToast } from '../ui/toast';

export type SearchScreenProps = {
  searchBooks: (query: string) => Promise<BookSearchResult[]>;
  onSelectResult: (result: BookSearchResult) => void;
};

const NETWORK_MESSAGE = "Couldn't reach the server. Tap to retry.";
const SERVER_MESSAGE = 'Something went wrong. Tap to retry.';

export function SearchScreen({ searchBooks, onSelectResult }: SearchScreenProps) {
  const toast = useToast();
  const { query, setQuery, results, status, retry } = useBookSearch({
    searchBooks,
  });

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
    } else if (status === 'loading' || status === 'ready') {
      toastRef.current.dismiss();
    }
  }, [status]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search by title or author"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {status === 'ready' && results.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No books found. Try a different title or author.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.google_books_id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => onSelectResult(item)}
            >
              {item.cover_url ? (
                <Image source={{ uri: item.cover_url }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]} />
              )}
              <View style={styles.rowText}>
                <Text style={styles.title}>{item.title}</Text>
                {item.author && <Text style={styles.author}>{item.author}</Text>}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    gap: 12,
  },
  cover: { width: 48, height: 72, borderRadius: 4, backgroundColor: '#eee' },
  coverPlaceholder: { backgroundColor: '#ddd' },
  rowText: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  author: { color: '#555', marginTop: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#555', textAlign: 'center', paddingHorizontal: 24 },
});
