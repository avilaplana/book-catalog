import { parseScannedBarcode } from '../parse-scanned-barcode';

describe('parseScannedBarcode', () => {
  test('978-prefixed EAN-13 with a valid check digit → isbn', () => {
    expect(parseScannedBarcode('9780261103573')).toEqual({
      kind: 'isbn',
      isbn: '9780261103573',
    });
  });

  test('979-prefixed EAN-13 with a valid check digit → isbn', () => {
    expect(parseScannedBarcode('9790000000001')).toEqual({
      kind: 'isbn',
      isbn: '9790000000001',
    });
  });

  test('13-digit numeric with valid check digit but non-978/979 prefix → not a book', () => {
    expect(parseScannedBarcode('0000000000000')).toEqual({ kind: 'not-a-book' });
  });

  test('wrong length → not a book', () => {
    expect(parseScannedBarcode('978026110357')).toEqual({ kind: 'not-a-book' });
    expect(parseScannedBarcode('97802611035731')).toEqual({ kind: 'not-a-book' });
  });

  test('contains a non-digit character → not a book', () => {
    expect(parseScannedBarcode('97802611035X3')).toEqual({ kind: 'not-a-book' });
  });

  test('978-prefixed 13 digits with a wrong check digit → not a book', () => {
    expect(parseScannedBarcode('9780261103574')).toEqual({ kind: 'not-a-book' });
  });
});
