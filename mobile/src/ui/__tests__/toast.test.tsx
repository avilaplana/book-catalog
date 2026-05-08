import { Pressable, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ToastProvider, useToast, type ToastOptions } from '../toast';

function Trigger({ opts }: { opts: ToastOptions }) {
  const toast = useToast();
  return (
    <Pressable testID="trigger" onPress={() => toast.show(opts)}>
      <Text>fire</Text>
    </Pressable>
  );
}

describe('Toast', () => {
  test('renders toast message after show()', () => {
    render(
      <ToastProvider>
        <Trigger opts={{ message: 'Saved', variant: 'success' }} />
      </ToastProvider>,
    );

    fireEvent.press(screen.getByTestId('trigger'));

    expect(screen.getByText('Saved')).toBeTruthy();
  });

  test('error toast with onRetry shows Retry; tapping fires callback and dismisses', () => {
    const onRetry = jest.fn();
    render(
      <ToastProvider>
        <Trigger
          opts={{ message: 'Network down', variant: 'error', onRetry }}
        />
      </ToastProvider>,
    );
    fireEvent.press(screen.getByTestId('trigger'));

    fireEvent.press(screen.getByText('Retry'));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Network down')).toBeNull();
  });

  test('toast without onRetry auto-dismisses after 3s', () => {
    jest.useFakeTimers();
    try {
      render(
        <ToastProvider>
          <Trigger opts={{ message: 'Saved', variant: 'success' }} />
        </ToastProvider>,
      );
      fireEvent.press(screen.getByTestId('trigger'));
      expect(screen.getByText('Saved')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.queryByText('Saved')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  test('error toast with onRetry does NOT auto-dismiss', () => {
    jest.useFakeTimers();
    try {
      render(
        <ToastProvider>
          <Trigger
            opts={{
              message: 'Network down',
              variant: 'error',
              onRetry: jest.fn(),
            }}
          />
        </ToastProvider>,
      );
      fireEvent.press(screen.getByTestId('trigger'));

      act(() => {
        jest.advanceTimersByTime(10_000);
      });

      expect(screen.getByText('Network down')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  test('useToast outside provider throws', () => {
    function Bad() {
      useToast();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(/ToastProvider/);
  });
});
