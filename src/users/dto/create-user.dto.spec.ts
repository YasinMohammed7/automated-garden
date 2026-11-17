import 'reflect-metadata';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateUserDto } from './create-user.dto.js';

function makeDto(overrides: Record<string, unknown> = {}): CreateUserDto {
  const instance = new CreateUserDto();
  Object.assign(instance, {
    emailAddress: 'john.doe@example.com',
    ...overrides,
  });
  return instance;
}

async function errorsFor(overrides: Record<string, unknown> = {}) {
  return validate(makeDto(overrides));
}

describe('CreateUserDto', () => {
  it('accepts a valid user payload', async () => {
    const errors = await errorsFor();
    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid emailAddress', async () => {
    const errors = await errorsFor({ emailAddress: 'not-an-email' });
    expect(errors.some((e) => e.property === 'emailAddress')).toBe(true);
  });

  it('rejects an emailAddress longer than 254 characters', async () => {
    const errors = await errorsFor({ emailAddress: `${'a'.repeat(250)}@example.com` });
    expect(errors.some((e) => e.property === 'emailAddress')).toBe(true);
  });

  it('rejects a blank firstName', async () => {
    const errors = await errorsFor({ firstName: '   ' });
    expect(errors.some((e) => e.property === 'firstName')).toBe(true);
  });

  it('rejects a firstName longer than 100 characters', async () => {
    const errors = await errorsFor({ firstName: 'a'.repeat(101) });
    expect(errors.some((e) => e.property === 'firstName')).toBe(true);
  });

  it('rejects a blank lastName', async () => {
    const errors = await errorsFor({ lastName: '' });
    expect(errors.some((e) => e.property === 'lastName')).toBe(true);
  });

  it('rejects an age below 0', async () => {
    const errors = await errorsFor({ age: -1 });
    expect(errors.some((e) => e.property === 'age')).toBe(true);
  });

  it('rejects an age above 125', async () => {
    const errors = await errorsFor({ age: 126 });
    expect(errors.some((e) => e.property === 'age')).toBe(true);
  });

  it('rejects a non-integer age', async () => {
    const errors = await errorsFor({ age: 25.5 });
    expect(errors.some((e) => e.property === 'age')).toBe(true);
  });
});
