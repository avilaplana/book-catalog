import { ActivityIndicator, Linking } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ScannerScreen } from '../ScannerScreen';

const mockCamera: {
  onBarcodeScanned?: (event: { data: string }) => void;
  enableTorch?: boolean;
} = {};

jest.mock('expo-camera', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    __esModule: true,
    CameraView: (props: {
      onBarcodeScanned?: (event: { data: string }) => void;
      enableTorch?: boolean;
    }) => {
      mockCamera.onBarcodeScanned = props.onBarcodeScanned;
      mockCamera.enableTorch = props.enableTorch;
      return React.createElement(RN.View, { testID: 'camera-view' });
    },
    useCameraPermissions: jest.fn(),
  };
});

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    __esModule: true,
    useFocusEffect: (cb: () => void) => {
      React.useEffect(() => {
        cb();
      }, []);
    },
  };
});

const { useCameraPermissions } = require('expo-camera') as {
  useCameraPermissions: jest.Mock;
};

const VALID_ISBN = '9780261103573';

function setPermission(
  permission: { granted: boolean; canAskAgain: boolean } | null,
) {
  useCameraPermissions.mockReturnValue([permission, jest.fn()]);
}

describe('ScannerScreen', () => {
  beforeEach(() => {
    mockCamera.onBarcodeScanned = undefined;
    mockCamera.enableTorch = undefined;
    useCameraPermissions.mockReset();
  });

  test('shows a spinner while the permission is still resolving', () => {
    setPermission(null);
    render(<ScannerScreen onScanned={jest.fn()} />);

    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  test('when permission is denied, offers to open Settings', () => {
    setPermission({ granted: false, canAskAgain: false });
    const openSettings = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);
    render(<ScannerScreen onScanned={jest.fn()} />);

    expect(
      screen.getByText('Camera access is needed to scan barcodes.'),
    ).toBeTruthy();

    fireEvent.press(screen.getByText('Open Settings'));
    expect(openSettings).toHaveBeenCalled();
    openSettings.mockRestore();
  });

  test('when permission is granted, renders the camera', () => {
    setPermission({ granted: true, canAskAgain: true });
    render(<ScannerScreen onScanned={jest.fn()} />);

    expect(screen.getByTestId('camera-view')).toBeTruthy();
  });

  test('a valid book barcode reports the ISBN exactly once', () => {
    setPermission({ granted: true, canAskAgain: true });
    const onScanned = jest.fn();
    render(<ScannerScreen onScanned={onScanned} />);

    act(() => {
      mockCamera.onBarcodeScanned?.({ data: VALID_ISBN });
    });
    act(() => {
      mockCamera.onBarcodeScanned?.({ data: VALID_ISBN });
    });

    expect(onScanned).toHaveBeenCalledTimes(1);
    expect(onScanned).toHaveBeenCalledWith(VALID_ISBN);
  });

  test('a non-book barcode does not navigate and shows the hint', () => {
    setPermission({ granted: true, canAskAgain: true });
    const onScanned = jest.fn();
    render(<ScannerScreen onScanned={onScanned} />);

    act(() => {
      mockCamera.onBarcodeScanned?.({ data: '0123456789012' });
    });

    expect(onScanned).not.toHaveBeenCalled();
    expect(screen.getByText(/not a book barcode/i)).toBeTruthy();
  });

  test('the torch toggle flips the camera torch', () => {
    setPermission({ granted: true, canAskAgain: true });
    render(<ScannerScreen onScanned={jest.fn()} />);

    expect(mockCamera.enableTorch).toBe(false);

    fireEvent.press(screen.getByText('Torch on'));
    expect(mockCamera.enableTorch).toBe(true);
  });
});
