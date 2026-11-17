import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateGardenDto } from './create-garden.dto.js';

const validPayload = {
  gardenName: 'Backyard',
  totalSurfaceArea: 12.5,
};

function makeDto(overrides: Record<string, unknown> = {}): CreateGardenDto {
  // Mirrors the ValidationPipe (transform: true): coerce plain input first.
  return plainToInstance(CreateGardenDto, { ...validPayload, ...overrides });
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

  it('coerces totalSurfaceArea from a string', async () => {
    const dto = makeDto({ totalSurfaceArea: '12.5' });

    expect(dto.totalSurfaceArea).toBe(12.5);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects a non-numeric totalSurfaceArea string', async () => {
    const errors = await errorsFor({ totalSurfaceArea: 'not-a-number' });
    expect(errors.some((e) => e.property === 'totalSurfaceArea')).toBe(true);
  });
});
