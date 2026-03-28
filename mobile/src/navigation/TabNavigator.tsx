import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TabParamList, LibraryStackParamList, DiscoverStackParamList } from './types';
import LibraryScreen from '@/screens/library/LibraryScreen';
import BookDetailScreen from '@/screens/library/BookDetailScreen';
import DiscoverScreen from '@/screens/discover/DiscoverScreen';
import BookPreviewScreen from '@/screens/discover/BookPreviewScreen';
import ManualAddScreen from '@/screens/add/ManualAddScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();

function LibraryNavigator() {
  return (
    <LibraryStack.Navigator>
      <LibraryStack.Screen name="LibraryHome" component={LibraryScreen} options={{ title: 'My Library' }} />
      <LibraryStack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: 'Book Detail' }} />
    </LibraryStack.Navigator>
  );
}

function DiscoverNavigator() {
  return (
    <DiscoverStack.Navigator>
      <DiscoverStack.Screen name="DiscoverHome" component={DiscoverScreen} options={{ title: 'Discover' }} />
      <DiscoverStack.Screen name="BookPreview" component={BookPreviewScreen} options={{ title: 'Add Book' }} />
      <DiscoverStack.Screen name="ManualAdd" component={ManualAddScreen} options={{ title: 'Add Manually' }} />
    </DiscoverStack.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Library" component={LibraryNavigator} />
      <Tab.Screen name="Discover" component={DiscoverNavigator} />
      <Tab.Screen name="Add" component={ManualAddScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
