export type ReadingStatus = 'want_to_read' | 'currently_reading' | 'read';

export interface ShelfSummary {
  id: string;
  name: string;
}

export interface UserBook {
  id: string;
  bookId: string;
  googleBooksId: string | null;
  isbn: string | null;
  title: string;
  authors: string[] | null;
  coverUrl: string | null;
  publisher: string | null;
  publishedDate: string | null;
  status: ReadingStatus;
  rating: number | null;
  notes: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  shelves: ShelfSummary[];
}

export interface Shelf {
  id: string;
  name: string;
  bookCount: number;
  createdAt: string;
}

export interface BookSearchResult {
  googleBooksId: string;
  isbn: string | null;
  title: string;
  authors: string[] | null;
  description: string | null;
  coverUrl: string | null;
  pageCount: number | null;
  publishedDate: string | null;
  publisher: string | null;
}

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  totalBooks: number;
  statusCounts: {
    wantToRead: number;
    currentlyReading: number;
    read: number;
  };
  shelfCount: number;
}

export interface AddBookPayload {
  googleBooksId?: string;
  status: ReadingStatus;
  title?: string;
  authors?: string[];
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  coverUrl?: string;
}

export interface UpdateBookPayload {
  status?: ReadingStatus;
  rating?: number;
  notes?: string;
  startedAt?: string;
  finishedAt?: string;
}
