import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { LoginScreen, type LoginOutcome } from '../LoginScreen';
import { ToastProvider } from '../../ui/toast';

function renderLogin(signIn: () => Promise<LoginOutcome>) {
  return render(
    <ToastProvider>
      <LoginScreen signIn={signIn} />
    </ToastProvider>,
  );
}

describe('LoginScreen', () => {
  test('renders Continue with Google button', () => {
    renderLogin(jest.fn().mockResolvedValue({ status: 'ok' }));

    expect(screen.getByText('Continue with Google')).toBeTruthy();
  });

  test('pressing button invokes signIn', () => {
    const signIn = jest.fn().mockResolvedValue({ status: 'ok' });
    renderLogin(signIn);

    fireEvent.press(screen.getByText('Continue with Google'));

    expect(signIn).toHaveBeenCalledTimes(1);
  });

  test('shows in-progress label while signIn is pending', async () => {
    let resolve!: (v: LoginOutcome) => void;
    const signIn = jest.fn(
      () => new Promise<LoginOutcome>((r) => (resolve = r)),
    );
    renderLogin(signIn);

    fireEvent.press(screen.getByText('Continue with Google'));

    expect(screen.getByText('Signing in…')).toBeTruthy();

    resolve({ status: 'ok' });
    await waitFor(() =>
      expect(screen.getByText('Continue with Google')).toBeTruthy(),
    );
  });

  test('error outcome shows the error message in a toast', async () => {
    const signIn = jest
      .fn()
      .mockResolvedValue({ status: 'error', message: 'Google said no' });
    renderLogin(signIn);

    fireEvent.press(screen.getByText('Continue with Google'));

    await waitFor(() =>
      expect(screen.getByText('Google said no')).toBeTruthy(),
    );
  });

  test('cancelled outcome shows no toast', async () => {
    const signIn = jest.fn().mockResolvedValue({ status: 'cancelled' });
    renderLogin(signIn);

    fireEvent.press(screen.getByText('Continue with Google'));
    await waitFor(() => expect(signIn).toHaveBeenCalled());

    expect(screen.queryByText(/cancel/i)).toBeNull();
  });

  test('button is disabled while signIn is in-flight', async () => {
    let resolve!: (v: LoginOutcome) => void;
    const signIn = jest.fn(
      () => new Promise<LoginOutcome>((r) => (resolve = r)),
    );
    renderLogin(signIn);

    const button = screen.getByText('Continue with Google');
    fireEvent.press(button);
    fireEvent.press(screen.getByText('Signing in…'));

    expect(signIn).toHaveBeenCalledTimes(1);

    resolve({ status: 'ok' });
    await waitFor(() =>
      expect(screen.getByText('Continue with Google')).toBeTruthy(),
    );
  });
});
