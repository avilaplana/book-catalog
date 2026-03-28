import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ReadingStatus } from '@/types';

const TABS: { label: string; value: ReadingStatus }[] = [
  { label: 'Want to Read', value: 'want_to_read' },
  { label: 'Reading', value: 'currently_reading' },
  { label: 'Read', value: 'read' },
];

interface Props {
  selected: ReadingStatus;
  onSelect: (status: ReadingStatus) => void;
}

export default function StatusTabs({ selected, onSelect }: Props) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.value}
          style={[styles.tab, selected === tab.value && styles.active]}
          onPress={() => onSelect(tab.value)}
        >
          <Text style={[styles.label, selected === tab.value && styles.activeLabel]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6' },
  active: { backgroundColor: '#6c63ff' },
  label: { fontSize: 12, color: '#666' },
  activeLabel: { color: '#fff', fontWeight: '600' },
});
