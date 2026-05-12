import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export type BookRowProps = {
  coverUrl?: string | null;
  title: string;
  author?: string | null;
  onPress?: () => void;
};

export function BookRow({ coverUrl, title, author, onPress }: BookRowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]} />
      )}
      <View style={styles.rowText}>
        <Text style={styles.title}>{title}</Text>
        {author && <Text style={styles.author}>{author}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});
