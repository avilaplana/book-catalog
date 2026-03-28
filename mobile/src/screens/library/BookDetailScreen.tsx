import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { LibraryStackProps } from '@/navigation/types';
import StarRating from '@/components/StarRating';
import { catalogApi } from '@/api/catalog';
import type { ReadingStatus, UpdateBookPayload } from '@/types';

const STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: 'Want to Read',
  currently_reading: 'Currently Reading',
  read: 'Read',
};

const STATUS_OPTIONS: ReadingStatus[] = ['want_to_read', 'currently_reading', 'read'];

export default function BookDetailScreen({ route }: LibraryStackProps<'BookDetail'>) {
  const { userBookId } = route.params;
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);

  const { data: book, isLoading } = useQuery({
    queryKey: ['catalog', 'book', userBookId],
    queryFn: () => catalogApi.getBook(userBookId),
  });

  useEffect(() => {
    if (book && !editingNotes) setNotes(book.notes ?? '');
  }, [book?.notes]);

  const { mutate: updateBook, isPending } = useMutation({
    mutationFn: (payload: UpdateBookPayload) => catalogApi.updateBook(userBookId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });

  if (isLoading || !book) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {book.coverUrl ? (
          <Image source={{ uri: book.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.placeholder]}>
            <Text style={styles.placeholderText}>📚</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.authors?.[0] ?? 'Unknown'}</Text>
          {book.publisher && <Text style={styles.meta}>{book.publisher}</Text>}
          {book.publishedDate && <Text style={styles.meta}>{book.publishedDate}</Text>}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Status</Text>
        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusBtn, book.status === s && styles.statusBtnActive]}
              onPress={() => updateBook({ status: s })}
              disabled={isPending}
            >
              <Text style={[styles.statusBtnText, book.status === s && styles.statusBtnTextActive]}>
                {STATUS_LABELS[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Rating</Text>
        <StarRating value={book.rating} onChange={(rating) => updateBook({ rating })} />
      </View>

      {book.shelves.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Shelves</Text>
          <View style={styles.shelvesRow}>
            {book.shelves.map((shelf) => (
              <View key={shelf.id} style={styles.shelfChip}>
                <Text style={styles.shelfChipText}>{shelf.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notes</Text>
        {editingNotes ? (
          <View>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Add your notes..."
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => { updateBook({ notes }); setEditingNotes(false); }}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditingNotes(true)}>
            <Text style={notes ? styles.notesText : styles.notesPlaceholder}>
              {notes || 'Tap to add notes...'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', padding: 16, gap: 16 },
  cover: { width: 100, height: 140, borderRadius: 8, backgroundColor: '#e5e7eb' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 32 },
  info: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  author: { fontSize: 14, color: '#444', marginBottom: 4 },
  meta: { fontSize: 12, color: '#888' },
  section: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db' },
  statusBtnActive: { backgroundColor: '#6c63ff', borderColor: '#6c63ff' },
  statusBtnText: { fontSize: 12, color: '#444' },
  statusBtnTextActive: { color: '#fff', fontWeight: '600' },
  shelvesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  shelfChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f3f4f6' },
  shelfChipText: { fontSize: 12, color: '#444' },
  notesInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, minHeight: 80, fontSize: 14 },
  saveBtn: { marginTop: 8, backgroundColor: '#6c63ff', padding: 10, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  notesText: { fontSize: 14, color: '#333', lineHeight: 20 },
  notesPlaceholder: { fontSize: 14, color: '#aaa', fontStyle: 'italic' },
});
