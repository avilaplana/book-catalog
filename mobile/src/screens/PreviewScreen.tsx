import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type BookSearchResult } from '../search/use-book-search';

export type PreviewScreenProps = {
  result: BookSearchResult;
};

export function PreviewScreen({ result }: PreviewScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {result.cover_url ? (
        <Image source={{ uri: result.cover_url }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]} />
      )}
      <Text style={styles.title}>{result.title}</Text>
      {result.author && <Text style={styles.author}>{result.author}</Text>}
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
  description: { color: '#333', lineHeight: 22, alignSelf: 'stretch' },
});
