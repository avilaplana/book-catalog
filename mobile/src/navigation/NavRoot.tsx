import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  NavigationContainer,
  type NavigationContainerRefWithCurrent,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { TokenPair } from '../api/client';
import type { AuthSession } from '../auth/session';
import { useAuthSessionStatus } from '../auth/use-auth-session';
import type { BookSearchResult } from '../search/use-book-search';
import { LibraryScreen } from '../screens/LibraryScreen';
import { LoginScreen, type LoginOutcome } from '../screens/LoginScreen';
import { PreviewScreen } from '../screens/PreviewScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { ToastProvider } from '../ui/toast';

export type NavRootDeps = {
  session: AuthSession;
  signIn: () => Promise<LoginOutcome>;
  loadBooks: () => Promise<unknown[]>;
  searchBooks: (query: string) => Promise<BookSearchResult[]>;
  exchangeRefresh: (refreshToken: string) => Promise<TokenPair | null>;
};

export type StackParamList = {
  Login: undefined;
  Library: undefined;
  Search: undefined;
  Preview: { result: BookSearchResult };
};

const Stack = createNativeStackNavigator<StackParamList>();

export type NavRootProps = {
  deps: NavRootDeps;
  navigationRef?: NavigationContainerRefWithCurrent<StackParamList>;
};

export function NavRoot({ deps, navigationRef }: NavRootProps) {
  const status = useAuthSessionStatus(deps.session);
  const [coldStartDone, setColdStartDone] = useState(false);
  const depsRef = useRef(deps);
  depsRef.current = deps;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const d = depsRef.current;
      await d.session.loadFromStorage();
      const refresh = d.session.getRefreshToken();
      if (refresh) {
        const pair = await d.exchangeRefresh(refresh);
        if (cancelled) return;
        if (pair) {
          await d.session.setTokens(pair);
        } else {
          await d.session.clear();
        }
      }
      if (!cancelled) setColdStartDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!coldStartDone || status === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ToastProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator>
          {status === 'authenticated' ? (
            <>
              <Stack.Screen name="Library" options={{ title: 'Library' }}>
                {({ navigation }) => (
                  <LibraryScreen
                    loadBooks={deps.loadBooks}
                    onFindBook={() => navigation.navigate('Search')}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Search" options={{ title: 'Search' }}>
                {({ navigation }) => (
                  <SearchScreen
                    searchBooks={deps.searchBooks}
                    onSelectResult={(result) =>
                      navigation.navigate('Preview', { result })
                    }
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Preview" options={{ title: 'Preview' }}>
                {({ route }) => <PreviewScreen result={route.params.result} />}
              </Stack.Screen>
            </>
          ) : (
            <Stack.Screen
              name="Login"
              options={{ headerShown: false }}
            >
              {() => <LoginScreen signIn={deps.signIn} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
