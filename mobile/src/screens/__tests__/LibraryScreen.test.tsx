import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { LibraryScreen } from '../LibraryScreen';
import { AuthExpired, NetworkError } from '../../api/client';
import { ToastProvider } from '../../ui/toast';

function renderLibrary(opts: {
  loadBooks: () => Promise<unknown[]>;
  onFindBook?: () => void;
}) {
  return render(
    <ToastProvider>
      <LibraryScreen
        loadBooks={opts.loadBooks}
        onFindBook={opts.onFindBook ?? jest.fn()}
      />
    </ToastProvider>,
  );
}

describe('LibraryScreen', () => {
  test('calls loadBooks on mount', () => {
    const loadBooks = jest.fn().mockResolvedValue([]);
    renderLibrary({ loadBooks });
    expect(loadBooks).toHaveBeenCalledTimes(1);
  });

  test('empty response renders the empty state with Find a book button', async () => {
    renderLibrary({ loadBooks: jest.fn().mockResolvedValue([]) });

    await waitFor(() =>
      expect(screen.getByText('Your library is empty')).toBeTruthy(),
    );
    expect(screen.getByText('Find a book')).toBeTruthy();
  });

  test('Find a book button invokes onFindBook', async () => {
    const onFindBook = jest.fn();
    renderLibrary({
      loadBooks: jest.fn().mockResolvedValue([]),
      onFindBook,
    });
    await waitFor(() => screen.getByText('Find a book'));

    fireEvent.press(screen.getByText('Find a book'));

    expect(onFindBook).toHaveBeenCalledTimes(1);
  });

  test('NetworkError surfaces a toast with Retry that re-fetches', async () => {
    const loadBooks = jest
      .fn()
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValueOnce([]);
    renderLibrary({ loadBooks });

    await waitFor(() => expect(screen.getByText('Retry')).toBeTruthy());

    fireEvent.press(screen.getByText('Retry'));

    await waitFor(() =>
      expect(screen.getByText('Your library is empty')).toBeTruthy(),
    );
    expect(loadBooks).toHaveBeenCalledTimes(2);
  });

  test('AuthExpired does not surface any toast (navigator handles it)', async () => {
    const loadBooks = jest.fn().mockRejectedValue(new AuthExpired());
    renderLibrary({ loadBooks });

    await waitFor(() => expect(loadBooks).toHaveBeenCalled());

    expect(screen.queryByText('Retry')).toBeNull();
    expect(screen.queryByText(/couldn't|error|expired/i)).toBeNull();
  });
});
