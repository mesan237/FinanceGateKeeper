import { generateSalt, hashPin } from '@/utils/pinHash';

describe('pinHash', () => {
  describe('hashPin', () => {
    it('is deterministic for the same pin and salt', async () => {
      const a = await hashPin('1234', 'abc123');
      const b = await hashPin('1234', 'abc123');
      expect(a).toBe(b);
    });

    it('produces a different hash for a different pin', async () => {
      const a = await hashPin('1234', 'abc123');
      const b = await hashPin('5678', 'abc123');
      expect(a).not.toBe(b);
    });

    it('produces a different hash for a different salt', async () => {
      const a = await hashPin('1234', 'saltone');
      const b = await hashPin('1234', 'salttwo');
      expect(a).not.toBe(b);
    });

    it('returns a non-empty hex string', async () => {
      const hash = await hashPin('1234', 'abc123');
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('generateSalt', () => {
    it('returns a 32-char hex string (16 bytes)', async () => {
      const salt = await generateSalt();
      expect(salt).toMatch(/^[0-9a-f]{32}$/);
    });

    it('varies between calls', async () => {
      const a = await generateSalt();
      const b = await generateSalt();
      expect(a).not.toBe(b);
    });
  });
});
