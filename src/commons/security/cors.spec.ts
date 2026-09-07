import {
  buildCorsOriginAllowlist,
  buildCorsOriginOption,
  parseCorsOriginList,
} from './cors';

describe('cors origin helpers', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('parses comma-separated origins and removes blanks and duplicates', () => {
    expect(
      parseCorsOriginList(
        ' https://app.example.com, ,https://staff.example.com,https://app.example.com ',
      ),
    ).toEqual([
      'https://app.example.com',
      'https://staff.example.com',
    ]);
  });

  it('returns an empty allowlist when the CSV env is not set', () => {
    delete process.env.CORS_ALLOWED_ORIGINS;

    expect(buildCorsOriginAllowlist()).toEqual([]);
  });

  it('allows any origin outside production for local development', () => {
    delete process.env.NODE_ENV;
    process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com';

    expect(buildCorsOriginOption()).toBe(true);
  });

  it('uses the configured allowlist in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com';

    expect(buildCorsOriginOption()).toEqual(['https://app.example.com']);
  });
});
