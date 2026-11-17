import 'reflect-metadata';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { VerifyEmailDto } from './verify-email.dto.js';

function makeDto(overrides: Record<string, unknown> = {}): VerifyEmailDto {
  const instance = new VerifyEmailDto();
  Object.assign(instance, { token: 'abc', ...overrides });
  return instance;
}

async function errorsFor(overrides: Record<string, unknown> = {}) {
  return validate(makeDto(overrides));
}

describe('VerifyEmailDto', () => {
  it('accepts a valid token', async () => {
    const errors = await errorsFor();
    expect(errors).toHaveLength(0);
  });

  it('rejects an empty token', async () => {
    const errors = await errorsFor({ token: '' });
    expect(errors.some((e) => e.property === 'token')).toBe(true);
  });

  it('rejects a token longer than 256 characters', async () => {
    const errors = await errorsFor({ token: 'a'.repeat(257) });
    expect(errors.some((e) => e.property === 'token')).toBe(true);
  });

  it('rejects a non-string token', async () => {
    const errors = await errorsFor({ token: 123 });
    expect(errors.some((e) => e.property === 'token')).toBe(true);
  });
});
