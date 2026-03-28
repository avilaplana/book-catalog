import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import StatusTabs from '@/components/StatusTabs';
import BookGrid from '@/components/BookGrid';
import { catalogApi } from '@/api/catalog';
import type { ReadingStatus, UserBook } from '@/types';
import type { LibraryStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<LibraryStackParamList, 'LibraryHome'>;

export default function LibraryScreen() {
  const [status, setStatus] = useState<ReadingStatus>('currently_reading');
  const navigation = useNavigation<Nav>();

  const { data: books = [], isLoading } = useQuery({
    queryKey: ['catalog', 'books', status],
    queryFn: () => catalogApi.listBooks({ status }),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator testID="loading-indicator" size="large" color="#6c63ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusTabs selected={status} onSelect={setStatus} />
      <BookGrid books={books} onPressBook={(book: UserBook) => navigation.navigate('BookDetail', { userBookId: book.id })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
