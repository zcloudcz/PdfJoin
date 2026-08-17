import { describe, expect, test } from 'vitest';
import { createFileId } from '../src/id';

describe('createFileId', () => {
  test('creates distinct IDs when randomUUID is unavailable in an insecure context', () => {
    const cryptoWithoutRandomUuid = {
      getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
    };

    const first = createFileId(cryptoWithoutRandomUuid);
    const second = createFileId(cryptoWithoutRandomUuid);

    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(second).toMatch(/^[0-9a-f]{32}$/);
    expect(first).not.toBe(second);
  });
});
