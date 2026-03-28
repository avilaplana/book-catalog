import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DiscoverStackProps } from '@/navigation/types';
import { catalogApi } from '@/api/catalog';
import type { ReadingStatus } from '@/types';

const STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: 'Want to Read',
  currently_reading: 'Currently Reading',
  read: 'Read',
};

export default function BookPreviewScreen({ route, navigation }: DiscoverStackProps<'BookPreview'>) {
  const { book } = route.params;
  const [selectedStatus, setSelectedStatus] = useState<ReadingStatus>('want_to_read');
  const queryClient = useQueryClient();

  const { mutate: addBook, isPending } = useMutation({
    mutationFn: () => catalogApi.addBook({ googleBooksId: book.googleBooksId, status: selectedStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      navigation.popToTop();
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {book.coverUrl ? (
          <Image source={{ uri: book.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={{ fontSize: 40 }}>📚</Text>
          </View>
        )}
        <View style={styles.meta}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.authors?.[0] ?? 'Unknown'}</Text>
          {book.publisher && <Text style={styles.detail}>{book.publisher}</Text>}
          {book.publishedDate && <Text style={styles.detail}>{book.publishedDate}</Text>}
        </View>
      </View>

      <Text style={styles.sectionLabel}>Add to catalog as</Text>
      <View style={styles.statusRow}>
        {(['want_to_read', 'currently_reading', 'read'] as ReadingStatus[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.statusChip, selectedStatus === s && styles.statusChipActive]}
            onPress={() => setSelectedStatus(s)}
          >
            <Text style={[styles.statusChipText, selectedStatus === s && styles.statusChipTextActive]}>
              {STATUS_LABELS[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => addBook()} disabled={isPending}>
        {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.addButtonText}>Add to My Library</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  cover: { width: 80, height: 112, borderRadius: 4 },
  coverPlaceholder: { backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  meta: { flex: 1 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  author: { fontSize: 14, color: '#444', marginBottom: 4 },
  detail: { fontSize: 12, color: '#888' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 8 },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 32 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6' },
  statusChipActive: { backgroundColor: '#6c63ff' },
  statusChipText: { fontSize: 12, color: '#666' },
  statusChipTextActive: { color: '#fff', fontWeight: '600' },
  addButton: { backgroundColor: '#6c63ff', padding: 16, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
