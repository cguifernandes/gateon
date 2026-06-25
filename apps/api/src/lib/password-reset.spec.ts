import {
  buildPasswordResetUrl,
  getPasswordResetMaxRequestsPerHour,
  getPasswordResetTtlMs,
  hashPasswordResetToken,
} from './password-reset';

describe('password reset helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, DATA_HASH_SECRET: 'test-secret' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('hashes tokens with a stable prefix', () => {
    const first = hashPasswordResetToken('abc');
    const second = hashPasswordResetToken('abc');
    const other = hashPasswordResetToken('xyz');

    expect(first).toBe(second);
    expect(first).not.toBe(other);
  });

  it('builds reset URLs without trailing slash duplication', () => {
    expect(buildPasswordResetUrl('http://localhost:3000/', 'token-1')).toBe(
      'http://localhost:3000/reset-password?token=token-1',
    );
  });

  it('falls back to safe defaults for ttl and rate limits', () => {
    delete process.env.PASSWORD_RESET_TTL_MINUTES;
    delete process.env.PASSWORD_RESET_MAX_REQUESTS_PER_HOUR;

    expect(getPasswordResetTtlMs()).toBe(60 * 60_000);
    expect(getPasswordResetMaxRequestsPerHour()).toBe(3);
  });
});
