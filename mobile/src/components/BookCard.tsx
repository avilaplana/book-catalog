import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import type { UserBook } from '@/types';

interface Props {
  book: UserBook;
  onPress: () => void;
}

export default function BookCard({ book, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {book.coverUrl ? (
        <Image source={{ uri: book.coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.placeholder]}>
          <Text style={styles.placeholderText}>📚</Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
      <Text style={styles.author} numberOfLines={1}>
        {book.authors?.[0] ?? 'Unknown'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { width: 100, margin: 8 },
  cover: { width: 100, height: 140, borderRadius: 4, backgroundColor: '#e5e7eb' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 32 },
  title: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  author: { fontSize: 11, color: '#666', marginTop: 2 },
});
