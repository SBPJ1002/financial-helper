describe('Encryption Utilities', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-that-is-at-least-32-chars-long';
  });

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  it('should encrypt and decrypt a string roundtrip', async () => {
    const { encrypt, decrypt } = await import('../../utils/encryption');
    const original = '12345678901';
    const encrypted = encrypt(original);

    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':');

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should produce different ciphertext for same input (random IV)', async () => {
    const { encrypt } = await import('../../utils/encryption');
    const input = 'same-input';
    const enc1 = encrypt(input);
    const enc2 = encrypt(input);

    expect(enc1).not.toBe(enc2);
  });

  it('should handle special characters', async () => {
    const { encrypt, decrypt } = await import('../../utils/encryption');
    const original = 'Test@123!#$%^&*()_+{}|:"<>?';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should handle unicode characters', async () => {
    const { encrypt, decrypt } = await import('../../utils/encryption');
    const original = 'João da Silva — Açaí café';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });
});
