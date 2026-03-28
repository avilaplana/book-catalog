import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import BookCard from './BookCard';
import type { UserBook } from '@/types';

interface Props {
  books: UserBook[];
  onPressBook: (book: UserBook) => void;
}

export default function BookGrid({ books, onPressBook }: Props) {
  return (
    <FlatList
      data={books}
      keyExtractor={(item) => item.id}
      numColumns={3}
      renderItem={({ item }) => <BookCard book={item} onPress={() => onPressBook(item)} />}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 8 },
});
