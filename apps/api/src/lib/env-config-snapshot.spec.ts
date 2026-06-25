import {
  buildEnvConfigSnapshot,
  isEnvDebugEnabled,
  maskEnvValue,
} from './env-config-snapshot';

describe('env-config-snapshot', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('masks database URLs with credentials', () => {
    expect(
      maskEnvValue(
        'DATABASE_URL',
        'postgresql://postgres:supersecret@db.example.com:5432/postgres?sslmode=require',
      ),
    ).toBe(
      'postgresql://po...es:***@db.example.com:5432/postgres?sslmode=require',
    );
  });

  it('masks secret-like env names', () => {
    expect(maskEnvValue('RESEND_API_KEY', 're_abcdefghijklmnop')).toBe(
      're_a...mnop',
    );
  });

  it('shows non-secret values as-is', () => {
    expect(maskEnvValue('WEB_BASE_URL', 'https://gateon.app')).toBe(
      'https://gateon.app',
    );
  });

  it('enables debug in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ENABLE_ENV_DEBUG;
    expect(isEnvDebugEnabled()).toBe(true);
  });

  it('requires ENABLE_ENV_DEBUG in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_ENV_DEBUG;
    expect(isEnvDebugEnabled()).toBe(false);

    process.env.ENABLE_ENV_DEBUG = 'true';
    expect(isEnvDebugEnabled()).toBe(true);
  });

  it('builds snapshot entries for known keys', () => {
    process.env.PORT = '4000';
    const entry = buildEnvConfigSnapshot(['PORT']).at(0);
    expect(entry).toEqual({
      name: 'PORT',
      set: true,
      display: '4000',
    });
  });
});
