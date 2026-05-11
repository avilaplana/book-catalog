import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { AuthExpired } from '../api/client';
import { useToast } from '../ui/toast';

export type LibraryBook = {
  google_books_id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  added_at: string;
};

export type LibraryScreenProps = {
  loadBooks: () => Promise<LibraryBook[]>;
  onFindBook: () => void;
};

export function LibraryScreen({ loadBooks, onFindBook }: LibraryScreenProps) {
  const toast = useToast();
  const navigation = useNavigation();
  const [books, setBooks] = useState<LibraryBook[] | null>(null);

  const onFindBookRef = useRef(onFindBook);
  onFindBookRef.current = onFindBook;

  const fetchBooks = useCallback(async () => {
    try {
      const result = await loadBooks();
      setBooks(result);
    } catch (e) {
      if (e instanceof AuthExpired) return;
      toast.show({
        message: "Couldn't load your library",
        variant: 'error',
        onRetry: () => {
          void fetchBooks();
        },
      });
    }
  }, [loadBooks, toast]);

  useFocusEffect(
    useCallback(() => {
      void fetchBooks();
    }, [fetchBooks]),
  );

  const hasBooks = books !== null && books.length > 0;
  useLayoutEffect(() => {
    const options: Partial<NativeStackNavigationOptions> = {
      headerRight: hasBooks
        ? () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a book"
              hitSlop={12}
              onPress={() => onFindBookRef.current()}
            >
              <Text style={styles.headerAdd}>＋</Text>
            </Pressable>
          )
        : undefined,
    };
    navigation.setOptions(options);
  }, [navigation, hasBooks]);

  if (books === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (books.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Your library is empty</Text>
        <Pressable style={styles.button} onPress={onFindBook}>
          <Text style={styles.buttonLabel}>Find a book</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={books}
      keyExtractor={(book) => book.google_books_id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.row}>
          {item.cover_url ? (
            <Image source={{ uri: item.cover_url }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]} />
          )}
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            {item.author ? (
              <Text style={styles.rowAuthor}>{item.author}</Text>
            ) : null}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1a73e8',
  },
  buttonLabel: { color: 'white', fontSize: 16, fontWeight: '600' },
  headerAdd: { fontSize: 24, fontWeight: '600', color: '#1a73e8' },
  list: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  cover: { width: 48, height: 72, borderRadius: 4, backgroundColor: '#eee' },
  coverPlaceholder: { backgroundColor: '#ddd' },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowAuthor: { color: '#555' },
});
