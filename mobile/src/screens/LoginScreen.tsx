import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useToast } from '../ui/toast';

export type LoginOutcome =
  | { status: 'ok' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export type LoginScreenProps = {
  signIn: () => Promise<LoginOutcome>;
};

export function LoginScreen({ signIn }: LoginScreenProps) {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function onPress() {
    if (pending) return;
    setPending(true);
    try {
      const result = await signIn();
      if (result.status === 'error') {
        toast.show({ message: result.message, variant: 'error' });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Colophon</Text>
      <Pressable
        style={[styles.button, pending && styles.buttonDisabled]}
        onPress={onPress}
        disabled={pending}
      >
        <Text style={styles.buttonLabel}>
          {pending ? 'Signing in…' : 'Continue with Google'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 32,
  },
  title: { fontSize: 28, fontWeight: '600' },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1a73e8',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonLabel: { color: 'white', fontSize: 16, fontWeight: '600' },
});
