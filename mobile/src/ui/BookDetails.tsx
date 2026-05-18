import { Image, StyleSheet, Text, View } from 'react-native';

export type BookDetailsProps = {
  coverUrl?: string | null;
  title: string;
  subtitle?: string | null;
  author?: string | null;
  publisher?: string | null;
  publishedDate?: string | null;
  pageCount?: number | null;
  categories?: string | null;
  language?: string | null;
  isbn13?: string | null;
};

export function BookDetails({
  coverUrl,
  title,
  subtitle,
  author,
  publisher,
  publishedDate,
  pageCount,
  categories,
  language,
  isbn13,
}: BookDetailsProps) {
  const metadataParts = [
    publisher,
    publishedDate,
    pageCount != null ? `${pageCount} pages` : null,
    language,
  ].filter((part): part is string => !!part);
  const metadataLine = metadataParts.length > 0 ? metadataParts.join(' · ') : null;

  return (
    <View style={styles.container}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]} />
      )}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {author ? <Text style={styles.author}>{author}</Text> : null}
      {metadataLine ? (
        <Text style={styles.metadata}>{metadataLine}</Text>
      ) : null}
      {categories ? (
        <Text style={styles.categories}>{categories}</Text>
      ) : null}
      {isbn13 ? <Text style={styles.isbn}>{`ISBN: ${isbn13}`}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  cover: { width: 144, height: 216, borderRadius: 8, backgroundColor: '#eee' },
  coverPlaceholder: { backgroundColor: '#ddd' },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: 16, fontWeight: '400', color: '#555', textAlign: 'center' },
  author: { color: '#555', fontSize: 16 },
  metadata: { color: '#777', fontSize: 13 },
  categories: { color: '#777', fontSize: 13 },
  isbn: { color: '#777', fontSize: 13 },
});
