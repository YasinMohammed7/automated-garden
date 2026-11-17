import 'reflect-metadata';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateGardenDto } from './create-garden.dto.js';

function makeDto(overrides: Record<string, unknown> = {}): CreateGardenDto {
  const instance = new CreateGardenDto();
  Object.assign(instance, {
    gardenName: 'Backyard',
    totalSurfaceArea: 12.5,
    ...overrides,
  });
  return instance;
}

async function errorsFor(overrides: Record<string, unknown> = {}) {
  return validate(makeDto(overrides));
}

describe('CreateGardenDto', () => {
  it('accepts a valid garden payload', async () => {
    const errors = await errorsFor();
    expect(errors).toHaveLength(0);
  });

  it('rejects a blank gardenName', async () => {
    const errors = await errorsFor({ gardenName: '   ' });
    expect(errors.some((e) => e.property === 'gardenName')).toBe(true);
  });

  it('rejects a gardenName longer than 100 characters', async () => {
    const errors = await errorsFor({ gardenName: 'a'.repeat(101) });
    expect(errors.some((e) => e.property === 'gardenName')).toBe(true);
  });

  it('rejects a negative totalSurfaceArea', async () => {
    const errors = await errorsFor({ totalSurfaceArea: -1 });
    expect(errors.some((e) => e.property === 'totalSurfaceArea')).toBe(true);
  });

  it('accepts a zero totalSurfaceArea', async () => {
    const errors = await errorsFor({ totalSurfaceArea: 0 });
    expect(errors).toHaveLength(0);
  });

  it('rejects a locationDescription longer than 1000 characters', async () => {
    const errors = await errorsFor({ locationDescription: 'a'.repeat(1001) });
    expect(errors.some((e) => e.property === 'locationDescription')).toBe(true);
  });
});
