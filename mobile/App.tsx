import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from '@/navigation/RootNavigator';
import { setAuthFailureCallback } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 5 } },
});

export default function App() {
  useEffect(() => {
    setAuthFailureCallback(() => {
      useAuthStore.setState({ token: null, isAuthenticated: false });
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
}
