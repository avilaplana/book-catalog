import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthExpired } from '../api/client';
import { useToast } from '../ui/toast';

export type LibraryScreenProps = {
  loadBooks: () => Promise<unknown[]>;
  onFindBook: () => void;
};

export function LibraryScreen({ loadBooks, onFindBook }: LibraryScreenProps) {
  const toast = useToast();
  const [books, setBooks] = useState<unknown[] | null>(null);

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

  useEffect(() => {
    void fetchBooks();
  }, [fetchBooks]);

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
    <View style={styles.center}>
      <Text>{books.length} book(s) in your library</Text>
    </View>
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
});
