import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { catalogApi } from '@/api/catalog';
import type { ReadingStatus } from '@/types';

const STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: 'Want to Read',
  currently_reading: 'Currently Reading',
  read: 'Read',
};

export default function ManualAddScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publishedDate, setPublishedDate] = useState('');
  const [status, setStatus] = useState<ReadingStatus>('want_to_read');
  const [error, setError] = useState<string | null>(null);

  const { mutate: addBook, isPending } = useMutation({
    mutationFn: () => catalogApi.addBook({
      status,
      title,
      authors: authors ? authors.split(',').map((a) => a.trim()) : undefined,
      isbn: isbn || undefined,
      publisher: publisher || undefined,
      publishedDate: publishedDate || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      navigation.goBack();
    },
    onError: () => setError('Failed to add book. Please try again.'),
  });

  const handleAdd = () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    setError(null);
    addBook();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Book title" />

      <Text style={styles.label}>Author(s)</Text>
      <TextInput style={styles.input} value={authors} onChangeText={setAuthors} placeholder="Author name (comma-separated)" />

      <Text style={styles.label}>ISBN</Text>
      <TextInput style={styles.input} value={isbn} onChangeText={setIsbn} placeholder="9780000000000" keyboardType="numeric" />

      <Text style={styles.label}>Publisher</Text>
      <TextInput style={styles.input} value={publisher} onChangeText={setPublisher} placeholder="Publisher name" />

      <Text style={styles.label}>Published Year</Text>
      <TextInput style={styles.input} value={publishedDate} onChangeText={setPublishedDate} placeholder="1965" keyboardType="numeric" />

      <Text style={styles.label}>Status</Text>
      <View style={styles.statusRow}>
        {(['want_to_read', 'currently_reading', 'read'] as ReadingStatus[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.statusChip, status === s && styles.statusChipActive]}
            onPress={() => setStatus(s)}
          >
            <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{STATUS_LABELS[s]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleAdd} disabled={isPending}>
        {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Add to Library</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 14 },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6' },
  statusChipActive: { backgroundColor: '#6c63ff' },
  chipText: { fontSize: 12, color: '#666' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  error: { color: '#ef4444', marginTop: 12, fontSize: 13 },
  button: { backgroundColor: '#6c63ff', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
