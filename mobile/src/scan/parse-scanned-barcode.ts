export type ScannedBarcode =
  | { kind: 'isbn'; isbn: string }
  | { kind: 'not-a-book' };

function hasValidEan13CheckDigit(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const value = digits.charCodeAt(i) - 48;
    sum += i % 2 === 0 ? value : value * 3;
  }
  return sum % 10 === 0;
}

export function parseScannedBarcode(raw: string): ScannedBarcode {
  if (!/^\d{13}$/.test(raw)) {
    return { kind: 'not-a-book' };
  }
  if (!raw.startsWith('978') && !raw.startsWith('979')) {
    return { kind: 'not-a-book' };
  }
  if (!hasValidEan13CheckDigit(raw)) {
    return { kind: 'not-a-book' };
  }
  return { kind: 'isbn', isbn: raw };
}
