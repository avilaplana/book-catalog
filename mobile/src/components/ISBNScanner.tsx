import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface Props {
  onScanned: (isbn: string) => void;
  onClose: () => void;
}

export default function ISBNScanner({ onScanned, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera access is needed to scan barcodes.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : ({ data }) => {
          setScanned(true);
          onScanned(data);
        }}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
      />
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.buttonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  camera: { width: '100%', height: '80%' },
  message: { color: '#fff', marginBottom: 16, textAlign: 'center', paddingHorizontal: 24 },
  button: { backgroundColor: '#6c63ff', padding: 12, borderRadius: 8, marginBottom: 12 },
  closeButton: { position: 'absolute', bottom: 40, backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  cancel: { color: '#aaa', marginTop: 8 },
});
