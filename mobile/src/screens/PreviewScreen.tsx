import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AuthExpired, Conflict } from '../api/client';
import { type BookSearchResult } from '../search/use-book-search';
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
      {result.cover_url ? (
        <Image source={{ uri: result.cover_url }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]} />
      )}
      <Text style={styles.title}>{result.title}</Text>
      {result.author && <Text style={styles.author}>{result.author}</Text>}
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
      {result.description && (
        <Text style={styles.description}>{result.description}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center', gap: 16 },
  cover: {
    width: 144,
    height: 216,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  coverPlaceholder: { backgroundColor: '#ddd' },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center' },
  author: { color: '#555', fontSize: 16 },
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
