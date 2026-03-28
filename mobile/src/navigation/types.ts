import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { BookSearchResult } from '@/types';

export type RootStackParamList = {
  Login: undefined;
  Tabs: undefined;
};

export type TabParamList = {
  Library: undefined;
  Discover: undefined;
  Add: undefined;
  Profile: undefined;
};

export type LibraryStackParamList = {
  LibraryHome: undefined;
  BookDetail: { userBookId: string };
};

export type DiscoverStackParamList = {
  DiscoverHome: undefined;
  BookPreview: { book: BookSearchResult };
  ManualAdd: undefined;
};

export type RootStackProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
export type TabProps<T extends keyof TabParamList> = BottomTabScreenProps<TabParamList, T>;
export type LibraryStackProps<T extends keyof LibraryStackParamList> = NativeStackScreenProps<LibraryStackParamList, T>;
export type DiscoverStackProps<T extends keyof DiscoverStackParamList> = NativeStackScreenProps<DiscoverStackParamList, T>;
