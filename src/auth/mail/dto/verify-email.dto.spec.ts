import 'reflect-metadata';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { VerifyEmailDto } from './verify-email.dto.js';

function makeDto(overrides: Record<string, unknown> = {}): VerifyEmailDto {
  const instance = new VerifyEmailDto();
  Object.assign(instance, { code: '123456', ...overrides });
  return instance;
}

async function errorsFor(overrides: Record<string, unknown> = {}) {
  return validate(makeDto(overrides));
}

describe('VerifyEmailDto', () => {
  it('accepts a 6-digit code', async () => {
    const errors = await errorsFor();
    expect(errors).toHaveLength(0);
  });

  it('rejects an empty code', async () => {
    const errors = await errorsFor({ code: '' });
    expect(errors.some((e) => e.property === 'code')).toBe(true);
  });

  it('rejects a code shorter than 6 digits', async () => {
    const errors = await errorsFor({ code: '12345' });
    expect(errors.some((e) => e.property === 'code')).toBe(true);
  });

  it('rejects a code longer than 6 digits', async () => {
    const errors = await errorsFor({ code: '1234567' });
    expect(errors.some((e) => e.property === 'code')).toBe(true);
  });

  it('rejects a code with non-digit characters', async () => {
    const errors = await errorsFor({ code: '12a456' });
    expect(errors.some((e) => e.property === 'code')).toBe(true);
  });
});
