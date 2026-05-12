import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';

import { parseScannedBarcode } from '../scan/parse-scanned-barcode';

export type ScannerScreenProps = {
  onScanned: (isbn: string) => void;
};

const PERMISSION_MESSAGE = 'Camera access is needed to scan barcodes.';
const NOT_A_BOOK_HINT =
  "That's not a book barcode — point at the ISBN on the back cover.";
const HINT_VISIBLE_MS = 2000;

export function ScannerScreen({ onScanned }: ScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  const scannedRef = useRef(false);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  useFocusEffect(
    useCallback(() => {
      scannedRef.current = false;
    }, []),
  );

  useEffect(
    () => () => {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    },
    [],
  );

  const showNotABookHint = useCallback(() => {
    setHintVisible(true);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(
      () => setHintVisible(false),
      HINT_VISIBLE_MS,
    );
  }, []);

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scannedRef.current) return;
      const parsed = parseScannedBarcode(data);
      if (parsed.kind === 'not-a-book') {
        showNotABookHint();
        return;
      }
      scannedRef.current = true;
      onScanned(parsed.isbn);
    },
    [onScanned, showNotABookHint],
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{PERMISSION_MESSAGE}</Text>
        <Pressable style={styles.button} onPress={() => Linking.openSettings()}>
          <Text style={styles.buttonLabel}>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.frame} />
        {hintVisible && (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>{NOT_A_BOOK_HINT}</Text>
          </View>
        )}
      </View>
      <Pressable
        style={styles.torchButton}
        accessibilityRole="button"
        accessibilityLabel={torchOn ? 'Turn torch off' : 'Turn torch on'}
        onPress={() => setTorchOn((on) => !on)}
      >
        <Text style={styles.torchLabel}>{torchOn ? 'Torch off' : 'Torch on'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  message: { color: '#555', textAlign: 'center', fontSize: 16 },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1a73e8',
  },
  buttonLabel: { color: 'white', fontSize: 16, fontWeight: '600' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '78%',
    height: 140,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  hintBox: {
    position: 'absolute',
    bottom: 48,
    marginHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  hintText: { color: 'white', textAlign: 'center' },
  torchButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  torchLabel: { color: 'white', fontWeight: '600' },
});
