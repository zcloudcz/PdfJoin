type CryptoIdSource = Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>>;

export function createFileId(source: CryptoIdSource = globalThis.crypto): string {
  if (typeof source.randomUUID === 'function') return source.randomUUID();

  const bytes = source.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
