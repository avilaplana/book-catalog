import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { profileApi } from '@/api/profile';

export default function ProfileScreen() {
  const { signOut } = useAuthStore();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.getProfile,
  });

  if (isLoading || !profile) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#6c63ff" /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{profile.displayName}</Text>
      <Text style={styles.email}>{profile.email}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.totalBooks}</Text>
          <Text style={styles.statLabel}>Books</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.statusCounts.read}</Text>
          <Text style={styles.statLabel}>Read</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.statusCounts.currentlyReading}</Text>
          <Text style={styles.statLabel}>Reading</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.shelfCount}</Text>
          <Text style={styles.statLabel}>Shelves</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  email: { fontSize: 14, color: '#666', marginBottom: 32 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#f8f9fa', borderRadius: 12, padding: 20, marginBottom: 32 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#6c63ff' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  signOutButton: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 14, alignItems: 'center' },
  signOutText: { fontSize: 16, color: '#ef4444' },
});
