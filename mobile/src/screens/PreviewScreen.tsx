import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AuthExpired, Conflict } from '../api/client';
import { type BookSearchResult } from '../search/use-book-search';
import { BookDetails } from '../ui/BookDetails';
import { useToast } from '../ui/toast';

export type PreviewScreenProps = {
  result: BookSearchResult;
  addBook: () => Promise<void>;
  onAdded: () => void;
};

export function PreviewScreen({ result, addBook, onAdded }: PreviewScreenProps) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);

  const handleAdd = useCallback(async () => {
    setAdding(true);
    try {
      await addBook();
      toast.show({ message: 'Added to your library.', variant: 'success' });
      onAdded();
    } catch (e) {
      if (e instanceof AuthExpired) return;
      if (e instanceof Conflict) {
        toast.show({ message: 'Already in your library.', variant: 'error' });
        return;
      }
      toast.show({
        message: "Couldn't reach the server. Tap to retry.",
        variant: 'error',
        onRetry: () => {
          void handleAdd();
        },
      });
    } finally {
      setAdding(false);
    }
  }, [addBook, onAdded, toast]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BookDetails
        coverUrl={result.cover_url}
        title={result.title}
        subtitle={result.subtitle}
        author={result.author}
        publisher={result.publisher}
        publishedDate={result.published_date}
        pageCount={result.page_count}
        categories={result.categories}
        language={result.language}
        isbn13={result.isbn_13}
      />
      <Pressable
        style={[styles.addButton, adding && styles.addButtonDisabled]}
        disabled={adding}
        onPress={() => {
          void handleAdd();
        }}
      >
        {adding ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.addLabel}>Add to library</Text>
        )}
      </Pressable>
      {result.description ? (
        <Text style={styles.description}>{result.description}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center', gap: 16 },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1a73e8',
    minWidth: 180,
    alignItems: 'center',
  },
  addButtonDisabled: { opacity: 0.6 },
  addLabel: { color: 'white', fontSize: 16, fontWeight: '600' },
  description: { color: '#333', lineHeight: 22, alignSelf: 'stretch' },
});
